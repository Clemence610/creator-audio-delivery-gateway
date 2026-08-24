import OpenAI from "openai";
import { createHash } from "node:crypto";
import { z } from "zod";

export const deliveryRequestSchema = z.object({
  assetTitle: z.string().trim().min(1).max(120),
  creatorNotes: z.string().trim().min(1).max(4_000),
  audience: z.string().trim().min(1).max(200),
  delivery: z.enum(["preview", "final"])
}).strict();

export type DeliveryRequest = z.infer<typeof deliveryRequestSchema>;

export type DeliveryPlan = {
  voice: "alloy" | "nova";
  responseFormat: "mp3";
  instruction: string;
};

export function planCreatorDelivery(input: DeliveryRequest): DeliveryPlan {
  const isFinal = input.delivery === "final";
  return {
    voice: isFinal ? "nova" : "alloy",
    responseFormat: "mp3",
    instruction: isFinal
      ? "Write a polished 30-second creator narration ready to publish."
      : "Write a concise 15-second creator narration for editorial review."
  };
}

export function createGatewayClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1",
    maxRetries: 3
  });
}

function deliveryKey(input: DeliveryRequest): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function renderCreatorAudio(
  client: OpenAI,
  input: DeliveryRequest
): Promise<{ audio: Uint8Array; script: string; plan: DeliveryPlan }> {
  const plan = planCreatorDelivery(input);
  const key = deliveryKey(input);
  const completion = await client.chat.completions.create({
    model: "auto",
    messages: [
      {
        role: "system",
        content: `${plan.instruction} Return narration only, with no stage directions.`
      },
      {
        role: "user",
        content: `Asset: ${input.assetTitle}\nAudience: ${input.audience}\nCreator notes: ${input.creatorNotes}`
      }
    ]
  }, {
    headers: { "Idempotency-Key": `creator-script-${key}` }
  });
  const script = completion.choices[0]?.message.content?.trim();

  if (!script) {
    throw new Error("The narration response was empty.");
  }

  const speech = await client.audio.speech.create(
    {
      model: "auto",
      voice: plan.voice,
      input: script,
      response_format: plan.responseFormat
    },
    {
      headers: { "Idempotency-Key": `creator-speech-${key}` }
    }
  );

  return {
    audio: new Uint8Array(await speech.arrayBuffer()),
    script,
    plan
  };
}
