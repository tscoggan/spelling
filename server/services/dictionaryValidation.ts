import fetch from 'node-fetch';
import type { IStorage } from '../storage';

interface ValidationResult {
  valid: string[];
  invalid: string[];
  skipped: string[];
}

interface WordMetadata {
  definition?: string;
  example?: string;
  origin?: string;
  partOfSpeech?: string;
}

interface CacheEntry {
  isValid: boolean;
  timestamp: number;
}

// In-memory cache with 24h TTL
const validationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const API_TIMEOUT = 5000; // 5 seconds per word
const MAX_CONCURRENT = 5; // Maximum concurrent API requests

// Merriam-Webster API keys from environment
const MW_LEARNERS_KEY = process.env.MERRIAM_WEBSTER_LEARNERS_API_KEY;
const MW_COLLEGIATE_KEY = process.env.MERRIAM_WEBSTER_COLLEGIATE_API_KEY;

// Normalize word for caching and lookup
function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

// Clear expired cache entries
function cleanCache() {
  const now = Date.now();
  const entries = Array.from(validationCache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL) {
      validationCache.delete(key);
    }
  }
}

// Strip Merriam-Webster formatting codes from text
function stripFormatting(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\{bc\}/g, '')           // bold colon
    .replace(/\{it\}/g, '')           // italic start
    .replace(/\{\/it\}/g, '')         // italic end
    .replace(/\{b\}/g, '')            // bold start
    .replace(/\{\/b\}/g, '')          // bold end
    .replace(/\{sup\}.*?\{\/sup\}/g, '') // superscript
    .replace(/\{inf\}.*?\{\/inf\}/g, '') // inferior
    .replace(/\{dx\}.*?\{\/dx\}/g, '') // cross references
    .replace(/\{dxt\|.*?\}/g, '')     // cross reference text
    .replace(/\{sx\|.*?\}/g, '')      // synonym cross reference
    .replace(/\{ma\}/g, '')           // math
    .replace(/\{\/ma\}/g, '')
    .replace(/\{ldquo\}/g, '"')       // left double quote
    .replace(/\{rdquo\}/g, '"')       // right double quote
    .replace(/\{phrase\}/g, '')       // phrase start
    .replace(/\{\/phrase\}/g, '')     // phrase end
    .trim();
}

// Extract examples from definition text (dt) array
function extractExamples(dt: any[]): string[] {
  const examples: string[] = [];
  
  for (const item of dt) {
    if (Array.isArray(item) && item[0] === 'vis') {
      // vis = verbal illustrations (examples)
      const visArray = item[1];
      if (Array.isArray(visArray)) {
        for (const vis of visArray) {
          if (vis && vis.t) {
            const example = stripFormatting(vis.t);
            if (example.length > 0) {
              examples.push(example);
            }
          }
        }
      }
    }
  }
  
  return examples;
}

// Extract definition text from dt array
function extractDefinitionText(dt: any[]): string {
  for (const item of dt) {
    if (Array.isArray(item) && item[0] === 'text') {
      const text = stripFormatting(item[1]);
      if (text.length > 0) {
        return text;
      }
    }
  }
  return '';
}

// Parse Merriam-Webster Learner's Dictionary response
function parseLearnerResponse(data: any): WordMetadata {
  const metadata: WordMetadata = {};
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return metadata;
  }
  
  // Collect ALL parts of speech from all entries
  const partsOfSpeechSet = new Set<string>();
  const definitionsArray: string[] = [];
  
  for (const entry of data) {
    // Check if we got string suggestions instead of actual entry
    if (typeof entry === 'string') {
      continue;
    }
    
    // Part of speech (functional label)
    if (entry.fl) {
      partsOfSpeechSet.add(entry.fl.toLowerCase());
    }
    
    // Short definitions (collect ALL)
    if (entry.shortdef && Array.isArray(entry.shortdef)) {
      for (const def of entry.shortdef) {
        const cleaned = stripFormatting(def);
        if (cleaned.length > 0) {
          definitionsArray.push(cleaned);
        }
      }
    }
    
    // Extract example from detailed definitions (only first one)
    if (!metadata.example && entry.def && Array.isArray(entry.def)) {
      for (const def of entry.def) {
        if (def.sseq && Array.isArray(def.sseq)) {
          for (const sseq of def.sseq) {
            if (Array.isArray(sseq)) {
              for (const sense of sseq) {
                if (Array.isArray(sense) && sense[0] === 'sense' && sense[1]?.dt) {
                  const examples = extractExamples(sense[1].dt);
                  if (examples.length > 0 && !metadata.example) {
                    metadata.example = examples[0];
                    break;
                  }
                }
              }
            }
            if (metadata.example) break;
          }
        }
        if (metadata.example) break;
      }
    }
  }
  
  // Join all parts of speech with "or"
  if (partsOfSpeechSet.size > 0) {
    metadata.partOfSpeech = Array.from(partsOfSpeechSet).join(' or ');
  }
  
  // Join all definitions with pause separator for TTS
  if (definitionsArray.length > 0) {
    metadata.definition = definitionsArray.join('. ... ');
  }
  
  return metadata;
}

// Parse Merriam-Webster Collegiate Dictionary response
function parseCollegiateResponse(data: any): WordMetadata {
  const metadata: WordMetadata = {};
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return metadata;
  }
  
  // Collect ALL parts of speech from all entries
  const partsOfSpeechSet = new Set<string>();
  const definitionsArray: string[] = [];
  
  for (const entry of data) {
    // Check if we got string suggestions instead of actual entry
    if (typeof entry === 'string') {
      continue;
    }
    
    // Part of speech (functional label)
    if (entry.fl) {
      partsOfSpeechSet.add(entry.fl.toLowerCase());
    }
    
    // Short definitions (collect ALL)
    if (entry.shortdef && Array.isArray(entry.shortdef)) {
      for (const def of entry.shortdef) {
        const cleaned = stripFormatting(def);
        if (cleaned.length > 0) {
          definitionsArray.push(cleaned);
        }
      }
    }
    
    // Etymology (word origin) - unique to Collegiate (only from first entry)
    if (!metadata.origin && entry.et && Array.isArray(entry.et)) {
      for (const et of entry.et) {
        if (Array.isArray(et) && et[0] === 'text') {
          metadata.origin = stripFormatting(et[1]);
          break;
        }
      }
    }
    
    // Extract example from detailed definitions (only first one)
    if (!metadata.example && entry.def && Array.isArray(entry.def)) {
      for (const def of entry.def) {
        if (def.sseq && Array.isArray(def.sseq)) {
          for (const sseq of def.sseq) {
            if (Array.isArray(sseq)) {
              for (const sense of sseq) {
                if (Array.isArray(sense) && sense[0] === 'sense' && sense[1]?.dt) {
                  const examples = extractExamples(sense[1].dt);
                  if (examples.length > 0 && !metadata.example) {
                    metadata.example = examples[0];
                    break;
                  }
                }
              }
            }
            if (metadata.example) break;
          }
        }
        if (metadata.example) break;
      }
    }
  }
  
  // Join all parts of speech with "or"
  if (partsOfSpeechSet.size > 0) {
    metadata.partOfSpeech = Array.from(partsOfSpeechSet).join(' or ');
  }
  
  // Join all definitions with pause separator for TTS
  if (definitionsArray.length > 0) {
    metadata.definition = definitionsArray.join('. ... ');
  }
  
  return metadata;
}

// Check Merriam-Webster Learner's Dictionary (PRIMARY source)
async function checkMerriamWebsterLearners(word: string): Promise<{ valid: boolean; skipped: boolean; metadata?: WordMetadata }> {
  if (!MW_LEARNERS_KEY) {
    console.error('Merriam-Webster Learner\'s API key not configured');
    return { valid: false, skipped: true };
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/learners/json/${encodeURIComponent(word)}?key=${MW_LEARNERS_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    
    // Handle non-2xx responses
    if (!response.ok) {
      // 404 = word not found (invalid)
      // 401/403 = auth error (skipped)
      // 429 = rate limit (skipped)
      // 500+ = server error (skipped)
      if (response.status === 404) {
        return { valid: false, skipped: false };
      }
      // All other errors (auth, rate limit, server errors) = skipped
      return { valid: false, skipped: true };
    }
    
    const data: any = await response.json();
    
    // Check if we got actual entry or just suggestions
    if (!Array.isArray(data) || data.length === 0 || typeof data[0] === 'string') {
      return { valid: false, skipped: false };
    }
    
    const metadata = parseLearnerResponse(data);
    
    // Word is valid if we got at least a definition
    const valid = !!metadata.definition;
    
    return { valid, skipped: false, metadata };
  } catch (error) {
    // Timeout or network error - mark as skipped
    return { valid: false, skipped: true };
  }
}

// Check Merriam-Webster Collegiate Dictionary (FALLBACK source)
async function checkMerriamWebsterCollegiate(word: string): Promise<{ valid: boolean; skipped: boolean; metadata?: WordMetadata }> {
  if (!MW_COLLEGIATE_KEY) {
    console.error('Merriam-Webster Collegiate API key not configured');
    return { valid: false, skipped: true };
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${MW_COLLEGIATE_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    
    // Handle non-2xx responses
    if (!response.ok) {
      // 404 = word not found (invalid)
      // 401/403 = auth error (skipped)
      // 429 = rate limit (skipped)
      // 500+ = server error (skipped)
      if (response.status === 404) {
        return { valid: false, skipped: false };
      }
      // All other errors (auth, rate limit, server errors) = skipped
      return { valid: false, skipped: true };
    }
    
    const data: any = await response.json();
    
    // Check if we got actual entry or just suggestions
    if (!Array.isArray(data) || data.length === 0 || typeof data[0] === 'string') {
      return { valid: false, skipped: false };
    }
    
    const metadata = parseCollegiateResponse(data);
    
    // Word is valid if we got at least a definition
    const valid = !!metadata.definition;
    
    return { valid, skipped: false, metadata };
  } catch (error) {
    // Timeout or network error - mark as skipped
    return { valid: false, skipped: true };
  }
}

// Validate a single word using Merriam-Webster hierarchy (Learner's → Collegiate)
async function validateSingleWord(word: string, difficulty: string, storage?: IStorage): Promise<{ word: string; isValid: boolean; skipped: boolean }> {
  const normalized = normalizeWord(word);
  
  // Check cache first
  const cached = validationCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { word, isValid: cached.isValid, skipped: false };
  }
  
  // Step 1: Try Learner's Dictionary (PRIMARY - best for children)
  const learnersResult = await checkMerriamWebsterLearners(word);
  
  let finalMetadata: WordMetadata = {};
  let isValid = false;
  let bothSkipped = false;
  
  if (learnersResult.valid) {
    // Learner's Dictionary validated the word - use its metadata
    isValid = true;
    finalMetadata = learnersResult.metadata || {};
  } else if (!learnersResult.skipped) {
    // Learner's Dictionary didn't find it - try Collegiate (FALLBACK)
    const collegiateResult = await checkMerriamWebsterCollegiate(word);
    
    if (collegiateResult.valid) {
      isValid = true;
      finalMetadata = collegiateResult.metadata || {};
    } else if (collegiateResult.skipped) {
      bothSkipped = true;
    }
  } else {
    // Learner's service failed - try Collegiate as backup
    const collegiateResult = await checkMerriamWebsterCollegiate(word);
    
    if (collegiateResult.valid) {
      isValid = true;
      finalMetadata = collegiateResult.metadata || {};
    } else if (collegiateResult.skipped) {
      bothSkipped = true;
    }
  }
  
  // If both services failed, mark as skipped
  if (bothSkipped) {
    return { word, isValid: false, skipped: true };
  }
  
  // If Learner's was valid but missing fields, fill from Collegiate
  if (learnersResult.valid && learnersResult.metadata) {
    const learnersMeta = learnersResult.metadata;
    
    // Check if we need to fill any gaps
    const needsOrigin = !learnersMeta.origin;
    const needsExample = !learnersMeta.example;
    const needsPartOfSpeech = !learnersMeta.partOfSpeech;
    
    if (needsOrigin || needsExample || needsPartOfSpeech) {
      const collegiateResult = await checkMerriamWebsterCollegiate(word);
      
      if (collegiateResult.valid && collegiateResult.metadata) {
        const collegiateMeta = collegiateResult.metadata;
        
        // Fill missing fields from Collegiate
        if (needsOrigin && collegiateMeta.origin) {
          finalMetadata.origin = collegiateMeta.origin;
        }
        if (needsExample && collegiateMeta.example) {
          finalMetadata.example = collegiateMeta.example;
        }
        if (needsPartOfSpeech && collegiateMeta.partOfSpeech) {
          finalMetadata.partOfSpeech = collegiateMeta.partOfSpeech;
        }
      }
    }
  }
  
  // Cache the result
  validationCache.set(normalized, {
    isValid,
    timestamp: Date.now(),
  });
  
  if (!isValid) {
    return { word, isValid: false, skipped: false };
  }
  
  // Save valid word metadata to database
  if (storage) {
    try {
      await storage.upsertWord(
        word,
        difficulty,
        finalMetadata.definition,
        finalMetadata.example,
        finalMetadata.origin,
        finalMetadata.partOfSpeech
      );
    } catch (error) {
      console.error(`Failed to save word metadata for "${word}":`, error);
    }
  }
  
  return { word, isValid: true, skipped: false };
}

// Validate multiple words with concurrency control
async function validateWordsInBatches(words: string[], difficulty: string, storage?: IStorage): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: [],
    invalid: [],
    skipped: [],
  };
  
  // Clean expired cache entries
  cleanCache();
  
  // Process words in batches to limit concurrency
  for (let i = 0; i < words.length; i += MAX_CONCURRENT) {
    const batch = words.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(
      batch.map(word => validateSingleWord(word, difficulty, storage))
    );
    
    for (const { word, isValid, skipped } of results) {
      if (skipped) {
        result.skipped.push(word);
      } else if (isValid) {
        result.valid.push(word);
      } else {
        result.invalid.push(word);
      }
    }
  }
  
  return result;
}

// Main validation function
export async function validateWords(words: string[], difficulty: string = 'medium', storage?: IStorage): Promise<ValidationResult> {
  // Filter out empty words
  const filteredWords = words.filter(w => w && w.trim().length > 0);
  
  if (filteredWords.length === 0) {
    return { valid: [], invalid: [], skipped: [] };
  }
  
  return await validateWordsInBatches(filteredWords, difficulty, storage);
}

// Function to clear cache (for testing or admin purposes)
export function clearValidationCache(): void {
  validationCache.clear();
}
