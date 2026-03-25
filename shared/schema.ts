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
  accountType: text("account_type").notNull().default("school"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  definition: text("definition"),
  sentenceExample: text("sentence_example"),
  wordOrigin: text("word_origin"),
  partOfSpeech: text("part_of_speech"),
  updatedAt: timestamp("updated_at"),
  updatedByUser: integer("updated_by_user"),
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

// Word lists table - stores word IDs via junction table instead of text array
export const wordLists = pgTable("word_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  visibility: text("visibility").notNull().default("private"),
  assignImages: boolean("assign_images").notNull().default(true),
  gradeLevel: text("grade_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table linking word lists to words
export const wordListWords = pgTable("word_list_words", {
  id: serial("id").primaryKey(),
  wordListId: integer("word_list_id").notNull(),
  wordId: integer("word_id").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wordListWordUnique: unique("word_list_word_unique").on(table.wordListId, table.wordId),
}));

export const wordIllustrations = pgTable("word_illustrations", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  wordListId: integer("word_list_id").notNull(),
  imagePath: text("image_path"),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  plaintextPassword: text("plaintext_password"),
  membersCanShareWordLists: boolean("members_can_share_word_lists").notNull().default(true),
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
  metadata: text("metadata"),
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

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flaggedWords = pgTable("flagged_words", {
  id: serial("id").primaryKey(),
  wordId: integer("word_id").notNull(),
  userId: integer("user_id"),
  gameMode: text("game_mode").notNull(),
  flaggedContentTypes: text("flagged_content_types").array().notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userHiddenWordLists = pgTable("user_hidden_word_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  wordListId: integer("word_list_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userWordListUnique: unique("user_hidden_word_list_unique").on(table.userId, table.wordListId),
}));

export const wordListUserShares = pgTable("word_list_user_shares", {
  id: serial("id").primaryKey(),
  wordListId: integer("word_list_id").notNull(),
  sharedWithUserId: integer("shared_with_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wordListUserUnique: unique("word_list_user_share_unique").on(table.wordListId, table.sharedWithUserId),
}));

export const familyAccounts = pgTable("family_accounts", {
  id: serial("id").primaryKey(),
  primaryParentUserId: integer("primary_parent_user_id").notNull(),
  vpcStatus: text("vpc_status").notNull().default("pending"),
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionAmount: integer("subscription_amount").default(500),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  vpcVerifiedAt: timestamp("vpc_verified_at"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  lastPaymentMethod: text("last_payment_method"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  renewalReminderSentAt: timestamp("renewal_reminder_sent_at"),
  emailVerifiedAt: timestamp("email_verified_at"),
  legalAcceptedAt: timestamp("legal_accepted_at"),
  appliedPromoCode: text("applied_promo_code"),
  promoDiscountPercent: integer("promo_discount_percent").notNull().default(0),
});

export const familyLegalAcceptances = pgTable("family_legal_acceptances", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull(),
  userId: integer("user_id").notNull(),
  tosVersion: text("tos_version").notNull().default("1.1"),
  privacyVersion: text("privacy_version").notNull().default("1.1"),
  acceptedTos: boolean("accepted_tos").notNull(),
  acceptedPrivacy: boolean("accepted_privacy").notNull(),
  acceptedParentalConsent: boolean("accepted_parental_consent").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("child"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  familyMemberUnique: unique("family_member_unique").on(table.familyId, table.userId),
}));

export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  description: text("description"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("completed"),
});

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
  volleyball_theme: {
    id: "volleyball_theme",
    name: "Volleyball Theme",
    description: "Spike your way to spelling success on the volleyball court!",
    cost: 5,
    type: "theme" as const,
    themeId: "volleyball",
  },
  mermaid_theme: {
    id: "mermaid_theme",
    name: "Mermaid Theme",
    description: "Dive into an underwater adventure with a magical mermaid character!",
    cost: 5,
    type: "theme" as const,
    themeId: "mermaid",
  },
  dragon_theme: {
    id: "dragon_theme",
    name: "Dragon Theme",
    description: "Soar through the skies with a friendly dragon companion!",
    cost: 5,
    type: "theme" as const,
    themeId: "dragon",
  },
  videogame_theme: {
    id: "videogame_theme",
    name: "Video Game Theme",
    description: "Enter a retro pixel world with classic platformer vibes!",
    cost: 5,
    type: "theme" as const,
    themeId: "videogame",
  },
  anime_theme: {
    id: "anime_theme",
    name: "Anime Theme",
    description: "Join an adorable anime adventure with a cute cat companion!",
    cost: 5,
    type: "theme" as const,
    themeId: "anime",
  },
} as const;

export type ShopItemId = keyof typeof SHOP_ITEMS;
export type ShopItem = typeof SHOP_ITEMS[ShopItemId];

export type ThemeId = "default" | "pirate" | "space" | "soccer" | "skiing" | "basketball" | "robot" | "unicorn" | "volleyball" | "mermaid" | "dragon" | "videogame" | "anime";

export interface ThemeAssets {
  backgroundLandscape: string;
  backgroundPortrait: string;
  mascotTrophy: string;
  mascotGoodTry: string;
  name: string;
}

export const AVAILABLE_THEMES: Record<ThemeId, { name: string; requiresPurchase: boolean; shopItemId?: ShopItemId }> = {
  default: {
    name: "Playground",
    requiresPurchase: false,
  },
  pirate: {
    name: "Pirate",
    requiresPurchase: true,
    shopItemId: "pirate_theme",
  },
  space: {
    name: "Space",
    requiresPurchase: true,
    shopItemId: "space_theme",
  },
  soccer: {
    name: "Soccer",
    requiresPurchase: true,
    shopItemId: "soccer_theme",
  },
  skiing: {
    name: "Skiing",
    requiresPurchase: true,
    shopItemId: "skiing_theme",
  },
  basketball: {
    name: "Basketball",
    requiresPurchase: true,
    shopItemId: "basketball_theme",
  },
  robot: {
    name: "Robot",
    requiresPurchase: true,
    shopItemId: "robot_theme",
  },
  unicorn: {
    name: "Unicorn",
    requiresPurchase: true,
    shopItemId: "unicorn_theme",
  },
  volleyball: {
    name: "Volleyball",
    requiresPurchase: true,
    shopItemId: "volleyball_theme",
  },
  mermaid: {
    name: "Mermaid",
    requiresPurchase: true,
    shopItemId: "mermaid_theme",
  },
  dragon: {
    name: "Dragon",
    requiresPurchase: true,
    shopItemId: "dragon_theme",
  },
  videogame: {
    name: "Video Game",
    requiresPurchase: true,
    shopItemId: "videogame_theme",
  },
  anime: {
    name: "Anime",
    requiresPurchase: true,
    shopItemId: "anime_theme",
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
  wordLists: many(wordLists),
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

export const wordsRelations = relations(words, ({ many }) => ({
  wordListWordsJunction: many(wordListWords),
}));

export const wordListsRelations = relations(wordLists, ({ one, many }) => ({
  user: one(users, {
    fields: [wordLists.userId],
    references: [users.id],
  }),
  wordListWordsJunction: many(wordListWords),
  wordListUserGroups: many(wordListUserGroups),
  wordIllustrations: many(wordIllustrations),
  achievements: many(achievements),
}));

// Relations for wordListWords junction table
export const wordListWordsRelations = relations(wordListWords, ({ one }) => ({
  wordList: one(wordLists, {
    fields: [wordListWords.wordListId],
    references: [wordLists.id],
  }),
  word: one(words, {
    fields: [wordListWords.wordId],
    references: [words.id],
  }),
}));

export const wordIllustrationsRelations = relations(wordIllustrations, ({ one }) => ({
  wordList: one(wordLists, {
    fields: [wordIllustrations.wordListId],
    references: [wordLists.id],
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
  wordList: one(wordLists, {
    fields: [wordListUserGroups.wordListId],
    references: [wordLists.id],
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
  wordList: one(wordLists, {
    fields: [achievements.wordListId],
    references: [wordLists.id],
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
  wordList: one(wordLists, {
    fields: [headToHeadChallenges.wordListId],
    references: [wordLists.id],
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

// InsertCustomWordList schema using wordLists table but with words array for backward compatibility
export const insertCustomWordListSchema = createInsertSchema(wordLists).omit({
  id: true,
  createdAt: true,
}).extend({
  words: z.array(z.string().min(1).max(100)).min(5).max(5000),
  name: z.string().min(1).max(100),
  gradeLevel: z.string().max(50).optional(),
  visibility: z.enum(["public", "private", "groups"]).optional(),
  assignImages: z.boolean().optional(),
});

export const insertWordListSchema = createInsertSchema(wordLists).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1).max(100),
  gradeLevel: z.string().max(50).optional(),
  visibility: z.enum(["public", "private", "groups"]).optional(),
  assignImages: z.boolean().optional(),
});

export const insertWordListWordSchema = createInsertSchema(wordListWords).omit({
  id: true,
  createdAt: true,
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

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertFlaggedWordSchema = createInsertSchema(flaggedWords).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.number().nullable().optional(),
  flaggedContentTypes: z.array(z.enum(["definition", "sentence", "origin"])).min(1, "Please select at least one content type"),
  comments: z.string().max(500).optional(),
  gameMode: z.enum(["practice", "timed", "quiz", "scramble"]),
});

export const insertUserHiddenWordListSchema = createInsertSchema(userHiddenWordLists).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyAccountSchema = createInsertSchema(familyAccounts).omit({
  id: true,
  createdAt: true,
  vpcVerifiedAt: true,
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  paymentDate: true,
});

export const schoolAccounts = pgTable("school_accounts", {
  id: serial("id").primaryKey(),
  schoolAdminUserId: integer("school_admin_user_id").notNull(),
  schoolName: text("school_name").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"),
  subscriptionAmount: integer("subscription_amount").default(99),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  coppaCertifiedAt: timestamp("coppa_certified_at"),
});

export const schoolMembers = pgTable("school_members", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("student"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  schoolMemberUnique: unique("school_member_unique").on(table.schoolId, table.userId),
}));

export const schoolPaymentHistory = pgTable("school_payment_history", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  paymentMethod: text("payment_method").notNull().default("adult_verification"),
  status: text("status").notNull().default("completed"),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
});

export const schoolCertifications = pgTable("school_certifications", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  adminUserId: integer("admin_user_id").notNull(),
  certifiedAuthority: boolean("certified_authority").notNull(),
  certifiedCoppaSchoolException: boolean("certified_coppa_school_exception").notNull(),
  certifiedParentalConsentObtained: boolean("certified_parental_consent_obtained").notNull(),
  certifiedEducationalUseOnly: boolean("certified_educational_use_only").notNull(),
  certifiedFerpaAcknowledgment: boolean("certified_ferpa_acknowledgment").notNull(),
  certifiedAccuracyOfInfo: boolean("certified_accuracy_of_info").notNull(),
  agreedToTos: boolean("agreed_to_tos").notNull(),
  agreedToDpa: boolean("agreed_to_dpa").notNull(),
  agreementVersion: text("agreement_version").notNull(),
  acceptedAtUtc: timestamp("accepted_at_utc", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const insertSchoolCertificationSchema = createInsertSchema(schoolCertifications).omit({
  id: true,
  acceptedAtUtc: true,
});

export type InsertSchoolCertification = z.infer<typeof insertSchoolCertificationSchema>;
export type SchoolCertification = typeof schoolCertifications.$inferSelect;

export const insertSchoolAccountSchema = createInsertSchema(schoolAccounts).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});

export const insertSchoolMemberSchema = createInsertSchema(schoolMembers).omit({
  id: true,
  createdAt: true,
});

export const insertSchoolPaymentHistorySchema = createInsertSchema(schoolPaymentHistory).omit({
  id: true,
  paymentDate: true,
});

export const agreementAcceptances = pgTable("agreement_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountType: text("account_type").notNull(),
  agreementType: text("agreement_type").notNull(),
  agreementVersion: text("agreement_version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  textSnapshot: text("text_snapshot"),
  certificationCheckbox: boolean("certification_checkbox").notNull().default(true),
});

export const insertAgreementAcceptanceSchema = createInsertSchema(agreementAcceptances).omit({
  id: true,
  acceptedAt: true,
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
// CustomWordList type using wordLists table but with words array for backward compatibility
export type CustomWordList = typeof wordLists.$inferSelect & { words: string[] };
export type InsertWordList = z.infer<typeof insertWordListSchema>;
export type WordList = typeof wordLists.$inferSelect;
export type InsertWordListWord = z.infer<typeof insertWordListWordSchema>;
export type WordListWord = typeof wordListWords.$inferSelect;
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
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertFlaggedWord = z.infer<typeof insertFlaggedWordSchema>;
export type FlaggedWord = typeof flaggedWords.$inferSelect;
export type InsertUserHiddenWordList = z.infer<typeof insertUserHiddenWordListSchema>;
export type UserHiddenWordList = typeof userHiddenWordLists.$inferSelect;
export type InsertFamilyAccount = z.infer<typeof insertFamilyAccountSchema>;
export type FamilyAccount = typeof familyAccounts.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertSchoolAccount = z.infer<typeof insertSchoolAccountSchema>;
export type SchoolAccount = typeof schoolAccounts.$inferSelect;
export type InsertSchoolMember = z.infer<typeof insertSchoolMemberSchema>;
export type SchoolMember = typeof schoolMembers.$inferSelect;
export type InsertSchoolPaymentHistory = z.infer<typeof insertSchoolPaymentHistorySchema>;
export type SchoolPaymentHistory = typeof schoolPaymentHistory.$inferSelect;
export type InsertAgreementAcceptance = z.infer<typeof insertAgreementAcceptanceSchema>;
export type AgreementAcceptance = typeof agreementAcceptances.$inferSelect;

// Promo codes table
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  codeType: text("code_type").notNull().default("one_time"), // 'one_time' | 'ongoing'
  duration: text("duration").notNull().default("once"), // 'once' (first period only) | 'forever' (all renewals)
  applicablePlans: text("applicable_plans").notNull().default("both"), // 'monthly' | 'annual' | 'both'
  usesCount: integer("uses_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usesCount: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// Promo code usages
export const promoCodeUsages = pgTable("promo_code_usages", {
  id: serial("id").primaryKey(),
  codeId: integer("code_id").notNull(),
  userId: integer("user_id"),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type InsertPromoCode_ = z.infer<typeof insertPromoCodeSchema>;

// User preferences table (persisted filter/UI state)
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Choose Your Word List screen (game mode dialog)
  gameGradeFilter: text("game_grade_filter").notNull().default("all"),
  gameCreatedByFilter: text("game_created_by_filter").notNull().default("me"),
  gameHideMastered: boolean("game_hide_mastered").notNull().default(false),
  // Word Lists screen
  wordListGradeFilter: text("word_list_grade_filter").notNull().default("all"),
  wordListCreatedByFilter: text("word_list_created_by_filter").notNull().default("me"),
  wordListHideMastered: boolean("word_list_hide_mastered").notNull().default(false),
  wordListActiveTab: text("word_list_active_tab").notNull().default("all"),
  // Specific author search text
  gameSpecificAuthorSearch: text("game_specific_author_search").notNull().default(""),
  wordListSpecificAuthorSearch: text("word_list_specific_author_search").notNull().default(""),
  // My Stats screen
  statsDateFilter: text("stats_date_filter").notNull().default("all"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, updatedAt: true });
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export type GameMode = "practice" | "timed" | "quiz" | "scramble" | "mistake" | "crossword" | "headtohead";
export type VpcStatus = "pending" | "verified" | "failed";
export type SchoolVerificationStatus = "pending" | "verified";
export type FamilyRole = "parent" | "child";
export type FamilyMemberStatus = "active" | "invited" | "suspended";
export type SchoolRole = "admin" | "teacher" | "student";

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
