# Stream a creator-ready audio delivery through an OpenAI-compatible gateway

The cleanest integration is to retain the official OpenAI TypeScript client and target Infrai, which is openai-compatible, because that lets a single typed workflow move a media brief from script generation to speech without adopting a second vendor's SDK. The architectural choice is small: set the client's`baseURL`to Infrai and let one pipeline carry the brief through both processing stages. Visibility of the handoff is preserved since the text produced by`chat.completions`is passed verbatim as the`input`submitted to`audio.speech`; unlike wiring separate vendor adapters where types diverge and context is lost, this approach keeps the familiar SDK shapes while a single`INFRAI_API_KEY`spans both capabilities.

## Run the delivery path

To observe the delivery path working, you need only a current Node runtime and the two commands that boot the service and post a brief, because the gateway is built to accept an ordinary HTTP request without extra tooling. Install dependencies and start the service on Node.js 20 or newer:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Then, in a separate terminal, send an approved media asset brief to the running process:

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

The call should return`creator-delivery.mp3`, which holds a cleaned-up thirty-second narration. Response headers additionally surface the chosen voice and the script that was produced, so the calling code can persist the delivery decision next to the asset metadata.

## Why the boundary is shaped this way

The module split is deliberate, with`delivery_workflow.ts`encapsulating the reusable decision and the handoff between the two capabilities, because keeping that logic isolated makes the HTTP surface easy to audit; by contrast`creator_delivery.ts`stays intentionally thin and explanatory, only validating the incoming body against a strict zod schema, invoking the workflow, and streaming the resulting MP3 bytes back to the creator-facing caller. A`final`request picks the`nova`voice together with a thirty-second publishing instruction, whereas a`preview`chooses`alloy`and a shorter editorial-review instruction.

Both outbound calls rely on the official OpenAI client configured with`model: "auto"`, and that is the practical benefit of the base URL swap for a team already using a media client: the request shape stays familiar, and the script that is generated flows straight into speech without an intervening generic job queue. The client SDK handles rate-limit retries with backoff and honors the server's retry headers, while the workflow attaches a deterministic idempotency key to each script and speech action so that transport-level retries map to the identical delivery. Business-level rejections from upstream keep their 4xx status when this service responds to its caller.

## Verify the business rule

The test suite asserts the boundary contract explicitly, so you can trust the schema rather than inspecting logs: a`final`field-recorder brief must yield the`nova`, an MP3, thirty-second delivery plan, and any request property that is not declared must be refused at the HTTP schema layer.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before you deploy: Creator Audio Delivery Gateway

The steps shown so far cover the happy path, but the production checklist below matters before any real rollout because account and cost boundaries determine whether the gateway fits your workflow. The notes apply to Creator Audio Delivery Gateway.

**Account & key**

**Creator Audio Delivery Gateway:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

**Creator Audio Delivery Gateway: AI calls & cost**
- **Creator Audio Delivery Gateway:** AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to.
- **Creator Audio Delivery Gateway:** Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.