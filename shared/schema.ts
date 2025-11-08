import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  selectedAvatar: text("selected_avatar"),
  selectedTheme: text("selected_theme").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  difficulty: text("difficulty").notNull(),
  sentenceExample: text("sentence_example"),
  wordOrigin: text("word_origin"),
});

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  difficulty: text("difficulty").notNull(),
  gameMode: text("game_mode").notNull().default("standard"),
  score: integer("score").notNull().default(0),
  totalWords: integer("total_words").notNull().default(0),
  correctWords: integer("correct_words").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  isComplete: boolean("is_complete").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wordAttempts = pgTable("word_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: integer("session_id"),
  wordId: integer("word_id").notNull(),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const leaderboardScores = pgTable("leaderboard_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: integer("session_id").notNull(),
  score: integer("score").notNull(),
  accuracy: integer("accuracy").notNull(),
  difficulty: text("difficulty").notNull(),
  gameMode: text("game_mode").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customWordLists = pgTable("custom_word_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  difficulty: text("difficulty").notNull(),
  words: text("words").array().notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  gradeLevel: text("grade_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wordIllustrations = pgTable("word_illustrations", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  imagePath: text("image_path"),
  source: text("source").default("manual"),
  partsOfSpeech: text("parts_of_speech"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const illustrationJobs = pgTable("illustration_jobs", {
  id: serial("id").primaryKey(),
  wordListId: integer("word_list_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalWords: integer("total_words").notNull().default(0),
  processedWords: integer("processed_words").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const illustrationJobItems = pgTable("illustration_job_items", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  word: text("word").notNull(),
  status: text("status").notNull().default("pending"),
  imagePath: text("image_path"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  gameSessions: many(gameSessions),
  wordAttempts: many(wordAttempts),
  leaderboardScores: many(leaderboardScores),
  customWordLists: many(customWordLists),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [gameSessions.userId],
    references: [users.id],
  }),
  wordAttempts: many(wordAttempts),
  leaderboardScore: one(leaderboardScores),
}));

export const wordAttemptsRelations = relations(wordAttempts, ({ one }) => ({
  user: one(users, {
    fields: [wordAttempts.userId],
    references: [users.id],
  }),
  session: one(gameSessions, {
    fields: [wordAttempts.sessionId],
    references: [gameSessions.id],
  }),
  word: one(words, {
    fields: [wordAttempts.wordId],
    references: [words.id],
  }),
}));

export const leaderboardScoresRelations = relations(leaderboardScores, ({ one }) => ({
  user: one(users, {
    fields: [leaderboardScores.userId],
    references: [users.id],
  }),
  session: one(gameSessions, {
    fields: [leaderboardScores.sessionId],
    references: [gameSessions.id],
  }),
}));

export const wordsRelations = relations(words, ({ many }) => ({
  wordAttempts: many(wordAttempts),
}));

export const customWordListsRelations = relations(customWordLists, ({ one }) => ({
  user: one(users, {
    fields: [customWordLists.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertWordAttemptSchema = createInsertSchema(wordAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const insertLeaderboardScoreSchema = createInsertSchema(leaderboardScores).omit({
  id: true,
  createdAt: true,
});

export const insertCustomWordListSchema = createInsertSchema(customWordLists).omit({
  id: true,
  createdAt: true,
}).extend({
  words: z.array(z.string().min(1).max(100)).min(5).max(500),
  name: z.string().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  gradeLevel: z.string().max(50).optional(),
});

export const insertWordIllustrationSchema = createInsertSchema(wordIllustrations).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertWordAttempt = z.infer<typeof insertWordAttemptSchema>;
export type WordAttempt = typeof wordAttempts.$inferSelect;
export type InsertLeaderboardScore = z.infer<typeof insertLeaderboardScoreSchema>;
export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
export type InsertCustomWordList = z.infer<typeof insertCustomWordListSchema>;
export type CustomWordList = typeof customWordLists.$inferSelect;
export type InsertWordIllustration = z.infer<typeof insertWordIllustrationSchema>;
export type WordIllustration = typeof wordIllustrations.$inferSelect;

export type DifficultyLevel = "easy" | "medium" | "hard" | "custom";
export type GameMode = "standard" | "timed" | "quiz" | "scramble";

export interface GameState {
  sessionId: number;
  currentWordIndex: number;
  words: Word[];
  score: number;
  correctCount: number;
  streak: number;
  difficulty: DifficultyLevel;
  gameMode: GameMode;
}
