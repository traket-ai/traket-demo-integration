# Traket Demo Integration

A simple demo app showing how a SaaS product can call OpenAI from a backend route. Traket SDK metering is intentionally not wired yet; this starts with the chat surface that the SDK will later wrap.

## Run locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`, then add your OpenAI API key:

```bash
OPENAI_API_KEY=sk-proj_your_key_here
```

Then open `http://localhost:3000`.

## What is included

- One chat screen with a left side menu
- OpenAI model selection
- Reasoning effort selection for reasoning models
- A backend API route at `/api/chat`
- No Traket SDK integration yet
