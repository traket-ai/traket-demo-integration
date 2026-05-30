import OpenAI from "openai";
import { createMargins } from "@traket/sdk";
import { NextResponse } from "next/server";

import { findChatModel, reasoningEfforts, type ReasoningEffort } from "@/lib/models";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TrackingResult = {
  accepted: number;
  configured: boolean;
  error?: string;
  rejected: number;
};

type DemoCustomer = {
  appCustomerId: string;
  accountDomain: string;
  stripeCustomerId: string;
};

function cleanMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const maybeMessage = value as Partial<ChatMessage>;

  if (
    (maybeMessage.role !== "user" && maybeMessage.role !== "assistant") ||
    typeof maybeMessage.content !== "string"
  ) {
    return null;
  }

  const content = maybeMessage.content.trim();

  if (!content) {
    return null;
  }

  return {
    role: maybeMessage.role,
    content: content.slice(0, 8000)
  };
}

function transcriptFromMessages(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "User" : "Assistant";
      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");
}

function cleanReasoningEffort(value: unknown): ReasoningEffort {
  return reasoningEfforts.includes(value as ReasoningEffort)
    ? (value as ReasoningEffort)
    : "low";
}

function cleanOptionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : fallback;
}

function emailDomain(value: unknown) {
  if (typeof value !== "string") {
    return "demo.test";
  }

  const domain = value.trim().split("@")[1]?.toLowerCase();
  return domain ? domain.slice(0, 160) : "demo.test";
}

function cleanDemoCustomer(input: {
  appCustomerId?: unknown;
  demoEmail?: unknown;
  externalCustomerId?: unknown;
  stripeCustomerId?: unknown;
}): DemoCustomer {
  const appCustomerId = cleanOptionalString(
    input.appCustomerId ?? input.externalCustomerId,
    "org_demo_001"
  );

  return {
    accountDomain: emailDomain(input.demoEmail),
    appCustomerId,
    stripeCustomerId: cleanOptionalString(input.stripeCustomerId, "cus_demo_001")
  };
}

function createTraketClient() {
  const writeKey = process.env.TRAKET_WRITE_KEY?.trim();

  if (!writeKey) {
    return null;
  }

  return createMargins({
    endpoint: process.env.TRAKET_ENDPOINT,
    writeKey
  });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const input = body as {
    appCustomerId?: unknown;
    demoEmail?: unknown;
    externalCustomerId?: unknown;
    messages?: unknown;
    model?: unknown;
    reasoningEffort?: unknown;
    stripeCustomerId?: unknown;
  };

  const messages = Array.isArray(input.messages)
    ? input.messages.map(cleanMessage).filter((message): message is ChatMessage => Boolean(message))
    : [];

  if (messages.length === 0) {
    return NextResponse.json({ error: "Send at least one message." }, { status: 400 });
  }

  const model = findChatModel(typeof input.model === "string" ? input.model : "");
  const reasoningEffort = cleanReasoningEffort(input.reasoningEffort);
  const demoCustomer = cleanDemoCustomer(input);
  const client = new OpenAI();
  const margins = createTraketClient();
  const tracking: TrackingResult = {
    accepted: 0,
    configured: Boolean(margins),
    rejected: 0
  };
  const prompt = [
    "You are a helpful assistant inside a simple SaaS demo app.",
    "Answer clearly and keep responses concise unless the user asks for detail.",
    "",
    transcriptFromMessages(messages),
    "",
    "Assistant:"
  ].join("\n");

  try {
    const createResponse = () => client.responses.create({
      input: prompt,
      max_output_tokens: 5000,
      model: model.id,
      ...(model.supportsReasoning
        ? {
            reasoning: {
              effort: reasoningEffort
            }
          }
        : {})
    });
    const response = margins
      ? await margins.openai.track(createResponse, {
          environment: process.env.NODE_ENV,
          externalCustomerId: demoCustomer.appCustomerId,
          feature: "chat",
          metadata: {
            account_domain: demoCustomer.accountDomain,
            billing_customer_id: demoCustomer.stripeCustomerId
          },
          model: model.id,
          operation: "responses.create",
          promptType: "demo_chat"
        })
      : await createResponse();

    if (margins) {
      const flushResult = await margins.flush();
      tracking.accepted = flushResult?.accepted ?? 0;
      tracking.rejected = flushResult?.rejected ?? 0;
      tracking.error = flushResult?.results.find((result) => result.error)?.error;
    }

    const outputText =
      response.output_text?.trim() ||
      "The model finished without visible text. Try a lower reasoning effort or ask for a shorter answer.";

    return NextResponse.json({
      content: outputText,
      model: model.id,
      status: response.status,
      tracking,
      usage: response.usage ?? null
    });
  } catch (error) {
    if (margins) {
      await margins.flush().catch(() => null);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "OpenAI request failed. Check your API key and model access."
      },
      { status: 500 }
    );
  }
}
