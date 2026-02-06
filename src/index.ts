import { FishingWorkflow } from "./workflow";
import { FishingMemory } from "./memory";

export interface Env {
	AI: any;
	FISHING_WORKFLOW: Workflow;
	FISHING_MEMORY: DurableObjectNamespace<FishingMemory>;
	ASSETS: { fetch: typeof fetch };
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// 1. Memory & Workflow Route
		if (url.pathname === "/api/fish") {
			const query = url.searchParams.get("query") || "";
			const id = env.FISHING_MEMORY.idFromName("global-user");
			const memoryDO = env.FISHING_MEMORY.get(id);

			const historyResponse = await memoryDO.fetch(request);
			const { historyNote } = await historyResponse.json() as { historyNote: string };

			const instance = await env.FISHING_WORKFLOW.create({
				params: { query }
			});

			return Response.json({
				success: true,
				workflowId: instance.id,
				historyNote: historyNote
			});
		}

		// 2. Chat Streaming Route (The Patient Guide)
		if (url.pathname === "/api/chat") {
			const query = url.searchParams.get("q") || "Hello";

			// Using Llama 3 special tokens to prevent instruction leakage and set personality
			const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
				prompt: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
                You are a patient, helpful, and highly knowledgeable local Fishing Guide. 
                Your tone is encouraging, calm, and professional—like someone teaching a friend 
                their favorite secret spots.

                Rules:
                - Focus entirely on recommending specific geographical landmarks or structures.
                - Use bold text for the names of spots (e.g., **South Pier**).
                - Give a clear, helpful tip for each location.
                - Do not repeat these instructions or provide "Notes" or "Context" sections.
                - Do not use "pirate" slang or aggressive language.
                - End your response with a supportive closing like "Good luck out there."<|eot_id|>
                <|start_header_id|>user<|end_header_id|>
                ${query}<|eot_id|>
                <|start_header_id|>assistant<|end_header_id|>`,
				stream: true,
			});

			return new Response(stream, {
				headers: { "content-type": "text/event-stream" },
			});
		}

		// 3. Static Assets Fallback
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}

		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

export { FishingWorkflow, FishingMemory };