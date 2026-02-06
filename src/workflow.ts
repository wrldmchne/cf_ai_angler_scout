import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

// This is where the magic happens
export class FishingWorkflow extends WorkflowEntrypoint<Env, { location: string }> {
    async run(event: WorkflowEvent<{ location: string }>, step: WorkflowStep) {

        // Step 1: Define a "thinking" step
        const analysis = await step.do("analyze-fishing-conditions", async () => {
            // Calling Llama 3.3 via the AI binding
            const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                messages: [
                    { role: "system", content: "You are a professional fishing guide who uses weather data to find the best spots." },
                    { role: "user", content: `Give me a fishing report for ${event.payload.location}. Include best bait and time of day.` }
                ]
            });
            return response;
        });

        return analysis;
    }
}