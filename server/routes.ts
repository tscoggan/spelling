import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertWordSchema, insertCustomWordListSchema, type DifficultyLevel } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  app.get("/api/words", async (req, res) => {
    try {
      const words = await storage.getAllWords();
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch words" });
    }
  });

  app.get("/api/words/:difficulty", async (req, res) => {
    try {
      const difficulty = req.params.difficulty as DifficultyLevel;
      
      if (!["easy", "medium", "hard"].includes(difficulty)) {
        return res.status(400).json({ error: "Invalid difficulty level" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const words = await storage.getWordsByDifficulty(difficulty, limit);
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch words by difficulty" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertGameSessionSchema.parse(req.body);
      const session = await storage.createGameSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create game session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const session = await storage.getGameSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const updates = req.body;
      const session = await storage.updateGameSession(id, updates);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as DifficultyLevel | undefined;
      const gameMode = req.query.gameMode as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const scores = await storage.getTopScores(difficulty, gameMode, limit);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.post("/api/leaderboard", async (req, res) => {
    try {
      const { insertLeaderboardScoreSchema } = await import("@shared/schema");
      const scoreData = insertLeaderboardScoreSchema.parse(req.body);
      const score = await storage.createLeaderboardScore(scoreData);
      res.json(score);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid score data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save score" });
    }
  });

  app.post("/api/word-lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const listData = insertCustomWordListSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const wordList = await storage.createCustomWordList(listData);
      res.json(wordList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error creating word list:", error.errors);
        return res.status(400).json({ error: "Invalid word list data", details: error.errors });
      }
      console.error("Error creating word list:", error);
      res.status(500).json({ error: "Failed to create word list", message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/word-lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const wordLists = await storage.getUserCustomWordLists(req.user!.id);
      res.json(wordLists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch word lists" });
    }
  });

  app.get("/api/word-lists/public", async (req, res) => {
    try {
      const wordLists = await storage.getPublicCustomWordLists();
      res.json(wordLists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch public word lists" });
    }
  });

  app.get("/api/word-lists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const wordList = await storage.getCustomWordList(id);
      if (!wordList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      if (!wordList.isPublic && (!req.isAuthenticated() || req.user!.id !== wordList.userId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(wordList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch word list" });
    }
  });

  app.put("/api/word-lists/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const existingList = await storage.getCustomWordList(id);
      if (!existingList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      if (existingList.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updates = insertCustomWordListSchema.partial().parse(req.body);
      const updatedList = await storage.updateCustomWordList(id, updates);
      
      res.json(updatedList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid word list data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update word list" });
    }
  });

  app.delete("/api/word-lists/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const existingList = await storage.getCustomWordList(id);
      if (!existingList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      if (existingList.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteCustomWordList(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete word list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
