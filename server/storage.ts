import { 
  type Word, 
  type InsertWord, 
  type GameSession, 
  type InsertGameSession, 
  type DifficultyLevel,
  type User,
  type InsertUser,
  type WordAttempt,
  type InsertWordAttempt,
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
  words,
  gameSessions,
  users,
  wordAttempts,
  leaderboardScores,
  customWordLists,
  wordIllustrations,
  userGroups,
  userGroupMembership,
  userToDoItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  getAllWords(): Promise<Word[]>;
  getWordsByDifficulty(difficulty: DifficultyLevel, limit?: number): Promise<Word[]>;
  getWord(id: number): Promise<Word | undefined>;
  createWord(word: InsertWord): Promise<Word>;
  seedWords(): Promise<void>;
  
  getGameSession(id: number): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: number, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createWordAttempt(attempt: InsertWordAttempt): Promise<WordAttempt>;
  getMissedWordsByUser(userId: number): Promise<Word[]>;
  getUserAttemptHistory(userId: number, limit?: number): Promise<WordAttempt[]>;
  
  createLeaderboardScore(score: InsertLeaderboardScore): Promise<LeaderboardScore>;
  getTopScores(difficulty?: DifficultyLevel, gameMode?: string, limit?: number): Promise<LeaderboardScore[]>;
  getUserBestScores(userId: number): Promise<LeaderboardScore[]>;
  
  createCustomWordList(list: InsertCustomWordList): Promise<CustomWordList>;
  getCustomWordList(id: number): Promise<CustomWordList | undefined>;
  getUserCustomWordLists(userId: number): Promise<CustomWordList[]>;
  getPublicCustomWordLists(): Promise<CustomWordList[]>;
  updateCustomWordList(id: number, updates: Partial<InsertCustomWordList>): Promise<CustomWordList | undefined>;
  deleteCustomWordList(id: number): Promise<boolean>;
  
  createWordIllustration(illustration: InsertWordIllustration): Promise<WordIllustration>;
  getWordIllustration(word: string): Promise<WordIllustration | undefined>;
  getAllWordIllustrations(): Promise<WordIllustration[]>;
  updateWordIllustration(id: number, updates: Partial<InsertWordIllustration>): Promise<WordIllustration | undefined>;
  
  createUserGroup(group: any): Promise<any>;
  getUserGroup(groupId: number): Promise<any>;
  getUserAccessibleGroups(userId: number): Promise<any[]>;
  deleteUserGroup(groupId: number): Promise<boolean>;
  addGroupMember(groupId: number, userId: number): Promise<any>;
  removeGroupMember(groupId: number, userId: number): Promise<boolean>;
  getGroupMembers(groupId: number): Promise<any[]>;
  
  createToDoItem(todo: any): Promise<any>;
  getUserToDoItems(userId: number): Promise<any[]>;
  getToDoItem(todoId: number): Promise<any>;
  updateToDoItem(todoId: number, updates: any): Promise<any>;
  deleteToDoItem(todoId: number): Promise<boolean>;
  
  searchUsers(query: string): Promise<any[]>;
  
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

  async getAllWords(): Promise<Word[]> {
    return await db.select().from(words);
  }

  async getWordsByDifficulty(difficulty: DifficultyLevel, limit: number = 10): Promise<Word[]> {
    const allWords = await db.select().from(words).where(eq(words.difficulty, difficulty));
    return allWords.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  async getWord(id: number): Promise<Word | undefined> {
    const [word] = await db.select().from(words).where(eq(words.id, id));
    return word || undefined;
  }

  async createWord(insertWord: InsertWord): Promise<Word> {
    const [word] = await db.insert(words).values(insertWord).returning();
    return word;
  }

  async seedWords(): Promise<void> {
    const existingWords = await db.select().from(words);
    if (existingWords.length > 0) return;

    const easyWords = [
      { word: "apple", difficulty: "easy", sentenceExample: "I ate a red apple for lunch.", wordOrigin: "Old English æppel" },
      { word: "banana", difficulty: "easy", sentenceExample: "The banana is yellow and sweet.", wordOrigin: "West African" },
      { word: "cat", difficulty: "easy", sentenceExample: "The cat sleeps on the couch.", wordOrigin: "Latin cattus" },
      { word: "dog", difficulty: "easy", sentenceExample: "My dog loves to play fetch.", wordOrigin: "Old English docga" },
      { word: "elephant", difficulty: "easy", sentenceExample: "The elephant has a long trunk.", wordOrigin: "Greek elephas" },
      { word: "friend", difficulty: "easy", sentenceExample: "She is my best friend.", wordOrigin: "Old English freond" },
      { word: "garden", difficulty: "easy", sentenceExample: "We planted flowers in the garden.", wordOrigin: "Old French gardin" },
      { word: "happy", difficulty: "easy", sentenceExample: "I feel happy today.", wordOrigin: "Middle English hap (luck)" },
      { word: "island", difficulty: "easy", sentenceExample: "We sailed to a tropical island.", wordOrigin: "Old English igland" },
      { word: "jungle", difficulty: "easy", sentenceExample: "Lions live in the jungle.", wordOrigin: "Hindi jangal" },
      { word: "kitten", difficulty: "easy", sentenceExample: "The kitten is very playful.", wordOrigin: "Middle English kitoun" },
      { word: "lemon", difficulty: "easy", sentenceExample: "The lemon tastes sour.", wordOrigin: "Arabic laimun" },
      { word: "monkey", difficulty: "easy", sentenceExample: "The monkey swings from trees.", wordOrigin: "Low German" },
      { word: "nature", difficulty: "easy", sentenceExample: "I love spending time in nature.", wordOrigin: "Latin natura" },
      { word: "orange", difficulty: "easy", sentenceExample: "The orange is juicy and sweet.", wordOrigin: "Sanskrit naranga" },
      { word: "pencil", difficulty: "easy", sentenceExample: "I write with a pencil.", wordOrigin: "Latin penicillus" },
      { word: "queen", difficulty: "easy", sentenceExample: "The queen wore a crown.", wordOrigin: "Old English cwen" },
      { word: "rabbit", difficulty: "easy", sentenceExample: "The rabbit hops quickly.", wordOrigin: "Middle Dutch robbe" },
      { word: "sunny", difficulty: "easy", sentenceExample: "It's a sunny day today.", wordOrigin: "Old English sunne" },
      { word: "turtle", difficulty: "easy", sentenceExample: "The turtle moves slowly.", wordOrigin: "Latin tortuca" },
      { word: "umbrella", difficulty: "easy", sentenceExample: "I use an umbrella in the rain.", wordOrigin: "Italian ombrella" },
      { word: "violin", difficulty: "easy", sentenceExample: "She plays the violin beautifully.", wordOrigin: "Italian violino" },
      { word: "water", difficulty: "easy", sentenceExample: "I drink water every day.", wordOrigin: "Old English wæter" },
      { word: "yellow", difficulty: "easy", sentenceExample: "The sun is bright yellow.", wordOrigin: "Old English geolu" },
      { word: "zebra", difficulty: "easy", sentenceExample: "The zebra has black and white stripes.", wordOrigin: "Italian zebra" },
      { word: "beach", difficulty: "easy", sentenceExample: "We built sandcastles at the beach.", wordOrigin: "Old English bæce" },
      { word: "castle", difficulty: "easy", sentenceExample: "The castle has tall towers.", wordOrigin: "Latin castellum" },
      { word: "dragon", difficulty: "easy", sentenceExample: "The dragon breathes fire.", wordOrigin: "Greek drakon" },
      { word: "forest", difficulty: "easy", sentenceExample: "Many trees grow in the forest.", wordOrigin: "Latin forestis" },
      { word: "giant", difficulty: "easy", sentenceExample: "The giant was very tall.", wordOrigin: "Greek gigas" },
    ];

    const mediumWords = [
      { word: "achieve", difficulty: "medium", sentenceExample: "You can achieve your goals with hard work.", wordOrigin: "Old French achever" },
      { word: "beautiful", difficulty: "medium", sentenceExample: "The sunset was beautiful.", wordOrigin: "Latin bellus" },
      { word: "calendar", difficulty: "medium", sentenceExample: "I marked the date on my calendar.", wordOrigin: "Latin calendarium" },
      { word: "delicious", difficulty: "medium", sentenceExample: "The cake tastes delicious.", wordOrigin: "Latin deliciosus" },
      { word: "education", difficulty: "medium", sentenceExample: "Education is important for everyone.", wordOrigin: "Latin educatio" },
      { word: "fantastic", difficulty: "medium", sentenceExample: "The movie was fantastic!", wordOrigin: "Greek phantastikos" },
      { word: "happiness", difficulty: "medium", sentenceExample: "Happiness comes from within.", wordOrigin: "Old Norse happ" },
      { word: "important", difficulty: "medium", sentenceExample: "It's important to be kind.", wordOrigin: "Latin importare" },
      { word: "knowledge", difficulty: "medium", sentenceExample: "Knowledge is power.", wordOrigin: "Old English cnawan" },
      { word: "necessary", difficulty: "medium", sentenceExample: "Sleep is necessary for health.", wordOrigin: "Latin necessarius" },
      { word: "official", difficulty: "medium", sentenceExample: "This is an official document.", wordOrigin: "Latin officialis" },
      { word: "peaceful", difficulty: "medium", sentenceExample: "The lake was peaceful and calm.", wordOrigin: "Latin pax" },
      { word: "question", difficulty: "medium", sentenceExample: "I have a question about homework.", wordOrigin: "Latin quaestio" },
      { word: "recognize", difficulty: "medium", sentenceExample: "I recognize that face from somewhere.", wordOrigin: "Latin recognoscere" },
      { word: "separate", difficulty: "medium", sentenceExample: "Please separate the colors from the whites.", wordOrigin: "Latin separatus" },
      { word: "tomorrow", difficulty: "medium", sentenceExample: "I will see you tomorrow.", wordOrigin: "Old English to morgenne" },
      { word: "universe", difficulty: "medium", sentenceExample: "The universe is vast and mysterious.", wordOrigin: "Latin universus" },
      { word: "valuable", difficulty: "medium", sentenceExample: "This ring is very valuable.", wordOrigin: "Latin valere" },
      { word: "wonderful", difficulty: "medium", sentenceExample: "We had a wonderful time at the party.", wordOrigin: "Old English wundor" },
      { word: "yesterday", difficulty: "medium", sentenceExample: "I finished my homework yesterday.", wordOrigin: "Old English geostran dæg" },
      { word: "adventure", difficulty: "medium", sentenceExample: "Our camping trip was a great adventure.", wordOrigin: "Latin adventurus" },
      { word: "brilliant", difficulty: "medium", sentenceExample: "She has a brilliant mind.", wordOrigin: "French brillant" },
      { word: "creature", difficulty: "medium", sentenceExample: "The ocean is full of strange creatures.", wordOrigin: "Latin creatura" },
      { word: "dinosaur", difficulty: "medium", sentenceExample: "Dinosaurs lived millions of years ago.", wordOrigin: "Greek deinos sauros" },
      { word: "enormous", difficulty: "medium", sentenceExample: "The elephant is an enormous animal.", wordOrigin: "Latin enormis" },
      { word: "fragile", difficulty: "medium", sentenceExample: "Handle the glass carefully, it's fragile.", wordOrigin: "Latin fragilis" },
      { word: "gorgeous", difficulty: "medium", sentenceExample: "The flowers are gorgeous.", wordOrigin: "Old French gorgias" },
      { word: "innocent", difficulty: "medium", sentenceExample: "The child has an innocent smile.", wordOrigin: "Latin innocens" },
      { word: "mysterious", difficulty: "medium", sentenceExample: "The abandoned house looks mysterious.", wordOrigin: "Latin mysterium" },
      { word: "treasure", difficulty: "medium", sentenceExample: "Pirates search for buried treasure.", wordOrigin: "Greek thesauros" },
    ];

    const hardWords = [
      { word: "accommodate", difficulty: "hard", sentenceExample: "The hotel can accommodate 200 guests.", wordOrigin: "Latin accommodare" },
      { word: "bureaucracy", difficulty: "hard", sentenceExample: "Government bureaucracy can be slow.", wordOrigin: "French bureaucratie" },
      { word: "conscientious", difficulty: "hard", sentenceExample: "She is a conscientious student.", wordOrigin: "Latin conscient" },
      { word: "deteriorate", difficulty: "hard", sentenceExample: "The old building began to deteriorate.", wordOrigin: "Latin deteriorare" },
      { word: "embarrass", difficulty: "hard", sentenceExample: "Don't embarrass me in front of my friends.", wordOrigin: "French embarrasser" },
      { word: "fluorescent", difficulty: "hard", sentenceExample: "The fluorescent lights are very bright.", wordOrigin: "Latin fluere" },
      { word: "guarantee", difficulty: "hard", sentenceExample: "I guarantee you will love this movie.", wordOrigin: "Spanish garante" },
      { word: "harassment", difficulty: "hard", sentenceExample: "Workplace harassment is unacceptable.", wordOrigin: "French harasser" },
      { word: "independent", difficulty: "hard", sentenceExample: "She is an independent woman.", wordOrigin: "Latin independens" },
      { word: "maintenance", difficulty: "hard", sentenceExample: "Regular maintenance keeps cars running well.", wordOrigin: "French maintenir" },
      { word: "occurrence", difficulty: "hard", sentenceExample: "This is a rare occurrence.", wordOrigin: "Latin occurrere" },
      { word: "perseverance", difficulty: "hard", sentenceExample: "Success requires perseverance.", wordOrigin: "Latin perseverare" },
      { word: "questionnaire", difficulty: "hard", sentenceExample: "Please fill out this questionnaire.", wordOrigin: "French questionnaire" },
      { word: "restaurant", difficulty: "hard", sentenceExample: "We ate dinner at a nice restaurant.", wordOrigin: "French restaurer" },
      { word: "sacrilegious", difficulty: "hard", sentenceExample: "The act was considered sacrilegious.", wordOrigin: "Latin sacrilegium" },
      { word: "rhythm", difficulty: "hard", sentenceExample: "The song has a catchy rhythm.", wordOrigin: "Greek rhythmos" },
      { word: "millennium", difficulty: "hard", sentenceExample: "We celebrated the new millennium in 2000.", wordOrigin: "Latin mille" },
      { word: "pharaoh", difficulty: "hard", sentenceExample: "The pharaoh ruled ancient Egypt.", wordOrigin: "Egyptian pr-aa" },
      { word: "chaos", difficulty: "hard", sentenceExample: "The room was in complete chaos.", wordOrigin: "Greek khaos" },
      { word: "pneumonia", difficulty: "hard", sentenceExample: "He was hospitalized with pneumonia.", wordOrigin: "Greek pneumon" },
      { word: "pseudonym", difficulty: "hard", sentenceExample: "The author writes under a pseudonym.", wordOrigin: "Greek pseudonymos" },
      { word: "silhouette", difficulty: "hard", sentenceExample: "I could see her silhouette in the window.", wordOrigin: "French silhouette" },
      { word: "surveillance", difficulty: "hard", sentenceExample: "The building is under surveillance.", wordOrigin: "French surveiller" },
      { word: "yacht", difficulty: "hard", sentenceExample: "They sailed on a luxury yacht.", wordOrigin: "Dutch jacht" },
      { word: "psychiatrist", difficulty: "hard", sentenceExample: "She sees a psychiatrist weekly.", wordOrigin: "Greek psyche iatros" },
      { word: "rendezvous", difficulty: "hard", sentenceExample: "We have a rendezvous at noon.", wordOrigin: "French rendez-vous" },
      { word: "entrepreneur", difficulty: "hard", sentenceExample: "The entrepreneur started three companies.", wordOrigin: "French entreprendre" },
      { word: "mischievous", difficulty: "hard", sentenceExample: "The mischievous child played pranks.", wordOrigin: "Old French meschever" },
      { word: "maneuver", difficulty: "hard", sentenceExample: "The pilot executed a difficult maneuver.", wordOrigin: "French manoeuvre" },
      { word: "hierarchy", difficulty: "hard", sentenceExample: "The company has a strict hierarchy.", wordOrigin: "Greek hierarchia" },
    ];

    await db.insert(words).values([...easyWords, ...mediumWords, ...hardWords]);
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

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createWordAttempt(insertAttempt: InsertWordAttempt): Promise<WordAttempt> {
    const [attempt] = await db.insert(wordAttempts).values(insertAttempt).returning();
    return attempt;
  }

  async getMissedWordsByUser(userId: number): Promise<Word[]> {
    const missedAttempts = await db
      .select({ wordId: wordAttempts.wordId })
      .from(wordAttempts)
      .where(and(eq(wordAttempts.userId, userId), eq(wordAttempts.isCorrect, false)))
      .groupBy(wordAttempts.wordId);

    if (missedAttempts.length === 0) return [];

    const wordIds = missedAttempts.map(a => a.wordId);
    return await db.select().from(words).where(sql`${words.id} = ANY(${wordIds})`);
  }

  async getUserAttemptHistory(userId: number, limit: number = 50): Promise<WordAttempt[]> {
    return await db
      .select()
      .from(wordAttempts)
      .where(eq(wordAttempts.userId, userId))
      .orderBy(desc(wordAttempts.attemptedAt))
      .limit(limit);
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

  async getTopScores(difficulty?: DifficultyLevel, gameMode?: string, limit: number = 10): Promise<any[]> {
    const baseQuery = db
      .select({
        id: leaderboardScores.id,
        userId: leaderboardScores.userId,
        sessionId: leaderboardScores.sessionId,
        score: leaderboardScores.score,
        accuracy: leaderboardScores.accuracy,
        difficulty: leaderboardScores.difficulty,
        gameMode: leaderboardScores.gameMode,
        createdAt: leaderboardScores.createdAt,
        username: users.username,
        selectedAvatar: users.selectedAvatar,
      })
      .from(leaderboardScores)
      .leftJoin(users, eq(leaderboardScores.userId, users.id));

    if (difficulty && gameMode) {
      return await baseQuery
        .where(and(eq(leaderboardScores.difficulty, difficulty), eq(leaderboardScores.gameMode, gameMode)))
        .orderBy(desc(leaderboardScores.score))
        .limit(limit);
    } else if (difficulty) {
      return await baseQuery
        .where(eq(leaderboardScores.difficulty, difficulty))
        .orderBy(desc(leaderboardScores.score))
        .limit(limit);
    } else if (gameMode) {
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

  async getUserCustomWordLists(userId: number): Promise<any[]> {
    return await db
      .select({
        id: customWordLists.id,
        userId: customWordLists.userId,
        name: customWordLists.name,
        difficulty: customWordLists.difficulty,
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
  }

  async getPublicCustomWordLists(): Promise<any[]> {
    return await db
      .select({
        id: customWordLists.id,
        userId: customWordLists.userId,
        name: customWordLists.name,
        difficulty: customWordLists.difficulty,
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
      .where(eq(wordIllustrations.word, illustration.word.toLowerCase()));
    
    if (existingIllustration) {
      // Update existing illustration with new image path
      const [updatedIllustration] = await db
        .update(wordIllustrations)
        .set({
          imagePath: illustration.imagePath,
          source: illustration.source || 'pixabay',
        })
        .where(eq(wordIllustrations.word, illustration.word.toLowerCase()))
        .returning();
      
      return updatedIllustration;
    }
    
    const [newIllustration] = await db
      .insert(wordIllustrations)
      .values({
        word: illustration.word.toLowerCase(),
        imagePath: illustration.imagePath,
        source: illustration.source || 'pixabay',
      })
      .returning();
    
    return newIllustration;
  }

  async getWordIllustration(word: string): Promise<WordIllustration | undefined> {
    const [illustration] = await db
      .select()
      .from(wordIllustrations)
      .where(eq(wordIllustrations.word, word.toLowerCase()));
    
    return illustration || undefined;
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

  async deleteWordIllustration(word: string): Promise<boolean> {
    const result = await db
      .delete(wordIllustrations)
      .where(eq(wordIllustrations.word, word.toLowerCase()));
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

  async getUserAccessibleGroups(userId: number): Promise<UserGroup[]> {
    const ownedGroups = await db.select().from(userGroups).where(eq(userGroups.ownerUserId, userId));
    
    const memberGroups = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        ownerUserId: userGroups.ownerUserId,
        isPublic: userGroups.isPublic,
        createdAt: userGroups.createdAt,
      })
      .from(userGroupMembership)
      .innerJoin(userGroups, eq(userGroupMembership.groupId, userGroups.id))
      .where(eq(userGroupMembership.userId, userId));
    
    const publicGroups = await db.select().from(userGroups).where(eq(userGroups.isPublic, true));
    
    const allGroups = [...ownedGroups, ...memberGroups, ...publicGroups];
    const uniqueGroups = Array.from(new Map(allGroups.map(g => [g.id, g])).values());
    
    return uniqueGroups;
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
}

export const storage = new DatabaseStorage();
