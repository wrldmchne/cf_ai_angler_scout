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

		// AI Chat Endpoint
		if (url.pathname === "/api/chat" && request.method === "POST") {
			const { messages } = await request.json() as { messages: any[] };
			const latestQuery = messages[messages.length - 1].content;

			// 1. Memory retrieval
			const id = env.FISHING_MEMORY.idFromName("global-session");
			const memoryDO = env.FISHING_MEMORY.get(id);
			const stateRes = await memoryDO.fetch("http://do/get");
			const { anchor } = await stateRes.json() as { anchor: string };

			// 2. Background Workflow trigger
			await env.FISHING_WORKFLOW.create({
				params: { query: latestQuery, activeAnchor: anchor }
			});

			// 3. AI Stream execution
			const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
				messages: [
					{
						role: "system",
						content: `You are the Angler Scout AI. 
            GEOGRAPHIC ANCHOR: ${anchor || "None"}.
            Use the Anchor for vague follow-ups. Update if a new location is named.
            FORMAT: New spots use "## 📍 [LOCATION]". Updates use "### 🧠 TACTICAL UPDATE".`
					},
					...messages
				],
				stream: true,
			});

			return new Response(stream, { headers: { "content-type": "text/event-stream" } });
		}

		// Anchor Update Endpoint
		if (url.pathname === "/api/anchor") {
			const loc = url.searchParams.get("loc");
			const id = env.FISHING_MEMORY.idFromName("global-session");
			await env.FISHING_MEMORY.get(id).fetch("http://do/set", {
				method: "POST",
				body: JSON.stringify({ location: loc })
			});
			return Response.json({ success: true });
		}

		return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
	}
} satisfies ExportedHandler<Env>;

export { FishingMemory, FishingWorkflow };