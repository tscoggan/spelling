# Spelling Champions

## Overview
Spelling Champions is an interactive educational app designed to improve children's spelling skills through engaging games. It features multiple difficulty levels, text-to-speech, immediate feedback, and a scoring system. The app leverages words inspired by the Scripps "Words of the Champions" list, promotes competitive learning via leaderboards, and allows users to create and share custom word lists. The core vision is to provide a comprehensive and enjoyable platform for children's spelling development.

## Recent Changes (November 2025)

### Crossword Puzzle Mode - Audio-Only Interface (November 2025)
Complete implementation of interactive crossword puzzle game mode with TTS-only interface:
- **Grid Generation**: Client-side algorithm places words with intersections using BFS connectivity validation (client/src/lib/crosswordGenerator.ts)
- **Connectivity Validation**: All words in puzzle connect to at least one other word; disconnected entries are automatically filtered out and grid is rebuilt
- **Audio-Only Interface**: Play buttons (Volume icons) replace definition text and cell numbers; click to hear word via TTS
- **UI**: Centered grid without clue lists; subheader instructs "Click the play icon at the start of each word to hear the word"
- **Auto-Focus & Advance**: Clicking play button auto-focuses first letter; typing auto-advances through word (stops on last letter)
- **Overwrite Input**: Clicking on cell with existing letter selects the text; typing immediately replaces it without needing backspace
- **Smart Backspace Navigation**: Backspace/Delete clears current letter (stays in cell), pressing again moves to previous cell and clears it
- **Show Mistakes Feature**: Button highlights incorrect cells with red border (border-red-500), light red background (bg-red-50), and red text; highlights automatically clear when user types or deletes
- **Results Screen Enhancements**:
  - Simplified header: Smaller "Amazing Work!" title without sparkle icon or subheader
  - No points awarded (Crossword is practice-focused, not scored)
  - Single centered Accuracy card showing percentage
  - Completed puzzle grid display with per-letter feedback
- **Results Grid Display**: 
  - Incorrect letters: crossed out with red diagonal slash, correct letter shown in top-right corner overlay
  - Correct letters: displayed normally in gray
  - Caption: "Incorrect letters are crossed out in red with the correct letter shown"
- **Scoring**: Accuracy-based for internal tracking only (not displayed to user)
- **Support**: Works with custom word lists containing 5-15 words (increased from 12)
- **Status**: Production-ready, verified via automated testing

### Find the Mistake - Capitalization Fix
Fixed capitalization inconsistency in Find the Mistake mode:
- **Issue**: Misspelled words appeared in mixed case (e.g., "Appl") while correct choices were uppercase
- **Solution**: Updated misspellWord function to preserve full uppercase capitalization
- **Result**: All 4 word choices now display with consistent formatting
- **Status**: Production-ready, verified via automated testing

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## System Architecture

### UI/UX Decisions
The application uses a vibrant, hand-drawn crayon aesthetic inspired by Crayola.com, featuring a clean white background with large, school-themed decorative elements (pencils, bookworms) at 50% opacity. It uses Fredoka for titles and Nunito for body text. The color palette includes Bright Purple, Vibrant Yellow, and Fresh Green. Content is displayed on white cards with a school pattern overlay. Word illustrations are dynamically loaded. The design is responsive, accessible (WCAG AA compliant) with high contrast and keyboard navigation, and utilizes Framer Motion for smooth spring animations.

### Technical Implementations
The frontend is built with **React**, using **Wouter** for routing, **TanStack Query** for data fetching, **Framer Motion** for animations, **Shadcn UI** for components, and **Tailwind CSS** for styling. Text-to-speech functionality is provided by the **Web Speech API**.

The backend uses **Express.js** with **TypeScript**. **PostgreSQL** serves as the database, managed with **Drizzle ORM**. User authentication is handled by **Passport.js** with **Scrypt** for password hashing.

### Feature Specifications
- **User Authentication**: Secure accounts with unique usernames, hashed passwords, and avatar selection.
- **Custom Word Lists**: Users create, share, and manage custom word lists (5-500 words) with assigned difficulty (Easy, Medium, Hard) and grade levels (K-12). Built-in lists have been removed.
- **Game Modes**: Six modes available:
  - **Practice**: Classic mode with immediate feedback and word hints
  - **Timed Challenge**: 60-second countdown with immediate feedback
  - **Quiz Mode**: Answer all 10 words before seeing results (no word hints for increased difficulty)
  - **Word Scramble**: Drag-and-drop letter tiles to unscramble words
  - **Find the Mistake**: Choose the correctly spelled word from 4 options (3 misspelled, 1 correct) with consistent uppercase formatting
  - **Crossword Puzzle**: Solve interactive crossword puzzles using dictionary clues (supports 5-12 words per puzzle)
- **Text-to-Speech**: Words, definitions, and sentences are pronounced using the Web Speech API. "Definition" and "Use in Sentence" buttons provide audio-only feedback.
- **Auto-Focus Input**: Input fields automatically focus on new words and after audio playback.
- **Dictionary Integration**: Prioritizes Simple English Wiktionary for kid-friendly definitions, falling back to Free Dictionary API. Includes age-appropriate fallback sentences and extracts parts of speech.
- **Word Hints**: Visual letter placeholders show word length in most modes, but are hidden in Quiz Mode for increased difficulty.
- **Parts of Speech TTS**: A dedicated button speaks the grammatical categories of each word.
- **Cartoon Illustrations**: Word illustrations are stored permanently in Replit Object Storage. The app automatically enriches custom word lists with kid-friendly cartoon images via the Pixabay API, uploading them directly to Object Storage. This process runs as a background job with real-time progress indicators.
- **Scoring System**: Points based on list difficulty (Easy: 10, Medium: 20, Hard: 30 per word) with streak bonuses.
- **Leaderboard**: Displays player scores, filterable by difficulty, with usernames and avatars.
- **Progress Tracking**: Shows words completed, accuracy, and streak per game session.

### System Design Choices
- **Client-Server Architecture**: React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data, game sessions, leaderboards, custom word lists (including difficulty, public status, grade level), word illustrations (with nullable `imagePath` and `parts_of_speech`), and background job tracking. Words in custom lists are auto-capitalized server-side.
- **Authentication Flow**: Passport.js manages user registration, login, and session persistence for protected routes.
- **Object Storage Architecture**: Replit Object Storage stores all word illustration images permanently with public ACL visibility. The server provides a dedicated route (`/objects/images/:objectId`) for serving images with caching headers.
- **API Endpoints**: RESTful APIs for authentication, game management, leaderboards, CRUD operations for word lists, illustration job status, and image retrieval.
- **Background Job System**: Asynchronously processes Pixabay image enrichment for custom word lists, tracking job status and providing real-time UI updates.

## External Dependencies

- **React**: Frontend UI library.
- **Wouter**: Client-side routing.
- **TanStack Query**: Data fetching and caching.
- **Framer Motion**: Animations.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Web Speech API**: Browser-native text-to-speech functionality.
- **Express.js**: Backend web framework.
- **TypeScript**: Superset of JavaScript.
- **PostgreSQL**: Relational database.
- **Passport.js**: Authentication middleware.
- **Scrypt**: Password hashing library.
- **Drizzle ORM**: Type-safe ORM.
- **Pixabay API**: Provides kid-friendly cartoon illustrations for automated word enrichment.
- **Replit Object Storage**: Cloud storage for permanent image hosting.