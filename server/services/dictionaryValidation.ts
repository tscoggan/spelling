import fetch from 'node-fetch';
import type { IStorage } from '../storage';
import { containsKidInappropriateContent } from '../contentModeration';

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
    .replace(/\{phrase\}/g, '')       // phrase start
    .replace(/\{\/phrase\}/g, '')     // phrase end
    .replace(/\{ldquo\}/g, '"')       // left double quote
    .replace(/\{rdquo\}/g, '"')       // right double quote
    .replace(/\{sup\}.*?\{\/sup\}/g, '') // superscript
    .replace(/\{inf\}.*?\{\/inf\}/g, '') // inferior
    .replace(/\{dx\}.*?\{\/dx\}/g, '') // cross references
    .replace(/\{dxt\|.*?\}/g, '')     // cross reference text
    .replace(/\{sx\|.*?\}/g, '')      // synonym cross reference
    .replace(/\{ma\}/g, '')           // math
    .replace(/\{\/ma\}/g, '')
    .replace(/\[.*?\]/g, '')          // square brackets (e.g., [=leaped])
    .replace(/\s+/g, ' ')             // collapse multiple spaces
    .trim();
}

// Check if text is a complete sentence suitable for kids
function isCompleteSentence(text: string): boolean {
  if (!text) return false;
  
  // Trim whitespace before validation
  const trimmed = text.trim();
  if (trimmed.length < 10) return false;
  
  // Must start with uppercase letter
  if (!/^[A-Z]/.test(trimmed)) return false;
  
  // Must end with terminal punctuation
  if (!/[.!?]$/.test(trimmed)) return false;
  
  // Avoid fragments with ellipses or incomplete patterns
  if (trimmed.includes('...') || trimmed.includes('…')) return false;
  if (/^\(/.test(trimmed)) return false; // Avoid starting with parenthesis
  if (trimmed.startsWith('in ') || trimmed.startsWith('for ')) return false; // Fragments like "in June"
  
  return true;
}

// Check if text contains the target word (case-insensitive, word boundary match)
function containsTargetWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  
  // Create a regex that matches the word with word boundaries (case-insensitive)
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
  return regex.test(text);
}

// Extract examples from definition text (dt) array
function extractExamples(dt: any[]): string[] {
  const examples: string[] = [];
  
  // Helper to process vis (verbal illustrations) array
  function processVisArray(visArray: any[]) {
    for (const vis of visArray) {
      if (vis && vis.t) {
        let example = stripFormatting(vis.t);
        
        // Remove slash alternatives from words (e.g., "took/rode" → "took")
        // Only matches alphabetic alternatives, preserving fractions like "3/4"
        example = example.replace(/\b([A-Za-z]+)\/[A-Za-z]+\b/g, '$1');
        
        // Truncate at first period if followed by variant markers
        // Patterns: ". =", ". (US)", ". (chiefly", etc.
        // This removes alternative phrasings: "They arrived on June first. = (US) They arrived..."
        const variantMarkerMatch = example.match(/\.\s+[=(]/);
        if (variantMarkerMatch && variantMarkerMatch.index !== undefined) {
          example = example.substring(0, variantMarkerMatch.index + 1).trim();
        }
        
        if (example.length > 0) {
          examples.push(example);
        }
      }
    }
  }
  
  for (const item of dt) {
    if (Array.isArray(item)) {
      // Direct vis = verbal illustrations (examples)
      if (item[0] === 'vis') {
        const visArray = item[1];
        if (Array.isArray(visArray)) {
          processVisArray(visArray);
        }
      }
      
      // uns = usage notes, which can contain vis (examples)
      if (item[0] === 'uns') {
        const unsArray = item[1];
        if (Array.isArray(unsArray)) {
          for (const unsItem of unsArray) {
            if (Array.isArray(unsItem)) {
              // Each unsItem is an array of [type, content] pairs
              for (const unsContent of unsItem) {
                if (Array.isArray(unsContent) && unsContent[0] === 'vis') {
                  const visArray = unsContent[1];
                  if (Array.isArray(visArray)) {
                    processVisArray(visArray);
                  }
                }
              }
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

// Extract homograph number from MW id field (e.g., "is:1" -> 1, "is" -> 0)
function getHomographNumber(id: string | undefined): number {
  if (!id) return 0;
  const match = id.match(/:(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Parse Merriam-Webster Learner's Dictionary response
function parseLearnerResponse(data: any, requestedWord: string): WordMetadata {
  const metadata: WordMetadata = {};
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return metadata;
  }
  
  const normalizedRequest = normalizeWord(requestedWord);
  
  // Filter and sort entries by homograph number
  const validEntries = data
    .filter((entry: any) => {
      if (typeof entry === 'string') return false;
      
      const headword = entry.meta?.id || entry.hwi?.hw;
      if (!headword) return false;
      
      // Strip MW formatting but check for abbreviation markers (period at end)
      // "Is." should NOT match "is"
      const rawHeadword = headword.replace(/:\d+/g, ''); // Remove homograph number only
      if (rawHeadword.endsWith('.')) return false; // Skip abbreviations
      
      const cleanedHeadword = rawHeadword.replace(/\*/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '');
      const normalizedHeadword = normalizeWord(cleanedHeadword);
      
      // Check if headword matches OR if requested word is an inflection
      if (normalizedHeadword === normalizedRequest) return true;
      
      // Check inflections (but skip "or" alternatives and words with apostrophes)
      if (entry.ins && Array.isArray(entry.ins)) {
        for (const inf of entry.ins) {
          // Skip "or" alternatives - these are secondary spellings, not conjugations
          const label = (inf.il || '').toLowerCase();
          if (label === 'or') continue;
          
          const infWord = inf.if || inf.ifc || '';
          // Skip inflections with apostrophes (e.g., "i's" shouldn't match "is")
          if (infWord.includes("'")) continue;
          
          const cleanedInf = infWord.replace(/\*/g, '').replace(/:\d+/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '');
          if (normalizeWord(cleanedInf) === normalizedRequest) return true;
        }
      }
      
      return false;
    })
    .sort((a: any, b: any) => {
      const aNum = getHomographNumber(a.meta?.id);
      const bNum = getHomographNumber(b.meta?.id);
      return aNum - bNum;
    });
  
  // Collect parts of speech ONLY from entries matching the requested word
  const partsOfSpeechSet = new Set<string>();
  // Track definitions - 1 per homograph entry (meta.id)
  const allDefinitions: string[] = [];
  
  for (const entry of validEntries) {
    
    // Get headword from entry (meta.id is the normalized headword)
    const headword = entry.meta?.id || entry.hwi?.hw;
    // Strip MW formatting: asterisks, sense markers (:1, :2), parentheticals, digits
    const cleanedHeadword = headword ? headword.replace(/\*/g, '').replace(/:\d+/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '') : '';
    const normalizedHeadword = normalizeWord(cleanedHeadword);
    
    // Check if requested word appears in inflections (ins field) - for forms like "were" -> "be"
    // Skip "or" alternatives and words with apostrophes
    let isInflectedForm = false;
    let inflectionLabel = '';
    let inflectionIndex = -1;
    if (entry.ins && Array.isArray(entry.ins)) {
      for (let i = 0; i < entry.ins.length; i++) {
        const inf = entry.ins[i];
        // Skip "or" alternatives - these are secondary spellings, not primary inflections
        const label = (inf.il || '').toLowerCase();
        if (label === 'or') continue;
        
        const infWord = inf.if || inf.ifc || '';
        // Skip inflections with apostrophes (e.g., "i's" shouldn't match "is")
        if (infWord.includes("'")) continue;
        
        const cleanedInf = infWord.replace(/\*/g, '').replace(/:\d+/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '');
        if (normalizeWord(cleanedInf) === normalizedRequest) {
          isInflectedForm = true;
          // Capture the inflection label (il) for tense info
          inflectionLabel = inf.il || '';
          inflectionIndex = i;
          break;
        }
      }
    }
    
    // Collect part of speech from entries whose headword matches OR requested word is an inflection
    if (entry.fl && (normalizedHeadword === normalizedRequest || isInflectedForm)) {
      let pos = entry.fl.toLowerCase();
      
      // Add tense prefix for past tense verbs
      if (isInflectedForm && pos === 'verb') {
        if (inflectionLabel) {
          const labelLower = inflectionLabel.toLowerCase();
          if (labelLower.includes('past tense')) {
            pos = 'past tense verb';
          } else if (labelLower.includes('past participle')) {
            pos = 'past participle verb';
          } else if (labelLower.includes('present participle')) {
            pos = 'present participle verb';
          }
        }
        
        // Special case: "were" is past tense of "be" but MW labels it as "second singular" and "plural"
        // without the "past tense" prefix. Handle this explicitly.
        if (pos === 'verb' && normalizedRequest === 'were' && normalizedHeadword === 'be') {
          pos = 'past tense verb';
        }
        
        // For verbs without inflection labels, detect tense by suffix or position
        if (pos === 'verb' && !inflectionLabel && entry.ins && Array.isArray(entry.ins)) {
          const wordLower = normalizedRequest.toLowerCase();
          
          // Suffix-based detection for regular verbs
          if (wordLower.endsWith('ed')) {
            pos = 'past tense verb';
          } else if (wordLower.endsWith('ing')) {
            pos = 'present participle verb';
          } else if (wordLower.endsWith('en')) {
            // Words ending in -en are typically past participles (eaten, taken, spoken, etc.)
            pos = 'past participle verb';
          } else {
            // Position-based detection for irregular verbs
            // Check if first inflection ends with 's' (3rd person singular pattern)
            const firstInf = entry.ins[0];
            const firstWord = (firstInf?.if || firstInf?.ifc || '').replace(/\*/g, '').toLowerCase();
            const hasThirdPersonFirst = firstWord.endsWith('s');
            
            if (hasThirdPersonFirst) {
              // Pattern: [3rd person -s, past tense, past participle, present participle -ing]
              // Examples: goes/went/gone/going, eats/ate/eaten/eating
              if (inflectionIndex === 1) {
                pos = 'past tense verb';
              } else if (inflectionIndex === 2 && !wordLower.endsWith('ing')) {
                pos = 'past participle verb';
              }
            } else {
              // Pattern: [past tense, past participle, present participle -ing]
              // Examples: took/taken/taking
              if (inflectionIndex === 0) {
                pos = 'past tense verb';
              } else if (inflectionIndex === 1 && !wordLower.endsWith('ing')) {
                pos = 'past participle verb';
              }
            }
          }
        }
      }
      
      partsOfSpeechSet.add(pos);
      
      // Short definitions - take 1 definition per homograph entry (meta.id)
      if (entry.shortdef && Array.isArray(entry.shortdef)) {
        for (const def of entry.shortdef) {
          const cleaned = stripFormatting(def);
          if (cleaned.length > 0 && !containsKidInappropriateContent(cleaned) && !allDefinitions.includes(cleaned)) {
            allDefinitions.push(cleaned);
            break; // Only take first valid definition from this entry
          }
        }
      }
      
    }
    
    // Handle cognate cross-references (cxs) for words like "is", "was", "were" that reference "be"
    // These entries may have no fl (part of speech) or shortdef but have cxs pointing to the base word
    // This must be outside the if(entry.fl) block since cxs entries often lack fl
    if (entry.cxs && Array.isArray(entry.cxs) && allDefinitions.length === 0) {
      for (const cx of entry.cxs) {
        if (cx.cxl && cx.cxtis && Array.isArray(cx.cxtis)) {
          // cxl = "present tense third-person singular of", cxtis = [{cxt: "be"}]
          const label = cx.cxl;
          const target = cx.cxtis[0]?.cxt;
          if (label && target) {
            const cxDef = `${label} "${target}"`;
            if (!allDefinitions.includes(cxDef)) {
              allDefinitions.push(cxDef);
              // Also set part of speech based on the label
              if (label.includes('tense') && label.includes('of')) {
                partsOfSpeechSet.add('verb');
              }
              break; // Only take first cxs definition
            }
          }
        }
      }
    }
    
    // Extract example from detailed definitions (prioritize complete sentences)
    if (!metadata.example && entry.def && Array.isArray(entry.def)) {
      const allExamples: string[] = [];
      
      // Collect all examples first (from senses, divided senses, etc.)
      for (const def of entry.def) {
        if (def.sseq && Array.isArray(def.sseq)) {
          for (const sseq of def.sseq) {
            if (Array.isArray(sseq)) {
              for (const sense of sseq) {
                if (Array.isArray(sense)) {
                  const senseType = sense[0];
                  const senseData = sense[1];
                  
                  // Handle 'sense' type
                  if (senseType === 'sense' && senseData?.dt) {
                    const examples = extractExamples(senseData.dt);
                    allExamples.push(...examples);
                    
                    // Also check for sdsense (divided sense) within the sense
                    if (senseData.sdsense && senseData.sdsense.dt) {
                      const sdsExamples = extractExamples(senseData.sdsense.dt);
                      allExamples.push(...sdsExamples);
                    }
                  }
                  
                  // Handle 'sen' type (sense abbreviation)
                  if (senseType === 'sen' && senseData?.dt) {
                    const examples = extractExamples(senseData.dt);
                    allExamples.push(...examples);
                  }
                  
                  // Handle 'bs' (binding sense) which can contain a sense
                  if (senseType === 'bs' && senseData?.sense?.dt) {
                    const examples = extractExamples(senseData.sense.dt);
                    allExamples.push(...examples);
                  }
                }
              }
            }
          }
        }
      }
      
      // Priority 1: Complete sentence containing the word AND kid-appropriate
      for (const example of allExamples) {
        if (!containsKidInappropriateContent(example) && isCompleteSentence(example) && containsTargetWord(example, requestedWord)) {
          metadata.example = example;
          break;
        }
      }
      
      // Priority 2: Any example containing the word AND kid-appropriate
      if (!metadata.example) {
        for (const example of allExamples) {
          if (!containsKidInappropriateContent(example) && containsTargetWord(example, requestedWord)) {
            metadata.example = example;
            break;
          }
        }
      }
      
      // Priority 3: Complete sentence that's kid-appropriate (may not contain word)
      if (!metadata.example) {
        for (const example of allExamples) {
          if (!containsKidInappropriateContent(example) && isCompleteSentence(example)) {
            metadata.example = example;
            break;
          }
        }
      }
      
      // Priority 4: Any kid-appropriate example (fallback)
      if (!metadata.example) {
        for (const example of allExamples) {
          if (!containsKidInappropriateContent(example)) {
            metadata.example = example;
            break;
          }
        }
      }
    }
  }
  
  // Join all parts of speech with "or"
  if (partsOfSpeechSet.size > 0) {
    metadata.partOfSpeech = Array.from(partsOfSpeechSet).join(' or ');
  }
  
  // Join all definitions with pause separator for TTS
  if (allDefinitions.length > 0) {
    metadata.definition = allDefinitions.join('. ... ');
  }
  
  return metadata;
}

// Parse Merriam-Webster Collegiate Dictionary response
function parseCollegiateResponse(data: any, requestedWord: string): WordMetadata {
  const metadata: WordMetadata = {};
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return metadata;
  }
  
  const normalizedRequest = normalizeWord(requestedWord);
  
  // Filter and sort entries by homograph number
  const validEntries = data
    .filter((entry: any) => {
      if (typeof entry === 'string') return false;
      
      const headword = entry.meta?.id || entry.hwi?.hw;
      if (!headword) return false;
      
      // Strip MW formatting but check for abbreviation markers (period at end)
      // "Is." should NOT match "is"
      const rawHeadword = headword.replace(/:\d+/g, ''); // Remove homograph number only
      if (rawHeadword.endsWith('.')) return false; // Skip abbreviations
      
      const cleanedHeadword = rawHeadword.replace(/\*/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '');
      const normalizedHeadword = normalizeWord(cleanedHeadword);
      
      // Check if headword matches OR if requested word is an inflection
      if (normalizedHeadword === normalizedRequest) return true;
      
      // Check inflections (but skip "or" alternatives and words with apostrophes)
      if (entry.ins && Array.isArray(entry.ins)) {
        for (const inf of entry.ins) {
          // Skip "or" alternatives - these are secondary spellings, not conjugations
          const label = (inf.il || '').toLowerCase();
          if (label === 'or') continue;
          
          const infWord = inf.if || inf.ifc || '';
          // Skip inflections with apostrophes (e.g., "i's" shouldn't match "is")
          if (infWord.includes("'")) continue;
          
          const cleanedInf = infWord.replace(/\*/g, '').replace(/:\d+/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '');
          if (normalizeWord(cleanedInf) === normalizedRequest) return true;
        }
      }
      
      return false;
    })
    .sort((a: any, b: any) => {
      const aNum = getHomographNumber(a.meta?.id);
      const bNum = getHomographNumber(b.meta?.id);
      return aNum - bNum;
    });
  
  // Collect parts of speech ONLY from entries matching the requested word
  const partsOfSpeechSet = new Set<string>();
  // Track definitions - 1 per homograph entry (meta.id)
  const allDefinitions: string[] = [];
  
  for (const entry of validEntries) {
    // Check if requested word appears in inflections (ins field) - for forms like "were" -> "be"
    // Skip "or" alternatives and words with apostrophes
    let isInflectedForm = false;
    let inflectionLabel = '';
    let inflectionIndex = -1;
    
    // Get headword from entry (meta.id is the normalized headword)
    const headword = entry.meta?.id || entry.hwi?.hw;
    const cleanedHeadword = headword ? headword.replace(/\*/g, '').replace(/:\d+/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '') : '';
    const normalizedHeadword = normalizeWord(cleanedHeadword);
    
    if (entry.ins && Array.isArray(entry.ins)) {
      for (let i = 0; i < entry.ins.length; i++) {
        const inf = entry.ins[i];
        // Skip "or" alternatives - these are secondary spellings, not primary inflections
        const label = (inf.il || '').toLowerCase();
        if (label === 'or') continue;
        
        const infWord = inf.if || inf.ifc || '';
        // Skip inflections with apostrophes (e.g., "i's" shouldn't match "is")
        if (infWord.includes("'")) continue;
        
        const cleanedInf = infWord.replace(/\*/g, '').replace(/:\d+/g, '').replace(/\(.*?\)/g, '').replace(/\d+/g, '');
        if (normalizeWord(cleanedInf) === normalizedRequest) {
          isInflectedForm = true;
          // Capture the inflection label (il) for tense info
          inflectionLabel = inf.il || '';
          inflectionIndex = i;
          break;
        }
      }
    }
    
    // Collect part of speech from entries whose headword matches OR requested word is an inflection
    if (entry.fl && (normalizedHeadword === normalizedRequest || isInflectedForm)) {
      let pos = entry.fl.toLowerCase();
      
      // Add tense prefix for past tense verbs
      if (isInflectedForm && pos === 'verb') {
        if (inflectionLabel) {
          const labelLower = inflectionLabel.toLowerCase();
          if (labelLower.includes('past tense')) {
            pos = 'past tense verb';
          } else if (labelLower.includes('past participle')) {
            pos = 'past participle verb';
          } else if (labelLower.includes('present participle')) {
            pos = 'present participle verb';
          }
        }
        
        // Special case: "were" is past tense of "be" but MW labels it as "second singular" and "plural"
        // without the "past tense" prefix. Handle this explicitly.
        if (pos === 'verb' && normalizedRequest === 'were' && normalizedHeadword === 'be') {
          pos = 'past tense verb';
        }
        
        // For verbs without inflection labels, detect tense by suffix or position
        if (pos === 'verb' && !inflectionLabel && entry.ins && Array.isArray(entry.ins)) {
          const wordLower = normalizedRequest.toLowerCase();
          
          // Suffix-based detection for regular verbs
          if (wordLower.endsWith('ed')) {
            pos = 'past tense verb';
          } else if (wordLower.endsWith('ing')) {
            pos = 'present participle verb';
          } else if (wordLower.endsWith('en')) {
            // Words ending in -en are typically past participles (eaten, taken, spoken, etc.)
            pos = 'past participle verb';
          } else {
            // Position-based detection for irregular verbs
            // Check if first inflection ends with 's' (3rd person singular pattern)
            const firstInf = entry.ins[0];
            const firstWord = (firstInf?.if || firstInf?.ifc || '').replace(/\*/g, '').toLowerCase();
            const hasThirdPersonFirst = firstWord.endsWith('s');
            
            if (hasThirdPersonFirst) {
              // Pattern: [3rd person -s, past tense, past participle, present participle -ing]
              // Examples: goes/went/gone/going, eats/ate/eaten/eating
              if (inflectionIndex === 1) {
                pos = 'past tense verb';
              } else if (inflectionIndex === 2 && !wordLower.endsWith('ing')) {
                pos = 'past participle verb';
              }
            } else {
              // Pattern: [past tense, past participle, present participle -ing]
              // Examples: took/taken/taking
              if (inflectionIndex === 0) {
                pos = 'past tense verb';
              } else if (inflectionIndex === 1 && !wordLower.endsWith('ing')) {
                pos = 'past participle verb';
              }
            }
          }
        }
      }
      
      partsOfSpeechSet.add(pos);
      
      // Short definitions - take 1 definition per homograph entry (meta.id)
      if (entry.shortdef && Array.isArray(entry.shortdef)) {
        for (const def of entry.shortdef) {
          const cleaned = stripFormatting(def);
          if (cleaned.length > 0 && !containsKidInappropriateContent(cleaned) && !allDefinitions.includes(cleaned)) {
            allDefinitions.push(cleaned);
            break; // Only take first valid definition from this entry
          }
        }
      }
      
    }
    
    // Handle cognate cross-references (cxs) for words like "is", "was", "were" that reference "be"
    // These entries may have no fl (part of speech) or shortdef but have cxs pointing to the base word
    // This must be outside the if(entry.fl) block since cxs entries often lack fl
    if (entry.cxs && Array.isArray(entry.cxs) && allDefinitions.length === 0) {
      for (const cx of entry.cxs) {
        if (cx.cxl && cx.cxtis && Array.isArray(cx.cxtis)) {
          // cxl = "present tense third-person singular of", cxtis = [{cxt: "be"}]
          const label = cx.cxl;
          const target = cx.cxtis[0]?.cxt;
          if (label && target) {
            const cxDef = `${label} "${target}"`;
            if (!allDefinitions.includes(cxDef)) {
              allDefinitions.push(cxDef);
              // Also set part of speech based on the label
              if (label.includes('tense') && label.includes('of')) {
                partsOfSpeechSet.add('verb');
              }
              break; // Only take first cxs definition
            }
          }
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
    
    // Extract example from detailed definitions (prioritize complete sentences)
    if (!metadata.example && entry.def && Array.isArray(entry.def)) {
      const allExamples: string[] = [];
      
      // Collect all examples first (from senses, divided senses, etc.)
      for (const def of entry.def) {
        if (def.sseq && Array.isArray(def.sseq)) {
          for (const sseq of def.sseq) {
            if (Array.isArray(sseq)) {
              for (const sense of sseq) {
                if (Array.isArray(sense)) {
                  const senseType = sense[0];
                  const senseData = sense[1];
                  
                  // Handle 'sense' type
                  if (senseType === 'sense' && senseData?.dt) {
                    const examples = extractExamples(senseData.dt);
                    allExamples.push(...examples);
                    
                    // Also check for sdsense (divided sense) within the sense
                    if (senseData.sdsense && senseData.sdsense.dt) {
                      const sdsExamples = extractExamples(senseData.sdsense.dt);
                      allExamples.push(...sdsExamples);
                    }
                  }
                  
                  // Handle 'sen' type (sense abbreviation)
                  if (senseType === 'sen' && senseData?.dt) {
                    const examples = extractExamples(senseData.dt);
                    allExamples.push(...examples);
                  }
                  
                  // Handle 'bs' (binding sense) which can contain a sense
                  if (senseType === 'bs' && senseData?.sense?.dt) {
                    const examples = extractExamples(senseData.sense.dt);
                    allExamples.push(...examples);
                  }
                }
              }
            }
          }
        }
      }
      
      // Priority 1: Complete sentence containing the word AND kid-appropriate
      for (const example of allExamples) {
        if (!containsKidInappropriateContent(example) && isCompleteSentence(example) && containsTargetWord(example, requestedWord)) {
          metadata.example = example;
          break;
        }
      }
      
      // Priority 2: Any example containing the word AND kid-appropriate
      if (!metadata.example) {
        for (const example of allExamples) {
          if (!containsKidInappropriateContent(example) && containsTargetWord(example, requestedWord)) {
            metadata.example = example;
            break;
          }
        }
      }
      
      // Priority 3: Complete sentence that's kid-appropriate (may not contain word)
      if (!metadata.example) {
        for (const example of allExamples) {
          if (!containsKidInappropriateContent(example) && isCompleteSentence(example)) {
            metadata.example = example;
            break;
          }
        }
      }
      
      // Priority 4: Any kid-appropriate example (fallback)
      if (!metadata.example) {
        for (const example of allExamples) {
          if (!containsKidInappropriateContent(example)) {
            metadata.example = example;
            break;
          }
        }
      }
    }
  }
  
  // Join all parts of speech with "or"
  if (partsOfSpeechSet.size > 0) {
    metadata.partOfSpeech = Array.from(partsOfSpeechSet).join(' or ');
  }
  
  // Join all definitions with pause separator for TTS
  if (allDefinitions.length > 0) {
    metadata.definition = allDefinitions.join('. ... ');
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
    
    const metadata = parseLearnerResponse(data, word);
    
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
    
    const metadata = parseCollegiateResponse(data, word);
    
    // Word is valid if we got at least a definition
    const valid = !!metadata.definition;
    
    return { valid, skipped: false, metadata };
  } catch (error) {
    // Timeout or network error - mark as skipped
    return { valid: false, skipped: true };
  }
}

// Validate a single word using Merriam-Webster hierarchy (Learner's → Collegiate)
async function validateSingleWord(word: string, storage?: IStorage): Promise<{ word: string; isValid: boolean; skipped: boolean }> {
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
async function validateWordsInBatches(words: string[], storage?: IStorage): Promise<ValidationResult> {
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
      batch.map(word => validateSingleWord(word, storage))
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
export async function validateWords(words: string[], storage?: IStorage): Promise<ValidationResult> {
  // Filter out empty words
  const filteredWords = words.filter(w => w && w.trim().length > 0);
  
  if (filteredWords.length === 0) {
    return { valid: [], invalid: [], skipped: [] };
  }
  
  return await validateWordsInBatches(filteredWords, storage);
}

// Function to clear cache (for testing or admin purposes)
export function clearValidationCache(): void {
  validationCache.clear();
}

// Function to clear specific words from cache (used when overwriting words)
export function clearCacheForWords(words: string[]): void {
  for (const word of words) {
    const normalized = word.toLowerCase().trim().replace(/[^\w\s]/g, '');
    validationCache.delete(normalized);
  }
}
