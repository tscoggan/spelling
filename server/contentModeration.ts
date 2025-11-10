import { Filter } from 'bad-words';

// Initialize profanity filter with configuration to avoid false positives
const filter = new Filter();

// Remove words that cause false positives with common words
// These are overly broad patterns that match legitimate words
filter.removeWords('hell', 'hells', 'ass', 'tit', 'sadist', 'god');

// This prevents blocking: hello, shell, class, pass, title, etc.

/**
 * Checks if text contains inappropriate words for children
 * @param text - Text to check
 * @returns true if inappropriate content is detected, false otherwise
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
