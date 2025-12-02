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
  role: text("role").notNull().default("student"),
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

export const wordListCoOwners = pgTable("word_list_co_owners", {
  id: serial("id").primaryKey(),
  wordListId: integer("word_list_id").notNull(),
  coOwnerUserId: integer("co_owner_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wordListCoOwnerUnique: unique("word_list_co_owner_unique").on(table.wordListId, table.coOwnerUserId),
}));

export const userGroupCoOwners = pgTable("user_group_co_owners", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  coOwnerUserId: integer("co_owner_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  groupCoOwnerUnique: unique("group_co_owner_unique").on(table.groupId, table.coOwnerUserId),
}));

export const userToDoItems = pgTable("user_to_do_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  groupId: integer("group_id"),
  groupName: text("group_name"),
  requesterUsername: text("requester_username"),
  requesterId: integer("requester_id"),
  challengeId: integer("challenge_id"),
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

export const headToHeadChallenges = pgTable("head_to_head_challenges", {
  id: serial("id").primaryKey(),
  initiatorId: integer("initiator_id").notNull(),
  opponentId: integer("opponent_id").notNull(),
  wordListId: integer("word_list_id").notNull(),
  status: text("status").notNull().default("pending"),
  initiatorScore: integer("initiator_score"),
  initiatorTime: integer("initiator_time"),
  initiatorCorrect: integer("initiator_correct"),
  initiatorIncorrect: integer("initiator_incorrect"),
  opponentScore: integer("opponent_score"),
  opponentTime: integer("opponent_time"),
  opponentCorrect: integer("opponent_correct"),
  opponentIncorrect: integer("opponent_incorrect"),
  winnerUserId: integer("winner_user_id"),
  starAwarded: boolean("star_awarded").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  initiatorCompletedAt: timestamp("initiator_completed_at"),
  opponentCompletedAt: timestamp("opponent_completed_at"),
  completedAt: timestamp("completed_at"),
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
    type: "consumable" as const,
  },
  second_chance: {
    id: "second_chance",
    name: "2nd Chance",
    description: "Retry all incorrect words at the end of a game with no penalty",
    cost: 3,
    type: "consumable" as const,
  },
  pirate_theme: {
    id: "pirate_theme",
    name: "Pirate Theme",
    description: "Set sail for adventure with a pirate-themed background and captain character!",
    cost: 5,
    type: "theme" as const,
    themeId: "pirate",
  },
  space_theme: {
    id: "space_theme",
    name: "Space Theme",
    description: "Blast off to the stars with a space-themed background and astronaut character!",
    cost: 5,
    type: "theme" as const,
    themeId: "space",
  },
  soccer_theme: {
    id: "soccer_theme",
    name: "Soccer Theme",
    description: "Score big with a soccer field background and player character!",
    cost: 5,
    type: "theme" as const,
    themeId: "soccer",
  },
  skiing_theme: {
    id: "skiing_theme",
    name: "Skiing Theme",
    description: "Hit the slopes with a snowy mountain background and skier character!",
    cost: 5,
    type: "theme" as const,
    themeId: "skiing",
  },
  basketball_theme: {
    id: "basketball_theme",
    name: "Basketball Theme",
    description: "Shoot for the stars with a basketball court background and player character!",
    cost: 5,
    type: "theme" as const,
    themeId: "basketball",
  },
  robot_theme: {
    id: "robot_theme",
    name: "Robot Theme",
    description: "Join the robots in their high-tech factory adventure!",
    cost: 5,
    type: "theme" as const,
    themeId: "robot",
  },
  unicorn_theme: {
    id: "unicorn_theme",
    name: "Unicorn Theme",
    description: "Explore a magical rainbow world with adorable unicorns!",
    cost: 5,
    type: "theme" as const,
    themeId: "unicorn",
  },
  volleyball_theme: {
    id: "volleyball_theme",
    name: "Volleyball Theme",
    description: "Spike your way to spelling success on the volleyball court!",
    cost: 5,
    type: "theme" as const,
    themeId: "volleyball",
  },
} as const;

export type ShopItemId = keyof typeof SHOP_ITEMS;
export type ShopItem = typeof SHOP_ITEMS[ShopItemId];

export type ThemeId = "default" | "pirate" | "space" | "soccer" | "skiing" | "basketball" | "robot" | "unicorn" | "volleyball";

export interface ThemeAssets {
  backgroundLandscape: string;
  backgroundPortrait: string;
  mascotTrophy: string;
  mascotGoodTry: string;
  name: string;
}

export const AVAILABLE_THEMES: Record<ThemeId, { name: string; requiresPurchase: boolean; shopItemId?: ShopItemId }> = {
  default: {
    name: "Outdoor Adventure",
    requiresPurchase: false,
  },
  pirate: {
    name: "Pirate Theme",
    requiresPurchase: true,
    shopItemId: "pirate_theme",
  },
  space: {
    name: "Space Theme",
    requiresPurchase: true,
    shopItemId: "space_theme",
  },
  soccer: {
    name: "Soccer Theme",
    requiresPurchase: true,
    shopItemId: "soccer_theme",
  },
  skiing: {
    name: "Skiing Theme",
    requiresPurchase: true,
    shopItemId: "skiing_theme",
  },
  basketball: {
    name: "Basketball Theme",
    requiresPurchase: true,
    shopItemId: "basketball_theme",
  },
  robot: {
    name: "Robot Theme",
    requiresPurchase: true,
    shopItemId: "robot_theme",
  },
  unicorn: {
    name: "Unicorn Theme",
    requiresPurchase: true,
    shopItemId: "unicorn_theme",
  },
  volleyball: {
    name: "Volleyball Theme",
    requiresPurchase: true,
    shopItemId: "volleyball_theme",
  },
};

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

export const headToHeadChallengesRelations = relations(headToHeadChallenges, ({ one }) => ({
  initiator: one(users, {
    fields: [headToHeadChallenges.initiatorId],
    references: [users.id],
  }),
  opponent: one(users, {
    fields: [headToHeadChallenges.opponentId],
    references: [users.id],
  }),
  wordList: one(customWordLists, {
    fields: [headToHeadChallenges.wordListId],
    references: [customWordLists.id],
  }),
  winner: one(users, {
    fields: [headToHeadChallenges.winnerUserId],
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

export const insertWordListCoOwnerSchema = createInsertSchema(wordListCoOwners).omit({
  id: true,
  createdAt: true,
});

export const insertUserGroupCoOwnerSchema = createInsertSchema(userGroupCoOwners).omit({
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

export const insertHeadToHeadChallengeSchema = createInsertSchema(headToHeadChallenges).omit({
  id: true,
  createdAt: true,
  initiatorCompletedAt: true,
  opponentCompletedAt: true,
  completedAt: true,
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
export type InsertWordListCoOwner = z.infer<typeof insertWordListCoOwnerSchema>;
export type WordListCoOwner = typeof wordListCoOwners.$inferSelect;
export type InsertUserGroupCoOwner = z.infer<typeof insertUserGroupCoOwnerSchema>;
export type UserGroupCoOwner = typeof userGroupCoOwners.$inferSelect;
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
export type InsertHeadToHeadChallenge = z.infer<typeof insertHeadToHeadChallengeSchema>;
export type HeadToHeadChallenge = typeof headToHeadChallenges.$inferSelect;

export type GameMode = "practice" | "timed" | "quiz" | "scramble" | "mistake" | "crossword" | "headtohead";

export type ChallengeStatus = "pending" | "active" | "completed" | "declined";

export interface GameState {
  sessionId: number;
  currentWordIndex: number;
  words: Word[];
  score: number;
  correctCount: number;
  streak: number;
  gameMode: GameMode;
}
