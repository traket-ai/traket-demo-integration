"use client";

import { FormEvent, useMemo, useState } from "react";

import { chatModels, reasoningEfforts, type ReasoningEffort } from "@/lib/models";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  content?: string;
  error?: string;
  model?: string;
  status?: string;
  tracking?: {
    accepted: number;
    configured: boolean;
    error?: string;
    rejected: number;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | null;
};

function createMessage(role: Message["role"], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [appCustomerId, setAppCustomerId] = useState("org_demo_001");
  const [stripeCustomerId, setStripeCustomerId] = useState("cus_demo_001");
  const [demoEmail, setDemoEmail] = useState("alex@demo.test");
  const [model, setModel] = useState(chatModels[0].id);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("low");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<ChatResponse["usage"]>(null);
  const [lastTracking, setLastTracking] = useState<ChatResponse["tracking"]>(undefined);

  const selectedModel = useMemo(
    () => chatModels.find((item) => item.id === model) ?? chatModels[0],
    [model]
  );

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || isThinking) {
      return;
    }

    const nextMessages = [...messages, createMessage("user", content)];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLastUsage(null);
    setLastTracking(undefined);
    setIsThinking(true);

    try {
      const response = await fetch("/api/chat", {
        body: JSON.stringify({
          appCustomerId,
          demoEmail,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          })),
          model,
          reasoningEffort,
          stripeCustomerId
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      const data = (await response.json()) as ChatResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "The chat request failed.");
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.content ?? "No response text returned.")
      ]);
      setLastUsage(data.usage ?? null);
      setLastTracking(data.tracking);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The chat request failed."
      );
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <span className="brand-mark" />
            <div>
              <strong>Traket</strong>
              <span>Demo integration</span>
            </div>
          </div>

          <nav className="nav">
            <a aria-current="page" href="/">
              Chat
            </a>
          </nav>
        </div>

        <div className="sidebar-note">
          Traket SDK metering is wired in the server route. Add a write key to
          enable tracking.
        </div>
      </aside>

      <section className="chat-screen">
        <header className="chat-header">
          <div>
            <p className="eyebrow">OpenAI chat demo</p>
            <h1>Chat</h1>
          </div>

          <div className="controls">
            <label>
              <span>App customer ID</span>
              <input
                value={appCustomerId}
                onChange={(event) => setAppCustomerId(event.target.value)}
                placeholder="org_demo_001"
              />
            </label>

            <label>
              <span>Stripe customer ID</span>
              <input
                value={stripeCustomerId}
                onChange={(event) => setStripeCustomerId(event.target.value)}
                placeholder="cus_demo_001"
              />
            </label>

            <label>
              <span>Demo email</span>
              <input
                value={demoEmail}
                onChange={(event) => setDemoEmail(event.target.value)}
                placeholder="alex@demo.test"
              />
            </label>

            <label>
              <span>Model</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {chatModels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Reasoning</span>
              <select
                disabled={!selectedModel.supportsReasoning}
                value={reasoningEffort}
                onChange={(event) =>
                  setReasoningEffort(event.target.value as ReasoningEffort)
                }
              >
                {reasoningEfforts.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>Ask the assistant something.</h2>
              <p>
                Pick a model, send a message, and the server route will call the
                OpenAI Responses API through the Traket SDK when a write key is
                configured.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
                <p>{message.content}</p>
              </article>
            ))
          )}

          {isThinking ? (
            <article className="message assistant thinking">
              <span>Assistant</span>
              <p>Thinking with {selectedModel.label}...</p>
            </article>
          ) : null}
        </div>

        <footer className="composer">
          {error ? <div className="error">{error}</div> : null}
          {lastUsage ? (
            <div className="usage">
              Tokens: input {lastUsage.input_tokens ?? 0}, output{" "}
              {lastUsage.output_tokens ?? 0}, total {lastUsage.total_tokens ?? 0}
            </div>
          ) : null}
          {lastTracking ? (
            <div className="usage">
              Traket tracking:{" "}
              {lastTracking.configured
                ? `${lastTracking.accepted} accepted, ${lastTracking.rejected} rejected`
                : "not configured"}
              {lastTracking.error ? ` (${lastTracking.error})` : ""}
            </div>
          ) : null}

          <form onSubmit={sendMessage}>
            <textarea
              aria-label="Message"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Type a message..."
              rows={3}
              value={draft}
            />
            <button disabled={isThinking || draft.trim().length === 0} type="submit">
              {isThinking ? "Thinking" : "Send"}
            </button>
          </form>
        </footer>
      </section>
    </main>
  );
}
