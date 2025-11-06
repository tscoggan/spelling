import { type Word, type InsertWord, type GameSession, type InsertGameSession, type DifficultyLevel } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllWords(): Promise<Word[]>;
  getWordsByDifficulty(difficulty: DifficultyLevel): Promise<Word[]>;
  getWord(id: string): Promise<Word | undefined>;
  createWord(word: InsertWord): Promise<Word>;
  
  getGameSession(id: string): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
}

export class MemStorage implements IStorage {
  private words: Map<string, Word>;
  private gameSessions: Map<string, GameSession>;

  constructor() {
    this.words = new Map();
    this.gameSessions = new Map();
    this.initializeWords();
  }

  private initializeWords() {
    const easyWords = [
      "apple", "banana", "cat", "dog", "elephant", "friend", "garden", "happy",
      "island", "jungle", "kitten", "lemon", "monkey", "nature", "orange",
      "pencil", "queen", "rabbit", "sunny", "turtle", "umbrella", "violin",
      "water", "yellow", "zebra", "beach", "castle", "dragon", "forest", "giant"
    ];

    const mediumWords = [
      "achieve", "beautiful", "calendar", "delicious", "education", "fantastic",
      "happiness", "important", "knowledge", "necessary", "official", "peaceful",
      "question", "recognize", "separate", "tomorrow", "universe", "valuable",
      "wonderful", "yesterday", "adventure", "brilliant", "creature", "dinosaur",
      "enormous", "fragile", "gorgeous", "innocent", "mysterious", "treasure"
    ];

    const hardWords = [
      "accommodate", "bureaucracy", "conscientious", "deteriorate", "embarrass",
      "fluorescent", "guarantee", "harassment", "independent", "maintenance",
      "necessary", "occurrence", "perseverance", "questionnaire", "restaurant",
      "sacrilegious", "rhythm", "millennium", "pharaoh", "chaos", "pneumonia",
      "pseudonym", "silhouette", "surveillance", "yacht", "psychiatrist",
      "rendezvous", "entrepreneur", "mischievous", "maneuver"
    ];

    const addWords = (wordList: string[], difficulty: DifficultyLevel) => {
      wordList.forEach(word => {
        const id = randomUUID();
        this.words.set(id, { id, word, difficulty });
      });
    };

    addWords(easyWords, "easy");
    addWords(mediumWords, "medium");
    addWords(hardWords, "hard");
  }

  async getAllWords(): Promise<Word[]> {
    return Array.from(this.words.values());
  }

  async getWordsByDifficulty(difficulty: DifficultyLevel): Promise<Word[]> {
    const words = Array.from(this.words.values()).filter(
      word => word.difficulty === difficulty
    );
    return words.sort(() => Math.random() - 0.5).slice(0, 10);
  }

  async getWord(id: string): Promise<Word | undefined> {
    return this.words.get(id);
  }

  async createWord(insertWord: InsertWord): Promise<Word> {
    const id = randomUUID();
    const word: Word = { ...insertWord, id };
    this.words.set(id, word);
    return word;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const session: GameSession = { ...insertSession, id };
    this.gameSessions.set(id, session);
    return session;
  }

  async updateGameSession(
    id: string,
    updates: Partial<GameSession>
  ): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
