import { DurableObject } from "cloudflare:workers";

export class FishingMemory extends DurableObject {
    private anchor: string = "";

    constructor(ctx: DurableObjectState, env: any) {
        super(ctx, env);

        // Restore state from permanent storage on initialization
        this.ctx.blockConcurrencyWhile(async () => {
            this.anchor = await this.ctx.storage.get<string>("anchor") || "";
        });
    }

    async fetch(request: Request) {
        const url = new URL(request.url);

        // Update the Geographic Anchor
        if (url.pathname === "/set" && request.method === "POST") {
            const { location } = await request.json() as { location: string };
            this.anchor = location;
            await this.ctx.storage.put("anchor", location);
            return Response.json({ success: true, anchor: this.anchor });
        }

        // Retrieve the Geographic Anchor
        if (url.pathname === "/get") {
            return Response.json({ anchor: this.anchor });
        }

        return new Response("Not Found", { status: 404 });
    }
}