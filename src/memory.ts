import { DurableObject } from "cloudflare:workers";

/**
 * Durable Object for persistent state.
 * Fulfills the "Memory or State" requirement using SQLite.
 */
export class FishingMemory extends DurableObject {
    sql: SqlStorage;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sql = ctx.storage.sql;

        // Create a simple table to store preferences
        // This runs once when the memory object is first created
        this.sql.exec(`
      CREATE TABLE IF NOT EXISTS user_prefs (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    }

    // Method to save data (e.g., "favorite_fish" -> "Bass")
    async setPreference(key: string, value: string) {
        this.sql.exec(
            "INSERT OR REPLACE INTO user_prefs (key, value) VALUES (?, ?)",
            key,
            value
        );
    }

    // Method to retrieve data
    async getPreference(key: string): Promise<string | null> {
        const cursor = this.sql.exec(
            "SELECT value FROM user_prefs WHERE key = ?",
            key
        );

        // Get the first row from the cursor
        const row = cursor.next();

        // If row is null or undefined, return null; otherwise return the value
        return row.value ? (row.value.value as string) : null;
    }
}