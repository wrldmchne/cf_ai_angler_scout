import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

// Define the shape of the data coming from index.ts
type ScoutParams = {
    query: string;
    anchor: string;
};

export class FishingWorkflow extends WorkflowEntrypoint<any, ScoutParams> {
    async run(event: WorkflowEvent<ScoutParams>, step: WorkflowStep) {

        // Step 1: Tactical Logging
        // This simulates saving the session data to an external database or analytics engine
        await step.do("log-intelligence-request", async () => {
            console.log(`[WORKFLOW] Processing scout request for Anchor: ${event.payload.anchor}`);
            console.log(`[WORKFLOW] User Query: ${event.payload.query}`);

            return { status: "logged", timestamp: new Date().toISOString() };
        });

        // Step 2: Intel Enrichment
        // In a real-world app, this is where you'd fetch external Weather or Tide APIs 
        // to "enrich" the Durable Object state for the next time the user asks a question.
        const enrichment = await step.do("enrich-session-data", async () => {
            // Logic for background data fetching would go here
            return { enriched: true, version: "v1.0" };
        });

        return {
            missionId: crypto.randomUUID(),
            enrichment
        };
    }
}