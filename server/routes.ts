import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertWordSchema, insertCustomWordListSchema, type CustomWordList } from "@shared/schema";
import { z } from "zod";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { IllustrationJobService } from "./services/illustrationJobService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { sendPasswordResetEmail, sendEmailUpdateNotification, sendContactEmail } from "./services/emailService";
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

  // Contact/Feedback email endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        message: z.string().min(10, "Message must be at least 10 characters"),
      });
      
      const { name, email, message } = schema.parse(req.body);
      
      // Dev team email address
      const devTeamEmail = "tsmith28@mail.com";
      
      await sendContactEmail(name, email, message, devTeamEmail);
      
      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Contact email error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
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

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Validate request body with zod schema
      const profileUpdateSchema = z.object({
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        email: z.string().email("Invalid email address").max(255).optional().nullable(),
        selectedAvatar: z.string().max(500).optional(),
      });
      
      const validationResult = profileUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten() 
        });
      }
      
      const { firstName, lastName, email, selectedAvatar } = validationResult.data;
      
      // Build updates object with only provided fields
      const updates: { firstName?: string; lastName?: string; email?: string | null; selectedAvatar?: string } = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;
      if (selectedAvatar !== undefined) updates.selectedAvatar = selectedAvatar;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      // Check for email uniqueness if email is being updated
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ error: "Email is already in use by another account" });
        }
      }

      const updatedUser = await storage.updateUserProfile(req.user.id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
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
      // Normalize legacy "standard" mode to "practice"
      const normalizedData = {
        ...req.body,
        gameMode: req.body.gameMode === "standard" ? "practice" : req.body.gameMode
      };
      const sessionData = insertGameSessionSchema.parse(normalizedData);
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
      
      // Normalize legacy "standard" mode to "practice" if present in updates
      if (updates.gameMode === "standard") {
        updates.gameMode = "practice";
      }
      
      // First update the session
      const session = await storage.updateGameSession(id, updates);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Only increment user stars after successful session update
      if (updates.starsEarned && updates.starsEarned > 0 && session.userId) {
        await storage.incrementUserStars(session.userId, updates.starsEarned);
        console.log(`⭐ Incremented user ${session.userId} stars by ${updates.starsEarned}`);
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
      // Normalize legacy "standard" mode to "practice"
      const normalizedData = {
        ...req.body,
        gameMode: req.body.gameMode === "standard" ? "practice" : req.body.gameMode
      };
      const scoreData = insertLeaderboardScoreSchema.parse(normalizedData);
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

  app.post("/api/streaks/increment", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      await storage.incrementWordStreak(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing streak:", error);
      res.status(500).json({ error: "Failed to increment streak" });
    }
  });

  app.post("/api/streaks/reset", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      await storage.resetWordStreak(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting streak:", error);
      res.status(500).json({ error: "Failed to reset streak" });
    }
  });

  app.get("/api/stats/user/:userId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const requestedUserId = parseInt(req.params.userId);
      const user = req.user as any;
      
      // Only allow users to view their own stats
      if (user.id !== requestedUserId) {
        return res.status(403).json({ error: "You can only view your own stats" });
      }

      const dateFilter = req.query.dateFilter as string || "all";
      const timezone = (req.query.timezone as string) || 'UTC';
      
      // Let PostgreSQL handle timezone conversion using AT TIME ZONE
      const stats = await storage.getUserStats(user.id, dateFilter, timezone);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const { insertAchievementSchema } = await import("@shared/schema");
      // Normalize legacy "standard" mode to "practice" in completedModes array
      const normalizedData = {
        ...req.body,
        completedModes: req.body.completedModes 
          ? req.body.completedModes.map((mode: string) => mode === "standard" ? "practice" : mode)
          : []
      };
      const achievementData = insertAchievementSchema.parse(normalizedData);
      const achievement = await storage.upsertAchievement(achievementData);
      res.json(achievement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid achievement data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save achievement" });
    }
  });

  app.get("/api/user-items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const items = await storage.getUserItems(user.id);
      const { SHOP_ITEMS } = await import("@shared/schema");
      
      res.json({
        stars: user.stars || 0,
        inventory: items,
        catalog: SHOP_ITEMS,
      });
    } catch (error) {
      console.error("Error fetching user items:", error);
      res.status(500).json({ error: "Failed to fetch user items" });
    }
  });

  app.get("/api/user-items/list", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      const items = await storage.getUserItems(user.id);
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching user items list:", error);
      res.status(500).json({ error: "Failed to fetch user items list" });
    }
  });

  app.post("/api/user-items/purchase", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { itemId, quantity = 1 } = req.body;
      
      if (!itemId || typeof itemId !== 'string') {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { SHOP_ITEMS } = await import("@shared/schema");
      type ShopItemIdType = keyof typeof SHOP_ITEMS;
      
      if (!(itemId in SHOP_ITEMS)) {
        return res.status(400).json({ error: "Item not found in catalog" });
      }

      const user = req.user as any;
      const result = await storage.purchaseItem(user.id, itemId as ShopItemIdType, quantity);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        newStarBalance: result.newStarBalance,
        newItemQuantity: result.newItemQuantity,
      });
    } catch (error) {
      console.error("Error purchasing item:", error);
      res.status(500).json({ error: "Failed to purchase item" });
    }
  });

  app.post("/api/user-items/use", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { itemId, quantity = 1 } = req.body;
      
      if (!itemId || typeof itemId !== 'string') {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { SHOP_ITEMS } = await import("@shared/schema");
      type ShopItemIdType = keyof typeof SHOP_ITEMS;
      
      if (!(itemId in SHOP_ITEMS)) {
        return res.status(400).json({ error: "Item not found in catalog" });
      }

      const user = req.user as any;
      const result = await storage.useItem(user.id, itemId as ShopItemIdType, quantity);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        remainingQuantity: result.remainingQuantity,
      });
    } catch (error) {
      console.error("Error using item:", error);
      res.status(500).json({ error: "Failed to use item" });
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
      } else {
        // For private and groups visibility, first check if user is a participant in an H2H challenge
        // This allows opponents to access word lists for challenges regardless of visibility
        const isH2HParticipant = await storage.isUserParticipantInActiveChallenge(req.user!.id, id);
        
        if (!isH2HParticipant) {
          // Not an H2H participant, check normal visibility rules
          if (wordList.visibility === 'private' && req.user!.id !== wordList.userId) {
            return res.status(403).json({ error: "Access denied" });
          } else if (wordList.visibility === 'groups') {
            // Check if user is owner or member of any groups this list is shared with
            const isOwner = req.user!.id === wordList.userId;
            const isMember = await storage.isUserMemberOfWordListGroups(req.user!.id, id);
            
            if (!isOwner && !isMember) {
              return res.status(403).json({ error: "Access denied - group membership required" });
            }
          }
        }
        // H2H participants can access regardless of visibility
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

      // Check if user is owner or co-owner
      const isOwner = existingList.userId === req.user!.id;
      const isCoOwner = await storage.isWordListCoOwner(id, req.user!.id);
      
      if (!isOwner && !isCoOwner) {
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

      // Check if user is owner or co-owner
      const isOwner = existingList.userId === req.user!.id;
      const isCoOwner = await storage.isWordListCoOwner(id, req.user!.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteCustomWordList(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete word list" });
    }
  });

  // Get co-owners for a word list
  app.get("/api/word-lists/:id/co-owners", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const wordList = await storage.getCustomWordList(id);
      if (!wordList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      // Only owner or co-owners can view co-owners
      const isOwner = wordList.userId === req.user!.id;
      const isCoOwner = await storage.isWordListCoOwner(id, req.user!.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      const coOwners = await storage.getWordListCoOwners(id);
      
      // Get user details for each co-owner
      const coOwnersWithDetails = await Promise.all(
        coOwners.map(async (co) => {
          const user = await storage.getUser(co.coOwnerUserId);
          return {
            ...co,
            username: user?.username,
            firstName: user?.firstName,
            lastName: user?.lastName,
          };
        })
      );

      res.json(coOwnersWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch co-owners" });
    }
  });

  // Add a co-owner to a word list
  app.post("/api/word-lists/:id/co-owners", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only teachers can add co-owners
      if (req.user!.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can add co-owners" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid word list ID" });
      }

      const { coOwnerUserId } = req.body;
      if (!coOwnerUserId || typeof coOwnerUserId !== "number") {
        return res.status(400).json({ error: "Co-owner user ID is required" });
      }

      const wordList = await storage.getCustomWordList(id);
      if (!wordList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      // Only owner or existing co-owners can add new co-owners
      const isOwner = wordList.userId === req.user!.id;
      const isCoOwner = await storage.isWordListCoOwner(id, req.user!.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify the new co-owner is a teacher
      const newCoOwner = await storage.getUser(coOwnerUserId);
      if (!newCoOwner) {
        return res.status(404).json({ error: "User not found" });
      }
      if (newCoOwner.role !== "teacher") {
        return res.status(400).json({ error: "Co-owners must be teachers" });
      }

      // Cannot add owner as co-owner
      if (coOwnerUserId === wordList.userId) {
        return res.status(400).json({ error: "Cannot add owner as co-owner" });
      }

      // Check if already a co-owner
      const isAlreadyCoOwner = await storage.isWordListCoOwner(id, coOwnerUserId);
      if (isAlreadyCoOwner) {
        return res.status(400).json({ error: "User is already a co-owner" });
      }

      const coOwner = await storage.addWordListCoOwner(id, coOwnerUserId);
      res.json(coOwner);
    } catch (error) {
      res.status(500).json({ error: "Failed to add co-owner" });
    }
  });

  // Remove a co-owner from a word list
  app.delete("/api/word-lists/:id/co-owners/:coOwnerUserId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      const coOwnerUserId = parseInt(req.params.coOwnerUserId);
      
      if (isNaN(id) || isNaN(coOwnerUserId)) {
        return res.status(400).json({ error: "Invalid IDs" });
      }

      const wordList = await storage.getCustomWordList(id);
      if (!wordList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      // Only owner or co-owners can remove co-owners
      const isOwner = wordList.userId === req.user!.id;
      const isCoOwner = await storage.isWordListCoOwner(id, req.user!.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.removeWordListCoOwner(id, coOwnerUserId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove co-owner" });
    }
  });

  // Get list of teachers for co-owner selection
  app.get("/api/teachers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only teachers can view the teacher list
      if (req.user!.role !== "teacher") {
        return res.status(403).json({ error: "Access denied" });
      }

      const teachers = await storage.getTeachers();
      
      // Filter out current user and return minimal info
      const teacherList = teachers
        .filter(t => t.id !== req.user!.id)
        .map(t => ({
          id: t.id,
          username: t.username,
          firstName: t.firstName,
          lastName: t.lastName,
        }));

      res.json(teacherList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teachers" });
    }
  });

  // Search teachers by name, email, or username
  app.get("/api/teachers/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only teachers can search for other teachers
      if (req.user!.role !== "teacher") {
        return res.status(403).json({ error: "Access denied" });
      }

      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const teachers = await storage.searchTeachers(query);
      
      // Filter out current user and return minimal info
      const teacherList = teachers
        .filter(t => t.id !== req.user!.id)
        .map(t => ({
          id: t.id,
          username: t.username,
          email: t.email,
          firstName: t.firstName,
          lastName: t.lastName,
        }));

      res.json(teacherList);
    } catch (error) {
      res.status(500).json({ error: "Failed to search teachers" });
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

      const gameMode = req.query.gameMode as string | undefined;

      let sessions = await storage.getGameSessionsForWordList(wordListId, req.user!.id);
      
      // Filter by game mode if provided
      if (gameMode) {
        sessions = sessions.filter(session => session.gameMode === gameMode);
      }
      
      // Include sessions with attempted words (complete OR partial with activity)
      // This ensures partial sessions from restarts count toward accuracy metrics
      // Check for totalWords > 0 OR any incorrect words recorded (handles edge case where totalWords is 0 but attempts were made)
      sessions = sessions.filter(session => 
        session.isComplete || 
        (session.totalWords && session.totalWords > 0) ||
        (session.incorrectWords && session.incorrectWords.length > 0) ||
        (session.correctWords && session.correctWords > 0)
      );
      
      if (sessions.length === 0) {
        return res.json({ totalAccuracy: null, lastGameAccuracy: null });
      }

      // Calculate total accuracy (weighted by words across all sessions)
      // For each session, compute attempted words as max of totalWords or (correctWords + incorrectWords.length)
      // This handles partial sessions where totalWords might be 0 but there's activity
      const totalCorrectWords = sessions.reduce((sum, session) => sum + (session.correctWords || 0), 0);
      const totalTotalWords = sessions.reduce((sum, session) => {
        const sessionTotal = session.totalWords || 0;
        const sessionActivity = (session.correctWords || 0) + (session.incorrectWords?.length || 0);
        return sum + Math.max(sessionTotal, sessionActivity);
      }, 0);
      const totalAccuracy = totalTotalWords > 0
        ? Math.round((totalCorrectWords / totalTotalWords) * 100)
        : null;

      // Last game accuracy (most recent session)
      const lastSession = sessions[0]; // Already ordered by completedAt/createdAt desc
      const lastSessionTotal = lastSession.totalWords || 0;
      const lastSessionActivity = (lastSession.correctWords || 0) + (lastSession.incorrectWords?.length || 0);
      const lastWordsAttempted = Math.max(lastSessionTotal, lastSessionActivity);
      const lastGameAccuracy = lastWordsAttempted > 0
        ? Math.round(((lastSession.correctWords || 0) / lastWordsAttempted) * 100)
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

      // Check if user is owner or co-owner
      const isOwner = group.ownerUserId === user.id;
      const isCoOwner = await storage.isGroupCoOwner(groupId, user.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Only the group owner or co-owners can update the group" });
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
      
      // Check if user is owner or co-owner
      const isOwner = group.ownerUserId === user.id;
      const isCoOwner = await storage.isGroupCoOwner(groupId, user.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Only group owner or co-owners can delete" });
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
      
      // Check if user is owner or co-owner
      const isOwner = group.ownerUserId === user.id;
      const isCoOwner = await storage.isGroupCoOwner(groupId, user.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Only group owner or co-owners can remove members" });
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

  // Get co-owners for a user group
  app.get("/api/user-groups/:id/co-owners", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Only owner or co-owners can view co-owners
      const user = req.user as any;
      const isOwner = group.ownerUserId === user.id;
      const isCoOwner = await storage.isGroupCoOwner(groupId, user.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      const coOwners = await storage.getGroupCoOwners(groupId);
      
      // Get user details for each co-owner
      const coOwnersWithDetails = await Promise.all(
        coOwners.map(async (co) => {
          const coOwnerUser = await storage.getUser(co.coOwnerUserId);
          return {
            ...co,
            username: coOwnerUser?.username,
            firstName: coOwnerUser?.firstName,
            lastName: coOwnerUser?.lastName,
          };
        })
      );

      res.json(coOwnersWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch co-owners" });
    }
  });

  // Add a co-owner to a user group
  app.post("/api/user-groups/:id/co-owners", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      
      // Only teachers can add co-owners
      if (user.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can add co-owners" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const { coOwnerUserId } = req.body;
      if (!coOwnerUserId || typeof coOwnerUserId !== "number") {
        return res.status(400).json({ error: "Co-owner user ID is required" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Only owner or existing co-owners can add new co-owners
      const isOwner = group.ownerUserId === user.id;
      const isCoOwner = await storage.isGroupCoOwner(groupId, user.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify the new co-owner is a teacher
      const newCoOwner = await storage.getUser(coOwnerUserId);
      if (!newCoOwner) {
        return res.status(404).json({ error: "User not found" });
      }
      if (newCoOwner.role !== "teacher") {
        return res.status(400).json({ error: "Co-owners must be teachers" });
      }

      // Cannot add owner as co-owner
      if (coOwnerUserId === group.ownerUserId) {
        return res.status(400).json({ error: "Cannot add owner as co-owner" });
      }

      // Check if already a co-owner
      const isAlreadyCoOwner = await storage.isGroupCoOwner(groupId, coOwnerUserId);
      if (isAlreadyCoOwner) {
        return res.status(400).json({ error: "User is already a co-owner" });
      }

      const coOwner = await storage.addGroupCoOwner(groupId, coOwnerUserId);
      res.json(coOwner);
    } catch (error) {
      res.status(500).json({ error: "Failed to add co-owner" });
    }
  });

  // Remove a co-owner from a user group
  app.delete("/api/user-groups/:id/co-owners/:coOwnerUserId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const groupId = parseInt(req.params.id);
      const coOwnerUserId = parseInt(req.params.coOwnerUserId);
      
      if (isNaN(groupId) || isNaN(coOwnerUserId)) {
        return res.status(400).json({ error: "Invalid IDs" });
      }

      const group = await storage.getUserGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      const user = req.user as any;
      
      // Only owner or co-owners can remove co-owners
      const isOwner = group.ownerUserId === user.id;
      const isCoOwner = await storage.isGroupCoOwner(groupId, user.id);
      
      if (!isOwner && !isCoOwner) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.removeGroupCoOwner(groupId, coOwnerUserId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove co-owner" });
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

  // Teacher Dashboard endpoint
  app.get("/api/teacher/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user as any;
      if (user.role !== "teacher") {
        return res.status(403).json({ error: "Teacher access required" });
      }

      console.log(`[Teacher Dashboard] Teacher ID: ${user.id}, Username: ${user.username}`);

      // Get groups owned by this teacher (including co-owned groups)
      const ownedGroups = await storage.getUserOwnedGroups(user.id);
      const coOwnedGroups = await storage.getCoOwnedGroups(user.id);
      const allGroups = [...ownedGroups];
      
      console.log(`[Teacher Dashboard] Owned groups: ${ownedGroups.length}, Co-owned groups: ${coOwnedGroups.length}`);
      
      // Add co-owned groups that aren't already in the list
      for (const group of coOwnedGroups) {
        if (!allGroups.find(g => g.id === group.id)) {
          allGroups.push(group);
        }
      }
      
      console.log(`[Teacher Dashboard] Total groups: ${allGroups.length}, Group IDs: ${allGroups.map(g => g.id).join(', ')}`);
      
      // Get all students from the teacher's groups and track which groups they belong to
      const allStudents: Set<number> = new Set();
      const studentGroupMap: Map<number, number[]> = new Map(); // studentId -> groupIds
      for (const group of allGroups) {
        const members = await storage.getGroupMembers(group.id);
        console.log(`[Teacher Dashboard] Group ${group.id} (${group.name}) has ${members.length} members:`, members.map(m => `${m.username}(${m.id})`).join(', '));
        members.forEach(member => {
          // Note: getGroupMembers returns user objects with 'id', not 'userId'
          if (member.id !== user.id) { // Exclude the teacher
            allStudents.add(member.id);
            if (!studentGroupMap.has(member.id)) {
              studentGroupMap.set(member.id, []);
            }
            studentGroupMap.get(member.id)!.push(group.id);
          }
        });
      }
      
      console.log(`[Teacher Dashboard] Total unique students: ${allStudents.size}, Student IDs: ${Array.from(allStudents).join(', ')}`);
      
      // Get word lists that are shared with the teacher's groups
      // This includes: lists created by teacher + lists shared with their groups
      const teacherWordLists = await storage.getUserWordLists(user.id);
      const groupIds = allGroups.map(g => g.id);
      
      console.log(`[Teacher Dashboard] Teacher's own word lists: ${teacherWordLists.length}`);
      teacherWordLists.forEach(list => console.log(`  - List ID ${list.id}: "${list.name}"`));
      
      // Get all word lists shared with any of the teacher's groups
      const sharedWithGroupsLists = await storage.getWordListsSharedWithGroups(groupIds);
      
      console.log(`[Teacher Dashboard] Word lists shared with teacher's groups: ${sharedWithGroupsLists.length}`);
      sharedWithGroupsLists.forEach(list => console.log(`  - List ID ${list.id}: "${list.name}"`));
      
      // Combine and deduplicate word lists
      const wordListMap = new Map<number, CustomWordList>();
      for (const list of teacherWordLists) {
        wordListMap.set(list.id, list);
      }
      for (const list of sharedWithGroupsLists) {
        if (!wordListMap.has(list.id)) {
          wordListMap.set(list.id, list);
        }
      }
      const wordLists = Array.from(wordListMap.values());
      
      console.log(`[Teacher Dashboard] Combined unique word lists: ${wordLists.length}`);
      wordLists.forEach(list => console.log(`  - List ID ${list.id}: "${list.name}" (created by user ${list.userId})`));
      
      // For each word list, get statistics ONLY for students in the teacher's groups
      const wordListsWithStats = await Promise.all(wordLists.map(async (list) => {
        // Get statistics for each student in the teacher's groups
        const studentStats = await Promise.all(Array.from(allStudents).map(async (studentId) => {
          const studentUser = await storage.getUser(studentId);
          if (!studentUser) return null;

          // Get game sessions for this student on this word list
          const sessions = await storage.getGameSessionsByUserAndList(studentId, list.id);
          
          const totalGames = sessions.length;
          const correctWords = sessions.reduce((sum, s) => sum + (s.correctWords || 0), 0);
          const totalWords = sessions.reduce((sum, s) => sum + (s.totalWords || 0), 0);
          const averageAccuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
          
          // Get stars earned for this student on this word list from achievements
          const achievement = await storage.getAchievement(studentId, list.id, "Word List Mastery");
          const starsEarned = achievement?.completedModes?.length || 0;
          
          console.log(`[Teacher Dashboard] Student ${studentUser.username} (${studentId}) on list ${list.id}: ${totalGames} games, ${correctWords}/${totalWords} correct, ${starsEarned} stars`);

          return {
            id: studentUser.id,
            username: studentUser.username,
            firstName: studentUser.firstName,
            lastName: studentUser.lastName,
            totalGames,
            correctWords,
            totalWords,
            averageAccuracy,
            starsEarned,
            groupIds: studentGroupMap.get(studentId) || [],
          };
        }));

        const filteredStudents = studentStats.filter(s => s !== null && s.totalGames > 0);
        console.log(`[Teacher Dashboard] List ${list.id} (${list.name}): ${filteredStudents.length} students with games`);

        return {
          id: list.id,
          name: list.name,
          wordCount: list.words.length,
          students: filteredStudents,
        };
      }));

      // Get group info with member counts
      const groupsWithCounts = await Promise.all(allGroups.map(async (group) => {
        const members = await storage.getGroupMembers(group.id);
        return {
          id: group.id,
          name: group.name,
          memberCount: members.length,
        };
      }));

      res.json({
        wordLists: wordListsWithStats,
        groups: groupsWithCounts,
      });
    } catch (error) {
      console.error("Error fetching teacher dashboard:", error);
      res.status(500).json({ error: "Failed to fetch teacher dashboard" });
    }
  });

  // Head to Head Challenge routes
  app.post("/api/challenges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const schema = z.object({
        opponentId: z.number(),
        wordListId: z.number(),
      });

      const { opponentId, wordListId } = schema.parse(req.body);
      const initiatorId = (req.user as any).id;

      // Verify opponent exists
      const opponent = await storage.getUser(opponentId);
      if (!opponent) {
        return res.status(404).json({ error: "Opponent not found" });
      }

      // Verify word list exists
      const wordList = await storage.getCustomWordList(wordListId);
      if (!wordList) {
        return res.status(404).json({ error: "Word list not found" });
      }

      // Create the challenge
      const challenge = await storage.createChallenge({
        initiatorId,
        opponentId,
        wordListId,
        status: "pending",
        starAwarded: false,
      });

      // Create a to-do notification for the opponent
      const initiator = await storage.getUser(initiatorId);
      await storage.createToDoItem({
        userId: opponentId,
        message: `${initiator?.username || 'Someone'} has challenged you to a Head to Head match using the "${wordList.name}" word list!`,
        type: "challenge_invite",
        requesterId: initiatorId,
        requesterUsername: initiator?.username || 'Unknown',
        challengeId: challenge.id,
        completed: false,
      });

      res.json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  app.get("/api/challenges/pending", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = (req.user as any).id;
      const challenges = await storage.getUserPendingChallenges(userId);
      
      // Enrich with user and word list info
      const enrichedChallenges = await Promise.all(challenges.map(async (challenge) => {
        const initiator = await storage.getUser(challenge.initiatorId);
        const wordList = await storage.getCustomWordList(challenge.wordListId);
        return {
          ...challenge,
          initiatorUsername: initiator?.username || 'Unknown',
          initiatorFirstName: initiator?.firstName || null,
          initiatorLastName: initiator?.lastName || null,
          initiatorAvatar: initiator?.selectedAvatar || null,
          wordListName: wordList?.name || 'Unknown',
          wordCount: wordList?.words.length || 0,
        };
      }));
      
      res.json(enrichedChallenges);
    } catch (error) {
      console.error("Error fetching pending challenges:", error);
      res.status(500).json({ error: "Failed to fetch pending challenges" });
    }
  });

  app.get("/api/challenges/active", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = (req.user as any).id;
      const challenges = await storage.getUserActiveChallenges(userId);
      
      // Enrich with user and word list info
      const enrichedChallenges = await Promise.all(challenges.map(async (challenge) => {
        const initiator = await storage.getUser(challenge.initiatorId);
        const opponent = await storage.getUser(challenge.opponentId);
        const wordList = await storage.getCustomWordList(challenge.wordListId);
        return {
          ...challenge,
          initiatorUsername: initiator?.username || 'Unknown',
          initiatorFirstName: initiator?.firstName || null,
          initiatorLastName: initiator?.lastName || null,
          initiatorAvatar: initiator?.selectedAvatar || null,
          opponentUsername: opponent?.username || 'Unknown',
          opponentFirstName: opponent?.firstName || null,
          opponentLastName: opponent?.lastName || null,
          opponentAvatar: opponent?.selectedAvatar || null,
          wordListName: wordList?.name || 'Unknown',
          wordCount: wordList?.words.length || 0,
        };
      }));
      
      res.json(enrichedChallenges);
    } catch (error) {
      console.error("Error fetching active challenges:", error);
      res.status(500).json({ error: "Failed to fetch active challenges" });
    }
  });

  app.get("/api/challenges/completed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = (req.user as any).id;
      const challenges = await storage.getUserCompletedChallenges(userId);
      
      // Enrich with user and word list info
      const enrichedChallenges = await Promise.all(challenges.map(async (challenge) => {
        const initiator = await storage.getUser(challenge.initiatorId);
        const opponent = await storage.getUser(challenge.opponentId);
        const winner = challenge.winnerUserId ? await storage.getUser(challenge.winnerUserId) : null;
        const wordList = await storage.getCustomWordList(challenge.wordListId);
        return {
          ...challenge,
          initiatorUsername: initiator?.username || 'Unknown',
          initiatorFirstName: initiator?.firstName || null,
          initiatorLastName: initiator?.lastName || null,
          initiatorAvatar: initiator?.selectedAvatar || null,
          opponentUsername: opponent?.username || 'Unknown',
          opponentFirstName: opponent?.firstName || null,
          opponentLastName: opponent?.lastName || null,
          opponentAvatar: opponent?.selectedAvatar || null,
          winnerUsername: winner?.username || null,
          wordListName: wordList?.name || 'Unknown',
          wordCount: wordList?.words.length || 0,
        };
      }));
      
      res.json(enrichedChallenges);
    } catch (error) {
      console.error("Error fetching completed challenges:", error);
      res.status(500).json({ error: "Failed to fetch completed challenges" });
    }
  });

  app.get("/api/challenges/record", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = (req.user as any).id;
      const dateFilter = req.query.dateFilter as string;
      const timezone = req.query.timezone as string || "UTC";
      
      // Calculate date range based on filter
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (dateFilter && dateFilter !== "all") {
        const now = new Date();
        endDate = new Date(now);
        
        if (dateFilter === "today") {
          // Start of today in user's timezone
          const todayStart = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
          todayStart.setHours(0, 0, 0, 0);
          startDate = todayStart;
        } else if (dateFilter === "week") {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
        } else if (dateFilter === "month") {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
        }
      }
      
      const record = await storage.getUserChallengeRecord(userId, startDate, endDate);
      res.json(record);
    } catch (error) {
      console.error("Error fetching challenge record:", error);
      res.status(500).json({ error: "Failed to fetch challenge record" });
    }
  });

  app.get("/api/challenges/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const challengeId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Verify user is part of this challenge
      if (challenge.initiatorId !== userId && challenge.opponentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Enrich with user and word list info
      const initiator = await storage.getUser(challenge.initiatorId);
      const opponent = await storage.getUser(challenge.opponentId);
      const wordList = await storage.getCustomWordList(challenge.wordListId);
      
      res.json({
        ...challenge,
        initiatorUsername: initiator?.username || 'Unknown',
        initiatorFirstName: initiator?.firstName || null,
        initiatorLastName: initiator?.lastName || null,
        opponentUsername: opponent?.username || 'Unknown',
        opponentFirstName: opponent?.firstName || null,
        opponentLastName: opponent?.lastName || null,
        wordListName: wordList?.name || 'Unknown',
        wordCount: wordList?.words.length || 0,
        words: wordList?.words || [],
      });
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  app.post("/api/challenges/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const challengeId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Verify user is the opponent
      if (challenge.opponentId !== userId) {
        return res.status(403).json({ error: "Only the opponent can accept the challenge" });
      }

      // Verify challenge is pending
      if (challenge.status !== "pending") {
        return res.status(400).json({ error: "Challenge is not pending" });
      }

      // Update challenge status to active
      const updated = await storage.updateChallenge(challengeId, {
        status: "active",
      });

      // Mark the to-do notification as complete
      const todos = await storage.getUserToDoItems(userId);
      const challengeTodo = todos.find(t => t.type === "challenge_invite" && t.groupId === challengeId);
      if (challengeTodo) {
        await storage.updateToDoItem(challengeTodo.id, { completed: true });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error accepting challenge:", error);
      res.status(500).json({ error: "Failed to accept challenge" });
    }
  });

  app.post("/api/challenges/:id/decline", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const challengeId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Verify user is the opponent
      if (challenge.opponentId !== userId) {
        return res.status(403).json({ error: "Only the opponent can decline the challenge" });
      }

      // Verify challenge is pending
      if (challenge.status !== "pending") {
        return res.status(400).json({ error: "Challenge is not pending" });
      }

      // Update challenge status to declined
      const updated = await storage.updateChallenge(challengeId, {
        status: "declined",
      });

      // Mark the to-do notification as complete
      const todos = await storage.getUserToDoItems(userId);
      const challengeTodo = todos.find(t => t.type === "challenge_invite" && t.groupId === challengeId);
      if (challengeTodo) {
        await storage.updateToDoItem(challengeTodo.id, { completed: true });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error declining challenge:", error);
      res.status(500).json({ error: "Failed to decline challenge" });
    }
  });

  // Cancel a pending challenge (initiator only)
  app.post("/api/challenges/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const challengeId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Verify user is the initiator
      if (challenge.initiatorId !== userId) {
        return res.status(403).json({ error: "Only the initiator can cancel the challenge" });
      }

      // Verify challenge is pending
      if (challenge.status !== "pending") {
        return res.status(400).json({ error: "Challenge is not pending" });
      }

      // Update challenge status to cancelled
      const updated = await storage.updateChallenge(challengeId, {
        status: "cancelled",
      });

      // Mark the opponent's to-do notification as complete
      const opponentTodos = await storage.getUserToDoItems(challenge.opponentId);
      const challengeTodo = opponentTodos.find(t => t.type === "challenge_invite" && (t.challengeId === challengeId || t.groupId === challengeId));
      if (challengeTodo) {
        await storage.updateToDoItem(challengeTodo.id, { completed: true });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error cancelling challenge:", error);
      res.status(500).json({ error: "Failed to cancel challenge" });
    }
  });

  app.post("/api/challenges/:id/submit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const challengeId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const schema = z.object({
        score: z.number(),
        time: z.number(),
        correctCount: z.number(),
        incorrectCount: z.number(),
      });

      const { score, time, correctCount, incorrectCount } = schema.parse(req.body);
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Verify user is part of this challenge
      const isInitiator = challenge.initiatorId === userId;
      const isOpponent = challenge.opponentId === userId;
      
      if (!isInitiator && !isOpponent) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify challenge is active or pending (initiator can submit when pending)
      if (challenge.status !== "active" && challenge.status !== "pending") {
        return res.status(400).json({ error: "Challenge is not active" });
      }

      // Prepare updates
      const updates: any = {};
      
      if (isInitiator) {
        // Check if initiator already submitted
        if (challenge.initiatorScore !== null) {
          return res.status(400).json({ error: "You have already submitted your result" });
        }
        updates.initiatorScore = score;
        updates.initiatorTime = time;
        updates.initiatorCorrect = correctCount;
        updates.initiatorIncorrect = incorrectCount;
        updates.initiatorCompletedAt = new Date();
        
        // If challenge was pending, now it's active (waiting for opponent)
        if (challenge.status === "pending") {
          updates.status = "active";
        }
        
        // Notify opponent that it's their turn
        const initiator = await storage.getUser(userId);
        const wordList = await storage.getCustomWordList(challenge.wordListId);
        await storage.createToDoItem({
          userId: challenge.opponentId,
          message: `${initiator?.username || 'Someone'} has completed their Head to Head challenge! It's your turn to play using the "${wordList?.name}" word list.`,
          type: "challenge_invite",
          requesterId: userId,
          requesterUsername: initiator?.username || 'Unknown',
          groupId: challengeId,
          completed: false,
        });
      } else {
        // Check if opponent already submitted
        if (challenge.opponentScore !== null) {
          return res.status(400).json({ error: "You have already submitted your result" });
        }
        updates.opponentScore = score;
        updates.opponentTime = time;
        updates.opponentCorrect = correctCount;
        updates.opponentIncorrect = incorrectCount;
        updates.opponentCompletedAt = new Date();
      }

      // Update the challenge
      let updatedChallenge = await storage.updateChallenge(challengeId, updates);

      // Refetch to check if both players have completed
      updatedChallenge = await storage.getChallenge(challengeId);
      
      let starAwarded = false;
      if (updatedChallenge && 
          updatedChallenge.initiatorScore !== null && 
          updatedChallenge.opponentScore !== null) {
        // Both players completed - determine winner
        const initiatorScore = updatedChallenge.initiatorScore;
        const opponentScore = updatedChallenge.opponentScore;
        
        let winnerUserId: number | null = null;
        if (initiatorScore > opponentScore) {
          winnerUserId = updatedChallenge.initiatorId;
        } else if (opponentScore > initiatorScore) {
          winnerUserId = updatedChallenge.opponentId;
        }
        // If tied, winnerUserId stays null
        
        const finalUpdates: any = {
          status: "completed",
          completedAt: new Date(),
          winnerUserId,
        };
        
        // Award star to winner (only if there is one)
        if (winnerUserId) {
          await storage.incrementUserStars(winnerUserId, 1);
          finalUpdates.starAwarded = true;
          starAwarded = true;
        }
        
        updatedChallenge = await storage.updateChallenge(challengeId, finalUpdates);
        
        // Mark all challenge-related todos as complete for both participants
        const [initiatorTodos, opponentTodos] = await Promise.all([
          storage.getUserToDoItems(updatedChallenge!.initiatorId),
          storage.getUserToDoItems(updatedChallenge!.opponentId),
        ]);
        
        const challengeTodosToComplete = [
          ...initiatorTodos.filter(t => t.type === "challenge_invite" && (t.challengeId === challengeId || t.groupId === challengeId)),
          ...opponentTodos.filter(t => t.type === "challenge_invite" && (t.challengeId === challengeId || t.groupId === challengeId)),
        ];
        
        await Promise.all(challengeTodosToComplete.map(todo => 
          storage.updateToDoItem(todo.id, { completed: true })
        ));
        
        // Create challenge_complete notifications for both participants
        const wordList = await storage.getCustomWordList(updatedChallenge!.wordListId);
        const initiatorUser = await storage.getUser(updatedChallenge!.initiatorId);
        const opponentUser = await storage.getUser(updatedChallenge!.opponentId);
        
        // Determine result messages for each user
        let initiatorMessage: string;
        let opponentMessage: string;
        
        if (winnerUserId === updatedChallenge!.initiatorId) {
          initiatorMessage = `You won your Head to Head challenge against ${opponentUser?.firstName || opponentUser?.username || 'your opponent'}! You earned a star.`;
          opponentMessage = `${initiatorUser?.firstName || initiatorUser?.username || 'Your opponent'} won the Head to Head challenge. Better luck next time!`;
        } else if (winnerUserId === updatedChallenge!.opponentId) {
          initiatorMessage = `${opponentUser?.firstName || opponentUser?.username || 'Your opponent'} won the Head to Head challenge. Better luck next time!`;
          opponentMessage = `You won your Head to Head challenge against ${initiatorUser?.firstName || initiatorUser?.username || 'your opponent'}! You earned a star.`;
        } else {
          // Tie
          initiatorMessage = `Your Head to Head challenge against ${opponentUser?.firstName || opponentUser?.username || 'your opponent'} ended in a tie!`;
          opponentMessage = `Your Head to Head challenge against ${initiatorUser?.firstName || initiatorUser?.username || 'your opponent'} ended in a tie!`;
        }
        
        // Create notifications for both participants
        await Promise.all([
          storage.createToDoItem({
            userId: updatedChallenge!.initiatorId,
            message: initiatorMessage,
            type: "challenge_complete",
            requesterId: updatedChallenge!.opponentId,
            requesterUsername: opponentUser?.username || 'Unknown',
            groupId: challengeId,
            completed: false,
          }),
          storage.createToDoItem({
            userId: updatedChallenge!.opponentId,
            message: opponentMessage,
            type: "challenge_complete",
            requesterId: updatedChallenge!.initiatorId,
            requesterUsername: initiatorUser?.username || 'Unknown',
            groupId: challengeId,
            completed: false,
          }),
        ]);
      }

      // Fetch user names to include in response
      const [initiatorUser, opponentUser] = await Promise.all([
        storage.getUser(updatedChallenge!.initiatorId),
        storage.getUser(updatedChallenge!.opponentId),
      ]);

      // Return enriched challenge data with user names
      res.json({
        ...updatedChallenge,
        initiatorFirstName: initiatorUser?.firstName || null,
        initiatorLastName: initiatorUser?.lastName || null,
        initiatorUsername: initiatorUser?.username || "Unknown",
        opponentFirstName: opponentUser?.firstName || null,
        opponentLastName: opponentUser?.lastName || null,
        opponentUsername: opponentUser?.username || "Unknown",
        starAwarded,
      });
    } catch (error) {
      console.error("Error submitting challenge result:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit challenge result" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
