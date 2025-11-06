import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertWordSchema, type DifficultyLevel } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
