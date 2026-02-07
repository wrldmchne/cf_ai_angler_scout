import { FishingMemory } from "./memory";
import { FishingWorkflow } from "./workflow";

export interface Env {
	AI: any;
	FISHING_MEMORY: DurableObjectNamespace<FishingMemory>;
	FISHING_WORKFLOW: Workflow;
	ASSETS: { fetch: typeof fetch };
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/chat" && request.method === "POST") {
			const { messages } = await request.json() as { messages: any[] };
			const latestQuery = messages[messages.length - 1].content;

			const id = env.FISHING_MEMORY.idFromName("global-session");
			const memoryDO = env.FISHING_MEMORY.get(id);
			const stateRes = await memoryDO.fetch("http://do/get");
			const { anchor } = await stateRes.json() as { anchor: string };

			// Check if this is a fresh location scout or a follow-up
			const isInitialScout = !latestQuery.includes('?') && latestQuery.length < 50;

			await env.FISHING_WORKFLOW.create({ params: { query: latestQuery, anchor } });

			const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
				messages: [
					{
						role: "system",
						content: `You are Angler Scout AI. 
            LOCATION: ${anchor || "Pending"}.

            MODE 1: Initial Scout (User provides location)
            - Provide a "Strategic Overview". 
            - Mention 2-3 popular spots, 2 key species, and the general "vibe" of the area.
            - DO NOT go into specific lure colors, line weights, or exact timings yet. Keep them curious.
            - End with: "Awaiting your follow-up questions."

            MODE 2: Tactical Drill-down (User asks a question)
            - Provide "Tactical Intelligence".
            - Give high-specificity data: exact **lure types**, **depths**, **retrieval speeds**, and **tackle specs**.
            
            STRICT RULES: No tourism, no hotels, fishing only.`
					},
					...messages
				],
				stream: true,
				max_tokens: 2048

			});

			return new Response(stream, { headers: { "content-type": "text/event-stream" } });
		}

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