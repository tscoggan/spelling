import * as fs from 'fs';
import * as path from 'path';

interface GradeLevel {
  id: string;
  name: string;
  filename: string;
}

const GRADE_LEVELS: GradeLevel[] = [
  { id: 'kindergarten', name: 'Kindergarten', filename: 'Kindergarten_words_1765815683616.txt' },
  { id: '1st', name: '1st Grade', filename: '1st_grade_words_1765815683616.txt' },
  { id: '2nd', name: '2nd Grade', filename: '2nd_grade_words_1765815683615.txt' },
  { id: '3rd', name: '3rd Grade', filename: '3rd_grade_words_1765815683615.txt' },
  { id: '4th', name: '4th Grade', filename: '4th_grade_words_1765815683611.txt' },
  { id: '5th', name: '5th Grade', filename: '5th_grade_words_1765815683614.txt' },
  { id: '6th', name: '6th Grade', filename: '6th_grade_words_1765815683614.txt' },
  { id: '7th', name: '7th Grade', filename: '7th_grade_words_1765815683613.txt' },
  { id: '8th', name: '8th Grade', filename: '8th_grade_words_1765815683613.txt' },
  { id: 'highschool', name: 'High School', filename: 'High_school_words_1765815683612.txt' },
];

const wordListCache = new Map<string, string[]>();

function loadWordListFromFile(gradeId: string): string[] | null {
  const grade = GRADE_LEVELS.find(g => g.id === gradeId);
  if (!grade) return null;

  const filePath = path.join(process.cwd(), 'server', 'data', grade.filename);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content.split(',').map(w => w.trim()).filter(w => w.length > 0);
    return words;
  } catch (error) {
    console.error(`Failed to load word list for grade ${gradeId}:`, error);
    return null;
  }
}

export function getGradeLevelWords(gradeId: string): string[] | null {
  if (wordListCache.has(gradeId)) {
    return wordListCache.get(gradeId)!;
  }

  const words = loadWordListFromFile(gradeId);
  if (words) {
    wordListCache.set(gradeId, words);
  }
  return words;
}

export function getRandomWordsFromGrade(gradeId: string, count: number): string[] | null {
  const allWords = getGradeLevelWords(gradeId);
  if (!allWords) return null;

  const shuffled = [...allWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getAvailableGradeLevels(): { id: string; name: string }[] {
  return GRADE_LEVELS.map(g => ({ id: g.id, name: g.name }));
}

export function getGradeWordCount(gradeId: string): number | null {
  const words = getGradeLevelWords(gradeId);
  return words ? words.length : null;
}
