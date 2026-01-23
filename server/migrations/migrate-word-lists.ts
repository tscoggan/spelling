import { db } from "../db";
import { customWordLists, wordLists, wordListWords, words } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function migrateWordLists() {
  console.log("Starting word list migration...");
  
  // Get all custom word lists
  const customLists = await db.select().from(customWordLists);
  console.log(`Found ${customLists.length} custom word lists to migrate`);
  
  for (const customList of customLists) {
    console.log(`\nMigrating list: "${customList.name}" (ID: ${customList.id})`);
    
    // Check if already migrated (by checking if a word_lists entry with same user_id and name exists)
    const [existingList] = await db
      .select()
      .from(wordLists)
      .where(eq(wordLists.name, customList.name));
    
    if (existingList) {
      console.log(`  - Already migrated, skipping`);
      continue;
    }
    
    // Create new word_lists entry
    const [newList] = await db.insert(wordLists).values({
      userId: customList.userId,
      name: customList.name,
      isPublic: customList.isPublic,
      visibility: customList.visibility,
      assignImages: customList.assignImages,
      gradeLevel: customList.gradeLevel,
    }).returning();
    
    console.log(`  - Created word list ID: ${newList.id}`);
    
    // Process each word in the list
    const wordTexts = customList.words;
    console.log(`  - Processing ${wordTexts.length} words`);
    
    for (let position = 0; position < wordTexts.length; position++) {
      const wordText = wordTexts[position].toLowerCase().trim();
      
      // Find or create the word in the words table
      let [existingWord] = await db
        .select()
        .from(words)
        .where(eq(words.word, wordText));
      
      if (!existingWord) {
        // Create the word
        [existingWord] = await db.insert(words).values({
          word: wordText,
        }).returning();
        console.log(`    - Created new word: "${wordText}" (ID: ${existingWord.id})`);
      }
      
      // Create junction record
      await db.insert(wordListWords).values({
        wordListId: newList.id,
        wordId: existingWord.id,
        position: position,
      }).onConflictDoNothing();
    }
    
    console.log(`  - Migration complete for "${customList.name}"`);
  }
  
  console.log("\n=== Migration Summary ===");
  const [listCount] = await db.select({ count: sql<number>`count(*)` }).from(wordLists);
  const [wordCount] = await db.select({ count: sql<number>`count(*)` }).from(wordListWords);
  console.log(`Total word lists: ${listCount.count}`);
  console.log(`Total word-list associations: ${wordCount.count}`);
  console.log("Migration complete!");
}

// Run the migration
migrateWordLists()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
