import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertWordSchema, insertCustomWordListSchema, type DifficultyLevel } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { IllustrationJobService } from "./services/illustrationJobService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
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
      const limit = 10; // Always show top 10 only
      
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

      // Validate list name and words for inappropriate content before processing
      const { containsInappropriateContent, validateWords } = await import("./contentModeration");
      
      // Check list name
      if (req.body.name && containsInappropriateContent(req.body.name)) {
        return res.status(400).json({ 
          error: "Inappropriate content detected", 
          details: `The list name contains inappropriate content for children. Please choose a different name.` 
        });
      }
      
      // Check words array
      if (Array.isArray(req.body.words)) {
        const validation = validateWords(req.body.words);
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: "Inappropriate content detected", 
            details: `The following words are not appropriate for children: ${validation.inappropriateWords.join(", ")}` 
          });
        }
      }

      // Capitalize all words before validation
      const wordsArray = Array.isArray(req.body.words) 
        ? req.body.words.map((word: string) => word.toUpperCase())
        : req.body.words;

      const listData = insertCustomWordListSchema.parse({
        ...req.body,
        words: wordsArray,
        userId: req.user!.id,
      });
      
      const wordList = await storage.createCustomWordList(listData);
      
      let illustrationJobId: number | undefined;
      if (listData.assignImages !== false) {
        const jobService = new IllustrationJobService();
        illustrationJobId = await jobService.createJob(wordList.id);
      }
      
      res.json({ 
        ...wordList, 
        ...(illustrationJobId && { illustrationJobId }) 
      });
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

      // Check access based on visibility
      if (wordList.visibility === 'public') {
        // Public lists are accessible to everyone
      } else if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Authentication required" });
      } else if (wordList.visibility === 'private' && req.user!.id !== wordList.userId) {
        return res.status(403).json({ error: "Access denied" });
      } else if (wordList.visibility === 'groups') {
        // TODO: Check if user is member of any groups this list is shared with
        // For now, allow owner and deny others until groups UI is implemented
        if (req.user!.id !== wordList.userId) {
          return res.status(403).json({ error: "Access denied - group membership required" });
        }
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

      // Validate list name and words for inappropriate content before processing
      const { containsInappropriateContent, validateWords } = await import("./contentModeration");
      
      // Check list name if provided
      if (req.body.name && containsInappropriateContent(req.body.name)) {
        return res.status(400).json({ 
          error: "Inappropriate content detected", 
          details: `The list name contains inappropriate content for children. Please choose a different name.` 
        });
      }
      
      // Check words array if provided
      if (req.body.words && Array.isArray(req.body.words)) {
        const validation = validateWords(req.body.words);
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: "Inappropriate content detected", 
            details: `The following words are not appropriate for children: ${validation.inappropriateWords.join(", ")}` 
          });
        }
      }

      // Capitalize all words before validation if words array is being updated
      const bodyData = req.body.words && Array.isArray(req.body.words)
        ? { ...req.body, words: req.body.words.map((word: string) => word.toUpperCase()) }
        : req.body;

      const updates = insertCustomWordListSchema.partial().parse(bodyData);
      const updatedList = await storage.updateCustomWordList(id, updates);
      
      if (!updatedList) {
        return res.status(500).json({ error: "Failed to update word list" });
      }
      
      // If words were updated, check for new words and trigger image enrichment (if assignImages is enabled)
      let illustrationJobId: number | undefined;
      const shouldAssignImages = updates.assignImages !== undefined ? updates.assignImages : updatedList.assignImages;
      
      if (shouldAssignImages !== false && updates.words && Array.isArray(updates.words)) {
        const oldWords = new Set(existingList.words.map((w: string) => w.toLowerCase()));
        const newWords = updates.words.filter((w: string) => !oldWords.has(w.toLowerCase()));
        
        if (newWords.length > 0) {
          const jobService = new IllustrationJobService();
          illustrationJobId = await jobService.createJob(updatedList.id);
        }
      }
      
      res.json(illustrationJobId ? { ...updatedList, illustrationJobId } : updatedList);
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

  // Pixabay preview endpoint - fetch top results without downloading
  app.get("/api/pixabay/previews", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const word = req.query.word as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
      }

      const { PixabayService } = await import("./services/pixabay");
      const pixabayService = new PixabayService();
      const previews = await pixabayService.getImagePreviews(word, limit);
      
      res.json(previews);
    } catch (error) {
      console.error("Error fetching Pixabay previews:", error);
      res.status(500).json({ error: "Failed to fetch image previews" });
    }
  });

  // Select and download a specific Pixabay image (or remove image if imageUrl is null)
  app.post("/api/word-illustrations/select", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { word, imageUrl } = req.body;

      if (!word) {
        return res.status(400).json({ error: "Word is required" });
      }

      // If imageUrl is null, delete the illustration for this word
      if (imageUrl === null) {
        await storage.deleteWordIllustration(word);
        return res.json({ success: true, message: "Image removed" });
      }

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl must be a string or null" });
      }

      // Security: Validate that imageUrl is from Pixabay domain only
      try {
        const url = new URL(imageUrl);
        const allowedDomains = ['pixabay.com', 'cdn.pixabay.com'];
        const isValidDomain = allowedDomains.some(domain => 
          url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        );
        
        if (!isValidDomain || url.protocol !== 'https:') {
          return res.status(400).json({ 
            error: "Invalid image URL - must be HTTPS from pixabay.com" 
          });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      const { PixabayService } = await import("./services/pixabay");
      const pixabayService = new PixabayService();
      
      // Download the selected image
      const imagePath = await pixabayService.downloadImageById(imageUrl, word);

      // Save to database
      const illustration = await storage.createWordIllustration({
        word: word.toLowerCase(),
        imagePath,
        source: 'pixabay',
      });

      res.json(illustration);
    } catch (error) {
      console.error("Error selecting image:", error);
      res.status(500).json({ error: "Failed to save selected image" });
    }
  });

  app.get("/api/word-illustrations", async (req, res) => {
    try {
      const illustrations = await storage.getAllWordIllustrations();
      res.json(illustrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch word illustrations" });
    }
  });

  // Update parts of speech for a word illustration
  app.patch("/api/word-illustrations/:word/parts-of-speech", async (req, res) => {
    try {
      const word = req.params.word.toLowerCase();
      const { partsOfSpeech } = req.body;

      if (!partsOfSpeech && partsOfSpeech !== null) {
        return res.status(400).json({ error: "partsOfSpeech is required" });
      }

      // Get existing illustration
      const existing = await storage.getWordIllustration(word);
      
      if (existing) {
        // Update existing illustration
        const updated = await storage.updateWordIllustration(existing.id, {
          partsOfSpeech: partsOfSpeech || null,
        });
        return res.json(updated);
      } else {
        // Create new illustration entry with just parts of speech (no image)
        const newIllustration = await storage.createWordIllustration({
          word,
          imagePath: null,
          source: 'dictionary',
          partsOfSpeech: partsOfSpeech || null,
        });
        return res.json(newIllustration);
      }
    } catch (error) {
      console.error("Error updating parts of speech:", error);
      res.status(500).json({ error: "Failed to update parts of speech" });
    }
  });

  app.get("/api/word-illustrations/:word", async (req, res) => {
    try {
      const word = req.params.word.toLowerCase();
      const illustration = await storage.getWordIllustration(word);
      
      if (!illustration) {
        return res.status(404).json({ error: "Illustration not found for this word" });
      }
      
      res.json(illustration);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch word illustration" });
    }
  });

  app.get("/api/illustration-jobs/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const jobService = new IllustrationJobService();
      const jobStatus = await jobService.getJobStatus(jobId);
      
      if (!jobStatus) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      res.json(jobStatus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  app.post("/api/backfill-illustrations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const jobService = new IllustrationJobService();
      const jobId = await jobService.createBackfillJob();
      
      res.json({ jobId, message: "Backfill job started" });
    } catch (error: any) {
      console.error("Error starting backfill job:", error);
      res.status(500).json({ error: "Failed to start backfill job", details: error.message });
    }
  });

  // User Groups endpoints
  app.get("/api/user-groups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const groups = await storage.getUserAccessibleGroups(user.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  app.post("/api/user-groups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const { insertUserGroupSchema } = await import("@shared/schema");
      const groupData = insertUserGroupSchema.parse({
        ...req.body,
        ownerUserId: user.id,
      });
      
      const group = await storage.createUserGroup(groupData);
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid group data", details: error.errors });
      }
      console.error("Error creating user group:", error);
      res.status(500).json({ error: "Failed to create user group" });
    }
  });

  app.delete("/api/user-groups/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const user = req.user as any;
      
      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      if (group.ownerUserId !== user.id) {
        return res.status(403).json({ error: "Only group owner can delete" });
      }

      await storage.deleteUserGroup(groupId);
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Error deleting user group:", error);
      res.status(500).json({ error: "Failed to delete user group" });
    }
  });

  app.get("/api/user-groups/:id/members", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  app.post("/api/user-groups/:id/members", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const { userId } = req.body;
      
      const membership = await storage.addGroupMember(groupId, userId);
      res.json(membership);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ error: "Failed to add group member" });
    }
  });

  app.delete("/api/user-groups/:id/members/:userId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const user = req.user as any;
      
      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      if (group.ownerUserId !== user.id) {
        return res.status(403).json({ error: "Only group owner can remove members" });
      }

      await storage.removeGroupMember(groupId, userId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ error: "Failed to remove group member" });
    }
  });

  // To-Do Items endpoints
  app.get("/api/todos", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const todos = await storage.getUserToDoItems(user.id);
      res.json(todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  app.post("/api/todos", async (req, res) => {
    try {
      const { insertUserToDoItemSchema } = await import("@shared/schema");
      const todoData = insertUserToDoItemSchema.parse(req.body);
      const todo = await storage.createToDoItem(todoData);
      res.json(todo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid todo data", details: error.errors });
      }
      console.error("Error creating todo:", error);
      res.status(500).json({ error: "Failed to create todo" });
    }
  });

  app.patch("/api/todos/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const todoId = parseInt(req.params.id);
      const { completed } = req.body;
      
      const todo = await storage.updateToDoItem(todoId, { completed });
      res.json(todo);
    } catch (error) {
      console.error("Error updating todo:", error);
      res.status(500).json({ error: "Failed to update todo" });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const todoId = parseInt(req.params.id);
      const user = req.user as any;
      
      const todo = await storage.getToDoItem(todoId);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }
      
      if (todo.userId !== user.id) {
        return res.status(403).json({ error: "Cannot delete another user's todo" });
      }

      await storage.deleteToDoItem(todoId);
      res.json({ message: "Todo deleted successfully" });
    } catch (error) {
      console.error("Error deleting todo:", error);
      res.status(500).json({ error: "Failed to delete todo" });
    }
  });

  // User search endpoint for invitations
  app.get("/api/users/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query required" });
      }

      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
