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
const API_TIMEOUT = 3000; // 3 seconds per word
const MAX_CONCURRENT = 5; // Maximum concurrent API requests

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

// Parse Simple English Wiktionary extract to get part of speech ONLY
// Simple Wiktionary is now used for validation and POS gap-filling only
function parseWiktionaryPartOfSpeech(extract: string): string | undefined {
  if (!extract || extract.trim().length === 0) {
    return undefined;
  }
  
  // Extract part of speech (look for headers like "== Noun ==", "== Verb ==", etc.)
  // Case-insensitive to handle variations
  const posMatch = extract.match(/==\s*(Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|Proper\s*noun)\s*==/i);
  if (posMatch) {
    return posMatch[1].replace(/\s+/g, ' ').trim().toLowerCase();
  }
  
  return undefined;
}

// Check Simple English Wiktionary for existence and part of speech only
async function checkSimpleWiktionary(word: string): Promise<{ valid: boolean; skipped: boolean; partOfSpeech?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Build unique list of word variations to try (lowercase, capitalized, original)
    const lowercase = word.toLowerCase().trim();
    const capitalized = lowercase.charAt(0).toUpperCase() + lowercase.slice(1);
    
    // Create unique set: always try lowercase first, then capitalized if different
    const wordsToTry = [lowercase];
    if (capitalized !== lowercase) {
      wordsToTry.push(capitalized);
    }
    // Also try original input if different from both
    if (word !== lowercase && word !== capitalized) {
      wordsToTry.push(word);
    }
    
    for (const tryWord of wordsToTry) {
      const response = await fetch(
        `https://simple.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(tryWord)}&prop=extracts&explaintext=1&format=json&origin=*`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);
      
      // Server error - mark as skipped
      if (!response.ok && response.status >= 500) {
        return { valid: false, skipped: true };
      }
      
      if (!response.ok) {
        continue; // Try next variation
      }
      
      const data: any = await response.json();
      const pages = data?.query?.pages;
      
      if (!pages) {
        continue; // Try next variation
      }
      
      const pageId = Object.keys(pages)[0];
      const pageData = pages[pageId];
      
      // Check if page exists and has content (not missing)
      if (pageData && pageData.extract && !pageData.missing && pageData.extract.trim().length > 0) {
        // Parse extract to get part of speech only
        const partOfSpeech = parseWiktionaryPartOfSpeech(pageData.extract);
        return { valid: true, skipped: false, partOfSpeech };
      }
    }
    
    return { valid: false, skipped: false };
  } catch (error) {
    // Timeout or network error - mark as skipped
    return { valid: false, skipped: true };
  }
}

// Check Free Dictionary API and fetch full metadata (PRIMARY source)
async function checkFreeDictionary(word: string): Promise<{ valid: boolean; skipped: boolean; metadata?: WordMetadata }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    
    // Server error - mark as skipped
    if (!response.ok && response.status >= 500) {
      return { valid: false, skipped: true };
    }
    
    if (!response.ok) {
      return { valid: false, skipped: false };
    }
    
    try {
      const data: any = await response.json();
      const metadata: WordMetadata = {};
      
      if (data && data.length > 0) {
        const entry = data[0];
        
        // Extract origin
        if (entry.origin) {
          metadata.origin = entry.origin;
        }
        
        // Extract definitions, examples, and part of speech from meanings
        if (entry.meanings && Array.isArray(entry.meanings)) {
          const allDefinitions: string[] = [];
          
          // Get part of speech from first meaning
          if (entry.meanings[0].partOfSpeech) {
            metadata.partOfSpeech = entry.meanings[0].partOfSpeech.toLowerCase();
          }
          
          for (const meaning of entry.meanings) {
            if (meaning.definitions && Array.isArray(meaning.definitions)) {
              for (const def of meaning.definitions) {
                // Collect definition
                if (def.definition && !allDefinitions.includes(def.definition)) {
                  allDefinitions.push(def.definition);
                }
                
                // Get first example found
                if (def.example && !metadata.example) {
                  metadata.example = def.example;
                }
              }
            }
          }
          
          // Format definition(s) - use first definition as primary
          if (allDefinitions.length > 0) {
            metadata.definition = allDefinitions[0];
          }
        }
      }
      
      return { valid: true, skipped: false, metadata };
    } catch (error) {
      return { valid: true, skipped: false };
    }
  } catch (error) {
    // Timeout or network error - mark as skipped
    return { valid: false, skipped: true };
  }
}

// Validate a single word (Free Dictionary PRIMARY, Simple Wiktionary for existence + POS gap-filling)
async function validateSingleWord(word: string, difficulty: string, storage?: IStorage): Promise<{ word: string; isValid: boolean; skipped: boolean }> {
  const normalized = normalizeWord(word);
  
  // Check cache first
  const cached = validationCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { word, isValid: cached.isValid, skipped: false };
  }
  
  // Step 1: Check Simple Wiktionary for existence and part of speech
  const wiktionaryResult = await checkSimpleWiktionary(word);
  
  // If Wiktionary service failed, continue anyway - Free Dictionary is primary
  const wordExists = wiktionaryResult.valid;
  const wiktionaryPOS = wiktionaryResult.partOfSpeech;
  
  // Step 2: Fetch metadata from Free Dictionary (AUTHORITATIVE when available)
  const freeDictResult = await checkFreeDictionary(word);
  
  // If both services failed, propagate skipped status
  if (freeDictResult.skipped && wiktionaryResult.skipped) {
    return { word, isValid: false, skipped: true };
  }
  
  // Decision tree for validation:
  // 1. If Free Dictionary validates → word is valid (use its metadata)
  // 2. If Free Dictionary misses but Wiktionary finds it:
  //    - Accept if POS is NOT "proper noun" (keeps real words like "feline")
  //    - Reject if POS is "proper noun" (filters "thursday", "october")
  
  let isValid = false;
  let finalMetadata: WordMetadata = {};
  
  if (freeDictResult.valid) {
    // Free Dictionary is authoritative - word is valid
    isValid = true;
    
    // Use Free Dictionary metadata (PRIMARY source)
    if (freeDictResult.metadata) {
      finalMetadata.definition = freeDictResult.metadata.definition;
      finalMetadata.example = freeDictResult.metadata.example;
      finalMetadata.origin = freeDictResult.metadata.origin;
      finalMetadata.partOfSpeech = freeDictResult.metadata.partOfSpeech;
    }
    
    // Fill POS gap with Wiktionary if needed
    if (!finalMetadata.partOfSpeech && wiktionaryPOS) {
      finalMetadata.partOfSpeech = wiktionaryPOS;
    }
  } else if (wordExists) {
    // Free Dictionary missed, but Wiktionary found it
    // Accept ONLY if it's not a proper noun
    if (wiktionaryPOS && wiktionaryPOS !== 'proper noun') {
      isValid = true;
      // Use Wiktionary POS since Free Dictionary didn't provide metadata
      finalMetadata.partOfSpeech = wiktionaryPOS;
    } else {
      // Reject proper nouns and words without POS
      isValid = false;
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
