# Spelling Champions

## Overview
Spelling Champions is an interactive educational app designed to improve children's spelling skills through engaging games. It features multiple difficulty levels, text-to-speech, immediate feedback, and a scoring system. The app leverages words inspired by the Scripps "Words of the Champions" list, promotes competitive learning via leaderboards, and allows users to create and share custom word lists. The core vision is to provide a comprehensive and enjoyable platform for children's spelling development.

## Recent Changes (November 2025)

### Crossword Puzzle Mode - Audio-Only Interface (November 2025)
Complete implementation of interactive crossword puzzle game mode with TTS-only interface:
- **Grid Generation**: Client-side algorithm prioritizes word connectivity (client/src/lib/crosswordGenerator.ts)
  - **Multi-attempt strategy**: Tries 30 different word orderings to maximize connected words
  - **Connectivity requirement**: ALL words must connect to at least one other word via shared letters
  - **Isolation filtering**: Words with no common letters are automatically excluded from the puzzle
  - **Quality over quantity**: Prioritizes fully-connected puzzles over reaching a specific word count
  - Prevents two words from starting in the same box (unique play button cells)
  - Target: 15 words when possible, but accepts fewer if needed to maintain connectivity
  - Typical results: 5-12 connected words depending on letter overlap in the word list
- **Audio-Only Interface**: Play buttons (Volume icons) replace definition text and cell numbers; click to hear word via TTS
- **UI**: Centered grid without clue lists; subheader instructs "Click the play icon at the start of each word to hear the word"
- **Auto-Focus & Advance**: Clicking play button auto-focuses first letter; typing auto-advances through word (stops on last letter)
- **Overwrite Input**: Clicking on cell with existing letter selects the text; typing immediately replaces it without needing backspace
- **Smart Backspace Navigation**: Backspace/Delete clears current letter (stays in cell), pressing again moves to previous cell and clears it
- **Show Mistakes Feature**: Button highlights incorrect cells with red border (border-red-500), light red background (bg-red-50), and red text (text-red-700); highlights automatically clear when user types or deletes. Does NOT show correct letter overlay - only highlights mistakes.
- **Loading Screen**: Shows spinner and "Generating crossword puzzle..." message while grid is being generated (2-5 seconds)
- **Results Screen Enhancements**:
  - NO header text or sparkle icon (practice-focused mode)
  - Single centered Accuracy card showing percentage
  - Completed puzzle grid display with per-letter feedback
- **Results Grid Display**: 
  - Incorrect letters: highlighted in red with correct letter shown in top-right corner overlay
  - Correct letters: displayed normally in gray
  - Caption: "Incorrect letters are highlighted in red with the correct letter shown"
- **Scoring**: Accuracy-based for internal tracking only (not displayed to user)
- **Support**: Works with custom word lists containing 5-15 words (increased from 12)
- **Status**: Production-ready, verified via automated testing

### Find the Mistake - Realistic Misspellings (November 2025)
Enhanced educational experience with believable spelling mistakes:
- **Capitalization Fix**: All 4 word choices display with consistent uppercase formatting
- **Realistic Spelling Mistakes**: Two-tier misspelling strategy for challenging, educational gameplay
  - **Tier 1 - Common mistakes**: ie/ei confusion (receive → recieve), dropped consonants (cannot → canot), silent e errors (make → mak, cat → cate), vowel drops (delicious → delicius), letter swaps (friend → freind)
  - **Tier 2 - Phonetic alternatives**: Used when realistic mistakes conflict with other choices: c/k swaps (cat → kat), ph/f swaps (phonics → fonics), doubled consonants (pig → pigg)
  - Validation ensures misspellings don't match any of the 3 correct choices
  - Examples from testing: CATE, BIRDE, DOGE (realistic additions of silent 'e')
  - Much more challenging than obviously fake patterns
- **Correct Answer Feedback**: When user correctly selects the misspelled word:
  - Shows "Correct!" heading with checkmark
  - Displays "The misspelled word was:" label with strikethrough word
  - Shows "Correct spelling:" label with proper spelling
  - Uses same educational format as incorrect answer feedback
- **Incorrect Answer Feedback**: When user selects a correctly-spelled word instead of the misspelled one:
  - Shows the selected word in green with "That word is spelled correctly!" message
  - Displays the actual misspelled word with strikethrough
  - Shows the correct spelling of the misspelled word
  - Provides clear, educational feedback explaining the mistake
- **Implementation**: Enhanced `misspellWord` function with realistic strategies and `selectedChoiceIndex` state tracking
- **Status**: Production-ready, verified via automated testing

### Content Moderation for Children's Safety (November 2025)
Implemented comprehensive content filtering to ensure age-appropriate content:
- **Word Filtering**: Validates all user-submitted content against profanity filter using `bad-words` library
  - **List Names**: Checks list names for inappropriate content during creation and updates
  - **Word Arrays**: Validates each word in custom word lists
  - Applied to both word list creation (POST /api/word-lists) and updates (PUT /api/word-lists/:id)
  - Rejects submissions containing inappropriate content with detailed error messages
  - Server-side validation (server/contentModeration.ts) ensures security
  - **False Positive Prevention**: Removed overly broad patterns (hell, ass, tit, god) to allow legitimate words like "hello", "class", "pass", "title"
  - **Explicit Blocking**: Still blocks truly explicit profanity from bad-words default list
- **Image Safety**: Relies on Pixabay's built-in safe search filtering for cartoon illustrations
- **Error Handling**: Client displays detailed error messages showing which words/content were blocked
- **UI Enhancement**: Enter key now triggers search in Edit Images screen
- **UI Simplification**: Removed "Difficulty - Game Mode" text from all modes except Crossword
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
- **bad-words**: Profanity filter library for content moderation to ensure child-appropriate content.