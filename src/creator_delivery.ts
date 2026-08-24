import { createServer } from "node:http";
import OpenAI from "openai";
import {
  createGatewayClient,
  deliveryRequestSchema,
  renderCreatorAudio
} from "./delivery_workflow.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) {
  throw new Error("Set INFRAI_API_KEY before starting the service.");
}

const client = createGatewayClient(apiKey);
const port = Number(process.env.PORT ?? "3000");

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/creator-deliveries") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const parsed = deliveryRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid delivery request", issues: parsed.error.issues }));
      return;
    }

    const result = await renderCreatorAudio(client, parsed.data);
    response.writeHead(200, {
      "content-type": "audio/mpeg",
      "content-length": result.audio.byteLength,
      "x-delivery-voice": result.plan.voice,
      "x-script": encodeURIComponent(result.script)
    });
    response.end(result.audio);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery could not be created";
    const upstreamStatus = error instanceof OpenAI.APIError ? error.status : undefined;
    const status = upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500
      ? upstreamStatus
      : 502;
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: message }));
  }
});

server.listen(port, () => {
  console.log(`Creator delivery service listening on http://localhost:${port}`);
});
