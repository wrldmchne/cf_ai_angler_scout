import { DurableObject } from "cloudflare:workers";

export class FishingMemory extends DurableObject {
    private sql: any;

    constructor(ctx: DurableObjectState, env: any) {
        super(ctx, env);
        this.sql = ctx.storage.sql;

        // Create a table to store the last query for a user/session
        this.sql.exec(`
      CREATE TABLE IF NOT EXISTS session_memory (
        id TEXT PRIMARY KEY,
        last_query TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const query = url.searchParams.get("query") || "";
        const sessionId = "global-user"; // Simplified for the assignment

        // 1. Check if we remember this user
        const cursor = this.sql.exec("SELECT last_query FROM session_memory WHERE id = ?", sessionId);
        const row = cursor.next();
        const previousQuery = row.value ? row.value.last_query : null;

        // 2. Update the memory with the NEW query
        this.sql.exec(
            "INSERT OR REPLACE INTO session_memory (id, last_query, timestamp) VALUES (?, ?, CURRENT_TIMESTAMP)",
            sessionId,
            query
        );

        // 3. Craft the "History Note"
        let historyNote = "This is our first trip together!";
        if (previousQuery) {
            historyNote = `I remember you were asking about "${previousQuery}" earlier!`;
        }

        return Response.json({ historyNote });
    }
}