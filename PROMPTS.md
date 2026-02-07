# AI Prompt Engineering History: Angler Scout

### 1. Architectural Strategy
- "Help me build a Cloudflare Worker that uses Durable Objects to store a 'Geographic Anchor' so the AI remembers which body of water we are discussing across multiple chat messages."
- "Integrate a Cloudflare Workflow that triggers on every chat request to handle background telemetry and logging without slowing down the main AI stream."

### 2. Personality & Guardrails
- "Define a system prompt for a professional fishing guide. It must be hyper-focused on tactics, species, and gear. Strictly forbid any mention of hotels, tourism, or sightseeing to maintain a professional tool feel."
- "Implement a 'Progressive Disclosure' response model. Initial searches should return a high-level strategic overview, while follow-up questions should trigger a high-specificity tactical drill-down."

### 3. UX & Visual Polish
- "Create a Gemini-style UI where the search bar starts in the center and docks to the bottom after the first search. Use a nautical blue (#4ec3ff) accent color."
- "Write a JavaScript stream parser for the frontend that handles partial JSON chunks and filters out the '[DONE]' signal to prevent 'undefined' text from appearing in the UI."

### 4. Optimization
- "The AI responses are cutting off mid-sentence. Adjust the Worker implementation to increase `max_tokens` to 2048 to allow for detailed responses."