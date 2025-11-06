import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const words = pgTable("words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull().unique(),
  difficulty: text("difficulty").notNull(),
});

export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  difficulty: text("difficulty").notNull(),
  score: integer("score").notNull().default(0),
  totalWords: integer("total_words").notNull().default(0),
  correctWords: integer("correct_words").notNull().default(0),
  isComplete: boolean("is_complete").notNull().default(false),
});

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
});

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface GameState {
  sessionId: string;
  currentWordIndex: number;
  words: Word[];
  score: number;
  correctCount: number;
  streak: number;
  difficulty: DifficultyLevel;
}

export interface WordAttempt {
  wordId: string;
  userAnswer: string;
  isCorrect: boolean;
}
