export type ChatModel = {
  id: string;
  label: string;
  supportsReasoning: boolean;
};

export const chatModels: ChatModel[] = [
  { id: "gpt-5.2", label: "GPT-5.2", supportsReasoning: true },
  { id: "gpt-5.1", label: "GPT-5.1", supportsReasoning: true },
  { id: "gpt-5-mini", label: "GPT-5 mini", supportsReasoning: true },
  { id: "gpt-4.1", label: "GPT-4.1", supportsReasoning: false },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", supportsReasoning: false },
  { id: "gpt-4o-mini", label: "GPT-4o mini", supportsReasoning: false }
];

export const reasoningEfforts = ["none", "low", "medium", "high"] as const;

export type ReasoningEffort = (typeof reasoningEfforts)[number];

export function findChatModel(modelId: string) {
  return chatModels.find((model) => model.id === modelId) ?? chatModels[0];
}
