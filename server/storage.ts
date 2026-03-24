import { 
  type Word, 
  type InsertWord, 
  type GameSession, 
  type InsertGameSession, 
  type User,
  type InsertUser,
  type LeaderboardScore,
  type InsertLeaderboardScore,
  type CustomWordList,
  type InsertCustomWordList,
  type WordList,
  type InsertWordList,
  type WordListWord,
  type InsertWordListWord,
  type WordIllustration,
  type InsertWordIllustration,
  type UserGroup,
  type InsertUserGroup,
  type UserGroupMembership,
  type InsertUserGroupMembership,
  type UserToDoItem,
  type InsertUserToDoItem,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Achievement,
  type InsertAchievement,
  type UserStreak,
  type InsertUserStreak,
  type UserItem,
  type WordListCoOwner,
  type UserGroupCoOwner,
  type HeadToHeadChallenge,
  type InsertHeadToHeadChallenge,
  type FlaggedWord,
  type InsertFlaggedWord,
  type UserHiddenWordList,
  type FamilyAccount,
  type InsertFamilyAccount,
  type FamilyMember,
  type InsertFamilyMember,
  type PaymentHistory,
  type InsertPaymentHistory,
  words,
  gameSessions,
  users,
  leaderboardScores,
  wordLists,
  wordListWords,
  wordIllustrations,
  userGroups,
  userGroupMembership,
  userToDoItems,
  wordListUserGroups,
  wordListCoOwners,
  userGroupCoOwners,
  passwordResetTokens,
  achievements,
  userStreaks,
  userItems,
  headToHeadChallenges,
  appSettings,
  flaggedWords,
  userHiddenWordLists,
  wordListUserShares,
  familyAccounts,
  familyLegalAcceptances,
  familyMembers,
  paymentHistory,
  schoolAccounts,
  schoolMembers,
  schoolPaymentHistory,
  schoolCertifications,
  agreementAcceptances,
  SHOP_ITEMS,
  type ShopItemId,
  type SchoolAccount,
  type InsertSchoolAccount,
  type SchoolMember,
  type InsertSchoolMember,
  type SchoolPaymentHistory,
  type InsertSchoolPaymentHistory,
  type SchoolCertification,
  type InsertSchoolCertification,
  type AgreementAcceptance,
  type InsertAgreementAcceptance,
  type PromoCode,
  type InsertPromoCode,
  promoCodes,
  promoCodeUsages,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, not, or, isNull, like, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { APP_VERSION } from "@shared/version";
import { encryptUserPII, decryptUserPII, encrypt, decrypt, hasEncryptionKey } from "./services/encryption";

export interface IStorage {
  getWord(id: number): Promise<Word | undefined>;
  getWordByText(word: string): Promise<Word | undefined>;
  getWordsByTexts(wordTexts: string[]): Promise<Word[]>;
  createWord(word: InsertWord): Promise<Word>;
  upsertWord(word: string, definition?: string, sentenceExample?: string, wordOrigin?: string, partOfSpeech?: string, overwrite?: boolean): Promise<Word>;
  deleteWord(id: number): Promise<boolean>;
  
  getGameSession(id: number): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: number, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  getGameSessionsForWordList(wordListId: number, userId: number): Promise<GameSession[]>;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: number, preferences: { preferredVoice?: string | null }): Promise<User>;
  updateUserEmail(userId: number, email: string): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string; email?: string; selectedAvatar?: string }): Promise<User>;
  
  createLeaderboardScore(score: InsertLeaderboardScore): Promise<LeaderboardScore>;
  getTopScores(gameMode?: string, limit?: number): Promise<LeaderboardScore[]>;
  getUserBestScores(userId: number): Promise<LeaderboardScore[]>;
  
  createCustomWordList(list: InsertCustomWordList): Promise<CustomWordList>;
  getCustomWordList(id: number): Promise<CustomWordList | undefined>;
  getUserCustomWordLists(userId: number): Promise<CustomWordList[]>;
  getPublicCustomWordLists(): Promise<CustomWordList[]>;
  getGroupSharedWordLists(userId: number): Promise<CustomWordList[]>;
  updateCustomWordList(id: number, updates: Partial<InsertCustomWordList>): Promise<CustomWordList | undefined>;
  deleteCustomWordList(id: number): Promise<boolean>;
  
  // New WordList methods (using word IDs via junction table)
  createWordList(list: InsertWordList): Promise<WordList>;
  getWordList(id: number): Promise<WordList | undefined>;
  getUserWordListsNew(userId: number): Promise<WordList[]>;
  getPublicWordLists(): Promise<WordList[]>;
  updateWordList(id: number, updates: Partial<InsertWordList>): Promise<WordList | undefined>;
  deleteWordList(id: number): Promise<boolean>;
  
  // WordListWord junction table methods
  addWordToWordList(wordListId: number, wordId: number, position: number): Promise<WordListWord>;
  removeWordFromWordList(wordListId: number, wordId: number): Promise<boolean>;
  getWordListWords(wordListId: number): Promise<{ wordId: number; word: Word; position: number }[]>;
  setWordListWords(wordListId: number, wordIds: number[]): Promise<void>;
  
  createWordIllustration(illustration: InsertWordIllustration): Promise<WordIllustration>;
  getWordIllustration(word: string, wordListId: number): Promise<WordIllustration | undefined>;
  getWordIllustrationsForWordList(wordListId: number): Promise<WordIllustration[]>;
  getAllWordIllustrations(): Promise<WordIllustration[]>;
  updateWordIllustration(id: number, updates: Partial<InsertWordIllustration>): Promise<WordIllustration | undefined>;
  deleteWordIllustrationForWordList(word: string, wordListId: number): Promise<boolean>;
  
  createUserGroup(group: any): Promise<any>;
  getUserGroup(groupId: number): Promise<any>;
  getUserAccessibleGroups(userId: number): Promise<any[]>;
  updateUserGroup(groupId: number, updates: Partial<InsertUserGroup>): Promise<any>;
  deleteUserGroup(groupId: number): Promise<boolean>;
  addGroupMember(groupId: number, userId: number): Promise<any>;
  removeGroupMember(groupId: number, userId: number): Promise<boolean>;
  getGroupMembers(groupId: number): Promise<any[]>;
  approveGroupJoinRequest(groupId: number, requestId: number): Promise<any>;
  denyGroupJoinRequest(groupId: number, requestId: number): Promise<boolean>;
  
  createToDoItem(todo: any): Promise<any>;
  getUserToDoItems(userId: number): Promise<any[]>;
  getUserPendingRequests(userId: number): Promise<any[]>;
  getToDoItem(todoId: number): Promise<any>;
  updateToDoItem(todoId: number, updates: any): Promise<any>;
  deleteToDoItem(todoId: number): Promise<boolean>;
  deleteFlaggedContentToDos(word: string): Promise<number>;
  
  searchUsers(query: string): Promise<any[]>;
  
  getUserOwnedGroups(userId: number): Promise<any[]>;
  getCoOwnedGroups(userId: number): Promise<any[]>;
  getUserWordLists(userId: number): Promise<CustomWordList[]>;
  getWordListsSharedWithGroups(groupIds: number[]): Promise<CustomWordList[]>;
  getGameSessionsByUserAndList(userId: number, wordListId: number): Promise<GameSession[]>;
  getGameSessionsByWordList(wordListId: number): Promise<GameSession[]>;
  
  getWordListSharedGroupIds(wordListId: number): Promise<number[]>;
  setWordListSharedGroups(wordListId: number, groupIds: number[]): Promise<void>;
  isUserMemberOfWordListGroups(userId: number, wordListId: number): Promise<boolean>;
  isWordListDirectlySharedWithUser(wordListId: number, userId: number): Promise<boolean>;
  isUserGroupMember(userId: number, groupId: number): Promise<boolean>;
  
  getWordListCoOwners(wordListId: number): Promise<WordListCoOwner[]>;
  addWordListCoOwner(wordListId: number, coOwnerUserId: number): Promise<WordListCoOwner>;
  removeWordListCoOwner(wordListId: number, coOwnerUserId: number): Promise<boolean>;
  isWordListCoOwner(wordListId: number, userId: number): Promise<boolean>;
  
  getGroupCoOwners(groupId: number): Promise<UserGroupCoOwner[]>;
  addGroupCoOwner(groupId: number, coOwnerUserId: number): Promise<UserGroupCoOwner>;
  removeGroupCoOwner(groupId: number, coOwnerUserId: number): Promise<boolean>;
  isGroupCoOwner(groupId: number, userId: number): Promise<boolean>;
  
  getTeachers(): Promise<User[]>;
  searchTeachers(query: string): Promise<User[]>;
  
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  getPasswordResetTokenById(id: number): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: number): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
  deleteUnusedTokensForUser(userId: number): Promise<void>;
  
  getAchievement(userId: number, wordListId: number, achievementType: string): Promise<Achievement | undefined>;
  getUserAchievements(userId: number): Promise<Achievement[]>;
  getWordListAchievements(wordListId: number): Promise<Achievement[]>;
  upsertAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserStats(userId: number, dateFilter: string, timezone: string): Promise<any>;
  
  getUserStreak(userId: number): Promise<UserStreak | undefined>;
  createUserStreak(userId: number): Promise<UserStreak>;
  updateUserStreak(userId: number, currentStreak: number, longestStreak: number): Promise<UserStreak>;
  incrementWordStreak(userId: number): Promise<void>;
  resetWordStreak(userId: number): Promise<void>;
  
  incrementUserStars(userId: number, amount: number): Promise<void>;
  
  getUserItems(userId: number): Promise<UserItem[]>;
  purchaseItem(userId: number, itemId: ShopItemId, quantity?: number): Promise<{ success: boolean; newStarBalance: number; newItemQuantity: number; error?: string }>;
  useItem(userId: number, itemId: ShopItemId, quantity?: number): Promise<{ success: boolean; remainingQuantity: number; error?: string }>;
  
  createChallenge(challenge: InsertHeadToHeadChallenge): Promise<HeadToHeadChallenge>;
  getChallenge(id: number): Promise<HeadToHeadChallenge | undefined>;
  getUserPendingChallenges(userId: number): Promise<HeadToHeadChallenge[]>;
  getUserActiveChallenges(userId: number): Promise<HeadToHeadChallenge[]>;
  getUserCompletedChallenges(userId: number): Promise<HeadToHeadChallenge[]>;
  updateChallenge(id: number, updates: Partial<HeadToHeadChallenge>): Promise<HeadToHeadChallenge | undefined>;
  getUserChallengeRecord(userId: number, startDate?: Date, endDate?: Date): Promise<{ wins: number; losses: number; ties: number }>;
  isUserParticipantInActiveChallenge(userId: number, wordListId: number): Promise<boolean>;
  
  getAppSetting(key: string): Promise<string | undefined>;
  setAppSetting(key: string, value: string): Promise<void>;
  bumpAppVersion(): Promise<string>;
  
  createFlaggedWord(flag: InsertFlaggedWord): Promise<FlaggedWord>;
  getAllFlaggedWords(): Promise<(FlaggedWord & { word: string })[]>;
  deleteFlaggedWord(id: number): Promise<boolean>;
  getAdminEmails(): Promise<string[]>;
  getAdminUserIds(): Promise<number[]>;
  
  getUserHiddenWordLists(userId: number): Promise<UserHiddenWordList[]>;
  hideWordList(userId: number, wordListId: number): Promise<UserHiddenWordList>;
  unhideWordList(userId: number, wordListId: number): Promise<boolean>;
  isWordListHidden(userId: number, wordListId: number): Promise<boolean>;
  
  // Admin methods
  searchWords(query: string, limit?: number): Promise<Word[]>;
  getAllWords(): Promise<Word[]>;
  updateWord(id: number, updates: Partial<{ definition: string | null; sentenceExample: string | null; wordOrigin: string | null; partOfSpeech: string | null }>, updatedByUserId?: number): Promise<Word | undefined>;
  getUsageMetrics(dateRange: 'today' | 'week' | 'month' | 'all'): Promise<{ userId: number | null; username: string; gamesPlayed: number }[]>;
  getAllUsersWithMetrics(): Promise<{ id: number; username: string; firstName: string | null; lastName: string | null; email: string | null; role: string; accountType: string; subscriptionExpiresAt: Date | null; createdAt: Date; gamesPlayed: number; lastActive: Date | null }[]>;
  deleteUserAndAllData(userId: number): Promise<boolean>;
  
  // Family account methods
  createFamilyAccount(parentUserId: number): Promise<FamilyAccount>;
  getFamilyAccount(id: number): Promise<FamilyAccount | undefined>;
  getFamilyAccountByParentId(parentUserId: number): Promise<FamilyAccount | undefined>;
  getFamilyAccountByStripeSubscriptionId(subscriptionId: string): Promise<FamilyAccount | undefined>;
  getFamilyAccountByStripeCustomerId(customerId: string): Promise<FamilyAccount | undefined>;
  updateFamilyAccount(id: number, updates: Partial<FamilyAccount>): Promise<FamilyAccount | undefined>;
  getFamilyAccountsNeedingRenewalReminder(): Promise<FamilyAccount[]>;
  createFamilyLegalAcceptance(data: { familyId: number; userId: number; ipAddress?: string; userAgent?: string }): Promise<void>;
  deleteFamilyAccount(id: number): Promise<boolean>;
  verifyFamilyVpc(familyId: number): Promise<FamilyAccount | undefined>;
  
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  getFamilyMembers(familyId: number): Promise<(FamilyMember & { user: User })[]>;
  getFamilyMemberByUserId(userId: number): Promise<FamilyMember | undefined>;
  updateFamilyMember(id: number, updates: Partial<FamilyMember>): Promise<FamilyMember | undefined>;
  removeFamilyMember(familyId: number, userId: number): Promise<boolean>;
  getChildrenMetrics(userIds: number[], dateFilter?: string): Promise<{ userId: number; gamesPlayed: number; lastActive: Date | null }[]>;
  shareWordListWithFamilyChildren(wordListId: number, familyId: number): Promise<void>;
  
  createPaymentRecord(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(familyId: number): Promise<PaymentHistory[]>;
  getPaymentsByUser(userId: number): Promise<PaymentHistory[]>;

  // School account methods
  createSchoolAccount(adminUserId: number, schoolName: string): Promise<SchoolAccount>;
  getSchoolAccount(id: number): Promise<SchoolAccount | undefined>;
  getSchoolAccountByAdminId(adminUserId: number): Promise<SchoolAccount | undefined>;
  updateSchoolAccount(id: number, updates: Partial<SchoolAccount>): Promise<SchoolAccount | undefined>;
  verifySchoolAccount(schoolId: number): Promise<SchoolAccount | undefined>;
  addSchoolMember(schoolId: number, userId: number, role: string): Promise<SchoolMember>;
  getSchoolMembers(schoolId: number): Promise<(SchoolMember & { user: User })[]>;
  getSchoolMemberByUserId(userId: number): Promise<SchoolMember | undefined>;
  removeSchoolMember(memberId: number): Promise<boolean>;
  getSchoolMembersBySchoolId(schoolId: number): Promise<SchoolMember[]>;
  createSchoolPayment(payment: InsertSchoolPaymentHistory): Promise<SchoolPaymentHistory>;
  getSchoolPayments(schoolId: number): Promise<SchoolPaymentHistory[]>;
  createAgreementAcceptance(record: InsertAgreementAcceptance): Promise<AgreementAcceptance>;
  getAgreementAcceptances(userId: number): Promise<AgreementAcceptance[]>;
  createSchoolCertification(record: InsertSchoolCertification): Promise<SchoolCertification>;
  getSchoolMetrics(schoolId: number, startDate?: Date, endDate?: Date): Promise<any>;

  // Promo codes
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  getPromoCodes(): Promise<PromoCode[]>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getPromoCodeById(id: number): Promise<PromoCode | undefined>;
  updatePromoCode(id: number, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: number): Promise<void>;
  recordPromoCodeUsage(codeId: number, userId?: number): Promise<void>;
  getPromoCodeUsages(codeId: number): Promise<{ id: number; userId: number | null; username: string | null; usedAt: Date }[]>;

  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getWord(id: number): Promise<Word | undefined> {
    const [word] = await db.select().from(words).where(eq(words.id, id));
    return word || undefined;
  }

  async getWordByText(wordText: string): Promise<Word | undefined> {
    const normalized = wordText.toLowerCase().trim();
    const [word] = await db.select().from(words).where(eq(words.word, normalized));
    return word || undefined;
  }

  async getWordsByTexts(wordTexts: string[]): Promise<Word[]> {
    if (wordTexts.length === 0) return [];
    const normalized = wordTexts.map(w => w.toLowerCase().trim());
    return await db.select().from(words).where(inArray(words.word, normalized));
  }

  async createWord(insertWord: InsertWord): Promise<Word> {
    const [word] = await db.insert(words).values(insertWord).returning();
    return word;
  }

  async upsertWord(wordText: string, definition?: string, sentenceExample?: string, wordOrigin?: string, partOfSpeech?: string, overwrite?: boolean): Promise<Word> {
    const normalized = wordText.toLowerCase().trim();
    
    const existing = await this.getWordByText(normalized);
    
    if (existing) {
      const updates: Partial<InsertWord> = {};
      
      // When overwrite=true, update all fields regardless of existing values
      if (overwrite) {
        if (definition !== undefined) updates.definition = definition || null;
        if (sentenceExample !== undefined) updates.sentenceExample = sentenceExample || null;
        if (wordOrigin !== undefined) updates.wordOrigin = wordOrigin || null;
        if (partOfSpeech !== undefined) updates.partOfSpeech = partOfSpeech || null;
      } else {
        // Only fill in missing fields
        if (definition && !existing.definition) {
          updates.definition = definition;
        }
        
        if (sentenceExample && !existing.sentenceExample) {
          updates.sentenceExample = sentenceExample;
        }
        
        if (wordOrigin && !existing.wordOrigin) {
          updates.wordOrigin = wordOrigin;
        }
        
        if (partOfSpeech && !existing.partOfSpeech) {
          updates.partOfSpeech = partOfSpeech;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        // Set updatedAt for dictionary API updates (no user ID)
        const [updated] = await db
          .update(words)
          .set({ ...updates, updatedAt: new Date(), updatedByUser: null })
          .where(eq(words.id, existing.id))
          .returning();
        return updated;
      }
      
      return existing;
    }
    
    const [newWord] = await db
      .insert(words)
      .values({
        word: normalized,
        definition: definition || null,
        sentenceExample: sentenceExample || null,
        wordOrigin: wordOrigin || null,
        partOfSpeech: partOfSpeech || null,
        updatedAt: new Date(),
        updatedByUser: null,
      })
      .returning();
    
    return newWord;
  }

  async deleteWord(id: number): Promise<boolean> {
    const result = await db.delete(words).where(eq(words.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getGameSession(id: number): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return session || undefined;
  }

  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const [session] = await db.insert(gameSessions).values(insertSession).returning();
    return session;
  }

  async updateGameSession(id: number, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const [session] = await db
      .update(gameSessions)
      .set(updates)
      .where(eq(gameSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getGameSessionsForWordList(wordListId: number, userId: number): Promise<GameSession[]> {
    // Include sessions that are complete OR have at least one word attempted
    // This ensures partial sessions (from restarts) count toward accuracy metrics
    // Check for totalWords > 0 OR correctWords > 0 OR incorrectWords array has items
    // Use COALESCE to fall back to createdAt for incomplete sessions that don't have completedAt set
    const sessions = await db
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.wordListId, wordListId),
          eq(gameSessions.userId, userId),
          sql`(${gameSessions.isComplete} = true OR COALESCE(${gameSessions.totalWords}, 0) > 0 OR COALESCE(${gameSessions.correctWords}, 0) > 0 OR COALESCE(array_length(${gameSessions.incorrectWords}, 1), 0) > 0)`
        )
      )
      .orderBy(desc(sql`COALESCE(${gameSessions.completedAt}, ${gameSessions.createdAt})`));
    return sessions;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!hasEncryptionKey()) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    }
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      const decrypted = decryptUserPII(user);
      if (decrypted.email?.toLowerCase() === email.toLowerCase()) {
        return decrypted;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const encryptedUser = hasEncryptionKey() ? encryptUserPII(insertUser) : insertUser;
    const [user] = await db.insert(users).values(encryptedUser).returning();
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async updateUserPreferences(userId: number, preferences: { preferredVoice?: string | null; selectedTheme?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set(preferences)
      .where(eq(users.id, userId))
      .returning();
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async updateUserEmail(userId: number, email: string): Promise<User> {
    const encryptedEmail = hasEncryptionKey() ? encrypt(email) : email;
    const [user] = await db
      .update(users)
      .set({ email: encryptedEmail })
      .where(eq(users.id, userId))
      .returning();
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId))
      .returning();
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string; email?: string; selectedAvatar?: string }): Promise<User> {
    const encryptedUpdates = hasEncryptionKey() ? encryptUserPII(updates) : updates;
    const [user] = await db
      .update(users)
      .set(encryptedUpdates)
      .where(eq(users.id, userId))
      .returning();
    return hasEncryptionKey() ? decryptUserPII(user) : user;
  }

  async createLeaderboardScore(insertScore: InsertLeaderboardScore): Promise<LeaderboardScore> {
    const [score] = await db.insert(leaderboardScores).values(insertScore).returning();
    
    // Keep only top 10 scores - delete all scores outside the top 10
    const topScores = await db
      .select({ id: leaderboardScores.id })
      .from(leaderboardScores)
      .orderBy(desc(leaderboardScores.score))
      .limit(10);
    
    const topScoreIds = topScores.map(s => s.id);
    
    if (topScoreIds.length > 0) {
      await db
        .delete(leaderboardScores)
        .where(sql`${leaderboardScores.id} NOT IN (${sql.join(topScoreIds.map(id => sql`${id}`), sql`, `)})`);
    }
    
    return score;
  }

  async getTopScores(gameMode?: string, limit: number = 10): Promise<any[]> {
    const baseQuery = db
      .select({
        id: leaderboardScores.id,
        userId: leaderboardScores.userId,
        sessionId: leaderboardScores.sessionId,
        score: leaderboardScores.score,
        accuracy: leaderboardScores.accuracy,
        gameMode: leaderboardScores.gameMode,
        createdAt: leaderboardScores.createdAt,
        username: users.username,
        selectedAvatar: users.selectedAvatar,
      })
      .from(leaderboardScores)
      .leftJoin(users, eq(leaderboardScores.userId, users.id));

    if (gameMode) {
      return await baseQuery
        .where(eq(leaderboardScores.gameMode, gameMode))
        .orderBy(desc(leaderboardScores.score))
        .limit(limit);
    }

    return await baseQuery
      .orderBy(desc(leaderboardScores.score))
      .limit(limit);
  }

  async getUserBestScores(userId: number): Promise<LeaderboardScore[]> {
    return await db
      .select()
      .from(leaderboardScores)
      .where(eq(leaderboardScores.userId, userId))
      .orderBy(desc(leaderboardScores.score))
      .limit(10);
  }

  async createCustomWordList(list: InsertCustomWordList): Promise<CustomWordList> {
    // Use new wordLists table - create list and then add words via junction table
    const { words: wordTexts, ...listData } = list;
    
    const [newList] = await db.insert(wordLists).values(listData).returning();
    
    // Ensure all words exist in words table and create junction records
    for (let position = 0; position < wordTexts.length; position++) {
      const wordText = wordTexts[position].toLowerCase().trim();
      
      // Find or create the word
      let [existingWord] = await db
        .select()
        .from(words)
        .where(eq(words.word, wordText));
      
      if (!existingWord) {
        [existingWord] = await db.insert(words).values({ word: wordText }).returning();
      }
      
      // Create junction record
      await db.insert(wordListWords).values({
        wordListId: newList.id,
        wordId: existingWord.id,
        position: position,
      }).onConflictDoNothing();
    }
    
    // Return in the expected CustomWordList format (with words array)
    return {
      ...newList,
      isPublic: newList.isPublic,
      words: wordTexts,
    } as unknown as CustomWordList;
  }

  async getCustomWordList(id: number): Promise<CustomWordList | undefined> {
    // Use new wordLists table
    const [list] = await db.select().from(wordLists).where(eq(wordLists.id, id));
    if (!list) return undefined;
    
    // Fetch words from junction table
    const wordAssociations = await db
      .select({ wordText: words.word })
      .from(wordListWords)
      .innerJoin(words, eq(wordListWords.wordId, words.id))
      .where(eq(wordListWords.wordListId, id))
      .orderBy(wordListWords.position);
    
    const wordTexts = wordAssociations.map(w => w.wordText);
    
    return {
      ...list,
      words: wordTexts,
    } as unknown as CustomWordList;
  }

  async getSystemWordListId(): Promise<number | null> {
    // Use new wordLists table
    const [systemList] = await db
      .select({ id: wordLists.id })
      .from(wordLists)
      .where(
        and(
          eq(wordLists.name, 'System Illustrations'),
          eq(wordLists.gradeLevel, 'System')
        )
      );
    return systemList?.id || null;
  }

  async getUserCustomWordLists(userId: number): Promise<any[]> {
    // Use new wordLists table instead of customWordLists
    const lists = await db
      .select({
        id: wordLists.id,
        userId: wordLists.userId,
        name: wordLists.name,
        visibility: wordLists.visibility,
        assignImages: wordLists.assignImages,
        gradeLevel: wordLists.gradeLevel,
        createdAt: wordLists.createdAt,
        authorUsername: users.username,
      })
      .from(wordLists)
      .leftJoin(users, eq(wordLists.userId, users.id))
      .where(eq(wordLists.userId, userId))
      .orderBy(desc(wordLists.createdAt));
    
    if (lists.length === 0) {
      return [];
    }
    
    // Fetch words for all lists from junction table
    const listIds = lists.map(l => l.id);
    const wordAssociations = await db
      .select({
        wordListId: wordListWords.wordListId,
        wordText: words.word,
        position: wordListWords.position,
      })
      .from(wordListWords)
      .innerJoin(words, eq(wordListWords.wordId, words.id))
      .where(inArray(wordListWords.wordListId, listIds))
      .orderBy(wordListWords.wordListId, wordListWords.position);
    
    // Group words by list ID
    const wordsByList = new Map<number, string[]>();
    for (const assoc of wordAssociations) {
      if (!wordsByList.has(assoc.wordListId)) {
        wordsByList.set(assoc.wordListId, []);
      }
      wordsByList.get(assoc.wordListId)!.push(assoc.wordText);
    }
    
    // Fetch group information for lists with 'groups' visibility
    const groupVisibleListIds = lists.filter(list => list.visibility === 'groups').map(list => list.id);
    const groupsByWordList = new Map<number, any[]>();
    
    if (groupVisibleListIds.length > 0) {
      const groupMappings = await db
        .select({
          wordListId: wordListUserGroups.wordListId,
          groupId: wordListUserGroups.groupId,
          groupName: userGroups.name,
        })
        .from(wordListUserGroups)
        .leftJoin(userGroups, eq(wordListUserGroups.groupId, userGroups.id))
        .where(inArray(wordListUserGroups.wordListId, groupVisibleListIds));
      
      for (const mapping of groupMappings) {
        if (!groupsByWordList.has(mapping.wordListId)) {
          groupsByWordList.set(mapping.wordListId, []);
        }
        groupsByWordList.get(mapping.wordListId)!.push({
          id: mapping.groupId,
          name: mapping.groupName,
        });
      }
    }
    
    // Build result with words array and group info
    return lists.map(list => ({
      ...list,
      words: wordsByList.get(list.id) || [],
      sharedGroups: list.visibility === 'groups' ? (groupsByWordList.get(list.id) || []) : [],
    }));
  }

  async getPublicCustomWordLists(): Promise<any[]> {
    // Use new wordLists table
    const lists = await db
      .select({
        id: wordLists.id,
        userId: wordLists.userId,
        name: wordLists.name,
        visibility: wordLists.visibility,
        assignImages: wordLists.assignImages,
        gradeLevel: wordLists.gradeLevel,
        createdAt: wordLists.createdAt,
        authorUsername: users.username,
      })
      .from(wordLists)
      .leftJoin(users, eq(wordLists.userId, users.id))
      .where(eq(wordLists.visibility, 'public'))
      .orderBy(desc(wordLists.createdAt));
    
    if (lists.length === 0) {
      return [];
    }
    
    // Fetch words for all lists from junction table
    const listIds = lists.map(l => l.id);
    const wordAssociations = await db
      .select({
        wordListId: wordListWords.wordListId,
        wordText: words.word,
        position: wordListWords.position,
      })
      .from(wordListWords)
      .innerJoin(words, eq(wordListWords.wordId, words.id))
      .where(inArray(wordListWords.wordListId, listIds))
      .orderBy(wordListWords.wordListId, wordListWords.position);
    
    // Group words by list ID
    const wordsByList = new Map<number, string[]>();
    for (const assoc of wordAssociations) {
      if (!wordsByList.has(assoc.wordListId)) {
        wordsByList.set(assoc.wordListId, []);
      }
      wordsByList.get(assoc.wordListId)!.push(assoc.wordText);
    }
    
    // Public lists don't need group information, but return in consistent format
    return lists.map(list => ({
      ...list,
      words: wordsByList.get(list.id) || [],
      sharedGroups: [],
    }));
  }

  async getGroupSharedWordLists(userId: number): Promise<any[]> {
    // First, get all groups the user is a member of or owns
    const userGroupIds = await db
      .select({ groupId: userGroupMembership.groupId })
      .from(userGroupMembership)
      .where(eq(userGroupMembership.userId, userId));
    
    const ownedGroups = await db
      .select({ groupId: userGroups.id })
      .from(userGroups)
      .where(eq(userGroups.ownerUserId, userId));
    
    const allGroupIds = [
      ...userGroupIds.map(g => g.groupId),
      ...ownedGroups.map(g => g.groupId)
    ];
    
    // Get word lists shared via groups
    let groupSharedListIds: number[] = [];
    if (allGroupIds.length > 0) {
      const sharedListIds = await db
        .select({ wordListId: wordListUserGroups.wordListId })
        .from(wordListUserGroups)
        .where(inArray(wordListUserGroups.groupId, allGroupIds));
      groupSharedListIds = sharedListIds.map(s => s.wordListId);
    }
    
    // Get word lists shared directly with the user (e.g., from family parents)
    const directSharedListIds = await db
      .select({ wordListId: wordListUserShares.wordListId })
      .from(wordListUserShares)
      .where(eq(wordListUserShares.sharedWithUserId, userId));
    
    const allSharedListIds = [
      ...groupSharedListIds,
      ...directSharedListIds.map(s => s.wordListId)
    ];
    
    if (allSharedListIds.length === 0) {
      return [];
    }
    
    const uniqueListIds = Array.from(new Set(allSharedListIds));
    
    // Use new wordLists table - Fetch the actual word lists (excluding ones owned by the user)
    const lists = await db
      .select({
        id: wordLists.id,
        userId: wordLists.userId,
        name: wordLists.name,
        visibility: wordLists.visibility,
        assignImages: wordLists.assignImages,
        gradeLevel: wordLists.gradeLevel,
        createdAt: wordLists.createdAt,
        authorUsername: users.username,
      })
      .from(wordLists)
      .leftJoin(users, eq(wordLists.userId, users.id))
      .where(
        and(
          inArray(wordLists.id, uniqueListIds),
          not(eq(wordLists.userId, userId))
        )
      )
      .orderBy(desc(wordLists.createdAt));
    
    if (lists.length === 0) {
      return [];
    }
    
    // Fetch words for all lists from junction table
    const listIds = lists.map(l => l.id);
    const wordAssociations = await db
      .select({
        wordListId: wordListWords.wordListId,
        wordText: words.word,
        position: wordListWords.position,
      })
      .from(wordListWords)
      .innerJoin(words, eq(wordListWords.wordId, words.id))
      .where(inArray(wordListWords.wordListId, listIds))
      .orderBy(wordListWords.wordListId, wordListWords.position);
    
    // Group words by list ID
    const wordsByList = new Map<number, string[]>();
    for (const assoc of wordAssociations) {
      if (!wordsByList.has(assoc.wordListId)) {
        wordsByList.set(assoc.wordListId, []);
      }
      wordsByList.get(assoc.wordListId)!.push(assoc.wordText);
    }
    
    // Fetch group information for these lists
    const groupMappings = await db
      .select({
        wordListId: wordListUserGroups.wordListId,
        groupId: wordListUserGroups.groupId,
        groupName: userGroups.name,
      })
      .from(wordListUserGroups)
      .leftJoin(userGroups, eq(wordListUserGroups.groupId, userGroups.id))
      .where(inArray(wordListUserGroups.wordListId, listIds));
    
    // Create a map of word list ID to groups
    const groupsByWordList = new Map<number, any[]>();
    for (const mapping of groupMappings) {
      if (!groupsByWordList.has(mapping.wordListId)) {
        groupsByWordList.set(mapping.wordListId, []);
      }
      groupsByWordList.get(mapping.wordListId)!.push({
        id: mapping.groupId,
        name: mapping.groupName,
      });
    }
    
    // Add group information and words to word lists
    return lists.map(list => ({
      ...list,
      words: wordsByList.get(list.id) || [],
      sharedGroups: groupsByWordList.get(list.id) || [],
    }));
  }

  async updateCustomWordList(id: number, updates: Partial<InsertCustomWordList>): Promise<CustomWordList | undefined> {
    // Use new wordLists table
    const { words: wordTexts, ...listUpdates } = updates;
    
    // Update list properties
    const [updatedList] = await db.update(wordLists)
      .set(listUpdates)
      .where(eq(wordLists.id, id))
      .returning();
    
    if (!updatedList) return undefined;
    
    // If words array was provided, update the junction table
    if (wordTexts !== undefined) {
      // Delete existing word associations
      await db.delete(wordListWords).where(eq(wordListWords.wordListId, id));
      
      // Add new word associations
      for (let position = 0; position < wordTexts.length; position++) {
        const wordText = wordTexts[position].toLowerCase().trim();
        
        // Find or create the word
        let [existingWord] = await db
          .select()
          .from(words)
          .where(eq(words.word, wordText));
        
        if (!existingWord) {
          [existingWord] = await db.insert(words).values({ word: wordText }).returning();
        }
        
        // Create junction record
        await db.insert(wordListWords).values({
          wordListId: id,
          wordId: existingWord.id,
          position: position,
        }).onConflictDoNothing();
      }
    }
    
    // Fetch the updated word list with words
    return this.getCustomWordList(id);
  }

  async deleteCustomWordList(id: number): Promise<boolean> {
    // Use new wordLists table - delete word associations first, then the list
    await db.delete(wordListWords).where(eq(wordListWords.wordListId, id));
    const result = await db.delete(wordLists).where(eq(wordLists.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // New WordList methods (using word IDs via junction table)
  async createWordList(list: InsertWordList): Promise<WordList> {
    const [result] = await db.insert(wordLists).values(list).returning();
    return result;
  }

  async getWordList(id: number): Promise<WordList | undefined> {
    const [result] = await db.select().from(wordLists).where(eq(wordLists.id, id));
    return result || undefined;
  }

  async getUserWordListsNew(userId: number): Promise<WordList[]> {
    return await db
      .select()
      .from(wordLists)
      .where(eq(wordLists.userId, userId))
      .orderBy(desc(wordLists.createdAt));
  }

  async getPublicWordLists(): Promise<WordList[]> {
    return await db
      .select()
      .from(wordLists)
      .where(eq(wordLists.visibility, 'public'))
      .orderBy(desc(wordLists.createdAt));
  }

  async updateWordList(id: number, updates: Partial<InsertWordList>): Promise<WordList | undefined> {
    const [result] = await db
      .update(wordLists)
      .set(updates)
      .where(eq(wordLists.id, id))
      .returning();
    return result || undefined;
  }

  async deleteWordList(id: number): Promise<boolean> {
    // Also delete all word associations
    await db.delete(wordListWords).where(eq(wordListWords.wordListId, id));
    const result = await db.delete(wordLists).where(eq(wordLists.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // WordListWord junction table methods
  async addWordToWordList(wordListId: number, wordId: number, position: number): Promise<WordListWord> {
    const [result] = await db
      .insert(wordListWords)
      .values({ wordListId, wordId, position })
      .returning();
    return result;
  }

  async removeWordFromWordList(wordListId: number, wordId: number): Promise<boolean> {
    const result = await db
      .delete(wordListWords)
      .where(and(eq(wordListWords.wordListId, wordListId), eq(wordListWords.wordId, wordId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getWordListWords(wordListId: number): Promise<{ wordId: number; word: Word; position: number }[]> {
    const results = await db
      .select({
        wordId: wordListWords.wordId,
        position: wordListWords.position,
        word: words,
      })
      .from(wordListWords)
      .innerJoin(words, eq(wordListWords.wordId, words.id))
      .where(eq(wordListWords.wordListId, wordListId))
      .orderBy(wordListWords.position);
    
    return results.map(r => ({
      wordId: r.wordId,
      word: r.word,
      position: r.position,
    }));
  }

  async setWordListWords(wordListId: number, wordIds: number[]): Promise<void> {
    // Delete existing associations
    await db.delete(wordListWords).where(eq(wordListWords.wordListId, wordListId));
    
    // Add new associations with positions
    if (wordIds.length > 0) {
      const values = wordIds.map((wordId, index) => ({
        wordListId,
        wordId,
        position: index,
      }));
      await db.insert(wordListWords).values(values);
    }
  }

  async createWordIllustration(illustration: InsertWordIllustration): Promise<WordIllustration> {
    const [existingIllustration] = await db
      .select()
      .from(wordIllustrations)
      .where(
        and(
          eq(wordIllustrations.word, illustration.word.toLowerCase()),
          eq(wordIllustrations.wordListId, illustration.wordListId)
        )
      );
    
    if (existingIllustration) {
      const [updatedIllustration] = await db
        .update(wordIllustrations)
        .set({
          imagePath: illustration.imagePath,
          source: illustration.source || 'pixabay',
        })
        .where(eq(wordIllustrations.id, existingIllustration.id))
        .returning();
      
      return updatedIllustration;
    }
    
    const [newIllustration] = await db
      .insert(wordIllustrations)
      .values({
        word: illustration.word.toLowerCase(),
        wordListId: illustration.wordListId,
        imagePath: illustration.imagePath,
        source: illustration.source || 'pixabay',
      })
      .returning();
    
    return newIllustration;
  }

  async getWordIllustration(word: string, wordListId: number): Promise<WordIllustration | undefined> {
    const [illustration] = await db
      .select()
      .from(wordIllustrations)
      .where(
        and(
          eq(wordIllustrations.word, word.toLowerCase()),
          eq(wordIllustrations.wordListId, wordListId)
        )
      );
    
    return illustration || undefined;
  }

  async getWordIllustrationsForWordList(wordListId: number): Promise<WordIllustration[]> {
    return await db
      .select()
      .from(wordIllustrations)
      .where(eq(wordIllustrations.wordListId, wordListId));
  }

  async getAllWordIllustrations(): Promise<WordIllustration[]> {
    return await db.select().from(wordIllustrations);
  }

  async updateWordIllustration(id: number, updates: Partial<InsertWordIllustration>): Promise<WordIllustration | undefined> {
    const [updated] = await db
      .update(wordIllustrations)
      .set(updates)
      .where(eq(wordIllustrations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWordIllustrationForWordList(word: string, wordListId: number): Promise<boolean> {
    const result = await db
      .delete(wordIllustrations)
      .where(
        and(
          eq(wordIllustrations.word, word.toLowerCase()),
          eq(wordIllustrations.wordListId, wordListId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createUserGroup(group: InsertUserGroup): Promise<UserGroup> {
    const [newGroup] = await db.insert(userGroups).values(group).returning();
    return newGroup;
  }

  async getUserGroup(groupId: number): Promise<UserGroup | undefined> {
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, groupId));
    return group || undefined;
  }

  async getUserAccessibleGroups(userId: number): Promise<any[]> {
    // Get owned groups with owner username (self)
    const ownedGroups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        ownerUserId: userGroups.ownerUserId,
        isPublic: userGroups.isPublic,
        membersCanShareWordLists: userGroups.membersCanShareWordLists,
        createdAt: userGroups.createdAt,
        plaintextPassword: userGroups.plaintextPassword,
        ownerUsername: users.username,
      })
      .from(userGroups)
      .innerJoin(users, eq(userGroups.ownerUserId, users.id))
      .where(eq(userGroups.ownerUserId, userId));
    
    // Get co-owned groups with owner username
    const coOwnedGroups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        ownerUserId: userGroups.ownerUserId,
        isPublic: userGroups.isPublic,
        membersCanShareWordLists: userGroups.membersCanShareWordLists,
        createdAt: userGroups.createdAt,
        plaintextPassword: userGroups.plaintextPassword,
        ownerUsername: users.username,
      })
      .from(userGroupCoOwners)
      .innerJoin(userGroups, eq(userGroupCoOwners.groupId, userGroups.id))
      .innerJoin(users, eq(userGroups.ownerUserId, users.id))
      .where(eq(userGroupCoOwners.coOwnerUserId, userId));
    
    // Get member groups with owner username
    const memberGroups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        ownerUserId: userGroups.ownerUserId,
        isPublic: userGroups.isPublic,
        membersCanShareWordLists: userGroups.membersCanShareWordLists,
        createdAt: userGroups.createdAt,
        ownerUsername: users.username,
      })
      .from(userGroupMembership)
      .innerJoin(userGroups, eq(userGroupMembership.groupId, userGroups.id))
      .innerJoin(users, eq(userGroups.ownerUserId, users.id))
      .where(eq(userGroupMembership.userId, userId));
    
    // Get public groups with owner username
    const publicGroups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        ownerUserId: userGroups.ownerUserId,
        isPublic: userGroups.isPublic,
        membersCanShareWordLists: userGroups.membersCanShareWordLists,
        createdAt: userGroups.createdAt,
        plaintextPassword: userGroups.plaintextPassword,
        ownerUsername: users.username,
      })
      .from(userGroups)
      .innerJoin(users, eq(userGroups.ownerUserId, users.id))
      .where(eq(userGroups.isPublic, true));
    
    // Get member counts for all groups in one query
    const memberCounts = await db
      .select({
        groupId: userGroupMembership.groupId,
        count: sql<number>`count(*)::int`,
      })
      .from(userGroupMembership)
      .groupBy(userGroupMembership.groupId);
    
    const memberCountMap = new Map(memberCounts.map(mc => [mc.groupId, mc.count]));
    
    // Create sets for owned, co-owned, and member group IDs
    const ownedGroupIds = new Set(ownedGroups.map(g => g.id));
    const coOwnedGroupIds = new Set(coOwnedGroups.map(g => g.id));
    const memberGroupIds = new Set(memberGroups.map(g => g.id));
    
    // Deduplicate by ID, prioritizing owned/co-owned/member groups over public groups
    const groupMap = new Map();
    
    // Add owned groups first
    for (const group of ownedGroups) {
      groupMap.set(group.id, group);
    }
    
    // Add co-owned groups
    for (const group of coOwnedGroups) {
      if (!groupMap.has(group.id)) {
        groupMap.set(group.id, group);
      }
    }
    
    // Add member groups (may overlap with owned/co-owned)
    for (const group of memberGroups) {
      if (!groupMap.has(group.id)) {
        groupMap.set(group.id, group);
      }
    }
    
    // Add public groups only if not already added
    for (const group of publicGroups) {
      if (!groupMap.has(group.id)) {
        groupMap.set(group.id, group);
      }
    }
    
    const uniqueGroups = Array.from(groupMap.values());
    
    // Add isMember, isOwner, isCoOwner flags, and memberCount to each group
    return uniqueGroups.map(group => ({
      ...group,
      isOwner: ownedGroupIds.has(group.id),
      isCoOwner: coOwnedGroupIds.has(group.id),
      isMember: ownedGroupIds.has(group.id) || coOwnedGroupIds.has(group.id) || memberGroupIds.has(group.id),
      memberCount: memberCountMap.get(group.id) || 0,
    }));
  }

  async deleteUserGroup(groupId: number): Promise<boolean> {
    const result = await db.delete(userGroups).where(eq(userGroups.id, groupId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async addGroupMember(groupId: number, userId: number): Promise<UserGroupMembership> {
    const [membership] = await db
      .insert(userGroupMembership)
      .values({ groupId, userId })
      .returning();
    return membership;
  }

  async removeGroupMember(groupId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(userGroupMembership)
      .where(and(
        eq(userGroupMembership.groupId, groupId),
        eq(userGroupMembership.userId, userId)
      ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getGroupMembers(groupId: number): Promise<any[]> {
    const members = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        selectedAvatar: users.selectedAvatar,
      })
      .from(userGroupMembership)
      .innerJoin(users, eq(userGroupMembership.userId, users.id))
      .where(eq(userGroupMembership.groupId, groupId));
    
    return hasEncryptionKey() ? members.map(m => decryptUserPII(m)) : members;
  }

  async updateUserGroup(groupId: number, updates: Partial<InsertUserGroup>): Promise<UserGroup> {
    const [updated] = await db
      .update(userGroups)
      .set(updates)
      .where(eq(userGroups.id, groupId))
      .returning();
    return updated;
  }

  async approveGroupJoinRequest(groupId: number, requestId: number): Promise<any> {
    const [request] = await db
      .select()
      .from(userToDoItems)
      .where(eq(userToDoItems.id, requestId));
    
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.type !== 'join_request' || request.groupId !== groupId) {
      throw new Error("Invalid request");
    }

    // Add user to group
    await this.addGroupMember(groupId, request.userId);

    // Delete the to-do item
    await this.deleteToDoItem(requestId);

    return { success: true };
  }

  async denyGroupJoinRequest(groupId: number, requestId: number): Promise<boolean> {
    const [request] = await db
      .select()
      .from(userToDoItems)
      .where(eq(userToDoItems.id, requestId));
    
    if (!request) {
      return false;
    }

    if (request.type !== 'join_request' || request.groupId !== groupId) {
      return false;
    }

    return await this.deleteToDoItem(requestId);
  }

  async createToDoItem(todo: InsertUserToDoItem): Promise<UserToDoItem> {
    const [newTodo] = await db.insert(userToDoItems).values(todo).returning();
    return newTodo;
  }

  async getUserToDoItems(userId: number): Promise<UserToDoItem[]> {
    return await db
      .select()
      .from(userToDoItems)
      .where(and(
        eq(userToDoItems.userId, userId),
        eq(userToDoItems.completed, false)
      ))
      .orderBy(desc(userToDoItems.createdAt));
  }

  async getUserPendingRequests(userId: number): Promise<UserToDoItem[]> {
    return await db
      .select()
      .from(userToDoItems)
      .where(and(
        eq(userToDoItems.requesterId, userId),
        eq(userToDoItems.type, 'join_request'),
        eq(userToDoItems.completed, false)
      ))
      .orderBy(desc(userToDoItems.createdAt));
  }

  async getToDoItem(todoId: number): Promise<UserToDoItem | undefined> {
    const [todo] = await db.select().from(userToDoItems).where(eq(userToDoItems.id, todoId));
    return todo || undefined;
  }

  async updateToDoItem(todoId: number, updates: Partial<UserToDoItem>): Promise<UserToDoItem | undefined> {
    const [updated] = await db
      .update(userToDoItems)
      .set(updates)
      .where(eq(userToDoItems.id, todoId))
      .returning();
    return updated || undefined;
  }

  async deleteToDoItem(todoId: number): Promise<boolean> {
    const result = await db.delete(userToDoItems).where(eq(userToDoItems.id, todoId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteFlaggedContentToDos(word: string): Promise<number> {
    const result = await db
      .delete(userToDoItems)
      .where(
        and(
          eq(userToDoItems.type, 'flagged_content'),
          like(userToDoItems.message, `%"${word}"%`)
        )
      );
    return result.rowCount || 0;
  }

  async searchUsers(query: string): Promise<any[]> {
    const searchTerm = query.toLowerCase();
    
    if (!hasEncryptionKey()) {
      const results = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          selectedAvatar: users.selectedAvatar,
        })
        .from(users)
        .where(
          sql`LOWER(${users.username}) LIKE ${'%' + searchTerm + '%'} 
           OR LOWER(${users.firstName}) LIKE ${'%' + searchTerm + '%'}
           OR LOWER(${users.lastName}) LIKE ${'%' + searchTerm + '%'}
           OR LOWER(${users.email}) LIKE ${'%' + searchTerm + '%'}`
        )
        .limit(10);
      return results;
    }
    
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        selectedAvatar: users.selectedAvatar,
      })
      .from(users);
    
    const decryptedUsers = allUsers.map(u => decryptUserPII(u));
    const filtered = decryptedUsers.filter(u => 
      u.username?.toLowerCase().includes(searchTerm) ||
      u.firstName?.toLowerCase().includes(searchTerm) ||
      u.lastName?.toLowerCase().includes(searchTerm) ||
      u.email?.toLowerCase().includes(searchTerm)
    );
    
    return filtered.slice(0, 10);
  }

  async getUserOwnedGroups(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(userGroups)
      .where(eq(userGroups.ownerUserId, userId));
  }

  async getCoOwnedGroups(userId: number): Promise<any[]> {
    const coOwnedGroupIds = await db
      .select({ groupId: userGroupCoOwners.groupId })
      .from(userGroupCoOwners)
      .where(eq(userGroupCoOwners.coOwnerUserId, userId));
    
    if (coOwnedGroupIds.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(userGroups)
      .where(inArray(userGroups.id, coOwnedGroupIds.map(c => c.groupId)));
  }

  async getUserWordLists(userId: number): Promise<CustomWordList[]> {
    // Use new wordLists table
    const lists = await db
      .select()
      .from(wordLists)
      .where(eq(wordLists.userId, userId))
      .orderBy(desc(wordLists.createdAt));
    
    // Fetch words for each list
    const result: CustomWordList[] = [];
    for (const list of lists) {
      const wordAssociations = await db
        .select({ wordText: words.word })
        .from(wordListWords)
        .innerJoin(words, eq(wordListWords.wordId, words.id))
        .where(eq(wordListWords.wordListId, list.id))
        .orderBy(wordListWords.position);
      
      result.push({
        ...list,
        words: wordAssociations.map(w => w.wordText),
      } as unknown as CustomWordList);
    }
    return result;
  }

  async getWordListsSharedWithGroups(groupIds: number[]): Promise<CustomWordList[]> {
    if (groupIds.length === 0) {
      return [];
    }
    
    // Get word list IDs that are shared with any of the specified groups
    const sharedWordListIds = await db
      .select({ wordListId: wordListUserGroups.wordListId })
      .from(wordListUserGroups)
      .where(inArray(wordListUserGroups.groupId, groupIds));
    
    if (sharedWordListIds.length === 0) {
      return [];
    }
    
    // Get unique word list IDs
    const uniqueListIds = Array.from(new Set(sharedWordListIds.map(s => s.wordListId)));
    
    // Use new wordLists table
    const lists = await db
      .select()
      .from(wordLists)
      .where(inArray(wordLists.id, uniqueListIds))
      .orderBy(desc(wordLists.createdAt));
    
    // Fetch words for each list
    const result: CustomWordList[] = [];
    for (const list of lists) {
      const wordAssociations = await db
        .select({ wordText: words.word })
        .from(wordListWords)
        .innerJoin(words, eq(wordListWords.wordId, words.id))
        .where(eq(wordListWords.wordListId, list.id))
        .orderBy(wordListWords.position);
      
      result.push({
        ...list,
        words: wordAssociations.map(w => w.wordText),
      } as unknown as CustomWordList);
    }
    return result;
  }

  async getGameSessionsByUserAndList(userId: number, wordListId: number): Promise<GameSession[]> {
    return await db
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, userId),
          eq(gameSessions.wordListId, wordListId)
        )
      )
      .orderBy(desc(gameSessions.createdAt));
  }

  async getGameSessionsByWordList(wordListId: number): Promise<GameSession[]> {
    return await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.wordListId, wordListId))
      .orderBy(desc(gameSessions.createdAt));
  }

  async getWordListSharedGroupIds(wordListId: number): Promise<number[]> {
    const sharedGroups = await db
      .select({ groupId: wordListUserGroups.groupId })
      .from(wordListUserGroups)
      .where(eq(wordListUserGroups.wordListId, wordListId));
    
    return sharedGroups.map(sg => sg.groupId);
  }

  async setWordListSharedGroups(wordListId: number, groupIds: number[]): Promise<void> {
    // Use transaction to ensure atomic delete+insert
    await db.transaction(async (tx) => {
      // Delete existing mappings
      await tx
        .delete(wordListUserGroups)
        .where(eq(wordListUserGroups.wordListId, wordListId));
      
      // Insert new mappings if any groups are specified
      if (groupIds.length > 0) {
        await tx.insert(wordListUserGroups).values(
          groupIds.map(groupId => ({
            wordListId,
            groupId,
          }))
        );
      }
    });
  }

  async isUserMemberOfWordListGroups(userId: number, wordListId: number): Promise<boolean> {
    const groupIds = await this.getWordListSharedGroupIds(wordListId);
    
    if (groupIds.length === 0) {
      return false;
    }
    
    // Check membership in any of the groups
    const membership = await db
      .select()
      .from(userGroupMembership)
      .where(
        and(
          eq(userGroupMembership.userId, userId),
          inArray(userGroupMembership.groupId, groupIds)
        )
      )
      .limit(1);
    
    if (membership.length > 0) return true;

    // Also check if the user owns any of the groups (group owners aren't in userGroupMembership)
    const ownedGroup = await db
      .select()
      .from(userGroups)
      .where(
        and(
          eq(userGroups.ownerUserId, userId),
          inArray(userGroups.id, groupIds)
        )
      )
      .limit(1);

    return ownedGroup.length > 0;
  }

  async isWordListDirectlySharedWithUser(wordListId: number, userId: number): Promise<boolean> {
    const [share] = await db
      .select()
      .from(wordListUserShares)
      .where(
        and(
          eq(wordListUserShares.wordListId, wordListId),
          eq(wordListUserShares.sharedWithUserId, userId)
        )
      )
      .limit(1);
    
    return !!share;
  }

  async isUserGroupMember(userId: number, groupId: number): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(userGroupMembership)
      .where(
        and(
          eq(userGroupMembership.userId, userId),
          eq(userGroupMembership.groupId, groupId)
        )
      )
      .limit(1);
    
    return !!membership;
  }

  async getWordListCoOwners(wordListId: number): Promise<WordListCoOwner[]> {
    return await db
      .select()
      .from(wordListCoOwners)
      .where(eq(wordListCoOwners.wordListId, wordListId));
  }

  async addWordListCoOwner(wordListId: number, coOwnerUserId: number): Promise<WordListCoOwner> {
    const [coOwner] = await db
      .insert(wordListCoOwners)
      .values({ wordListId, coOwnerUserId })
      .returning();
    return coOwner;
  }

  async removeWordListCoOwner(wordListId: number, coOwnerUserId: number): Promise<boolean> {
    const result = await db
      .delete(wordListCoOwners)
      .where(
        and(
          eq(wordListCoOwners.wordListId, wordListId),
          eq(wordListCoOwners.coOwnerUserId, coOwnerUserId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async isWordListCoOwner(wordListId: number, userId: number): Promise<boolean> {
    const [coOwner] = await db
      .select()
      .from(wordListCoOwners)
      .where(
        and(
          eq(wordListCoOwners.wordListId, wordListId),
          eq(wordListCoOwners.coOwnerUserId, userId)
        )
      )
      .limit(1);
    return !!coOwner;
  }

  async getGroupCoOwners(groupId: number): Promise<UserGroupCoOwner[]> {
    return await db
      .select()
      .from(userGroupCoOwners)
      .where(eq(userGroupCoOwners.groupId, groupId));
  }

  async addGroupCoOwner(groupId: number, coOwnerUserId: number): Promise<UserGroupCoOwner> {
    const [coOwner] = await db
      .insert(userGroupCoOwners)
      .values({ groupId, coOwnerUserId })
      .returning();
    return coOwner;
  }

  async removeGroupCoOwner(groupId: number, coOwnerUserId: number): Promise<boolean> {
    const result = await db
      .delete(userGroupCoOwners)
      .where(
        and(
          eq(userGroupCoOwners.groupId, groupId),
          eq(userGroupCoOwners.coOwnerUserId, coOwnerUserId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async isGroupCoOwner(groupId: number, userId: number): Promise<boolean> {
    const [coOwner] = await db
      .select()
      .from(userGroupCoOwners)
      .where(
        and(
          eq(userGroupCoOwners.groupId, groupId),
          eq(userGroupCoOwners.coOwnerUserId, userId)
        )
      )
      .limit(1);
    return !!coOwner;
  }

  async getTeachers(): Promise<User[]> {
    const teachers = await db
      .select()
      .from(users)
      .where(eq(users.role, "teacher"));
    return hasEncryptionKey() ? teachers.map(t => decryptUserPII(t)) : teachers;
  }

  async searchTeachers(query: string): Promise<User[]> {
    const searchTerm = query.toLowerCase();
    
    if (!hasEncryptionKey()) {
      return await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "teacher"),
            or(
              sql`LOWER(${users.username}) LIKE ${'%' + searchTerm + '%'}`,
              sql`LOWER(${users.email}) LIKE ${'%' + searchTerm + '%'}`,
              sql`LOWER(${users.firstName}) LIKE ${'%' + searchTerm + '%'}`,
              sql`LOWER(${users.lastName}) LIKE ${'%' + searchTerm + '%'}`,
              sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${'%' + searchTerm + '%'}`
            )
          )
        )
        .limit(10);
    }
    
    const allTeachers = await db
      .select()
      .from(users)
      .where(eq(users.role, "teacher"));
    
    const decrypted = allTeachers.map(t => decryptUserPII(t));
    return decrypted.filter(t =>
      t.username?.toLowerCase().includes(searchTerm) ||
      t.email?.toLowerCase().includes(searchTerm) ||
      t.firstName?.toLowerCase().includes(searchTerm) ||
      t.lastName?.toLowerCase().includes(searchTerm) ||
      `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
  }

  async createPasswordResetToken(insertToken: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(insertToken).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async getPasswordResetTokenById(id: number): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, id));
    return resetToken || undefined;
  }

  async markTokenAsUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  async deleteUnusedTokensForUser(userId: number): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          eq(passwordResetTokens.used, false)
        )
      );
  }

  async getAchievement(userId: number, wordListId: number, achievementType: string): Promise<Achievement | undefined> {
    const [achievement] = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, userId),
          eq(achievements.wordListId, wordListId),
          eq(achievements.achievementType, achievementType)
        )
      );
    return achievement || undefined;
  }

  async getUserAchievements(userId: number): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId));
  }

  async getWordListAchievements(wordListId: number): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.wordListId, wordListId));
  }

  async upsertAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const existing = await this.getAchievement(
      insertAchievement.userId,
      insertAchievement.wordListId,
      insertAchievement.achievementType
    );

    if (existing) {
      const [updated] = await db
        .update(achievements)
        .set({
          achievementValue: insertAchievement.achievementValue,
          completedModes: insertAchievement.completedModes,
          updatedAt: new Date(),
        })
        .where(eq(achievements.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(achievements)
        .values({
          ...insertAchievement,
          completedModes: insertAchievement.completedModes || [],
        })
        .returning();
      return created;
    }
  }

  async getUserStats(userId: number, dateFilter: string, timezone: string): Promise<any> {
    // Use PostgreSQL's AT TIME ZONE to filter by calendar boundaries in user's timezone
    // Include sessions that are complete OR have at least one word attempted (partial sessions from restarts)
    let allSessions;
    
    if (dateFilter === "all") {
      // No date filtering
      // Include sessions that are complete OR have at least one word attempted
      // Check for totalWords > 0 OR correctWords > 0 OR incorrectWords array has items
      // Use COALESCE to fall back to createdAt for incomplete sessions that don't have completedAt set
      allSessions = await db
        .select()
        .from(gameSessions)
        .where(and(
          eq(gameSessions.userId, userId),
          sql`(${gameSessions.isComplete} = true OR COALESCE(${gameSessions.totalWords}, 0) > 0 OR COALESCE(${gameSessions.correctWords}, 0) > 0 OR COALESCE(array_length(${gameSessions.incorrectWords}, 1), 0) > 0)`
        ))
        .orderBy(desc(sql`COALESCE(${gameSessions.completedAt}, ${gameSessions.createdAt})`));
    } else {
      // Use SQL fragments within Drizzle query for timezone-aware filtering
      let daysAgo: number;
      if (dateFilter === "today") {
        daysAgo = 0; // Today means from midnight today
      } else if (dateFilter === "week") {
        daysAgo = 6; // Last 7 days (6 days ago + today)
      } else if (dateFilter === "month") {
        daysAgo = 29; // Last 30 days (29 days ago + today)
      } else {
        daysAgo = 0;
      }
      
      // Use Drizzle query with SQL fragment for AT TIME ZONE support
      // Convert the timezone-aware boundary back to UTC for comparison with UTC completedAt
      // Include sessions that are complete OR have at least one word attempted
      // Check for totalWords > 0 OR correctWords > 0 OR incorrectWords array has items
      // Use COALESCE to fall back to createdAt for incomplete sessions that don't have completedAt set
      allSessions = await db
        .select()
        .from(gameSessions)
        .where(and(
          eq(gameSessions.userId, userId),
          sql`(${gameSessions.isComplete} = true OR COALESCE(${gameSessions.totalWords}, 0) > 0 OR COALESCE(${gameSessions.correctWords}, 0) > 0 OR COALESCE(array_length(${gameSessions.incorrectWords}, 1), 0) > 0)`,
          sql`COALESCE(${gameSessions.completedAt}, ${gameSessions.createdAt}) >= (date_trunc('day', (NOW() AT TIME ZONE ${timezone}) - INTERVAL '${sql.raw(daysAgo.toString())} days') AT TIME ZONE ${timezone} AT TIME ZONE 'UTC')`
        ))
        .orderBy(desc(sql`COALESCE(${gameSessions.completedAt}, ${gameSessions.createdAt})`));
    }
    
    // Use allSessions for all metrics (no separate filteredSessions needed)
    let filteredSessions = allSessions;

    // Calculate ALL metrics from filtered sessions only
    // For each session, compute attempted words as max of totalWords or (correctWords + incorrectWords.length)
    // This handles partial sessions where totalWords might be 0 but there's activity
    const totalWordsAttempted = filteredSessions.reduce((sum, s) => {
      const sessionTotal = s.totalWords || 0;
      const sessionActivity = (s.correctWords || 0) + (s.incorrectWords?.length || 0);
      return sum + Math.max(sessionTotal, sessionActivity);
    }, 0);
    const correctWords = filteredSessions.reduce((sum, s) => sum + (s.correctWords || 0), 0);
    const accuracy = totalWordsAttempted > 0 ? Math.round((correctWords / totalWordsAttempted) * 100) : null;
    const totalGamesPlayed = filteredSessions.length;
    const averageScore = totalGamesPlayed > 0 
      ? filteredSessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalGamesPlayed 
      : 0;
    const starsEarned = filteredSessions.reduce((sum, s) => sum + (s.starsEarned || 0), 0);
    
    // Favorite game mode from filtered sessions
    let favoriteGameMode: string | null = null;
    if (filteredSessions.length > 0) {
      const gameModeCounts: { [key: string]: number } = {};
      filteredSessions.forEach(s => {
        gameModeCounts[s.gameMode] = (gameModeCounts[s.gameMode] || 0) + 1;
      });
      favoriteGameMode = Object.entries(gameModeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    }

    // Streaks are lifetime metrics tracked during gameplay, not date-filtered
    // Always use authoritative user_streaks table for consistency across all date filters
    const userStreak = await this.getUserStreak(userId);
    const longestStreak = userStreak?.longestWordStreak || 0;
    const currentStreak = userStreak?.currentWordStreak || 0;

    // Calculate most misspelled words from incorrect_words column
    const wordFrequency: { [key: string]: number } = {};
    filteredSessions.forEach(session => {
      if (session.incorrectWords && Array.isArray(session.incorrectWords)) {
        session.incorrectWords.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
      }
    });

    // Sort by frequency and get top 20
    const mostMisspelledWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, mistakes]) => ({ word, mistakes }));

    return {
      totalWordsAttempted,
      accuracy,
      longestStreak,
      currentStreak,
      totalGamesPlayed,
      favoriteGameMode,
      averageScore: Math.round(averageScore),
      starsEarned,
      mostMisspelledWords,
    };
  }

  async getUserStreak(userId: number): Promise<UserStreak | undefined> {
    const [streak] = await db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId));
    return streak || undefined;
  }

  async createUserStreak(userId: number): Promise<UserStreak> {
    const [created] = await db
      .insert(userStreaks)
      .values({
        userId,
        currentWordStreak: 0,
        longestWordStreak: 0,
      })
      .returning();
    return created;
  }

  async updateUserStreak(userId: number, currentStreak: number, longestStreak: number): Promise<UserStreak> {
    const [updated] = await db
      .update(userStreaks)
      .set({
        currentWordStreak: currentStreak,
        longestWordStreak: longestStreak,
        updatedAt: new Date(),
      })
      .where(eq(userStreaks.userId, userId))
      .returning();
    return updated;
  }

  async incrementWordStreak(userId: number): Promise<void> {
    // Get or create user streak
    let streak = await this.getUserStreak(userId);
    if (!streak) {
      streak = await this.createUserStreak(userId);
    }

    const newCurrent = streak.currentWordStreak + 1;
    const newLongest = Math.max(newCurrent, streak.longestWordStreak);

    await this.updateUserStreak(userId, newCurrent, newLongest);
  }

  async resetWordStreak(userId: number): Promise<void> {
    // Get or create user streak
    let streak = await this.getUserStreak(userId);
    if (!streak) {
      streak = await this.createUserStreak(userId);
    }

    await this.updateUserStreak(userId, 0, streak.longestWordStreak);
  }

  async incrementUserStars(userId: number, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ stars: sql`COALESCE(${users.stars}, 0) + ${amount}` })
      .where(eq(users.id, userId));
  }

  async getUserItems(userId: number): Promise<UserItem[]> {
    return await db
      .select()
      .from(userItems)
      .where(eq(userItems.userId, userId));
  }

  async purchaseItem(
    userId: number, 
    itemId: ShopItemId, 
    quantity: number = 1
  ): Promise<{ success: boolean; newStarBalance: number; newItemQuantity: number; error?: string }> {
    const shopItem = SHOP_ITEMS[itemId];
    if (!shopItem) {
      return { success: false, newStarBalance: 0, newItemQuantity: 0, error: "Item not found" };
    }

    const totalCost = shopItem.cost * quantity;

    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, newStarBalance: 0, newItemQuantity: 0, error: "User not found" };
    }

    if ((user.stars || 0) < totalCost) {
      return { success: false, newStarBalance: user.stars || 0, newItemQuantity: 0, error: "Not enough stars" };
    }

    const newStarBalance = (user.stars || 0) - totalCost;
    await db
      .update(users)
      .set({ stars: newStarBalance })
      .where(eq(users.id, userId));

    const existingItem = await db
      .select()
      .from(userItems)
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));

    let newItemQuantity: number;
    if (existingItem.length > 0) {
      newItemQuantity = existingItem[0].quantity + quantity;
      await db
        .update(userItems)
        .set({ quantity: newItemQuantity, updatedAt: new Date() })
        .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));
    } else {
      newItemQuantity = quantity;
      await db
        .insert(userItems)
        .values({ userId, itemId, quantity });
    }

    return { success: true, newStarBalance, newItemQuantity };
  }

  async useItem(
    userId: number, 
    itemId: ShopItemId, 
    quantity: number = 1
  ): Promise<{ success: boolean; remainingQuantity: number; error?: string }> {
    const existingItem = await db
      .select()
      .from(userItems)
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));

    if (existingItem.length === 0 || existingItem[0].quantity < quantity) {
      return { success: false, remainingQuantity: existingItem[0]?.quantity || 0, error: "Not enough items" };
    }

    const remainingQuantity = existingItem[0].quantity - quantity;
    await db
      .update(userItems)
      .set({ quantity: remainingQuantity, updatedAt: new Date() })
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));

    return { success: true, remainingQuantity };
  }

  async createChallenge(challenge: InsertHeadToHeadChallenge): Promise<HeadToHeadChallenge> {
    const [created] = await db
      .insert(headToHeadChallenges)
      .values(challenge)
      .returning();
    return created;
  }

  async getChallenge(id: number): Promise<HeadToHeadChallenge | undefined> {
    const [challenge] = await db
      .select()
      .from(headToHeadChallenges)
      .where(eq(headToHeadChallenges.id, id));
    return challenge || undefined;
  }

  async getUserPendingChallenges(userId: number): Promise<HeadToHeadChallenge[]> {
    return await db
      .select()
      .from(headToHeadChallenges)
      .where(
        and(
          eq(headToHeadChallenges.opponentId, userId),
          eq(headToHeadChallenges.status, "pending")
        )
      )
      .orderBy(desc(headToHeadChallenges.createdAt));
  }

  async getUserActiveChallenges(userId: number): Promise<HeadToHeadChallenge[]> {
    return await db
      .select()
      .from(headToHeadChallenges)
      .where(
        and(
          or(
            eq(headToHeadChallenges.initiatorId, userId),
            eq(headToHeadChallenges.opponentId, userId)
          ),
          eq(headToHeadChallenges.status, "active")
        )
      )
      .orderBy(desc(headToHeadChallenges.createdAt));
  }

  async getUserCompletedChallenges(userId: number): Promise<HeadToHeadChallenge[]> {
    return await db
      .select()
      .from(headToHeadChallenges)
      .where(
        and(
          or(
            eq(headToHeadChallenges.initiatorId, userId),
            eq(headToHeadChallenges.opponentId, userId)
          ),
          eq(headToHeadChallenges.status, "completed")
        )
      )
      .orderBy(desc(headToHeadChallenges.completedAt));
  }

  async updateChallenge(id: number, updates: Partial<HeadToHeadChallenge>): Promise<HeadToHeadChallenge | undefined> {
    const [updated] = await db
      .update(headToHeadChallenges)
      .set(updates)
      .where(eq(headToHeadChallenges.id, id))
      .returning();
    return updated || undefined;
  }

  async getUserChallengeRecord(userId: number, startDate?: Date, endDate?: Date): Promise<{ wins: number; losses: number; ties: number }> {
    const completed = await this.getUserCompletedChallenges(userId);
    
    let wins = 0;
    let losses = 0;
    let ties = 0;
    
    for (const challenge of completed) {
      // Filter by date range if provided
      if (startDate && challenge.completedAt) {
        const completedDate = new Date(challenge.completedAt);
        if (completedDate < startDate) continue;
      }
      if (endDate && challenge.completedAt) {
        const completedDate = new Date(challenge.completedAt);
        if (completedDate > endDate) continue;
      }
      
      if (challenge.winnerUserId === null) {
        ties++;
      } else if (challenge.winnerUserId === userId) {
        wins++;
      } else {
        losses++;
      }
    }
    
    return { wins, losses, ties };
  }

  async isUserParticipantInActiveChallenge(userId: number, wordListId: number): Promise<boolean> {
    const challenges = await db
      .select()
      .from(headToHeadChallenges)
      .where(
        and(
          eq(headToHeadChallenges.wordListId, wordListId),
          or(
            eq(headToHeadChallenges.initiatorId, userId),
            eq(headToHeadChallenges.opponentId, userId)
          ),
          or(
            eq(headToHeadChallenges.status, "pending"),
            eq(headToHeadChallenges.status, "accepted"),
            eq(headToHeadChallenges.status, "active"),
            eq(headToHeadChallenges.status, "in_progress")
          )
        )
      );
    return challenges.length > 0;
  }

  async getAppSetting(key: string): Promise<string | undefined> {
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));
    return setting?.value;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    const existing = await this.getAppSetting(key);
    if (existing !== undefined) {
      await db
        .update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }
  }

  async bumpAppVersion(): Promise<string> {
    // Use APP_VERSION as fallback when no DB value exists
    const currentVersion = await this.getAppSetting("app_version") || APP_VERSION;
    const parts = currentVersion.split(".");
    const major = parseInt(parts[0] || "1");
    const minor = parseInt(parts[1] || "0");
    const patch = parseInt(parts[2] || "0") + 1;
    const newVersion = `${major}.${minor}.${patch}`;
    await this.setAppSetting("app_version", newVersion);
    return newVersion;
  }

  async createFlaggedWord(flag: InsertFlaggedWord): Promise<FlaggedWord> {
    const [flaggedWord] = await db.insert(flaggedWords).values(flag).returning();
    return flaggedWord;
  }

  async getAllFlaggedWords(): Promise<(FlaggedWord & { word: string })[]> {
    const results = await db
      .select({
        id: flaggedWords.id,
        wordId: flaggedWords.wordId,
        userId: flaggedWords.userId,
        gameMode: flaggedWords.gameMode,
        flaggedContentTypes: flaggedWords.flaggedContentTypes,
        comments: flaggedWords.comments,
        createdAt: flaggedWords.createdAt,
        word: words.word,
      })
      .from(flaggedWords)
      .innerJoin(words, eq(flaggedWords.wordId, words.id))
      .orderBy(desc(flaggedWords.createdAt));
    return results;
  }

  async deleteFlaggedWord(id: number): Promise<boolean> {
    const result = await db.delete(flaggedWords).where(eq(flaggedWords.id, id)).returning();
    return result.length > 0;
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, 'admin'));
    return admins
      .map(a => a.email)
      .filter((email): email is string => email !== null && email.length > 0);
  }

  async getAdminUserIds(): Promise<number[]> {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));
    return admins.map(a => a.id);
  }

  async getUserHiddenWordLists(userId: number): Promise<UserHiddenWordList[]> {
    return await db.select().from(userHiddenWordLists).where(eq(userHiddenWordLists.userId, userId));
  }

  async hideWordList(userId: number, wordListId: number): Promise<UserHiddenWordList> {
    const [hidden] = await db
      .insert(userHiddenWordLists)
      .values({ userId, wordListId })
      .onConflictDoNothing()
      .returning();
    
    if (!hidden) {
      const [existing] = await db
        .select()
        .from(userHiddenWordLists)
        .where(and(
          eq(userHiddenWordLists.userId, userId),
          eq(userHiddenWordLists.wordListId, wordListId)
        ));
      return existing;
    }
    return hidden;
  }

  async unhideWordList(userId: number, wordListId: number): Promise<boolean> {
    const result = await db
      .delete(userHiddenWordLists)
      .where(and(
        eq(userHiddenWordLists.userId, userId),
        eq(userHiddenWordLists.wordListId, wordListId)
      ));
    return true;
  }

  async isWordListHidden(userId: number, wordListId: number): Promise<boolean> {
    const [hidden] = await db
      .select()
      .from(userHiddenWordLists)
      .where(and(
        eq(userHiddenWordLists.userId, userId),
        eq(userHiddenWordLists.wordListId, wordListId)
      ));
    return !!hidden;
  }

  // Admin methods
  async searchWords(query: string, limit: number = 50): Promise<Word[]> {
    const normalized = query.toLowerCase().trim();
    return await db
      .select()
      .from(words)
      .where(sql`${words.word} ILIKE ${`%${normalized}%`}`)
      .orderBy(words.word)
      .limit(limit);
  }

  async getAllWords(): Promise<Word[]> {
    return await db.select().from(words).orderBy(words.word);
  }

  async updateWord(id: number, updates: Partial<{ definition: string | null; sentenceExample: string | null; wordOrigin: string | null; partOfSpeech: string | null }>, updatedByUserId?: number): Promise<Word | undefined> {
    const [updated] = await db
      .update(words)
      .set({ 
        ...updates, 
        updatedAt: new Date(), 
        updatedByUser: updatedByUserId ?? null 
      })
      .where(eq(words.id, id))
      .returning();
    return updated || undefined;
  }

  async getUsageMetrics(dateRange: 'today' | 'week' | 'month' | 'all'): Promise<{ userId: number | null; username: string; gamesPlayed: number }[]> {
    let dateFilter: Date | null = null;
    const now = new Date();
    
    switch (dateRange) {
      case 'today':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        dateFilter = null;
    }

    const baseQuery = db
      .select({
        userId: gameSessions.userId,
        gamesPlayed: sql<number>`count(*)::int`.as('games_played'),
      })
      .from(gameSessions);

    let results;
    if (dateFilter) {
      results = await baseQuery
        .where(sql`${gameSessions.createdAt} >= ${dateFilter}`)
        .groupBy(gameSessions.userId);
    } else {
      results = await baseQuery.groupBy(gameSessions.userId);
    }

    // Get usernames for each userId
    const enrichedResults = await Promise.all(
      results.map(async (row) => {
        if (row.userId === null) {
          return { userId: null, username: 'guest', gamesPlayed: row.gamesPlayed };
        }
        const user = await this.getUser(row.userId);
        return {
          userId: row.userId,
          username: user?.username || 'Unknown',
          gamesPlayed: row.gamesPlayed,
        };
      })
    );

    return enrichedResults;
  }

  async getAllUsersWithMetrics(): Promise<{ id: number; username: string; firstName: string | null; lastName: string | null; email: string | null; role: string; accountType: string; subscriptionExpiresAt: Date | null; createdAt: Date; gamesPlayed: number; lastActive: Date | null; familyId: number | null; familyRole: string | null }[]> {
    const allUsers = await db.select().from(users);
    
    const sessionsPerUser = await db
      .select({
        userId: gameSessions.userId,
        gamesPlayed: sql<number>`count(*)::int`,
        lastActive: sql<Date>`MAX(${gameSessions.createdAt})`,
      })
      .from(gameSessions)
      .groupBy(gameSessions.userId);
    
    const sessionMap = new Map(sessionsPerUser.map(s => [s.userId, { gamesPlayed: s.gamesPlayed, lastActive: s.lastActive }]));
    
    // Get all family memberships
    const allFamilyMembers = await db.select().from(familyMembers);
    const familyMemberMap = new Map(allFamilyMembers.map(fm => [fm.userId, { familyId: fm.familyId, role: fm.role }]));

    // Get all family accounts so we can surface subscriptionExpiresAt for family parents
    const allFamilyAccounts = await db.select({
      primaryParentUserId: familyAccounts.primaryParentUserId,
      subscriptionExpiresAt: familyAccounts.subscriptionExpiresAt,
    }).from(familyAccounts);
    const familyAccountMap = new Map(allFamilyAccounts.map(fa => [fa.primaryParentUserId, fa.subscriptionExpiresAt]));
    
    const usersWithMetrics = allUsers.map(user => {
      const decrypted = hasEncryptionKey() ? decryptUserPII(user) : user;
      const metrics = sessionMap.get(user.id) || { gamesPlayed: 0, lastActive: null };
      const familyMembership = familyMemberMap.get(user.id);
      
      // Determine role: use family role for family members, otherwise use user role
      let displayRole = decrypted.role;
      if (decrypted.accountType === 'family_parent') {
        displayRole = 'parent';
      } else if (decrypted.accountType === 'family_child') {
        displayRole = 'child';
      }

      // subscriptionExpiresAt lives in family_accounts for family parents, not in users
      const subscriptionExpiresAt = decrypted.accountType === 'family_parent'
        ? (familyAccountMap.get(decrypted.id) ?? null)
        : null;
      
      return {
        id: decrypted.id,
        username: decrypted.username,
        firstName: decrypted.firstName,
        lastName: decrypted.lastName,
        email: decrypted.email,
        role: displayRole,
        accountType: decrypted.accountType,
        subscriptionExpiresAt,
        createdAt: decrypted.createdAt,
        gamesPlayed: metrics.gamesPlayed,
        lastActive: metrics.lastActive,
        familyId: familyMembership?.familyId || null,
        familyRole: familyMembership?.role || null,
      };
    });
    
    return usersWithMetrics;
  }

  async deleteUserAndAllData(userId: number): Promise<boolean> {
    await db.delete(gameSessions).where(eq(gameSessions.userId, userId));
    await db.delete(leaderboardScores).where(eq(leaderboardScores.userId, userId));
    await db.delete(achievements).where(eq(achievements.userId, userId));
    await db.delete(userStreaks).where(eq(userStreaks.userId, userId));
    await db.delete(userItems).where(eq(userItems.userId, userId));
    await db.delete(userToDoItems).where(or(eq(userToDoItems.userId, userId), eq(userToDoItems.requesterId, userId)));
    await db.delete(userGroupMembership).where(eq(userGroupMembership.userId, userId));
    await db.delete(wordListCoOwners).where(eq(wordListCoOwners.coOwnerUserId, userId));
    await db.delete(userGroupCoOwners).where(eq(userGroupCoOwners.coOwnerUserId, userId));
    await db.delete(userHiddenWordLists).where(eq(userHiddenWordLists.userId, userId));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await db.delete(headToHeadChallenges).where(or(eq(headToHeadChallenges.initiatorId, userId), eq(headToHeadChallenges.opponentId, userId)));
    
    // Use new wordLists table
    const ownedWordLists = await db.select({ id: wordLists.id }).from(wordLists).where(eq(wordLists.userId, userId));
    for (const list of ownedWordLists) {
      await db.delete(wordListWords).where(eq(wordListWords.wordListId, list.id));
      await db.delete(wordIllustrations).where(eq(wordIllustrations.wordListId, list.id));
      await db.delete(wordListUserGroups).where(eq(wordListUserGroups.wordListId, list.id));
      await db.delete(wordListCoOwners).where(eq(wordListCoOwners.wordListId, list.id));
    }
    await db.delete(wordLists).where(eq(wordLists.userId, userId));
    
    const ownedGroups = await db.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.ownerUserId, userId));
    for (const group of ownedGroups) {
      await db.delete(userGroupMembership).where(eq(userGroupMembership.groupId, group.id));
      await db.delete(userGroupCoOwners).where(eq(userGroupCoOwners.groupId, group.id));
      await db.delete(wordListUserGroups).where(eq(wordListUserGroups.groupId, group.id));
    }
    await db.delete(userGroups).where(eq(userGroups.ownerUserId, userId));
    
    const result = await db.delete(users).where(eq(users.id, userId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Family account methods
  async createFamilyAccount(parentUserId: number): Promise<FamilyAccount> {
    const [family] = await db.insert(familyAccounts).values({
      primaryParentUserId: parentUserId,
      vpcStatus: "pending",
    }).returning();
    
    await db.insert(familyMembers).values({
      familyId: family.id,
      userId: parentUserId,
      role: "parent",
      status: "active",
    });
    
    return family;
  }

  async getFamilyAccount(id: number): Promise<FamilyAccount | undefined> {
    const [family] = await db.select().from(familyAccounts).where(eq(familyAccounts.id, id));
    return family || undefined;
  }

  async getFamilyAccountByParentId(parentUserId: number): Promise<FamilyAccount | undefined> {
    const [family] = await db.select().from(familyAccounts).where(eq(familyAccounts.primaryParentUserId, parentUserId));
    return family || undefined;
  }

  async getFamilyAccountByStripeSubscriptionId(subscriptionId: string): Promise<FamilyAccount | undefined> {
    const [family] = await db.select().from(familyAccounts).where(eq(familyAccounts.stripeSubscriptionId, subscriptionId));
    return family || undefined;
  }

  async getFamilyAccountByStripeCustomerId(customerId: string): Promise<FamilyAccount | undefined> {
    const [family] = await db.select().from(familyAccounts).where(eq(familyAccounts.stripeCustomerId, customerId));
    return family || undefined;
  }

  async updateFamilyAccount(id: number, updates: Partial<FamilyAccount>): Promise<FamilyAccount | undefined> {
    const [updated] = await db.update(familyAccounts).set(updates).where(eq(familyAccounts.id, id)).returning();
    return updated || undefined;
  }

  async getFamilyAccountsNeedingRenewalReminder(): Promise<FamilyAccount[]> {
    const now = new Date();
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // don't resend within 7 days
    return await db.select().from(familyAccounts).where(
      and(
        eq(familyAccounts.autoRenew, true),
        eq(familyAccounts.vpcStatus, 'verified'),
        sql`${familyAccounts.subscriptionExpiresAt} >= ${in1Day}`,
        sql`${familyAccounts.subscriptionExpiresAt} <= ${in3Days}`,
        or(
          isNull(familyAccounts.renewalReminderSentAt),
          sql`${familyAccounts.renewalReminderSentAt} < ${cutoff}`
        )
      )
    );
  }

  async createFamilyLegalAcceptance(data: { familyId: number; userId: number; ipAddress?: string; userAgent?: string }): Promise<void> {
    await db.insert(familyLegalAcceptances).values({
      familyId: data.familyId,
      userId: data.userId,
      tosVersion: "1.1",
      privacyVersion: "1.1",
      acceptedTos: true,
      acceptedPrivacy: true,
      acceptedParentalConsent: true,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  }

  async deleteFamilyAccount(id: number): Promise<boolean> {
    await db.delete(familyMembers).where(eq(familyMembers.familyId, id));
    const result = await db.delete(familyAccounts).where(eq(familyAccounts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async verifyFamilyVpc(familyId: number): Promise<FamilyAccount | undefined> {
    const [updated] = await db.update(familyAccounts).set({
      vpcStatus: "verified",
      vpcVerifiedAt: new Date(),
    }).where(eq(familyAccounts.id, familyId)).returning();
    return updated || undefined;
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const [created] = await db.insert(familyMembers).values(member).returning();
    return created;
  }

  async getFamilyMembers(familyId: number): Promise<(FamilyMember & { user: User })[]> {
    const members = await db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId));
    
    const result = await Promise.all(members.map(async (member) => {
      const user = await this.getUser(member.userId);
      if (!user) throw new Error(`User ${member.userId} not found for family member`);
      return { ...member, user };
    }));
    
    return result;
  }

  async getFamilyMemberByUserId(userId: number): Promise<FamilyMember | undefined> {
    const [member] = await db.select().from(familyMembers).where(
      and(eq(familyMembers.userId, userId), eq(familyMembers.status, "active"))
    );
    return member || undefined;
  }

  async updateFamilyMember(id: number, updates: Partial<FamilyMember>): Promise<FamilyMember | undefined> {
    const [updated] = await db.update(familyMembers).set(updates).where(eq(familyMembers.id, id)).returning();
    return updated || undefined;
  }

  async removeFamilyMember(familyId: number, userId: number): Promise<boolean> {
    const result = await db.delete(familyMembers).where(
      and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getChildrenMetrics(userIds: number[], dateFilter?: string): Promise<{ userId: number; gamesPlayed: number; lastActive: Date | null; starsEarned: number; accuracy: number }[]> {
    if (userIds.length === 0) return [];
    
    let whereClause;
    if (dateFilter === "today") {
      whereClause = and(
        inArray(gameSessions.userId, userIds),
        sql`${gameSessions.createdAt} >= NOW() - INTERVAL '1 day'`
      );
    } else if (dateFilter === "week") {
      whereClause = and(
        inArray(gameSessions.userId, userIds),
        sql`${gameSessions.createdAt} >= NOW() - INTERVAL '7 days'`
      );
    } else if (dateFilter === "month") {
      whereClause = and(
        inArray(gameSessions.userId, userIds),
        sql`${gameSessions.createdAt} >= NOW() - INTERVAL '30 days'`
      );
    } else {
      whereClause = inArray(gameSessions.userId, userIds);
    }
    
    const results = await db
      .select({
        userId: gameSessions.userId,
        gamesPlayed: sql<number>`count(*)::int`,
        lastActive: sql<Date | null>`MAX(${gameSessions.createdAt})`,
        starsEarned: sql<number>`COALESCE(SUM(${gameSessions.starsEarned}), 0)::int`,
        totalWords: sql<number>`COALESCE(SUM(${gameSessions.totalWords}), 0)::int`,
        correctWords: sql<number>`COALESCE(SUM(${gameSessions.correctWords}), 0)::int`,
      })
      .from(gameSessions)
      .where(whereClause)
      .groupBy(gameSessions.userId);
    
    // Return metrics for all users, with defaults for those without sessions
    return userIds.map(id => {
      const found = results.find(r => r.userId === id);
      const totalWords = found?.totalWords || 0;
      const correctWords = found?.correctWords || 0;
      const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
      return {
        userId: id,
        gamesPlayed: found?.gamesPlayed || 0,
        lastActive: found?.lastActive || null,
        starsEarned: found?.starsEarned || 0,
        accuracy,
      };
    });
  }

  async createPaymentRecord(payment: InsertPaymentHistory): Promise<PaymentHistory> {
    const [result] = await db.insert(paymentHistory).values(payment).returning();
    return result;
  }

  async getPaymentHistory(familyId: number): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(eq(paymentHistory.familyId, familyId))
      .orderBy(desc(paymentHistory.paymentDate));
  }

  async getPaymentsByUser(userId: number): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(eq(paymentHistory.userId, userId))
      .orderBy(desc(paymentHistory.paymentDate));
  }

  async shareWordListWithFamilyChildren(wordListId: number, familyId: number): Promise<void> {
    const members = await this.getFamilyMembers(familyId);
    const children = members.filter(m => m.role === "child");
    
    for (const child of children) {
      try {
        await db.insert(wordListUserShares).values({
          wordListId,
          sharedWithUserId: child.userId,
        }).onConflictDoNothing();
      } catch (err) {
        // Ignore duplicate key errors
      }
    }
  }

  async createSchoolAccount(adminUserId: number, schoolName: string): Promise<SchoolAccount> {
    const [school] = await db.insert(schoolAccounts).values({
      schoolAdminUserId: adminUserId,
      schoolName,
      verificationStatus: "pending",
      subscriptionAmount: 99,
    }).returning();
    await db.insert(schoolMembers).values({
      schoolId: school.id,
      userId: adminUserId,
      role: "admin",
      status: "active",
    });
    return school;
  }

  async getSchoolAccount(id: number): Promise<SchoolAccount | undefined> {
    const [school] = await db.select().from(schoolAccounts).where(eq(schoolAccounts.id, id));
    return school;
  }

  async getSchoolAccountByAdminId(adminUserId: number): Promise<SchoolAccount | undefined> {
    const [school] = await db.select().from(schoolAccounts).where(eq(schoolAccounts.schoolAdminUserId, adminUserId));
    return school;
  }

  async updateSchoolAccount(id: number, updates: Partial<SchoolAccount>): Promise<SchoolAccount | undefined> {
    const [updated] = await db.update(schoolAccounts).set(updates).where(eq(schoolAccounts.id, id)).returning();
    return updated;
  }

  async verifySchoolAccount(schoolId: number): Promise<SchoolAccount | undefined> {
    const subscriptionExpiresAt = new Date();
    subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + 1);
    const [updated] = await db.update(schoolAccounts).set({
      verificationStatus: "verified",
      verifiedAt: new Date(),
      subscriptionExpiresAt,
    }).where(eq(schoolAccounts.id, schoolId)).returning();
    return updated;
  }

  async addSchoolMember(schoolId: number, userId: number, role: string): Promise<SchoolMember> {
    const [member] = await db.insert(schoolMembers).values({
      schoolId,
      userId,
      role,
      status: "active",
    }).returning();
    return member;
  }

  async getSchoolMembers(schoolId: number): Promise<(SchoolMember & { user: User })[]> {
    const members = await db.select().from(schoolMembers).where(eq(schoolMembers.schoolId, schoolId));
    const result: (SchoolMember & { user: User })[] = [];
    for (const member of members) {
      const user = await this.getUser(member.userId);
      if (user) result.push({ ...member, user });
    }
    return result;
  }

  async getSchoolMemberByUserId(userId: number): Promise<SchoolMember | undefined> {
    const [member] = await db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId));
    return member;
  }

  async removeSchoolMember(memberId: number): Promise<boolean> {
    const result = await db.delete(schoolMembers).where(eq(schoolMembers.id, memberId));
    return (result.rowCount ?? 0) > 0;
  }

  async getSchoolMembersBySchoolId(schoolId: number): Promise<SchoolMember[]> {
    return await db.select().from(schoolMembers).where(eq(schoolMembers.schoolId, schoolId));
  }

  async createSchoolPayment(payment: InsertSchoolPaymentHistory): Promise<SchoolPaymentHistory> {
    const [result] = await db.insert(schoolPaymentHistory).values(payment).returning();
    return result;
  }

  async getSchoolPayments(schoolId: number): Promise<SchoolPaymentHistory[]> {
    return await db
      .select()
      .from(schoolPaymentHistory)
      .where(eq(schoolPaymentHistory.schoolId, schoolId))
      .orderBy(desc(schoolPaymentHistory.paymentDate));
  }

  async createAgreementAcceptance(record: InsertAgreementAcceptance): Promise<AgreementAcceptance> {
    const [result] = await db.insert(agreementAcceptances).values(record).returning();
    return result;
  }

  async getAgreementAcceptances(userId: number): Promise<AgreementAcceptance[]> {
    return await db
      .select()
      .from(agreementAcceptances)
      .where(eq(agreementAcceptances.userId, userId))
      .orderBy(desc(agreementAcceptances.acceptedAt));
  }

  async createSchoolCertification(record: InsertSchoolCertification): Promise<SchoolCertification> {
    const [result] = await db.insert(schoolCertifications).values(record).returning();
    return result;
  }

  async getSchoolMetrics(schoolId: number, startDate?: Date, endDate?: Date): Promise<any> {
    const members = await this.getSchoolMembers(schoolId);
    const memberUserIds = members.map(m => m.userId).filter(Boolean);

    if (memberUserIds.length === 0) {
      return { byStudent: [], byGrade: [], summary: { totalStudents: 0, totalTeachers: 0, totalSessions: 0, totalWords: 0, totalCorrect: 0 } };
    }

    const conditions: any[] = [inArray(gameSessions.userId, memberUserIds)];
    if (startDate) conditions.push(gte(gameSessions.createdAt, startDate));
    if (endDate) conditions.push(lte(gameSessions.createdAt, endDate));

    const sessionData = await db
      .select({
        userId: gameSessions.userId,
        gameMode: gameSessions.gameMode,
        score: gameSessions.score,
        totalWords: gameSessions.totalWords,
        correctWords: gameSessions.correctWords,
        createdAt: gameSessions.createdAt,
        gradeLevel: wordLists.gradeLevel,
      })
      .from(gameSessions)
      .leftJoin(wordLists, eq(wordLists.id, gameSessions.wordListId))
      .where(and(...conditions));

    const byStudent = members
      .filter(m => m.role !== 'admin')
      .map(member => {
        const sessions = sessionData.filter(s => s.userId === member.userId);
        const totalWords = sessions.reduce((sum, s) => sum + (s.totalWords ?? 0), 0);
        const correctWords = sessions.reduce((sum, s) => sum + (s.correctWords ?? 0), 0);
        const gameModes = [...new Set(sessions.map(s => s.gameMode))];
        return {
          userId: member.userId,
          firstName: (member as any).user?.firstName ?? null,
          lastName: (member as any).user?.lastName ?? null,
          username: (member as any).user?.username ?? '',
          role: member.role,
          sessionsCount: sessions.length,
          totalWords,
          correctWords,
          accuracy: totalWords > 0 ? Math.round(correctWords / totalWords * 100) : null,
          avgScore: sessions.length > 0 ? Math.round(sessions.reduce((s, g) => s + (g.score ?? 0), 0) / sessions.length) : 0,
          gameModes,
        };
      })
      .sort((a, b) => b.sessionsCount - a.sessionsCount);

    const gradeMap = new Map<string, { sessions: number; totalWords: number; correctWords: number; students: Set<number> }>();
    for (const s of sessionData) {
      const grade = s.gradeLevel ?? 'Not Specified';
      if (!gradeMap.has(grade)) gradeMap.set(grade, { sessions: 0, totalWords: 0, correctWords: 0, students: new Set() });
      const g = gradeMap.get(grade)!;
      g.sessions++;
      g.totalWords += s.totalWords ?? 0;
      g.correctWords += s.correctWords ?? 0;
      if (s.userId) g.students.add(s.userId);
    }

    const byGrade = Array.from(gradeMap.entries())
      .map(([gradeLevel, data]) => ({
        gradeLevel,
        studentsCount: data.students.size,
        sessionsCount: data.sessions,
        totalWords: data.totalWords,
        accuracy: data.totalWords > 0 ? Math.round(data.correctWords / data.totalWords * 100) : null,
      }))
      .sort((a, b) => b.sessionsCount - a.sessionsCount);

    const totalWords = sessionData.reduce((s, g) => s + (g.totalWords ?? 0), 0);
    const totalCorrect = sessionData.reduce((s, g) => s + (g.correctWords ?? 0), 0);

    const summary = {
      totalStudents: members.filter(m => m.role === 'student').length,
      totalTeachers: members.filter(m => m.role === 'teacher').length,
      totalSessions: sessionData.length,
      totalWords,
      totalCorrect,
      overallAccuracy: totalWords > 0 ? Math.round(totalCorrect / totalWords * 100) : null,
    };

    return { byStudent, byGrade, summary };
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [result] = await db.insert(promoCodes).values(data).returning();
    return result;
  }

  async getPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [result] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return result;
  }

  async getPromoCodeById(id: number): Promise<PromoCode | undefined> {
    const [result] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return result;
  }

  async updatePromoCode(id: number, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const [result] = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return result;
  }

  async deletePromoCode(id: number): Promise<void> {
    await db.delete(promoCodeUsages).where(eq(promoCodeUsages.codeId, id));
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async recordPromoCodeUsage(codeId: number, userId?: number): Promise<void> {
    await db.insert(promoCodeUsages).values({ codeId, userId });
    await db.update(promoCodes)
      .set({ usesCount: sql`${promoCodes.usesCount} + 1` })
      .where(eq(promoCodes.id, codeId));
  }

  async getPromoCodeUsages(codeId: number): Promise<{ id: number; userId: number | null; username: string | null; usedAt: Date }[]> {
    const rows = await db
      .select({
        id: promoCodeUsages.id,
        userId: promoCodeUsages.userId,
        username: users.username,
        usedAt: promoCodeUsages.usedAt,
      })
      .from(promoCodeUsages)
      .leftJoin(users, eq(promoCodeUsages.userId, users.id))
      .where(eq(promoCodeUsages.codeId, codeId))
      .orderBy(promoCodeUsages.usedAt);
    return rows;
  }
}

export const storage = new DatabaseStorage();
