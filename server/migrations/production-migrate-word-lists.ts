import { db } from "../db";
import { wordLists, wordListWords, words } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function productionMigration() {
  console.log("Starting production word list migration...");
  
  // Step 1: Check if old table exists
  const oldTableExists = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'custom_word_lists'
    );
  `);
  
  if (!oldTableExists.rows[0]?.exists) {
    console.log("Old custom_word_lists table does not exist. Migration may have already run.");
    return;
  }
  
  // Step 2: Create new tables if they don't exist (Drizzle push should handle this, but just in case)
  console.log("Ensuring new tables exist...");
  
  // Step 3: Get all custom word lists from old table
  const customLists = await db.execute(sql`SELECT * FROM custom_word_lists`);
  console.log(`Found ${customLists.rows.length} custom word lists to migrate`);
  
  // Track ID mappings for updating word_illustrations
  const idMapping = new Map<number, number>(); // old ID -> new ID
  
  for (const customList of customLists.rows) {
    const oldId = customList.id as number;
    const name = customList.name as string;
    const userId = customList.user_id as number;
    const wordsArray = customList.words as string[];
    const isPublic = customList.is_public as boolean;
    const visibility = customList.visibility as string;
    const assignImages = customList.assign_images as boolean;
    const gradeLevel = customList.grade_level as string | null;
    
    console.log(`\nMigrating list: "${name}" (old ID: ${oldId})`);
    
    // Check if already migrated
    const [existingList] = await db
      .select()
      .from(wordLists)
      .where(eq(wordLists.name, name));
    
    if (existingList) {
      console.log(`  - Already migrated to ID ${existingList.id}, recording mapping`);
      idMapping.set(oldId, existingList.id);
      continue;
    }
    
    // Create new word_lists entry
    const [newList] = await db.insert(wordLists).values({
      userId,
      name,
      isPublic,
      visibility,
      assignImages,
      gradeLevel,
    }).returning();
    
    idMapping.set(oldId, newList.id);
    console.log(`  - Created word list ID: ${newList.id}`);
    
    // Process each word
    console.log(`  - Processing ${wordsArray.length} words`);
    
    for (let position = 0; position < wordsArray.length; position++) {
      const wordText = wordsArray[position].toLowerCase().trim();
      
      // Find or create the word
      let [existingWord] = await db
        .select()
        .from(words)
        .where(eq(words.word, wordText));
      
      if (!existingWord) {
        [existingWord] = await db.insert(words).values({ word: wordText }).returning();
      }
      
      // Create junction record
      await db.insert(wordListWords).values({
        wordListId: newList.id,
        wordId: existingWord.id,
        position: position,
      }).onConflictDoNothing();
    }
    
    console.log(`  - Created ${wordsArray.length} word associations`);
  }
  
  // Step 4: Update word_illustrations to use new IDs
  console.log("\nUpdating word_illustrations foreign keys...");
  for (const [oldId, newId] of idMapping) {
    const result = await db.execute(sql`
      UPDATE word_illustrations 
      SET word_list_id = ${newId} 
      WHERE word_list_id = ${oldId}
    `);
    console.log(`  - Updated illustrations from old ID ${oldId} to new ID ${newId}`);
  }
  
  // Step 5: Drop old table
  console.log("\nDropping old custom_word_lists table...");
  await db.execute(sql`DROP TABLE IF EXISTS custom_word_lists CASCADE`);
  
  console.log("\n✅ Migration complete!");
  console.log(`Migrated ${customLists.rows.length} word lists`);
}

// Run migration
productionMigration()
  .then(() => {
    console.log("Migration finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
