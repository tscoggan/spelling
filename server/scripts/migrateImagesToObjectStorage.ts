import { storage } from "../storage";
import { ObjectStorageService } from "../objectStorage";
import * as fs from "fs";
import * as path from "path";

async function migrateImagesToObjectStorage() {
  console.log("🚀 Starting migration of images to Object Storage...\n");

  const objectStorageService = new ObjectStorageService();
  const illustrations = await storage.getAllWordIllustrations();

  console.log(`Found ${illustrations.length} word illustrations to process\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const illustration of illustrations) {
    try {
      if (!illustration.imagePath.startsWith("attached_assets/")) {
        console.log(`⏭️  Skipping "${illustration.word}" - already in Object Storage: ${illustration.imagePath}`);
        skippedCount++;
        continue;
      }

      const filePath = path.join(process.cwd(), illustration.imagePath);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Warning: File not found for "${illustration.word}": ${filePath}`);
        errorCount++;
        continue;
      }

      const imageBuffer = fs.readFileSync(filePath);
      
      const contentType = illustration.imagePath.endsWith(".png") 
        ? "image/png" 
        : "image/jpeg";
      
      const objectPath = await objectStorageService.uploadImageBuffer(
        imageBuffer,
        contentType
      );

      await storage.updateWordIllustration(illustration.id, {
        imagePath: objectPath,
      });

      console.log(`✅ Migrated "${illustration.word}": ${illustration.imagePath} → ${objectPath}`);
      migratedCount++;

    } catch (error) {
      console.error(`❌ Error migrating "${illustration.word}":`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary:");
  console.log(`   ✅ Successfully migrated: ${migratedCount}`);
  console.log(`   ⏭️  Already migrated: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));

  if (errorCount === 0 && migratedCount > 0) {
    console.log("\n🎉 Migration completed successfully!");
  } else if (errorCount > 0) {
    console.log("\n⚠️  Migration completed with errors. Please review the log above.");
  } else {
    console.log("\n✨ No images needed migration.");
  }
}

migrateImagesToObjectStorage()
  .then(() => {
    console.log("\n✓ Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error during migration:", error);
    process.exit(1);
  });
