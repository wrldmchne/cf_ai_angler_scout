# Angler Scout AI

Angler Scout is a specialized AI agent designed for curious anglers looking to explore new fisheries in their locale. It uses geographic persistence and progressive disclosure to provide strategic overviews and aggregated tactical intel for any body of water.

## The Tech Stack
- **Compute:** [Cloudflare Workers](https://workers.cloudflare.com/) (Entry point & API routing)
- **Intelligence:** [Workers AI](https://developers.cloudflare.com/ai/) (Running `llama-3.3-70b-instruct-fp8-fast`)
- **Persistence:** [Durable Objects](https://developers.cloudflare.com/durable-objects/) (The 'Geographic Anchor' for session state)
- **Orchestration:** [Workflows](https://developers.cloudflare.com/workflows/) (Asynchronous mission logging and data enrichment)
- **Frontend:** [Cloudflare Assets](https://developers.cloudflare.com/workers/frameworks/) (Vanilla JS / CSS variables)

## Key Architectural Patterns

### The Geographic Anchor (Durable Objects)
Instead of passing the location in every prompt, the app 'anchors' the session to a specific location in a Durable Object. This ensures that when a user asks "What lures should I use?", the AI already knows the context is "Lady Bird Lake, Austin" without the user repeating it. 



### Strategic vs. Tactical Mode (Progressive Disclosure)
To keep the UI clean and increase the relevance of follow-up interactions, the system uses a dual-mode prompting strategy:
1. **Strategic Overview:** A high-level summary of a new location (species, general spots).
2. **Tactical Elaboration:** Triggered by user follow-ups or UI chips to provide specific gear, line weights, and lure colors.



### Streaming Reliability
Implemented a robust Server-Sent Events (SSE) parser on the frontend to handle high-token responses, ensuring smooth rendering and preventing UI corruption during long-form tactical briefings.

---

## Engineering Challenges & Optimizations
Building a real-time AI agent at the Edge revealed several nuanced challenges with streaming and state synchronization.

#### 1. The "Undefined" Buffer Fragment
* **The Bug:** The UI would occasionally append the word `undefined` to the end of a report.
* **The Fix:** I identified that the stream was sending a terminal `[DONE]` signal or an empty final chunk. I implemented a strict existence check in the frontend parser (`if (json.response)`) and a `try-catch` block to gracefully ignore non-JSON fragments.

#### 2. Strategic vs. Tactical Disclosure
* **Problem:** The LLM originally "dumped" all intelligence in the first message, leaving no value for follow-up interaction.
* **Optimization:** I engineered a **Two-Mode System Prompt**. The agent now identifies "Initial Scout" (broad summary) vs. "Tactical Disclosure." This ensures the "Suggestive UI" chips stay relevant and useful.

#### 3. Mid-Sentence Cutoffs (Token Exhaustion)
* **The Bug:** Detailed reports and follow-ups were cutting off abruptly mid-paragraph.
* **The Fix:** The default inference window was too small for professional-grade reports. I optimized the implementation by scaling `max_tokens` to **2048**, providing enough "runway" for complex gear tables and multi-point strategies.

#### 4. Asynchronous State Race Conditions
* **Problem:** Follow-up questions would occasionally lose context of the location if the browser sent the chat request before the Durable Object write finished.
* **The Fix:** Optimized the Worker to treat the Durable Object as the immutable Source of Truth for the session, ensuring the prompt context is injected server-side before the AI inference begins.

## 5. Future Roadmap
The next evolution of Angler Scout will incorporate a ledger of curated hyper-local data to supplement the LLM's generalized knowledge. This "living document" approach allows the database to grow alongside the community, providing niche intel and "hidden gem" locations that general AI models often overlook:

- **Internal Knowledge Base (Vectorize):** I plan to implement a proprietary "Angler's Ledger" using **Cloudflare Vectorize**. This allows developers and verified contributors to update a centralized ledger (Excel/JSON) with hyper-local intel—such as secret creek access points and seasonally specific lure patterns—without needing to redeploy the core application.
- **Real-time Weather Integration:** Connecting the Geographic Anchor to a weather API to overlay barometric pressure trends on the tactical briefing.

---

## Deployment
```bash
git clone [https://github.com/wrldmchne/cf_ai_angler_scout.git](https://github.com/wrldmchne/cf_ai_angler_scout.git)
cd cf_ai_angler_scout
npm install
npx wrangler deploy