# Traket Demo Integration

A simple demo app showing how a SaaS product can call OpenAI from a backend route and meter usage with the Traket SDK.

## Run locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`, then add your OpenAI API key and Traket write key:

```bash
OPENAI_API_KEY=sk-proj_your_key_here
TRAKET_WRITE_KEY=sm_live_your_key_here
TRAKET_ENDPOINT=https://traket.ai/api/v1/usage/events
```

Then open `http://localhost:3000`.

## What is included

- One chat screen with a left side menu
- OpenAI model selection
- Reasoning effort selection for reasoning models
- App customer ID, Stripe customer ID, and demo email inputs for attribution
- A backend API route at `/api/chat`
- Traket SDK tracking around the OpenAI call when `TRAKET_WRITE_KEY` is set

The demo sends the app customer ID as `externalCustomerId`. The Stripe customer
ID is sent as safe billing metadata, and the demo email is reduced to its account
domain before tracking. The Traket write key maps the event to the correct
project.
