import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertWordSchema, insertCustomWordListSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { IllustrationJobService } from "./services/illustrationJobService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { sendPasswordResetEmail, sendEmailUpdateNotification } from "./services/emailService";
import multer from "multer";
import crypto from "crypto";

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

  // Password reset routes
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const schema = z.object({
        identifier: z.string().min(1), // Can be username or email
      });
      
      const { identifier } = schema.parse(req.body);
      
      // Try to find user by username or email
      let user = await storage.getUserByUsername(identifier);
      if (!user) {
        user = await storage.getUserByEmail(identifier);
      }
      
      if (!user) {
        // Don't reveal whether user exists for security
        return res.json({ message: "If an account exists, a password reset email will be sent." });
      }
      
      // Security: Return generic message even if account lacks email to prevent account enumeration
      // This prevents attackers from determining which accounts exist
      if (!user.email) {
        console.log(`Password reset blocked for user ${user.username} (ID: ${user.id}) - no email on file`);
        // Return same generic message as successful case
        return res.json({ message: "If an account exists, a password reset email will be sent." });
      }
      
      // Use the verified email on file
      const emailToUse = user.email;
      
      // Generate secure random secret for the token
      const tokenSecret = crypto.randomBytes(32).toString('hex');
      
      // Hash the secret before storing (security: protect against database compromise)
      const hashedSecret = crypto.createHash('sha256').update(tokenSecret).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Delete any existing unused tokens for this user to prevent multiple valid tokens
      await storage.deleteUnusedTokensForUser(user.id);
      
      // Save hashed secret to database (never store raw secret)
      const createdToken = await storage.createPasswordResetToken({
        userId: user.id,
        token: hashedSecret,
        expiresAt,
        used: false,
      });
      
      // Create two-part token: <tokenId>.<secret>
      // The ID is public, the secret is private and hashed in the database
      const fullToken = `${createdToken.id}.${tokenSecret}`;
      
      // Send full token in email (user needs this to reset password)
      await sendPasswordResetEmail(emailToUse, user.username, fullToken);
      
      res.json({ message: "If an account exists, a password reset email will be sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
    try {
      const { token: fullToken } = req.params;
      
      // Split the two-part token: <tokenId>.<secret>
      const parts = fullToken.split('.');
      if (parts.length !== 2) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      const [tokenIdStr, providedSecret] = parts;
      const tokenId = parseInt(tokenIdStr, 10);
      
      if (isNaN(tokenId)) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Fetch token by ID (constant time, no enumeration risk)
      const resetToken = await storage.getPasswordResetTokenById(tokenId);
      
      // Hash the provided secret for constant-time comparison
      const hashedProvidedSecret = crypto.createHash('sha256').update(providedSecret).digest('hex');
      
      // Security: Constant-time validation to prevent timing attacks
      const tokenExists = resetToken !== null && resetToken !== undefined;
      const secretsMatch = tokenExists && crypto.timingSafeEqual(
        Buffer.from(hashedProvidedSecret, 'hex'),
        Buffer.from(resetToken.token, 'hex')
      );
      const tokenUsed = tokenExists && resetToken.used;
      const tokenExpired = tokenExists && new Date() > resetToken.expiresAt;
      const isValid = tokenExists && secretsMatch && !tokenUsed && !tokenExpired;
      
      // Security: Use generic error message to prevent token enumeration attacks
      // Don't reveal whether token is invalid, expired, or already used
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "Failed to verify reset token" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const schema = z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6),
      });
      
      const { token: fullToken, newPassword } = schema.parse(req.body);
      
      // Split the two-part token: <tokenId>.<secret>
      const parts = fullToken.split('.');
      if (parts.length !== 2) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      const [tokenIdStr, providedSecret] = parts;
      const tokenId = parseInt(tokenIdStr, 10);
      
      if (isNaN(tokenId)) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Fetch token by ID (constant time, no enumeration risk)
      const resetToken = await storage.getPasswordResetTokenById(tokenId);
      
      // Hash the provided secret for constant-time comparison
      const hashedProvidedSecret = crypto.createHash('sha256').update(providedSecret).digest('hex');
      
      // Security: Constant-time validation to prevent timing attacks
      const tokenExists = resetToken !== null && resetToken !== undefined;
      const secretsMatch = tokenExists && crypto.timingSafeEqual(
        Buffer.from(hashedProvidedSecret, 'hex'),
        Buffer.from(resetToken.token, 'hex')
      );
      const tokenUsed = tokenExists && resetToken.used;
      const tokenExpired = tokenExists && new Date() > resetToken.expiresAt;
      const isValid = tokenExists && secretsMatch && !tokenUsed && !tokenExpired;
      
      // Security: Use generic error message to prevent token enumeration attacks
      // Don't reveal whether token is invalid, expired, or already used
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark this token as used
      await storage.markTokenAsUsed(resetToken.id);
      
      // Delete all other unused tokens for this user to ensure no lingering reset links
      await storage.deleteUnusedTokensForUser(resetToken.userId);
      
      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Avatar upload endpoint
  const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/upload-avatar", avatarUpload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const objectStorageService = new ObjectStorageService();
      const contentType = req.file.mimetype || 'image/jpeg';
      
      // uploadImageBuffer handles deduplication and returns /objects/images/{hash}.{ext}
      const avatarUrl = await objectStorageService.uploadImageBuffer(
        req.file.buffer,
        contentType
      );

      res.json({ avatarUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });
  
  app.get("/api/words/by-text/:word", async (req, res) => {
    try {
      // Normalize to lowercase for case-insensitive lookup
      const wordText = req.params.word.toLowerCase();
      const word = await storage.getWordByText(wordText);
      
      if (!word) {
        return res.status(404).json({ error: "Word not found" });
      }
      
      res.json(word);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch word" });
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
      
      // Convert completedAt string to Date object if present
      const updates = { ...req.body };
      if (updates.completedAt && typeof updates.completedAt === 'string') {
        updates.completedAt = new Date(updates.completedAt);
      }
      
      const session = await storage.updateGameSession(id, updates);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error(`❌ Failed to update session ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const gameMode = req.query.gameMode as string | undefined;
      const limit = 10; // Always show top 10 only
      
      const scores = await storage.getTopScores(gameMode, limit);
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

  app.get("/api/achievements/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const { insertAchievementSchema } = await import("@shared/schema");
      const achievementData = insertAchievementSchema.parse(req.body);
      const achievement = await storage.upsertAchievement(achievementData);
      res.json(achievement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid achievement data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save achievement" });
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

      // Normalize words to lowercase for validation
      const wordsArray = Array.isArray(req.body.words) 
        ? req.body.words.map((word: string) => word.toLowerCase().trim())
        : req.body.words;

      // Validate words against dictionaries
      const { validateWords: validateDictionary } = await import("./services/dictionaryValidation");
      const validationResult = await validateDictionary(wordsArray, storage);
      
      // Check if all words were skipped due to API failures
      if (validationResult.skipped.length === wordsArray.length) {
        return res.status(503).json({ 
          error: "Dictionary validation temporarily unavailable",
          details: "Please try again in a moment"
        });
      }
      
      // Use only valid words for the list
      const finalWords = validationResult.valid;
      
      // If no valid words remain, reject the request
      if (finalWords.length === 0) {
        return res.status(400).json({
          error: "No valid words found",
          details: "All words were either invalid or not found in the dictionary",
          removedWords: validationResult.invalid,
          skippedWords: validationResult.skipped
        });
      }

      const listData = insertCustomWordListSchema.parse({
        ...req.body,
        words: finalWords,
        userId: req.user!.id,
      });
      
      // Validate group requirements BEFORE creating the word list
      if (listData.visibility === 'groups') {
        if (!req.body.groupIds || !Array.isArray(req.body.groupIds) || req.body.groupIds.length === 0) {
          return res.status(400).json({ error: "Groups visibility requires at least one group to be selected" });
        }
        // Validate that user owns or is a member of all specified groups
        for (const groupId of req.body.groupIds) {
          const group = await storage.getUserGroup(groupId);
          if (!group) {
            return res.status(400).json({ error: `Group ${groupId} not found` });
          }
          const isOwner = group.ownerUserId === req.user!.id;
          const isMember = await storage.isUserGroupMember(req.user!.id, groupId);
          if (!isOwner && !isMember) {
            return res.status(403).json({ error: `You do not have access to group: ${group.name}` });
          }
        }
      }
      
      const wordList = await storage.createCustomWordList(listData);
      
      // Persist group mappings if visibility is 'groups'
      if (listData.visibility === 'groups' && req.body.groupIds && Array.isArray(req.body.groupIds)) {
        await storage.setWordListSharedGroups(wordList.id, req.body.groupIds);
      }
      
      let illustrationJobId: number | undefined;
      if (listData.assignImages !== false) {
        const jobService = new IllustrationJobService();
        illustrationJobId = await jobService.createJob(wordList.id);
      }
      
      // Build response with validation feedback
      const response: any = {
        ...wordList,
        ...(illustrationJobId && { illustrationJobId }),
      };
      
      // Include removed and skipped words if any
      if (validationResult.invalid.length > 0 || validationResult.skipped.length > 0) {
        response.removedWords = validationResult.invalid;
        response.skippedWords = validationResult.skipped;
      }
      
      res.json(response);
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

  app.get("/api/word-lists/shared-with-me", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const wordLists = await storage.getGroupSharedWordLists(req.user!.id);
      res.json(wordLists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shared word lists" });
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
        // Check if user is owner or member of any groups this list is shared with
        const isOwner = req.user!.id === wordList.userId;
        const isMember = await storage.isUserMemberOfWordListGroups(req.user!.id, id);
        
        if (!isOwner && !isMember) {
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

      // Normalize words to lowercase for validation if words array is being updated
      let wordsArray = req.body.words && Array.isArray(req.body.words)
        ? req.body.words.map((word: string) => word.toLowerCase().trim())
        : undefined;

      // Validate words against dictionaries if words are being updated
      let validationResult: { valid: string[]; invalid: string[]; skipped: string[] } | undefined;
      if (wordsArray) {
        const { validateWords: validateDictionary } = await import("./services/dictionaryValidation");
        validationResult = await validateDictionary(wordsArray, storage);
        
        // Check if all words were skipped due to API failures
        if (validationResult.skipped.length === wordsArray.length) {
          return res.status(503).json({ 
            error: "Dictionary validation temporarily unavailable",
            details: "Please try again in a moment"
          });
        }
        
        // Use only valid words
        wordsArray = validationResult.valid;
        
        // If no valid words remain, reject the request
        if (wordsArray.length === 0) {
          return res.status(400).json({
            error: "No valid words found",
            details: "All words were either invalid or not found in the dictionary",
            removedWords: validationResult.invalid,
            skippedWords: validationResult.skipped
          });
        }
      }

      const bodyData = wordsArray 
        ? { ...req.body, words: wordsArray }
        : req.body;

      const updates = insertCustomWordListSchema.partial().parse(bodyData);
      
      // Determine final visibility after this update
      const finalVisibility = updates.visibility !== undefined ? updates.visibility : existingList.visibility;
      const isChangingToGroups = updates.visibility === 'groups';
      const isChangingFromGroups = existingList.visibility === 'groups' && updates.visibility !== undefined && updates.visibility !== 'groups';
      const hasGroupsVisibility = existingList.visibility === 'groups';
      
      // If explicitly changing to 'groups', groupIds must be provided
      if (isChangingToGroups) {
        if (!req.body.groupIds || !Array.isArray(req.body.groupIds) || req.body.groupIds.length === 0) {
          return res.status(400).json({ error: "Groups visibility requires at least one group to be selected" });
        }
      }
      
      // If groupIds are provided, validate them (whether changing visibility or not)
      if (req.body.groupIds !== undefined && Array.isArray(req.body.groupIds)) {
        if (req.body.groupIds.length === 0 && (isChangingToGroups || hasGroupsVisibility)) {
          return res.status(400).json({ error: "Groups visibility requires at least one group to be selected" });
        }
        // Validate that user owns or is a member of all specified groups
        for (const groupId of req.body.groupIds) {
          const group = await storage.getUserGroup(groupId);
          if (!group) {
            return res.status(400).json({ error: `Group ${groupId} not found` });
          }
          const isOwner = group.ownerUserId === req.user!.id;
          const isMember = await storage.isUserGroupMember(req.user!.id, groupId);
          if (!isOwner && !isMember) {
            return res.status(403).json({ error: `You do not have access to group: ${group.name}` });
          }
        }
      }
      
      const updatedList = await storage.updateCustomWordList(id, updates);
      
      if (!updatedList) {
        return res.status(500).json({ error: "Failed to update word list" });
      }
      
      // Handle group mappings based on visibility changes
      if (isChangingFromGroups) {
        // Changing FROM 'groups' to 'private' or 'public' - remove all group mappings
        await storage.setWordListSharedGroups(id, []);
      } else if (finalVisibility === 'groups' && req.body.groupIds !== undefined && Array.isArray(req.body.groupIds)) {
        // Visibility is or remains 'groups' and groupIds are provided - update mappings
        await storage.setWordListSharedGroups(id, req.body.groupIds);
      }
      // If visibility is 'groups' but groupIds not provided, keep existing mappings (no action needed)
      
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
      
      // Build response with validation feedback
      const response: any = {
        ...updatedList,
        ...(illustrationJobId && { illustrationJobId }),
      };
      
      // Include removed and skipped words if any (only if words were updated)
      if (validationResult && (validationResult.invalid.length > 0 || validationResult.skipped.length > 0)) {
        response.removedWords = validationResult.invalid;
        response.skippedWords = validationResult.skipped;
      }
      
      res.json(response);
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
  // Configure multer for in-memory file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.'));
      }
    },
  });

  // Upload custom image for a word
  app.post("/api/word-illustrations/upload", upload.single('image'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { word, wordListId } = req.body;

      if (!word) {
        return res.status(400).json({ error: "Word is required" });
      }

      if (!wordListId) {
        return res.status(400).json({ error: "Word list ID is required" });
      }

      // Validate and parse wordListId
      const parsedWordListId = parseInt(wordListId);
      if (isNaN(parsedWordListId)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      // Authorization: Verify user owns or can edit the word list
      const existingList = await storage.getCustomWordList(parsedWordListId);
      if (!existingList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      if (existingList.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Upload the file to Object Storage
      const objectStorageService = new ObjectStorageService();
      const imagePath = await objectStorageService.uploadImageBuffer(
        req.file.buffer,
        req.file.mimetype
      );

      console.log(`✓ Uploaded custom image for "${word}" to Object Storage: ${imagePath}`);

      // Save to database with source as 'user'
      const illustration = await storage.createWordIllustration({
        word: word.toLowerCase(),
        wordListId: parsedWordListId,
        imagePath,
        source: 'user',
      });

      res.json(illustration);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.post("/api/word-illustrations/select", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { word, imageUrl, wordListId } = req.body;

      if (!word) {
        return res.status(400).json({ error: "Word is required" });
      }

      if (!wordListId) {
        return res.status(400).json({ error: "Word list ID is required" });
      }

      // If imageUrl is null, delete the illustration for this word and word list
      if (imageUrl === null) {
        await storage.deleteWordIllustrationForWordList(word, wordListId);
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
        wordListId,
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

  app.get("/api/word-lists/system/id", async (req, res) => {
    try {
      const systemListId = await storage.getSystemWordListId();
      if (!systemListId) {
        return res.status(404).json({ error: "System word list not found" });
      }
      res.json({ id: systemListId });
    } catch (error) {
      console.error("Error fetching system word list ID:", error);
      res.status(500).json({ error: "Failed to fetch system word list ID" });
    }
  });

  app.get("/api/word-lists/:id/illustrations", async (req, res) => {
    try {
      const wordListId = parseInt(req.params.id);
      if (isNaN(wordListId)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const illustrations = await storage.getWordIllustrationsForWordList(wordListId);
      res.json(illustrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch word illustrations for word list" });
    }
  });

  app.get("/api/word-lists/:id/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const wordListId = parseInt(req.params.id);
      if (isNaN(wordListId)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const sessions = await storage.getGameSessionsForWordList(wordListId, req.user!.id);
      
      if (sessions.length === 0) {
        return res.json({ totalAccuracy: null, lastGameAccuracy: null });
      }

      // Calculate total accuracy (weighted by words across all sessions)
      const totalCorrectWords = sessions.reduce((sum, session) => sum + session.correctWords, 0);
      const totalTotalWords = sessions.reduce((sum, session) => sum + session.totalWords, 0);
      const totalAccuracy = totalTotalWords > 0
        ? Math.round((totalCorrectWords / totalTotalWords) * 100)
        : null;

      // Last game accuracy (most recent session)
      const lastSession = sessions[0]; // Already ordered by completedAt desc
      const lastGameAccuracy = lastSession.totalWords > 0
        ? Math.round((lastSession.correctWords / lastSession.totalWords) * 100)
        : null;

      res.json({ totalAccuracy, lastGameAccuracy });
    } catch (error) {
      console.error("Error fetching word list stats:", error);
      res.status(500).json({ error: "Failed to fetch word list statistics" });
    }
  });

  app.get("/api/word-illustrations/:word", async (req, res) => {
    try {
      const word = req.params.word.toLowerCase();
      const wordListId = parseInt(req.query.wordListId as string);
      
      if (!wordListId || isNaN(wordListId)) {
        return res.status(400).json({ error: "Word list ID is required" });
      }

      const illustration = await storage.getWordIllustration(word, wordListId);
      
      if (!illustration) {
        return res.status(404).json({ error: "Illustration not found for this word and word list" });
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
      // Only include password for groups owned by the current user
      // For non-owned groups, include hasPassword flag but strip actual password
      const processedGroups = groups.map((group) => {
        if (group.ownerUserId === user.id) {
          return group; // Return with password for owned groups
        } else {
          const { plaintextPassword, ...groupWithoutPassword } = group;
          return {
            ...groupWithoutPassword,
            hasPassword: !!plaintextPassword, // Boolean flag indicating password exists
          };
        }
      });
      res.json(processedGroups);
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

  app.patch("/api/user-groups/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const groupId = parseInt(req.params.id);
      const group = await storage.getUserGroup(groupId);

      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      if (group.ownerUserId !== user.id) {
        return res.status(403).json({ error: "Only the group owner can update the group" });
      }

      const updatedGroup = await storage.updateUserGroup(groupId, req.body);
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid group data", details: error.errors });
      }
      console.error("Error updating user group:", error);
      res.status(500).json({ error: "Failed to update user group" });
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

  app.post("/api/user-groups/:id/invite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const { userIds } = req.body;
      const currentUser = req.user as any;

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "Valid user IDs array is required" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      if (group.ownerUserId !== currentUser.id) {
        return res.status(403).json({ error: "Only group owner can invite members" });
      }

      const results = {
        success: [] as number[],
        errors: [] as { userId: number; error: string }[]
      };

      for (const userId of userIds) {
        const targetUserIdNum = parseInt(String(userId));
        
        if (isNaN(targetUserIdNum)) {
          results.errors.push({ userId, error: "Invalid user ID" });
          continue;
        }

        const targetUser = await storage.getUser(targetUserIdNum);
        if (!targetUser) {
          results.errors.push({ userId: targetUserIdNum, error: "User not found" });
          continue;
        }

        const isAlreadyMember = await storage.isUserGroupMember(targetUserIdNum, groupId);
        if (isAlreadyMember) {
          results.errors.push({ userId: targetUserIdNum, error: "Already a member" });
          continue;
        }

        if (group.ownerUserId === targetUserIdNum) {
          results.errors.push({ userId: targetUserIdNum, error: "User is the owner" });
          continue;
        }

        const existingInvites = await storage.getUserToDoItems(targetUserIdNum);
        const hasPendingInvite = existingInvites.some(
          todo => todo.type === 'group_invite' && todo.groupId === groupId
        );

        if (hasPendingInvite) {
          results.errors.push({ userId: targetUserIdNum, error: "Invite already pending" });
          continue;
        }

        await storage.createToDoItem({
          userId: targetUserIdNum,
          type: 'group_invite',
          message: `${currentUser.username} invited you to join the group "${group.name}"`,
          groupId,
          groupName: group.name,
          requesterUsername: currentUser.username,
          requesterId: currentUser.id,
        });

        results.success.push(targetUserIdNum);
      }

      if (results.success.length === 0) {
        return res.status(400).json({ error: "No invitations were sent", details: results.errors });
      }

      res.status(201).json({ 
        message: `Successfully invited ${results.success.length} user(s)`,
        results
      });
    } catch (error) {
      console.error("Error inviting users to group:", error);
      res.status(500).json({ error: "Failed to send invitations" });
    }
  });

  app.post("/api/user-groups/:id/request-access", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Check if user is already a member
      const isAlreadyMember = await storage.isUserGroupMember(currentUser.id, groupId);
      if (isAlreadyMember) {
        return res.status(400).json({ error: "You are already a member of this group" });
      }

      // Check if user is the owner
      if (group.ownerUserId === currentUser.id) {
        return res.status(400).json({ error: "You are the owner of this group" });
      }

      // Check for existing pending request to prevent duplicates
      const ownerTodos = await storage.getUserToDoItems(group.ownerUserId);
      const hasPendingRequest = ownerTodos.some(
        todo => todo.type === 'join_request' && 
        todo.requesterId === currentUser.id &&
        todo.groupId === groupId
      );

      if (hasPendingRequest) {
        return res.status(400).json({ error: "You already have a pending access request for this group" });
      }

      // Create to-do notification for the group owner (stored as join_request type)
      // Build display name with first/last name if available
      let displayName = currentUser.username;
      if (currentUser.firstName || currentUser.lastName) {
        const fullName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ');
        displayName = `${fullName} (${currentUser.username})`;
      }
      
      await storage.createToDoItem({
        userId: group.ownerUserId,
        type: 'join_request',
        message: `${displayName} requested to join the group "${group.name}"`,
        groupId,
        groupName: group.name,
        requesterUsername: currentUser.username,
        requesterId: currentUser.id,
      });

      res.status(201).json({ message: "Access request sent successfully" });
    } catch (error) {
      console.error("Error requesting group access:", error);
      res.status(500).json({ error: "Failed to send access request" });
    }
  });

  app.post("/api/user-groups/:id/join-with-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const { password } = req.body;

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Only public groups can be joined with password
      if (!group.isPublic) {
        return res.status(403).json({ error: "Private groups cannot be joined with a password" });
      }

      // Group must have a password set
      if (!group.plaintextPassword) {
        return res.status(400).json({ error: "This group does not have a password set" });
      }

      // Check if user is already a member
      const isAlreadyMember = await storage.isUserGroupMember(currentUser.id, groupId);
      if (isAlreadyMember) {
        return res.status(400).json({ error: "You are already a member of this group" });
      }

      // Check if user is the owner
      if (group.ownerUserId === currentUser.id) {
        return res.status(400).json({ error: "You are the owner of this group" });
      }

      // Validate password (plaintext comparison)
      if (password !== group.plaintextPassword) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      // Add user to group immediately
      await storage.addGroupMember(groupId, currentUser.id);

      res.status(200).json({ message: "Successfully joined the group", groupId });
    } catch (error) {
      console.error("Error joining group with password:", error);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.post("/api/user-groups/:id/accept-invite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Verify user has a pending invitation
      const userTodos = await storage.getUserToDoItems(currentUser.id);
      const hasInvite = userTodos.some(
        todo => todo.type === 'group_invite' && 
        todo.groupId === groupId
      );

      if (!hasInvite) {
        return res.status(403).json({ error: "You do not have a pending invitation for this group" });
      }

      // Check if user is already a member
      const isAlreadyMember = await storage.isUserGroupMember(currentUser.id, groupId);
      if (isAlreadyMember) {
        return res.status(400).json({ error: "You are already a member of this group" });
      }

      // Add user to group
      await storage.addGroupMember(groupId, currentUser.id);

      res.status(200).json({ message: "Successfully joined the group", groupId });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.post("/api/user-groups/:id/approve-request", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const { userId } = req.body;
      const currentUser = req.user as any;

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: "Valid user ID is required" });
      }

      const userIdNum = parseInt(userId);

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Only group owner can approve requests
      if (group.ownerUserId !== currentUser.id) {
        return res.status(403).json({ error: "Only group owner can approve requests" });
      }

      // Check if user is already a member
      const isAlreadyMember = await storage.isUserGroupMember(userIdNum, groupId);
      if (isAlreadyMember) {
        return res.status(400).json({ error: "User is already a member of this group" });
      }

      // Add user to group
      await storage.addGroupMember(groupId, userIdNum);

      res.status(200).json({ message: "User added to group successfully", groupId });
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  app.post("/api/user-groups/:id/requests/:requestId/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const requestId = parseInt(req.params.requestId);
      const currentUser = req.user as any;

      if (isNaN(groupId) || isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid group ID or request ID" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Only group owner can approve requests
      if (group.ownerUserId !== currentUser.id) {
        return res.status(403).json({ error: "Only group owner can approve requests" });
      }

      await storage.approveGroupJoinRequest(groupId, requestId);
      res.status(200).json({ message: "Request approved successfully" });
    } catch (error: any) {
      console.error("Error approving request:", error);
      res.status(500).json({ error: error.message || "Failed to approve request" });
    }
  });

  app.delete("/api/user-groups/:id/requests/:requestId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const requestId = parseInt(req.params.requestId);
      const currentUser = req.user as any;

      if (isNaN(groupId) || isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid group ID or request ID" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Only group owner can deny requests
      if (group.ownerUserId !== currentUser.id) {
        return res.status(403).json({ error: "Only group owner can deny requests" });
      }

      const success = await storage.denyGroupJoinRequest(groupId, requestId);
      if (!success) {
        return res.status(404).json({ error: "Request not found" });
      }

      res.status(200).json({ message: "Request denied successfully" });
    } catch (error) {
      console.error("Error denying request:", error);
      res.status(500).json({ error: "Failed to deny request" });
    }
  });

  app.post("/api/user-groups/:id/leave", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Owner cannot leave their own group
      if (group.ownerUserId === currentUser.id) {
        return res.status(403).json({ error: "Owner cannot leave their own group. Delete the group instead." });
      }

      // Check if user is a member
      const isMember = await storage.isUserGroupMember(currentUser.id, groupId);
      if (!isMember) {
        return res.status(400).json({ error: "You are not a member of this group" });
      }

      // Remove user from group
      await storage.removeGroupMember(groupId, currentUser.id);

      res.status(200).json({ message: "Successfully left the group" });
    } catch (error) {
      console.error("Error leaving group:", error);
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  // To-Do Items endpoints
  app.get("/api/user-to-dos", async (req, res) => {
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

  app.get("/api/user-to-dos/count", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const todos = await storage.getUserToDoItems(user.id);
      res.json(todos.length);
    } catch (error) {
      console.error("Error fetching todos count:", error);
      res.status(500).json({ error: "Failed to fetch todos count" });
    }
  });

  // Get pending access requests for the current user (as requester)
  app.get("/api/user-pending-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const pendingRequests = await storage.getUserPendingRequests(user.id);
      res.json(pendingRequests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ error: "Failed to fetch pending requests" });
    }
  });

  app.post("/api/user-to-dos/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const todoId = parseInt(req.params.id);
      const user = req.user as any;

      if (isNaN(todoId)) {
        return res.status(400).json({ error: "Invalid todo ID" });
      }

      const todo = await storage.getToDoItem(todoId);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }

      if (todo.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to complete this todo" });
      }

      await storage.deleteToDoItem(todoId);
      res.json({ message: "Todo completed" });
    } catch (error) {
      console.error("Error completing todo:", error);
      res.status(500).json({ error: "Failed to complete todo" });
    }
  });

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
