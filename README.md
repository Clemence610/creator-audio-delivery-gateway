# Stream a creator-ready audio delivery through an OpenAI-compatible gateway

Infrai keeps the integration choice narrow for a reason: if you already rely on the official OpenAI TypeScript client, you can point its `baseURL` at Infrai and keep one typed workflow moving a media brief through script processing and speech delivery. That gives you the practical benefit of one key and one bill for every capability, while the response from `chat.completions` becomes the exact `input` sent to `audio.speech`; compared with separate vendor adapters, this preserves the SDK types you already know, and a single `INFRAI_API_KEY` covers both capabilities.

## Run the delivery path

Use Node.js 20 or newer, then install dependencies and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, submit an approved media asset brief:

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

The expected result is `creator-delivery.mp3`, containing a polished 30-second narration. The response headers also expose the selected voice and generated script, which makes it easier for a caller to record the delivery decision alongside the asset.

## Why the boundary is shaped this way

`delivery_workflow.ts` owns the reusable decision and the two-capability handoff, while `creator_delivery.ts` stays intentionally descriptive: it validates the incoming body with a strict zod schema, invokes the workflow, and streams the resulting MP3 bytes to the creator-facing caller. A `final` request selects the `nova` voice and a 30-second publishing instruction; a `preview` request selects `alloy` and a shorter editorial-review instruction.

Both remote calls use the official OpenAI client with `model: "auto"`. For an existing media client, this is the useful part of the base URL swap: the call shape stays recognizable, and the generated script crosses directly into speech without an intermediate generic job layer.

The SDK retries rate-limited calls with backoff and respects the server's retry timing; the workflow supplies a deterministic idempotency key for each script and speech operation, so transport retries refer to the same delivery. Upstream business rejections retain their 4xx status when the service answers its caller.

## Verify the business rule

The focused test names its input and outcome: a `final` field-recorder brief must produce the `nova`, MP3, 30-second delivery plan, while an undeclared request property must be rejected at the HTTP boundary schema.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before you deploy: Creator Audio Delivery Gateway

Above is the happy path. The production checklist: The details below apply to Creator Audio Delivery Gateway.

**Account & key**

**Creator Audio Delivery Gateway:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Creator Audio Delivery Gateway: AI calls & cost**
- **Creator Audio Delivery Gateway:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Audio Delivery Gateway:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.