import { db } from "../server/db";
import { wordIllustrations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function addWordIllustration(word: string, imagePath: string) {
  try {
    const [existingIllustration] = await db
      .select()
      .from(wordIllustrations)
      .where(eq(wordIllustrations.word, word.toLowerCase()));
    
    if (existingIllustration) {
      console.log(`✓ Illustration for "${word}" already exists at: ${existingIllustration.imagePath}`);
      return existingIllustration;
    }
    
    const [newIllustration] = await db
      .insert(wordIllustrations)
      .values({
        word: word.toLowerCase(),
        imagePath: imagePath,
      })
      .returning();
    
    console.log(`✓ Added illustration for "${word}" at: ${imagePath}`);
    return newIllustration;
  } catch (error) {
    console.error(`✗ Error adding illustration for "${word}":`, error);
    throw error;
  }
}

async function listWordsNeedingIllustrations() {
  try {
    const illustrations = await db.select().from(wordIllustrations);
    console.log(`\nCurrent word illustrations in database: ${illustrations.length}`);
    console.log(illustrations.map(ill => `  - ${ill.word}`).join('\n'));
    
    console.log('\nTo add a new illustration:');
    console.log('1. Use stock_image_tool to download a cartoon image for the word');
    console.log('2. Note the file path (e.g., attached_assets/generated_images/...)');
    console.log('3. Run: node scripts/add-word-illustration.ts <word> <path>');
  } catch (error) {
    console.error('Error listing illustrations:', error);
  }
}

const args = process.argv.slice(2);

if (args.length === 0) {
  listWordsNeedingIllustrations().then(() => process.exit(0));
} else if (args.length === 2) {
  const [word, imagePath] = args;
  addWordIllustration(word, imagePath).then(() => process.exit(0));
} else {
  console.log('Usage:');
  console.log('  List illustrations: node scripts/add-word-illustration.ts');
  console.log('  Add illustration:   node scripts/add-word-illustration.ts <word> <path>');
  process.exit(1);
}
