import { describe, expect, it } from "vitest";
import { deliveryRequestSchema, planCreatorDelivery } from "../src/delivery_workflow.js";

describe("creator delivery planning", () => {
  it("turns an approved asset into the final creator voice plan", () => {
    const input = deliveryRequestSchema.parse({
      assetTitle: "Field recorder launch",
      creatorNotes: "Lead with the quiet preamp and close with the release date.",
      audience: "independent documentary creators",
      delivery: "final"
    });

    expect(planCreatorDelivery(input)).toEqual({
      voice: "nova",
      responseFormat: "mp3",
      instruction: "Write a polished 30-second creator narration ready to publish."
    });
  });

  it("rejects undeclared request fields at the service boundary", () => {
    const result = deliveryRequestSchema.safeParse({
      assetTitle: "Field recorder launch",
      creatorNotes: "Make a short preview.",
      audience: "editors",
      delivery: "preview",
      voice: "nova"
    });

    expect(result.success).toBe(false);
  });
});
