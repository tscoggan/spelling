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

// Parse Simple English Wiktionary extract to get metadata
function parseWiktionaryExtract(extract: string): WordMetadata {
  const metadata: WordMetadata = {};
  
  if (!extract || extract.trim().length === 0) {
    return metadata;
  }
  
  // Extract part of speech (look for headers like "== Noun ==", "== Verb ==", etc.)
  const posMatch = extract.match(/==\s*(Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|Proper noun)\s*==/i);
  if (posMatch) {
    metadata.partOfSpeech = posMatch[1].toLowerCase();
  }
  
  // Split into lines and filter out empty ones
  const lines = extract.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let inTargetPOSSection = false;
  const definitions: string[] = [];
  const examples: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for part of speech headers
    if (line.startsWith('==') && line.match(/==\s*[A-Z]/)) {
      // If we found our target POS and now hit a new section, stop parsing
      if (inTargetPOSSection) {
        break;
      }
      // Check if this is the POS section we extracted earlier
      if (metadata.partOfSpeech && line.match(new RegExp(`==\\s*${metadata.partOfSpeech}\\s*==`, 'i'))) {
        inTargetPOSSection = true;
      }
      continue;
    }
    
    // Skip pronunciation and other metadata
    if (line.includes('IPA') || line.includes('SAMPA') || line.includes('Pronunciation') || line.includes('Hyphenation') || line.includes('enPR')) {
      continue;
    }
    
    if (inTargetPOSSection) {
      // Skip headword/lemma lines that contain inflection information in parentheses
      // Examples: "monkey (plural monkeys)", "happy (comparative happier, superlative happiest)"
      if (line.match(/\([^)]*(?:plural|comparative|superlative|third-person|present participle|past tense|past participle)[^)]*\)/i)) {
        continue;
      }
      
      // Wiktionary uses wiki markup: "#" for definitions, "#:" or "#*" for examples
      // If we see these markers, parse accordingly
      if (line.startsWith('#:') || line.startsWith('#*')) {
        // This is an example - strip the marker
        const cleanExample = line.replace(/^#[:\*]\s*/, '').trim();
        if (cleanExample.length > 5) {
          examples.push(cleanExample);
        }
      } else if (line.startsWith('#')) {
        // This is a definition - strip the marker
        const cleanDef = line.replace(/^#\s*/, '').trim();
        if (cleanDef.length > 5) {
          definitions.push(cleanDef);
        }
      }
      // If there are no wiki markers, use the simple heuristic:
      // First non-metadata line is definition, subsequent lines are examples
      else if (line.length > 5 && !line.startsWith('-')) {
        if (definitions.length === 0) {
          // First content line is the definition
          const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
          if (cleanLine.length > 0) {
            definitions.push(cleanLine);
          }
        } else {
          // Subsequent lines are examples
          examples.push(line);
        }
      }
    }
  }
  
  // Set definition (combine multiple if present)
  if (definitions.length > 0) {
    metadata.definition = definitions.length === 1
      ? definitions[0]
      : definitions.map((d, i) => `${i + 1}. ${d}`).join(' ');
  }
  
  // Set example (use first one)
  if (examples.length > 0) {
    metadata.example = examples[0];
  }
  
  return metadata;
}

// Check Simple English Wiktionary and extract metadata
async function checkSimpleWiktionary(word: string): Promise<{ valid: boolean; skipped: boolean; metadata?: WordMetadata }> {
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
        // Parse the extract to get metadata
        const metadata = parseWiktionaryExtract(pageData.extract);
        return { valid: true, skipped: false, metadata };
      }
    }
    
    return { valid: false, skipped: false };
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
        
        // Extract origin
        if (entry.origin) {
          metadata.origin = entry.origin;
        }
        
        // Extract definitions and examples
        if (entry.meanings && Array.isArray(entry.meanings)) {
          const allDefinitions: string[] = [];
          
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
          
          // Format definition(s)
          if (allDefinitions.length > 0) {
            metadata.definition = allDefinitions.length === 1
              ? allDefinitions[0]
              : allDefinitions.map((d, i) => `${i + 1}. ${d}`).join(' ');
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

// Validate a single word against both dictionaries (Simple Wiktionary PRIMARY, Free Dictionary BACKUP)
async function validateSingleWord(word: string, difficulty: string, storage?: IStorage): Promise<{ word: string; isValid: boolean; skipped: boolean }> {
  const normalized = normalizeWord(word);
  
  // Check cache first
  const cached = validationCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { word, isValid: cached.isValid, skipped: false };
  }
  
  // Try Simple Wiktionary FIRST (PRIMARY source)
  const wiktionaryResult = await checkSimpleWiktionary(word);
  
  // If Wiktionary service failed (network error), try Free Dictionary as fallback
  if (wiktionaryResult.skipped) {
    const freeDictResult = await checkFreeDictionary(word);
    
    // If both services failed, mark as skipped
    if (freeDictResult.skipped) {
      return { word, isValid: false, skipped: true };
    }
    
    // Free Dictionary worked, use its metadata
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
            freeDictResult.metadata.definition,
            freeDictResult.metadata.example,
            freeDictResult.metadata.origin,
            freeDictResult.metadata.partOfSpeech
          );
        } catch (error) {
          console.error(`Failed to save word metadata for "${word}":`, error);
        }
      }
    }
    
    return { word, isValid: freeDictResult.valid, skipped: false };
  }
  
  // Wiktionary validation succeeded
  if (wiktionaryResult.valid) {
    // Cache the positive result
    validationCache.set(normalized, {
      isValid: true,
      timestamp: Date.now(),
    });
    
    // Use Simple Wiktionary metadata as PRIMARY, fill gaps with Free Dictionary as BACKUP
    if (storage) {
      const combinedMetadata: WordMetadata = wiktionaryResult.metadata || {};
      
      // Only fetch from Free Dictionary if we're missing critical fields
      const needsBackup = !combinedMetadata.definition || !combinedMetadata.example || !combinedMetadata.origin;
      
      if (needsBackup) {
        const freeDictResult = await checkFreeDictionary(word);
        if (freeDictResult.valid && freeDictResult.metadata) {
          // Fill in ONLY missing fields - Simple Wiktionary takes priority
          if (!combinedMetadata.definition && freeDictResult.metadata.definition) {
            combinedMetadata.definition = freeDictResult.metadata.definition;
          }
          if (!combinedMetadata.example && freeDictResult.metadata.example) {
            combinedMetadata.example = freeDictResult.metadata.example;
          }
          if (!combinedMetadata.origin && freeDictResult.metadata.origin) {
            combinedMetadata.origin = freeDictResult.metadata.origin;
          }
          // Note: partOfSpeech from Simple Wiktionary is preferred
        }
      }
      
      // Save combined metadata to database
      try {
        await storage.upsertWord(
          word,
          difficulty,
          combinedMetadata.definition,
          combinedMetadata.example,
          combinedMetadata.origin,
          combinedMetadata.partOfSpeech
        );
      } catch (error) {
        console.error(`Failed to save word metadata for "${word}":`, error);
      }
    }
    
    return { word, isValid: true, skipped: false };
  }
  
  // Word not found in Simple Wiktionary, try Free Dictionary as fallback
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
  
  // Save Free Dictionary metadata if word is valid
  if (freeDictResult.valid && storage && freeDictResult.metadata) {
    try {
      await storage.upsertWord(
        word,
        difficulty,
        freeDictResult.metadata.definition,
        freeDictResult.metadata.example,
        freeDictResult.metadata.origin,
        freeDictResult.metadata.partOfSpeech
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
