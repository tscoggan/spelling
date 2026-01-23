import { db } from '../db';
import { wordIllustrations, wordLists, wordListWords, words } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { PixabayService } from './pixabay';

const pixabayServiceInstance = new PixabayService();

export interface JobItem {
  word: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  imagePath?: string;
  errorMessage?: string;
}

export interface IllustrationJob {
  id: number;
  wordListId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalWords: number;
  processedWords: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  completedAt?: Date;
  items: JobItem[];
}

const activeJobs = new Map<number, IllustrationJob>();
let nextJobId = 1;
let backfillInProgress = false;

export class IllustrationJobService {
  private pixabayService: PixabayService;

  constructor() {
    this.pixabayService = pixabayServiceInstance;
  }

  async createJob(wordListId: number): Promise<number> {
    const [wordList] = await db
      .select()
      .from(wordLists)
      .where(eq(wordLists.id, wordListId));

    if (!wordList) {
      throw new Error(`Word list ${wordListId} not found`);
    }

    // Fetch words from junction table
    const wordAssociations = await db
      .select({ wordText: words.word })
      .from(wordListWords)
      .innerJoin(words, eq(wordListWords.wordId, words.id))
      .where(eq(wordListWords.wordListId, wordListId))
      .orderBy(wordListWords.position);
    
    const wordTexts = wordAssociations.map(w => w.wordText);
    const uniqueWords = Array.from(new Set(wordTexts.map(w => w.toLowerCase())));

    const existingIllustrations = await db
      .select()
      .from(wordIllustrations)
      .where(eq(wordIllustrations.wordListId, wordListId));

    const existingWords = new Set(existingIllustrations.map(i => i.word.toLowerCase()));
    const wordsNeedingImages = uniqueWords.filter(word => !existingWords.has(word));

    if (wordsNeedingImages.length === 0) {
      console.log(`⏭️  All words in word list ${wordListId} already have illustrations`);
      const jobId = nextJobId++;
      const job: IllustrationJob = {
        id: jobId,
        wordListId,
        status: 'completed',
        totalWords: uniqueWords.length,
        processedWords: uniqueWords.length,
        successCount: 0,
        failureCount: 0,
        createdAt: new Date(),
        completedAt: new Date(),
        items: uniqueWords.map(word => ({
          word,
          status: 'skipped' as const,
          imagePath: existingIllustrations.find(i => i.word.toLowerCase() === word)?.imagePath || undefined,
        })),
      };
      activeJobs.set(jobId, job);
      return jobId;
    }

    const jobId = nextJobId++;
    const job: IllustrationJob = {
      id: jobId,
      wordListId,
      status: 'pending',
      totalWords: wordsNeedingImages.length,
      processedWords: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      items: wordsNeedingImages.map(word => ({
        word,
        status: 'pending' as const,
      })),
    };

    activeJobs.set(jobId, job);

    console.log(`✓ Created illustration job ${jobId} for word list ${wordListId} with ${wordsNeedingImages.length} words needing images`);

    this.processJobAsync(jobId);

    return jobId;
  }

  private async processJobAsync(jobId: number): Promise<void> {
    setImmediate(async () => {
      try {
        await this.processJob(jobId);
      } catch (error) {
        console.error(`Error processing illustration job ${jobId}:`, error);
        const job = activeJobs.get(jobId);
        if (job) {
          job.status = 'failed';
        }
      }
    });
  }

  async processJob(jobId: number): Promise<void> {
    const job = activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`🎨 Starting illustration job ${jobId}`);
    job.status = 'processing';

    const usedImageIds = new Set<number>();

    for (const item of job.items) {
      if (item.status !== 'pending') {
        continue;
      }

      try {
        const existingIllustration = await db
          .select()
          .from(wordIllustrations)
          .where(
            and(
              eq(wordIllustrations.word, item.word),
              eq(wordIllustrations.wordListId, job.wordListId)
            )
          );

        if (existingIllustration.length > 0) {
          console.log(`⏭️  Skipping "${item.word}" - already has illustration for this word list`);
          item.status = 'skipped';
          item.imagePath = existingIllustration[0].imagePath || undefined;
          job.processedWords++;
        } else {
          item.status = 'processing';

          const result = await this.pixabayService.searchCartoonImage(item.word, usedImageIds);

          if (result) {
            usedImageIds.add(result.imageId);
            
            await db.insert(wordIllustrations).values({
              word: item.word,
              wordListId: job.wordListId,
              imagePath: result.imagePath,
              source: 'pixabay',
            });

            item.status = 'completed';
            item.imagePath = result.imagePath;
            job.successCount++;
            job.processedWords++;
            console.log(`✅ Found and saved image for "${item.word}" in word list ${job.wordListId}`);
          } else {
            item.status = 'failed';
            item.errorMessage = 'No suitable image found';
            job.failureCount++;
            job.processedWords++;
            console.log(`❌ No image found for "${item.word}"`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        item.status = 'failed';
        item.errorMessage = error.message || 'Unknown error';
        job.failureCount++;
        job.processedWords++;
        console.error(`Error processing word "${item.word}":`, error);
      }
    }

    job.status = 'completed';
    job.completedAt = new Date();

    console.log(`🎉 Completed illustration job ${jobId}: ${job.successCount} success, ${job.failureCount} failed`);

    setTimeout(() => {
      activeJobs.delete(jobId);
      console.log(`🧹 Cleaned up completed job ${jobId} from memory`);
    }, 30 * 60 * 1000);
  }

  async getJobStatus(jobId: number): Promise<IllustrationJob | null> {
    return activeJobs.get(jobId) || null;
  }

  async createBackfillJob(): Promise<number> {
    if (backfillInProgress) {
      throw new Error('A backfill job is already in progress. Please wait for it to complete.');
    }
    
    const allWords = new Set<string>();
    
    const canonicalWords = await db.select().from(words);
    for (const wordEntry of canonicalWords) {
      allWords.add(wordEntry.word.toLowerCase());
    }
    console.log(`📖 Found ${canonicalWords.length} canonical words from words table`);
    
    // Get all word list IDs
    const allWordListsData = await db.select().from(wordLists);
    // For each list, fetch words from junction table
    for (const list of allWordListsData) {
      const wordAssociations = await db
        .select({ wordText: words.word })
        .from(wordListWords)
        .innerJoin(words, eq(wordListWords.wordId, words.id))
        .where(eq(wordListWords.wordListId, list.id));
      
      for (const wa of wordAssociations) {
        allWords.add(wa.wordText.toLowerCase());
      }
    }
    console.log(`📝 Found ${allWordListsData.length} word lists`);

    const uniqueWords = Array.from(allWords).filter(word => {
      const isTestWord = /^(word|extra|dinosau)\d*$/.test(word);
      const isTooShort = word.length < 3;
      return !isTestWord && !isTooShort;
    }).sort();

    console.log(`📚 Total ${uniqueWords.length} unique real words to backfill (filtered out test words)`);

    const jobId = nextJobId++;
    const job: IllustrationJob = {
      id: jobId,
      wordListId: 0,
      status: 'pending',
      totalWords: uniqueWords.length,
      processedWords: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      items: uniqueWords.map(word => ({
        word,
        status: 'pending' as const,
      })),
    };

    activeJobs.set(jobId, job);

    console.log(`✓ Created backfill job ${jobId} with ${uniqueWords.length} words`);

    this.processBackfillJobAsync(jobId);

    return jobId;
  }

  private async processBackfillJobAsync(jobId: number): Promise<void> {
    backfillInProgress = true;
    setImmediate(async () => {
      try {
        await this.processBackfillJob(jobId);
      } catch (error) {
        console.error(`Error processing backfill job ${jobId}:`, error);
        const job = activeJobs.get(jobId);
        if (job) {
          job.status = 'failed';
        }
      } finally {
        backfillInProgress = false;
      }
    });
  }

  private async processBackfillJob(jobId: number): Promise<void> {
    const job = activeJobs.get(jobId);
    if (!job) {
      backfillInProgress = false;
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`🎨 Starting backfill job ${jobId}`);
    job.status = 'processing';

    const usedImageIds = new Set<number>();

    for (const item of job.items) {
      if (item.status !== 'pending') {
        continue;
      }

      try {
        const existingIllustrations = await db
          .select()
          .from(wordIllustrations)
          .where(eq(wordIllustrations.word, item.word));

        if (existingIllustrations.length > 0) {
          console.log(`⏭️  Skipping "${item.word}" - already has illustration`);
          item.status = 'skipped';
          item.imagePath = existingIllustrations[0].imagePath || undefined;
          job.processedWords++;
        } else {
          item.status = 'processing';

          const result = await this.pixabayService.searchCartoonImage(item.word, usedImageIds);

          if (result) {
            usedImageIds.add(result.imageId);
            
            await db.insert(wordIllustrations).values({
              word: item.word,
              wordListId: 0,
              imagePath: result.imagePath,
              source: 'pixabay',
            });

            item.status = 'completed';
            item.imagePath = result.imagePath;
            job.successCount++;
            job.processedWords++;
            console.log(`✅ Found and saved image for "${item.word}"`);
          } else {
            item.status = 'failed';
            item.errorMessage = 'No suitable image found';
            job.failureCount++;
            job.processedWords++;
            console.log(`❌ No image found for "${item.word}"`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        item.status = 'failed';
        item.errorMessage = error.message || 'Unknown error';
        job.failureCount++;
        job.processedWords++;
        console.error(`Error processing word "${item.word}":`, error);
      }
    }

    job.status = 'completed';
    job.completedAt = new Date();

    console.log(`🎉 Completed backfill job ${jobId}: ${job.successCount} success, ${job.failureCount} failed`);

    setTimeout(() => {
      activeJobs.delete(jobId);
      console.log(`🧹 Cleaned up completed backfill job ${jobId} from memory`);
    }, 30 * 60 * 1000);
  }
}
