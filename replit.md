# Spelling Champions

## Overview

Spelling Champions is an interactive and engaging educational app designed to help children practice and improve their spelling skills. It features interactive games, multiple difficulty levels, text-to-speech pronunciation, immediate feedback, and a rewarding scoring system. The app aims to make learning fun and effective by utilizing words inspired by the Scripps "Words of the Champions" list, promoting competitive learning through leaderboards, and allowing users to create and share custom word lists. The business vision is to provide a comprehensive and enjoyable platform for children's spelling development.

## User Preferences

- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## Recent Fixes & Testing

### Object Storage Migration (November 2025)
- **Implementation**: Migrated all word illustration images from ephemeral filesystem storage (attached_assets/) to permanent Replit Object Storage for reliable cloud-based image hosting.
- **Architecture**: Created ObjectStorageService and ObjectAclService for managing uploads and access control. Updated Pixabay service to upload images directly to Object Storage. Added /objects/images/:objectId route for serving images with caching headers.
- **Migration**: Successfully migrated all 207 existing images from filesystem to Object Storage. Database imagePath values updated from filesystem paths to Object Storage format (/objects/images/{uuid}).
- **Testing**: End-to-end test verified images load correctly from Object Storage, new word lists auto-enrichment works, and all illustrations persist permanently.
- **Status**: Production-ready. All images now permanently stored in cloud with proper ACL policies and caching.

### iPad Button Accessibility Fix
- **Issue**: On iPad devices, the "Update List" button in the word list edit dialog was not clickable due to scroll container interference with touch events.
- **Solution**: Restructured dialog layout to separate scrollable form content (`max-h-[60vh] overflow-y-auto`) from fixed button footer. This ensures buttons remain visible and tappable on all touch devices.
- **Status**: Verified working via automated end-to-end test on 768x1024 iPad viewport.

### Parts of Speech Feature (November 2025)
- **Implementation**: Added parts of speech extraction from dictionary APIs with database persistence. Words now display their grammatical categories (noun, verb, adjective, etc.) during gameplay.
- **Database Schema**: Added nullable `parts_of_speech` column to word_illustrations table to store grammatical data. Made `imagePath` nullable to allow storing parts of speech without requiring images.
- **Dictionary Integration**: Parts of speech are extracted from Simple English Wiktionary (priority) and Free Dictionary API (fallback). Data persists to database for future gameplay sessions.
- **TTS Button**: Added "Parts of Speech" button with sparkles icon that speaks all parts separated by "or" (e.g., "noun or verb"). Button uses same auto-refocus pattern as other audio buttons.
- **Status**: Production-ready. Verified through end-to-end testing with successful database persistence.

### Recent UI Enhancements (November 2025)
- **Auto-Capitalization**: All words in custom word lists are automatically converted to uppercase when creating or updating lists (server-side transformation). Ensures consistent display and storage.
- **Quiz Mode Hints**: Word length hints (underscores) are now hidden in Quiz Mode to increase difficulty. Hints remain visible in Standard, Timed Challenge, and Word Scramble modes.
- **Action Button Tooltips**: Added tooltips to Edit List (pencil icon), Edit Images (camera icon), and Delete List (trash icon) buttons for improved discoverability.
- **Custom Pixabay Search**: Image editing dialog now includes a small text input field for manual Pixabay search override. Users can search for specific cartoon styles beyond automatic word matching.
- **Status**: All features verified through automated testing. No regressions detected.

### Test Infrastructure
- **Test User Credentials**: Username "tgs4", Password "test123" (configured for automated testing with properly hashed password in development database)
- **Camera Icon**: Used throughout image editing UI to represent image-related features (replaced previous sparkle icons)
- **Practice Mode Scoring**: Practice mode correctly excludes score saving to leaderboard (only Standard, Timed Challenge, Quiz, and Word Scramble modes save scores)

## System Architecture

### UI/UX Decisions
The application features a vibrant hand-drawn crayon aesthetic inspired by Crayola.com and children's book illustrations. All pages have clean white backgrounds overlaid with large, prominent school-themed decorative elements (cartoon pencils, bookworms, books, classroom objects at 240px scale with 50% opacity). The crayon-style title banner uses Fredoka font (font-crayon class) with large buttons, generous spacing, and a bright color palette (Primary: Bright Purple #8B5CF6, Secondary: Vibrant Yellow #FCD34D, Accent: Fresh Green #34D399, Foreground: Dark Blue-Gray). Content displays in white cards over the white backgrounds with school pattern overlay to maintain readability. Word illustrations are dynamically loaded from the database and displayed during gameplay when available. Initially, fourteen common kid-friendly words (cat, dog, apple, book, sun, house, ball, star, tree, flower, car, heart, rainbow, balloon) have vibrant cartoon illustrations. The design uses Fredoka typography for its playful crayon aesthetic and Nunito for body text, maintaining readability across mobile, tablet, and desktop devices. Smooth spring animations via Framer Motion enhance user experience, while accessibility remains a priority with high contrast, keyboard navigation, and screen reader support (WCAG AA compliant).

### Technical Implementations
The frontend is built with **React**, utilizing **Wouter** for routing, **TanStack Query** for data fetching, **Framer Motion** for animations, **Shadcn UI** for components, and **Tailwind CSS** for styling. The **Web Speech API** provides text-to-speech functionality.

The backend uses **Express.js** with **TypeScript** for type safety. **PostgreSQL** serves as the database, managed with **Drizzle ORM**. User authentication is handled by **Passport.js** with **Scrypt** for secure password hashing.

### Feature Specifications
- **User Authentication**: Secure accounts with unique usernames, hashed passwords, and avatar selection.
- **Custom Word Lists Only**: The app exclusively uses custom word lists (built-in lists removed). Users create lists with required difficulty levels (Easy, Medium, Hard), organize by grade level (K-12), and can share them publicly. Lists require 5-500 words.
- **Difficulty Levels**: Each custom word list must have an assigned difficulty (Easy, Medium, or Hard) selected via dropdown during creation. This determines point values.
- **Game Modes**: Four modes available - Standard (classic with immediate feedback), Timed Challenge (60 seconds), Quiz Mode (answer all 10 words before seeing results), and Word Scramble (drag-and-drop letter tiles to unscramble words).
- **Text-to-Speech**: Words are pronounced using the Web Speech API with customizable voice options. Dictionary "Definition" and "Use in Sentence" buttons speak through TTS (audio-only, no visual text display).
- **Auto-Focus Input**: Input field automatically receives focus on new word load (via HTML autoFocus attribute) and after clicking any audio button (Play Audio, Repeat, Definition, Use in Sentence) using a shared `speakWithRefocus()` helper with button blur + dual timeout strategy (TTS callback + backup). Input uses transparent styling to display word hints while remaining fully focusable.
- **Dictionary Integration**: Simple English Wiktionary is prioritized for kid-friendly definitions and example sentences. If a word isn't found there, the system falls back to the standard Free Dictionary API (dictionaryapi.dev). When APIs lack examples, the app generates age-appropriate fallback sentences using 10 kid-friendly templates. "Use in Sentence" button is always enabled (real or fallback examples). HTML tags are automatically stripped from Wiktionary responses. **Parts of speech** are extracted from both APIs and persisted to the database for future sessions.
- **Word Hints**: Visual letter placeholders with underlines show word length in Standard, Timed Challenge, and Word Scramble modes. Hints are **hidden in Quiz Mode** to increase difficulty. Typed letters appear above blanks. Input field remains transparent but focusable (text-transparent, pointer-events-auto).
- **Parts of Speech TTS**: Dedicated button speaks the grammatical categories of each word (noun, verb, adjective, etc.) using " or " separator between multiple parts. Auto-refocuses input after speaking for seamless gameplay.
- **Cartoon Illustrations**: Word illustrations are stored permanently in **Replit Object Storage** for persistent cloud-based image hosting. The PostgreSQL database (word_illustrations table) tracks metadata and Object Storage paths. The system features **automatic cartoon image enrichment** using the Pixabay API - when users create custom word lists, the app automatically searches for and downloads kid-friendly cartoon images for each word in the background, uploading them directly to Object Storage. A real-time progress indicator with animated camera icon and progress bar shows users the search status. Images appear between the instruction text and play button with spring animations during gameplay. The automated enrichment system uses a background job queue (illustration_jobs, illustration_job_items tables) to handle async processing without blocking the user experience. All 207 existing images have been successfully migrated from ephemeral filesystem storage to permanent Object Storage.
- **Scoring System**: Points awarded based on the custom list's difficulty (Easy: 10, Medium: 20, Hard: 30 points per word) with streak bonuses (+5 points per consecutive correct answer).
- **Leaderboard**: Displays all players' scores, filterable by difficulty, showing usernames, avatars, and game statistics.
- **Progress Tracking**: Shows words completed, accuracy, and streak information per game session.

### System Design Choices
- **Client-Server Architecture**: A React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data (id, username, password, avatar), game sessions, leaderboard entries, custom word lists (id, userId, name, difficulty, words, isPublic, gradeLevel, createdAt), word illustrations (id, word, imagePath (nullable), source, partsOfSpeech (nullable), createdAt), and background job tracking (illustration_jobs, illustration_job_items). Words in custom lists are automatically capitalized server-side.
- **Authentication Flow**: User registration and login managed by Passport.js, with session persistence. Protected routes ensure authenticated access to game features.
- **Object Storage Architecture**: All word illustration images are stored in Replit Object Storage (bucket: repl-default-bucket-1f380913-4181-41ce-bc80-cb388e213890) for permanent persistence. Images use public ACL visibility with "system" owner. The ObjectStorageService (server/objectStorage.ts) handles uploads via uploadImageBuffer() and serves images through streamObjectToResponse(). Image paths follow the format `/objects/images/{uuid}`. A dedicated GET /objects/images/:objectId route serves images with proper caching headers (Cache-Control: public, max-age=31536000, immutable).
- **API Endpoints**: A comprehensive set of RESTful APIs for authentication, game management, leaderboard interactions, CRUD operations for custom word lists, illustration job status tracking, word illustration retrieval, and Object Storage image serving.
- **Background Job System**: Automated cartoon image enrichment using Pixabay API (60,000+ kid-friendly images). When users create word lists, the system asynchronously searches for, downloads, and stores cartoon illustrations in Object Storage. Jobs track progress (pending/processing/completed states) with success/failure/skipped counts. Frontend polls job status every 2 seconds to display real-time progress with animated UI indicators.

## External Dependencies

- **React**: Frontend UI library.
- **Wouter**: Client-side routing.
- **TanStack Query**: Data fetching and caching.
- **Framer Motion**: Animations.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Web Speech API**: Browser-native text-to-speech functionality.
- **Express.js**: Backend web framework.
- **TypeScript**: Superset of JavaScript for type safety.
- **PostgreSQL**: Relational database for persistent storage.
- **Passport.js**: Authentication middleware.
- **Scrypt**: Password hashing library.
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **Pixabay API**: Free stock image service providing 60,000+ kid-friendly cartoon illustrations for automated word enrichment.
- **Replit Object Storage**: Cloud storage service for permanent image hosting using Google Cloud Storage backend.