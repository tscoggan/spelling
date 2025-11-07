import { db } from '../db';
import { illustrationJobs, illustrationJobItems, wordIllustrations, customWordLists } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { PixabayService } from './pixabay';

const pixabayServiceInstance = new PixabayService();

export class IllustrationJobService {
  private pixabayService: PixabayService;

  constructor() {
    this.pixabayService = pixabayServiceInstance;
  }

  async createJob(wordListId: number): Promise<number> {
    const [wordList] = await db
      .select()
      .from(customWordLists)
      .where(eq(customWordLists.id, wordListId));

    if (!wordList) {
      throw new Error(`Word list ${wordListId} not found`);
    }

    const uniqueWords = Array.from(new Set(wordList.words.map(w => w.toLowerCase())));

    const [job] = await db
      .insert(illustrationJobs)
      .values({
        wordListId,
        status: 'pending',
        totalWords: uniqueWords.length,
        processedWords: 0,
        successCount: 0,
        failureCount: 0,
      })
      .returning();

    for (const word of uniqueWords) {
      await db.insert(illustrationJobItems).values({
        jobId: job.id,
        word: word.toLowerCase(),
        status: 'pending',
      });
    }

    console.log(`✓ Created illustration job ${job.id} for word list ${wordListId} with ${uniqueWords.length} words`);

    this.processJobAsync(job.id);

    return job.id;
  }

  private async processJobAsync(jobId: number): Promise<void> {
    setImmediate(async () => {
      try {
        await this.processJob(jobId);
      } catch (error) {
        console.error(`Error processing illustration job ${jobId}:`, error);
      }
    });
  }

  async processJob(jobId: number): Promise<void> {
    console.log(`🎨 Starting illustration job ${jobId}`);

    await db
      .update(illustrationJobs)
      .set({ status: 'processing' })
      .where(eq(illustrationJobs.id, jobId));

    const items = await db
      .select()
      .from(illustrationJobItems)
      .where(eq(illustrationJobItems.jobId, jobId));

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const usedImageIds = new Set<number>();

    for (const item of items) {
      try {
        const existingIllustration = await db
          .select()
          .from(wordIllustrations)
          .where(eq(wordIllustrations.word, item.word));

        if (existingIllustration.length > 0) {
          console.log(`⏭️  Skipping "${item.word}" - already has illustration`);
          await db
            .update(illustrationJobItems)
            .set({
              status: 'skipped',
              imagePath: existingIllustration[0].imagePath,
              completedAt: new Date(),
            })
            .where(eq(illustrationJobItems.id, item.id));
          
          skippedCount++;
        } else {
          await db
            .update(illustrationJobItems)
            .set({ status: 'processing' })
            .where(eq(illustrationJobItems.id, item.id));

          const result = await this.pixabayService.searchCartoonImage(item.word, usedImageIds);

          if (result) {
            usedImageIds.add(result.imageId);
            
            await db.insert(wordIllustrations).values({
              word: item.word,
              imagePath: result.imagePath,
              source: 'pixabay',
            });

            await db
              .update(illustrationJobItems)
              .set({
                status: 'completed',
                imagePath: result.imagePath,
                completedAt: new Date(),
              })
              .where(eq(illustrationJobItems.id, item.id));

            successCount++;
            console.log(`✅ Found and saved image for "${item.word}"`);
          } else {
            await db
              .update(illustrationJobItems)
              .set({
                status: 'failed',
                errorMessage: 'No suitable image found',
                completedAt: new Date(),
              })
              .where(eq(illustrationJobItems.id, item.id));

            failureCount++;
            console.log(`❌ No image found for "${item.word}"`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        failureCount++;
        console.error(`Error processing word "${item.word}":`, error);
        
        await db
          .update(illustrationJobItems)
          .set({
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(illustrationJobItems.id, item.id));
      }

      await db
        .update(illustrationJobs)
        .set({
          processedWords: successCount + failureCount + skippedCount,
          successCount,
          failureCount,
        })
        .where(eq(illustrationJobs.id, jobId));
    }

    await db
      .update(illustrationJobs)
      .set({
        status: 'completed',
        processedWords: items.length,
        successCount,
        failureCount,
        completedAt: new Date(),
      })
      .where(eq(illustrationJobs.id, jobId));

    console.log(`🎉 Completed illustration job ${jobId}: ${successCount} success, ${failureCount} failed, ${skippedCount} skipped`);
  }

  async getJobStatus(jobId: number) {
    const [job] = await db
      .select()
      .from(illustrationJobs)
      .where(eq(illustrationJobs.id, jobId));

    if (!job) {
      return null;
    }

    const items = await db
      .select()
      .from(illustrationJobItems)
      .where(eq(illustrationJobItems.jobId, jobId));

    return {
      ...job,
      items,
    };
  }
}
