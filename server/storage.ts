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
  words,
  gameSessions,
  users,
  leaderboardScores,
  customWordLists,
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
  SHOP_ITEMS,
  type ShopItemId,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, not } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  getWord(id: number): Promise<Word | undefined>;
  getWordByText(word: string): Promise<Word | undefined>;
  createWord(word: InsertWord): Promise<Word>;
  upsertWord(word: string, definition?: string, sentenceExample?: string, wordOrigin?: string, partOfSpeech?: string): Promise<Word>;
  
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
  
  searchUsers(query: string): Promise<any[]>;
  
  getUserOwnedGroups(userId: number): Promise<any[]>;
  getUserWordLists(userId: number): Promise<CustomWordList[]>;
  getGameSessionsByUserAndList(userId: number, wordListId: number): Promise<GameSession[]>;
  
  getWordListSharedGroupIds(wordListId: number): Promise<number[]>;
  setWordListSharedGroups(wordListId: number, groupIds: number[]): Promise<void>;
  isUserMemberOfWordListGroups(userId: number, wordListId: number): Promise<boolean>;
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

  async createWord(insertWord: InsertWord): Promise<Word> {
    const [word] = await db.insert(words).values(insertWord).returning();
    return word;
  }

  async upsertWord(wordText: string, definition?: string, sentenceExample?: string, wordOrigin?: string, partOfSpeech?: string): Promise<Word> {
    const normalized = wordText.toLowerCase().trim();
    
    const existing = await this.getWordByText(normalized);
    
    if (existing) {
      const updates: Partial<InsertWord> = {};
      
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
      
      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(words)
          .set(updates)
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
      })
      .returning();
    
    return newWord;
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
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPreferences(userId: number, preferences: { preferredVoice?: string | null; selectedTheme?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set(preferences)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserEmail(userId: number, email: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ email })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string; email?: string; selectedAvatar?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
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
    const [wordList] = await db.insert(customWordLists).values(list).returning();
    return wordList;
  }

  async getCustomWordList(id: number): Promise<CustomWordList | undefined> {
    const [wordList] = await db.select().from(customWordLists).where(eq(customWordLists.id, id));
    return wordList || undefined;
  }

  async getSystemWordListId(): Promise<number | null> {
    const [systemList] = await db
      .select({ id: customWordLists.id })
      .from(customWordLists)
      .where(
        and(
          eq(customWordLists.name, 'System Illustrations'),
          eq(customWordLists.gradeLevel, 'System')
        )
      );
    return systemList?.id || null;
  }

  async getUserCustomWordLists(userId: number): Promise<any[]> {
    const wordLists = await db
      .select({
        id: customWordLists.id,
        userId: customWordLists.userId,
        name: customWordLists.name,
        words: customWordLists.words,
        visibility: customWordLists.visibility,
        assignImages: customWordLists.assignImages,
        gradeLevel: customWordLists.gradeLevel,
        createdAt: customWordLists.createdAt,
        authorUsername: users.username,
      })
      .from(customWordLists)
      .leftJoin(users, eq(customWordLists.userId, users.id))
      .where(eq(customWordLists.userId, userId))
      .orderBy(desc(customWordLists.createdAt));
    
    // Fetch group information for lists with 'groups' visibility
    const wordListIds = wordLists.filter(list => list.visibility === 'groups').map(list => list.id);
    if (wordListIds.length === 0) {
      return wordLists;
    }
    
    // Fetch all group mappings for these word lists
    const groupMappings = await db
      .select({
        wordListId: wordListUserGroups.wordListId,
        groupId: wordListUserGroups.groupId,
        groupName: userGroups.name,
      })
      .from(wordListUserGroups)
      .leftJoin(userGroups, eq(wordListUserGroups.groupId, userGroups.id))
      .where(inArray(wordListUserGroups.wordListId, wordListIds));
    
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
    
    // Add group information to word lists (always return an array, never undefined)
    return wordLists.map(list => ({
      ...list,
      sharedGroups: list.visibility === 'groups' ? (groupsByWordList.get(list.id) || []) : [],
    }));
  }

  async getPublicCustomWordLists(): Promise<any[]> {
    const wordLists = await db
      .select({
        id: customWordLists.id,
        userId: customWordLists.userId,
        name: customWordLists.name,
        words: customWordLists.words,
        visibility: customWordLists.visibility,
        assignImages: customWordLists.assignImages,
        gradeLevel: customWordLists.gradeLevel,
        createdAt: customWordLists.createdAt,
        authorUsername: users.username,
      })
      .from(customWordLists)
      .leftJoin(users, eq(customWordLists.userId, users.id))
      .where(eq(customWordLists.visibility, 'public'))
      .orderBy(desc(customWordLists.createdAt));
    
    // Public lists don't need group information, but return in consistent format
    return wordLists.map(list => ({
      ...list,
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
    
    if (allGroupIds.length === 0) {
      return [];
    }
    
    // Get word lists shared with these groups
    const sharedListIds = await db
      .select({ wordListId: wordListUserGroups.wordListId })
      .from(wordListUserGroups)
      .where(inArray(wordListUserGroups.groupId, allGroupIds));
    
    if (sharedListIds.length === 0) {
      return [];
    }
    
    const uniqueListIds = Array.from(new Set(sharedListIds.map(s => s.wordListId)));
    
    // Fetch the actual word lists (excluding ones owned by the user to avoid duplicates)
    const wordLists = await db
      .select({
        id: customWordLists.id,
        userId: customWordLists.userId,
        name: customWordLists.name,
        words: customWordLists.words,
        visibility: customWordLists.visibility,
        assignImages: customWordLists.assignImages,
        gradeLevel: customWordLists.gradeLevel,
        createdAt: customWordLists.createdAt,
        authorUsername: users.username,
      })
      .from(customWordLists)
      .leftJoin(users, eq(customWordLists.userId, users.id))
      .where(
        and(
          inArray(customWordLists.id, uniqueListIds),
          not(eq(customWordLists.userId, userId))
        )
      )
      .orderBy(desc(customWordLists.createdAt));
    
    // Fetch group information for these lists
    const groupMappings = await db
      .select({
        wordListId: wordListUserGroups.wordListId,
        groupId: wordListUserGroups.groupId,
        groupName: userGroups.name,
      })
      .from(wordListUserGroups)
      .leftJoin(userGroups, eq(wordListUserGroups.groupId, userGroups.id))
      .where(inArray(wordListUserGroups.wordListId, uniqueListIds));
    
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
    
    // Add group information to word lists
    return wordLists.map(list => ({
      ...list,
      sharedGroups: groupsByWordList.get(list.id) || [],
    }));
  }

  async updateCustomWordList(id: number, updates: Partial<InsertCustomWordList>): Promise<CustomWordList | undefined> {
    const [wordList] = await db.update(customWordLists)
      .set(updates)
      .where(eq(customWordLists.id, id))
      .returning();
    return wordList || undefined;
  }

  async deleteCustomWordList(id: number): Promise<boolean> {
    const result = await db.delete(customWordLists).where(eq(customWordLists.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
        createdAt: userGroups.createdAt,
        plaintextPassword: userGroups.plaintextPassword,
        ownerUsername: users.username,
      })
      .from(userGroups)
      .innerJoin(users, eq(userGroups.ownerUserId, users.id))
      .where(eq(userGroups.ownerUserId, userId));
    
    // Get member groups with owner username
    const memberGroups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        ownerUserId: userGroups.ownerUserId,
        isPublic: userGroups.isPublic,
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
    
    // Create sets for owned and member group IDs
    const ownedGroupIds = new Set(ownedGroups.map(g => g.id));
    const memberGroupIds = new Set(memberGroups.map(g => g.id));
    
    // Deduplicate by ID, prioritizing owned/member groups over public groups
    const groupMap = new Map();
    
    // Add owned groups first
    for (const group of ownedGroups) {
      groupMap.set(group.id, group);
    }
    
    // Add member groups (may overlap with owned)
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
    
    // Add isMember, isOwner flags, and memberCount to each group
    return uniqueGroups.map(group => ({
      ...group,
      isOwner: ownedGroupIds.has(group.id),
      isMember: ownedGroupIds.has(group.id) || memberGroupIds.has(group.id),
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
    
    return members;
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

  async searchUsers(query: string): Promise<any[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
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
        sql`LOWER(${users.username}) LIKE ${searchTerm} 
         OR LOWER(${users.firstName}) LIKE ${searchTerm}
         OR LOWER(${users.lastName}) LIKE ${searchTerm}
         OR LOWER(${users.email}) LIKE ${searchTerm}`
      )
      .limit(10);
    
    return results;
  }

  async getUserOwnedGroups(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(userGroups)
      .where(eq(userGroups.ownerUserId, userId));
  }

  async getUserWordLists(userId: number): Promise<CustomWordList[]> {
    return await db
      .select()
      .from(customWordLists)
      .where(eq(customWordLists.userId, userId))
      .orderBy(desc(customWordLists.createdAt));
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
    
    return membership.length > 0;
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
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "teacher"));
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
}

export const storage = new DatabaseStorage();
