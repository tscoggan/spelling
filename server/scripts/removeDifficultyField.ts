import { db } from "../db";
import { sql } from "drizzle-orm";

async function removeDifficultyField() {
  console.log("Starting migration to remove difficulty field...");

  try {
    // Drop difficulty column from words table
    console.log("Dropping difficulty column from words table...");
    await db.execute(sql`ALTER TABLE words DROP COLUMN IF EXISTS difficulty`);
    console.log("✓ Dropped difficulty column from words table");

    // Drop difficulty column from game_sessions table
    console.log("Dropping difficulty column from game_sessions table...");
    await db.execute(sql`ALTER TABLE game_sessions DROP COLUMN IF EXISTS difficulty`);
    console.log("✓ Dropped difficulty column from game_sessions table");

    // Drop difficulty column from leaderboard_scores table
    console.log("Dropping difficulty column from leaderboard_scores table...");
    await db.execute(sql`ALTER TABLE leaderboard_scores DROP COLUMN IF EXISTS difficulty`);
    console.log("✓ Dropped difficulty column from leaderboard_scores table");

    // Drop difficulty column from custom_word_lists table
    console.log("Dropping difficulty column from custom_word_lists table...");
    await db.execute(sql`ALTER TABLE custom_word_lists DROP COLUMN IF EXISTS difficulty`);
    console.log("✓ Dropped difficulty column from custom_word_lists table");

    console.log("\nMigration completed successfully!");
    console.log("All difficulty columns have been removed from the database.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

removeDifficultyField();
