import { Filter } from 'bad-words';

// Initialize profanity filter with configuration to avoid false positives
const filter = new Filter();

// Remove words that cause false positives with common words
// These are overly broad patterns that match legitimate words
filter.removeWords('hell', 'hells', 'ass', 'tit', 'sadist', 'god');

// This prevents blocking: hello, shell, class, pass, title, etc.

// Kid-inappropriate content patterns beyond profanity
// These filter out definitions/examples with mature themes
// Very specific patterns to avoid breaking dictionary definitions for innocent words
const KID_INAPPROPRIATE_PATTERNS = [
  // Sexual content - only explicit contexts
  /\bsexual(?:ly)?\s+(?:attractive|appeal(?:ing)?|desire|arousal|intercourse|act)/i,
  /\berotic\b/i,
  /\bsexy\b/i,
  /\bnude\b/i,
  /\bnudity\b/i,
  /\bpornograph/i,
  
  // Violence - broad matches OK
  /\bgraphic violence\b/i,
  /\bkilling\b/i,
  /\bkilled\b/i,
  
  // Alcohol & drugs - only abuse/intoxication contexts, not objects or processes
  /\bdrunk(?:en)?\b/i,  // Catches "drunk", "drunken"
  /\bintoxicated\b/i,
  /\bget(?:ting)?\s+drunk/i,  // "getting drunk"
  /\balcohol(?:ic)?\s+(?:abuse|addiction|beverage|consumption)/i,  // "alcoholic beverage" but not "alcoholic fermentation"
  /\bdrug\s+(?:abuse|addiction|dealer|dealing)/i,  // "drug abuse" but not "drugstore"
  /\billegal\s+drug/i,
];

/**
 * Checks if text contains kid-inappropriate content
 * Combines profanity filtering with mature theme detection
 * @param text - Text to check
 * @returns true if inappropriate content is detected, false otherwise
 */
export function containsKidInappropriateContent(text: string): boolean {
  if (!text) return false;
  
  // Check profanity filter first
  if (filter.isProfane(text)) {
    return true;
  }
  
  // Check for mature themes
  const lowerText = text.toLowerCase();
  for (const pattern of KID_INAPPROPRIATE_PATTERNS) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if text contains inappropriate words for children
 * @param text - Text to check
 * @returns true if inappropriate content is detected, false otherwise
 * @deprecated Use containsKidInappropriateContent instead
 */
export function containsInappropriateContent(text: string): boolean {
  return filter.isProfane(text);
}

/**
 * Validates an array of words for inappropriate content
 * @param words - Array of words to validate
 * @returns Object with isValid boolean and array of inappropriate words found
 */
export function validateWords(words: string[]): { isValid: boolean; inappropriateWords: string[] } {
  const inappropriateWords: string[] = [];
  
  for (const word of words) {
    if (filter.isProfane(word.toLowerCase())) {
      inappropriateWords.push(word);
    }
  }
  
  return {
    isValid: inappropriateWords.length === 0,
    inappropriateWords
  };
}

/**
 * Cleans text by replacing inappropriate words with asterisks
 * @param text - Text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  return filter.clean(text);
}
