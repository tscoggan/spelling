import fetch from 'node-fetch';
import type { IStorage } from '../storage';

interface ValidationResult {
  valid: string[];
  invalid: string[];
  skipped: string[];
}

interface WordMetadata {
  example?: string;
  origin?: string;
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

// Check Simple English Wiktionary
async function checkSimpleWiktionary(word: string): Promise<{ valid: boolean; skipped: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(
      `https://simple.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=extracts&explaintext=1&format=json&origin=*`,
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
    
    const data: any = await response.json();
    const pages = data?.query?.pages;
    
    if (!pages) {
      return { valid: false, skipped: false };
    }
    
    const pageId = Object.keys(pages)[0];
    const pageData = pages[pageId];
    
    // Check if page exists and has content (not missing)
    // Simple Wiktionary returns 200 with "missing" flag for non-existent words
    const valid = pageData && pageData.extract && !pageData.missing;
    return { valid, skipped: false };
  } catch (error) {
    // Timeout or network error - mark as skipped
    return { valid: false, skipped: true };
  }
}

// Check Free Dictionary API and fetch metadata
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
        
        if (entry.origin) {
          metadata.origin = entry.origin;
        }
        
        if (entry.meanings && Array.isArray(entry.meanings)) {
          for (const meaning of entry.meanings) {
            if (meaning.definitions && Array.isArray(meaning.definitions)) {
              for (const def of meaning.definitions) {
                if (def.example) {
                  metadata.example = def.example;
                  break;
                }
              }
              if (metadata.example) break;
            }
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

// Validate a single word against both dictionaries
async function validateSingleWord(word: string, difficulty: string, storage?: IStorage): Promise<{ word: string; isValid: boolean; skipped: boolean }> {
  const normalized = normalizeWord(word);
  
  // Check cache first
  const cached = validationCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { word, isValid: cached.isValid, skipped: false };
  }
  
  // Try Simple Wiktionary first
  const wiktionaryResult = await checkSimpleWiktionary(word);
  
  // If Wiktionary service failed (skipped), try Free Dictionary
  if (wiktionaryResult.skipped) {
    const freeDictResult = await checkFreeDictionary(word);
    
    // If both services failed, mark as skipped
    if (freeDictResult.skipped) {
      return { word, isValid: false, skipped: true };
    }
    
    // Free Dictionary worked, use its result and save metadata
    if (freeDictResult.valid) {
      validationCache.set(normalized, {
        isValid: true,
        timestamp: Date.now(),
      });
      
      if (storage && freeDictResult.metadata) {
        try {
          await storage.upsertWord(
            word,
            difficulty,
            freeDictResult.metadata.example,
            freeDictResult.metadata.origin
          );
        } catch (error) {
          console.error(`Failed to save word metadata for "${word}":`, error);
        }
      }
    }
    
    return { word, isValid: freeDictResult.valid, skipped: false };
  }
  
  // Wiktionary worked
  if (wiktionaryResult.valid) {
    // Cache the positive result
    validationCache.set(normalized, {
      isValid: true,
      timestamp: Date.now(),
    });
    
    if (storage) {
      const freeDictResult = await checkFreeDictionary(word);
      if (freeDictResult.valid && freeDictResult.metadata) {
        try {
          await storage.upsertWord(
            word,
            difficulty,
            freeDictResult.metadata.example,
            freeDictResult.metadata.origin
          );
        } catch (error) {
          console.error(`Failed to save word metadata for "${word}":`, error);
        }
      }
    }
    
    return { word, isValid: true, skipped: false };
  }
  
  // Word not found in Wiktionary, try Free Dictionary
  const freeDictResult = await checkFreeDictionary(word);
  
  // If Free Dictionary service failed, mark as skipped
  if (freeDictResult.skipped) {
    return { word, isValid: false, skipped: true };
  }
  
  // Cache the result (valid or invalid)
  validationCache.set(normalized, {
    isValid: freeDictResult.valid,
    timestamp: Date.now(),
  });
  
  if (freeDictResult.valid && storage && freeDictResult.metadata) {
    try {
      await storage.upsertWord(
        word,
        difficulty,
        freeDictResult.metadata.example,
        freeDictResult.metadata.origin
      );
    } catch (error) {
      console.error(`Failed to save word metadata for "${word}":`, error);
    }
  }
  
  return { word, isValid: freeDictResult.valid, skipped: false };
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
