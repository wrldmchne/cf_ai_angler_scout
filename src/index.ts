import { FishingMemory } from "./memory";
import { FishingWorkflow } from "./workflow";

export interface Env {
	AI: any;
	VECTOR_INDEX: VectorizeIndex;
	FISHING_MEMORY: DurableObjectNamespace<FishingMemory>;
	FISHING_WORKFLOW: Workflow;
	ASSETS: { fetch: typeof fetch };
	ADMIN_SECRET: string;
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		// --- SEEDING ENDPOINT ---
		if (url.pathname === "/api/seed" && request.method === "POST") {
			const authHeader = request.headers.get("Authorization");
			if (authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
				return new Response("Unauthorized", { status: 401 });
			}

			const data = await request.json() as any[];
			for (const entry of data) {
				// FIXED: Using 'bge-base-en-v1.5' for 768 dimensions to match your index
				const { data: embedding } = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
					text: [entry.text]
				});

				await env.VECTOR_INDEX.upsert([{
					id: entry.id || crypto.randomUUID(),
					values: embedding[0],
					metadata: { text: entry.text, location: entry.location }
				}]);
			}
			return new Response("Ledger Seeded Successfully", { status: 200 });
		}

		// --- CHAT ENDPOINT ---
		if (url.pathname === "/api/chat" && request.method === "POST") {
			const { messages } = await request.json() as { messages: any[] };
			const latestQuery = messages[messages.length - 1].content;

			const id = env.FISHING_MEMORY.idFromName("global-session");
			const memoryDO = env.FISHING_MEMORY.get(id);
			const stateRes = await memoryDO.fetch("http://do/get");
			const { anchor } = await stateRes.json() as { anchor: string };

			// FIXED: Matching the embedding model here as well (768 dims)
			const { data: queryEmbedding } = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
				text: [latestQuery]
			});

			const vectorMatches = await env.VECTOR_INDEX.query(queryEmbedding[0], {
				topK: 3,
				returnMetadata: "all"
			});

			const ledgerIntel = vectorMatches.matches
				.map(m => m.metadata?.text)
				.filter(Boolean)
				.join("\n---\n");

			await env.FISHING_WORKFLOW.create({ params: { query: latestQuery, anchor } });

			const contextHeader = ledgerIntel
				? `### VERIFIED PROPRIETARY INTEL (Priority): \n${ledgerIntel}`
				: `### NOTE: No specific proprietary data found. Defaulting to general tactical knowledge.`;

			const systemPrompt = `You are Angler Scout AI, a tactical fishing guide. 
            CURRENT LOCATION ANCHOR: ${anchor || "General Waters"}.

            ${contextHeader}

            INSTRUCTIONS:
            1. If "VERIFIED PROPRIETARY INTEL" is present, prioritize it for spots and gear.
            2. If missing, provide high-quality tactical advice based on your general training.
            3. Maintain a "Nautical Blue" personality: professional, concise, and focused on discovery.
            4. STRICT RULES: Fishing only. No hotels or tourism.`;

			const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
				messages: [
					{ role: "system", content: systemPrompt },
					...messages
				],
				stream: true,
				max_tokens: 2048
			});

			return new Response(stream, { headers: { "content-type": "text/event-stream" } });
		}

		// --- ANCHOR ENDPOINT ---
		if (url.pathname === "/api/anchor") {
			const loc = url.searchParams.get("loc");
			const id = env.FISHING_MEMORY.idFromName("global-session");
			await env.FISHING_MEMORY.get(id).fetch("http://do/set", {
				method: "POST",
				body: JSON.stringify({ location: loc })
			});
			return Response.json({ success: true });
		}

		return env.ASSETS.fetch(request);
	}
} satisfies ExportedHandler<Env>;

export { FishingMemory, FishingWorkflow };