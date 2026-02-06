import { FishingWorkflow } from "./workflow";
import { FishingMemory } from "./memory";

export interface Env {
	AI: any;
	FISHING_WORKFLOW: Workflow;
	FISHING_MEMORY: DurableObjectNamespace<FishingMemory>;
	ASSETS: { fetch: typeof fetch }; // This fixes the ASSETS error
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		// 1. Setup Memory Access
		// We use a fixed name like "user-1" for now, or you could use a session ID
		const memoryId = env.FISHING_MEMORY.idFromName("user-session-1");
		const memoryStub = env.FISHING_MEMORY.get(memoryId);

		// 2. Handle the AI Fishing Request
		if (url.pathname === "/api/fish") {
			const location = url.searchParams.get("location") || "Unknown";
			const targetFish = url.searchParams.get("target") || "any fish";

			// SAVE TO MEMORY: Store the user's target fish preference
			await memoryStub.setPreference("last_target", targetFish);

			// RETRIEVE FROM MEMORY: Get the last location they asked about
			const previousLocation = await memoryStub.getPreference("last_location");

			// Update memory with current location for next time
			await memoryStub.setPreference("last_location", location);

			// 3. TRIGGER WORKFLOW: Start the AI analysis
			const instance = await env.FISHING_WORKFLOW.create({
				params: {
					location,
					targetFish,
					context: `User previously asked about ${previousLocation || 'nowhere'}`
				}
			});

			return Response.json({
				success: true,
				message: `Guru is now analyzing conditions for ${targetFish} in ${location}.`,
				workflowId: instance.id,
				historyNote: previousLocation ? `I remember you asked about ${previousLocation} last time!` : "This is our first trip together!"
			});

		}
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}

		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

// IMPORTANT: You must export your classes so Cloudflare can find them
export { FishingWorkflow, FishingMemory };