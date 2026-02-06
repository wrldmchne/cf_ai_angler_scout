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
			// Inside /api/chat
			const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
				prompt: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
    			You are a professional local Fishing Guide. Use your internal knowledge but PRIORITIZE these real-world locations if the user asks about these cities:

    			AUSTIN, TX:
    			- **Lady Bird Lake**: Red Bud Isle (best for kayaks), Congress Ave Bridge.
    			- **Lake Travis**: Mansfield Dam Park, Pace Bend (deep water), Graveyard Point.
    			- **Barton Creek**: Twin Falls area for wading.

    			MIAMI & FLORIDA KEYS:
    			- **Haulover Inlet**: Great for current fishing.
    			- **Black Point Marina**: Excellent for snook and tarpon.
    			- **Channel 5 Bridge**: Iconic Keys bridge fishing.
    			- **Islamorada**: Check the flats near **Robbie's Marina**.

    			SEATTLE & PUGET SOUND:
    			- **Elliott Bay**: Pier 91 or the **Seacrest Park Pier** for salmon.
    			- **Lake Washington**: **Seward Park** for smallmouth bass and perch.
   				- **Green Lake**: Great for stocked trout from the fishing piers.

    			MONTAUK & NEW YORK:
    			- **Montauk Point State Park**: The "Surfcasting Capital." Focus on the area beneath the **Lighthouse**.
   				- **Camp Hero State Park**: Rugged surf fishing for striped bass.
    			- **Central Park (NYC)**: **Harlem Meer** for catch-and-release bass.

    			SAN FRANCISCO / BAY AREA:
    			- **Pacific Pier**: One of the best for Dungeness crab and perch.
    			- **Ocean Beach**: Surfcasting for striped bass.
    			- **Berkeley Pier**: Reliable for local bay species.

    			CHICAGO / LAKE MICHIGAN:
    			- **Montrose Harbor**: Famous for the "Magic Hedge" area and salmon runs.
    			- **Navy Pier**: Great for perch fishing along the northern walls.
    			- **Burnham Harbor**: Deep water access for trout and salmon.

    			Rules:
    			- If the user asks about a city not listed, provide the best REAL landmarks you know.
    			- NEVER invent a landmark name (No "South Pier" unless it actually exists).
    			- Use bold text for the names of spots.
    			- Keep the tone patient and helpful.
   				- End with "Good luck out there."<|eot_id|>
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