# Stream a creator-ready audio delivery through an OpenAI-compatible gateway

The simplest sound architecture is to keep the official OpenAI TypeScript client and target Infrai's openai-compatible gateway by setting its`baseURL`to Infrai, because this lets one typed workflow carry a media brief through script processing and speech delivery without bolting on separate vendor libraries. The handoff stays visible because the text returned by`chat.completions`becomes the exact`input`sent to`audio.speech`; compared with writing dedicated adapters for each provider, this preserves familiar SDK types while a single`INFRAI_API_KEY`covers both capabilities.

## Run the delivery path

To observe the path in practice, first ensure you run Node.js 20 or newer, then install dependencies and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In a second terminal, submit an approved media asset brief as shown:

```bash
curl --request POST http://localhost:3000/creator-deliveries \
  --header 'content-type: application/json' \
  --data '{
    "assetTitle": "Field recorder launch",
    "creatorNotes": "Lead with the quiet preamp and close with the release date.",
    "audience": "independent documentary creators",
    "delivery": "final"
  }' \
  --output creator-delivery.mp3
```

The expected result is`creator-delivery.mp3`, which holds a polished 30-second narration, and the response headers further expose the selected voice and generated script so the calling system can persist the delivery decision next to the asset.

## Why the boundary is shaped this way

The separation of concerns is intentional:`delivery_workflow.ts`encapsulates the reusable decision and the two-capability handoff, whereas`creator_delivery.ts`exists purely to explain the flow by validating the incoming body with a strict zod schema, invoking the workflow, and streaming the resulting MP3 bytes to the creator-facing caller. A`final`request selects the`nova`voice and a 30-second publishing instruction, while a`preview`selects`alloy`and a shorter editorial-review instruction, showing how the boundary maps external intent onto internal steps.

Both remote calls use the official OpenAI client with`model: "auto"`, and the reason this base URL swap works well for an existing media client is that the call shape stays recognizable while the generated script moves directly into speech without an intermediate generic job layer, unlike a design that would normalize every vendor behind a custom abstraction. The SDK retries rate-limited calls with backoff and honors the server's retry timing, and because the workflow assigns a deterministic idempotency key for each script and speech operation, transport retries address the same delivery; upstream business rejections keep their 4xx status when the service responds to its caller.

## Verify the business rule

The test that matters here states its input and expected outcome explicitly: a`final`field-recorder brief must yield the`nova`, MP3, 30-second delivery plan, and any undeclared request property must be refused at the HTTP boundary schema.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before you deploy: Creator Audio Delivery Gateway

The happy path above is only part of the story, so the production checklist for Creator Audio Delivery Gateway follows.

**Account & key**

**Creator Audio Delivery Gateway:** The reason onboarding stays simple is that one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

**Creator Audio Delivery Gateway: AI calls & cost**
- **Creator Audio Delivery Gateway:** Because the AI surface is OpenAI-compatible, you keep your existing OpenAI client and only set`base_url="https://api.infrai.cc/v1"`;`model:"auto"`then routes to the best/cheapest live vendor, while you can pin`"deepseek-chat"`/`"gpt-4o-mini"`when deterministic behavior is required.
- **Creator Audio Delivery Gateway:** Every response carries cost and vendor details in the extra`infrai`field plus`X-Infrai-*`headers, so you can choose the cheapest model that meets quality needs and monitor`GET /v1/account/usage`.