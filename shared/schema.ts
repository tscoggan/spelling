import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  selectedAvatar: text("selected_avatar"),
  selectedTheme: text("selected_theme").default("default"),
  preferredVoice: text("preferred_voice"),
  stars: integer("stars").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  definition: text("definition"),
  sentenceExample: text("sentence_example"),
  wordOrigin: text("word_origin"),
  partOfSpeech: text("part_of_speech"),
});

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  wordListId: integer("word_list_id"),
  gameMode: text("game_mode").notNull().default("practice"),
  score: integer("score").notNull().default(0),
  totalWords: integer("total_words").notNull().default(0),
  correctWords: integer("correct_words").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  incorrectWords: text("incorrect_words").array().notNull().default(sql`'{}'::text[]`),
  isComplete: boolean("is_complete").notNull().default(false),
  starsEarned: integer("stars_earned").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaderboardScores = pgTable("leaderboard_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: integer("session_id").notNull(),
  score: integer("score").notNull(),
  accuracy: integer("accuracy").notNull(),
  gameMode: text("game_mode").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customWordLists = pgTable("custom_word_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  words: text("words").array().notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  visibility: text("visibility").notNull().default("private"),
  assignImages: boolean("assign_images").notNull().default(true),
  gradeLevel: text("grade_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wordIllustrations = pgTable("word_illustrations", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  wordListId: integer("word_list_id").notNull(),
  imagePath: text("image_path"),
  source: text("source").default("manual"),
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

export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  plaintextPassword: text("plaintext_password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userGroupMembership = pgTable("user_group_membership", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  groupId: integer("group_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wordListUserGroups = pgTable("word_list_user_groups", {
  id: serial("id").primaryKey(),
  wordListId: integer("word_list_id").notNull(),
  groupId: integer("group_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userToDoItems = pgTable("user_to_do_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  groupId: integer("group_id"),
  groupName: text("group_name"),
  requesterUsername: text("requester_username"),
  requesterId: integer("requester_id"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  currentWordStreak: integer("current_word_streak").notNull().default(0),
  longestWordStreak: integer("longest_word_streak").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userItems = pgTable("user_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userItemUnique: unique("user_items_user_item_unique").on(table.userId, table.itemId),
}));

export const SHOP_ITEMS = {
  do_over: {
    id: "do_over",
    name: "Do Over",
    description: "Retry one incorrect word during a game with no penalty",
    cost: 1,
  },
  second_chance: {
    id: "second_chance",
    name: "2nd Chance",
    description: "Retry all incorrect words at the end of a game with no penalty",
    cost: 5,
  },
} as const;

export type ShopItemId = keyof typeof SHOP_ITEMS;

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  wordListId: integer("word_list_id").notNull(),
  achievementType: text("achievement_type").notNull(),
  achievementValue: text("achievement_value").notNull(),
  completedModes: text("completed_modes").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userWordListTypeUnique: unique("achievements_user_wordlist_type_unique").on(table.userId, table.wordListId, table.achievementType),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  gameSessions: many(gameSessions),
  leaderboardScores: many(leaderboardScores),
  customWordLists: many(customWordLists),
  ownedGroups: many(userGroups),
  groupMemberships: many(userGroupMembership),
  toDoItems: many(userToDoItems),
  achievements: many(achievements),
  streaks: one(userStreaks),
  items: many(userItems),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, {
    fields: [gameSessions.userId],
    references: [users.id],
  }),
  leaderboardScore: one(leaderboardScores),
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

export const wordsRelations = relations(words, ({ }) => ({}));

export const customWordListsRelations = relations(customWordLists, ({ one, many }) => ({
  user: one(users, {
    fields: [customWordLists.userId],
    references: [users.id],
  }),
  wordListUserGroups: many(wordListUserGroups),
  wordIllustrations: many(wordIllustrations),
  achievements: many(achievements),
}));

export const wordIllustrationsRelations = relations(wordIllustrations, ({ one }) => ({
  wordList: one(customWordLists, {
    fields: [wordIllustrations.wordListId],
    references: [customWordLists.id],
  }),
}));

export const userGroupsRelations = relations(userGroups, ({ one, many }) => ({
  owner: one(users, {
    fields: [userGroups.ownerUserId],
    references: [users.id],
  }),
  memberships: many(userGroupMembership),
  wordListGroups: many(wordListUserGroups),
}));

export const userGroupMembershipRelations = relations(userGroupMembership, ({ one }) => ({
  user: one(users, {
    fields: [userGroupMembership.userId],
    references: [users.id],
  }),
  group: one(userGroups, {
    fields: [userGroupMembership.groupId],
    references: [userGroups.id],
  }),
}));

export const wordListUserGroupsRelations = relations(wordListUserGroups, ({ one }) => ({
  wordList: one(customWordLists, {
    fields: [wordListUserGroups.wordListId],
    references: [customWordLists.id],
  }),
  group: one(userGroups, {
    fields: [wordListUserGroups.groupId],
    references: [userGroups.id],
  }),
}));

export const userToDoItemsRelations = relations(userToDoItems, ({ one }) => ({
  user: one(users, {
    fields: [userToDoItems.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
  wordList: one(customWordLists, {
    fields: [achievements.wordListId],
    references: [customWordLists.id],
  }),
}));

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(users, {
    fields: [userStreaks.userId],
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

export const insertLeaderboardScoreSchema = createInsertSchema(leaderboardScores).omit({
  id: true,
  createdAt: true,
});

export const insertCustomWordListSchema = createInsertSchema(customWordLists).omit({
  id: true,
  createdAt: true,
}).extend({
  words: z.array(z.string().min(1).max(100)).min(5).max(5000),
  name: z.string().min(1).max(100),
  gradeLevel: z.string().max(50).optional(),
  visibility: z.enum(["public", "private", "groups"]).optional(),
  assignImages: z.boolean().optional(),
});

export const insertWordIllustrationSchema = createInsertSchema(wordIllustrations).omit({
  id: true,
  createdAt: true,
});

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
});

export const insertUserGroupMembershipSchema = createInsertSchema(userGroupMembership).omit({
  id: true,
  createdAt: true,
});

export const insertWordListUserGroupSchema = createInsertSchema(wordListUserGroups).omit({
  id: true,
  createdAt: true,
});

export const insertUserToDoItemSchema = createInsertSchema(userToDoItems).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserStreakSchema = createInsertSchema(userStreaks).omit({
  id: true,
  updatedAt: true,
});

export const insertUserItemSchema = createInsertSchema(userItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertLeaderboardScore = z.infer<typeof insertLeaderboardScoreSchema>;
export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
export type InsertCustomWordList = z.infer<typeof insertCustomWordListSchema>;
export type CustomWordList = typeof customWordLists.$inferSelect;
export type InsertWordIllustration = z.infer<typeof insertWordIllustrationSchema>;
export type WordIllustration = typeof wordIllustrations.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroupMembership = z.infer<typeof insertUserGroupMembershipSchema>;
export type UserGroupMembership = typeof userGroupMembership.$inferSelect;
export type InsertWordListUserGroup = z.infer<typeof insertWordListUserGroupSchema>;
export type WordListUserGroup = typeof wordListUserGroups.$inferSelect;
export type InsertUserToDoItem = z.infer<typeof insertUserToDoItemSchema>;
export type UserToDoItem = typeof userToDoItems.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;
export type UserStreak = typeof userStreaks.$inferSelect;
export type InsertUserItem = z.infer<typeof insertUserItemSchema>;
export type UserItem = typeof userItems.$inferSelect;

export type GameMode = "practice" | "timed" | "quiz" | "scramble" | "mistake" | "crossword";

export interface GameState {
  sessionId: number;
  currentWordIndex: number;
  words: Word[];
  score: number;
  correctCount: number;
  streak: number;
  gameMode: GameMode;
}
