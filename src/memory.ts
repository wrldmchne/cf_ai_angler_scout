import { DurableObject } from "cloudflare:workers";

export class FishingMemory extends DurableObject {
    private anchor: string = "";

    constructor(ctx: DurableObjectState, env: any) {
        super(ctx, env);
        this.ctx.blockConcurrencyWhile(async () => {
            this.anchor = await this.ctx.storage.get<string>("anchor") || "";
        });
    }

    async fetch(request: Request) {
        const url = new URL(request.url);
        if (url.pathname === "/set") {
            const { location } = await request.json() as { location: string };
            this.anchor = location;
            await this.ctx.storage.put("anchor", location);
            return Response.json({ success: true });
        }
        if (url.pathname === "/get") {
            return Response.json({ anchor: this.anchor });
        }
        return new Response("Not Found", { status: 404 });
    }
}