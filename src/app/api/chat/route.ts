import OpenAI from "openai";
import { NextResponse } from "next/server";

import { findChatModel, reasoningEfforts, type ReasoningEffort } from "@/lib/models";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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
    messages?: unknown;
    model?: unknown;
    reasoningEffort?: unknown;
  };

  const messages = Array.isArray(input.messages)
    ? input.messages.map(cleanMessage).filter((message): message is ChatMessage => Boolean(message))
    : [];

  if (messages.length === 0) {
    return NextResponse.json({ error: "Send at least one message." }, { status: 400 });
  }

  const model = findChatModel(typeof input.model === "string" ? input.model : "");
  const reasoningEffort = cleanReasoningEffort(input.reasoningEffort);
  const client = new OpenAI();
  const prompt = [
    "You are a helpful assistant inside a simple SaaS demo app.",
    "Answer clearly and keep responses concise unless the user asks for detail.",
    "",
    transcriptFromMessages(messages),
    "",
    "Assistant:"
  ].join("\n");

  try {
    const response = await client.responses.create({
      input: prompt,
      max_output_tokens: 900,
      model: model.id,
      ...(model.supportsReasoning
        ? {
            reasoning: {
              effort: reasoningEffort
            }
          }
        : {})
    });

    const outputText =
      response.output_text?.trim() ||
      "The model finished without visible text. Try a lower reasoning effort or ask for a shorter answer.";

    return NextResponse.json({
      content: outputText,
      model: model.id,
      status: response.status,
      usage: response.usage ?? null
    });
  } catch (error) {
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
