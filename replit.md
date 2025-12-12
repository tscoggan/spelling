# Spelling Playground

## Overview
Spelling Playground is an interactive educational application designed to enhance children's spelling abilities through engaging games. It incorporates text-to-speech, immediate feedback, and a scoring system. The application utilizes custom, user-generated word lists, fostering collaborative learning through leaderboards and list sharing. The project's vision is to deliver a comprehensive and enjoyable platform for spelling development, with recent expansions including user groups, an audio-only crossword puzzle mode, realistic misspelling challenges, and robust content moderation for child safety.

## Version Management
- Version stored in `app_settings` database table with `APP_VERSION` from `shared/version.ts` as fallback
- Version displayed in the Help dialog footer
- Version automatically increments on each production deployment (when app starts in production mode)
  - Increments the patch version (3rd digit, e.g., 1.0.0 → 1.0.1)
  - Major/minor version changes are done manually upon request
  - Database-backed for persistence across deployments

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## System Architecture

### UI/UX Decisions
The application features a bright, responsive rainbow-themed design optimized for mobile and desktop, with a semi-transparent overlay for readability in both light and dark modes. Content is presented on theme-aware cards with rounded corners and soft shadows. Text elements utilize backdrop blur for enhanced readability. The design adheres to WCAG AA accessibility standards, including keyboard navigation and high contrast support, and uses Framer Motion for smooth animations. Practice mode includes automatic viewport centering and smooth scrolling for game cards on mobile.

### Technical Implementations
The frontend is built with React, utilizing Wouter for routing, TanStack Query for data fetching, Framer Motion for animations, Shadcn UI for components, and Tailwind CSS for styling. Text-to-speech is powered by the Web Speech API. The backend uses Express.js with TypeScript and PostgreSQL as the database, managed by Drizzle ORM. Passport.js handles authentication with Scrypt for password hashing. Content moderation uses the `bad-words` library.

### Feature Specifications
- **User Management**: Secure authentication, enhanced user profiles, support for user groups with membership and to-do notifications, and a `stars` column to track spendable stars for the Star Shop. Teachers can delegate co-owners (other teachers) for word lists and user groups, granting them full admin privileges.
- **Three-Tier Account System**: 
  - **Free (Guest)**: No-login guest mode with localStorage persistence for user ID. Social features (User Groups, Head-to-Head Challenges, Word List Sharing) are visibly disabled with lock icons and "Upgrade to Family or School account" tooltips. Server-side `requirePaidAccount` middleware returns 403 for all social feature API routes.
  - **Family**: Stubbed for future implementation with $5 Stripe payment and Verifiable Parental Consent (VPC) flow. Currently shows "Coming Soon" message.
  - **School**: Full-featured accounts with complete access to all features including social features, user groups, and head-to-head challenges.
- **Star Shop**: Users can purchase power-ups with earned stars. Available items include "Do Over" (1 star, retry one incorrect word) and "2nd Chance" (5 stars, retry all incorrect words at the end). Items are stored in the `user_items` table with quantity tracking.
- **Custom Word Lists**: Users create, share, and manage custom word lists with assignable grade levels, image assignment, and visibility controls (public, private, groups). Supports importing words from .txt, .csv, and .pdf files with profanity filtering.
- **Game Modes**: Includes Practice, Timed Challenge, Quiz Mode, Word Scramble (with dynamic tile sizing and single-row layout), Find the Mistake (with realistic error generation), and Crossword Puzzle (interactive, audio-only with client-side grid generation and mobile UX enhancements). All game modes use Durstenfeld shuffle for word randomization.
- **Responsive Font Scaling**: Dynamic font sizing ensures long words fit within input fields across all game modes and viewport sizes.
- **Text-to-Speech**: Pronounces words, definitions, and parts of speech.
- **Dictionary Integration**: Uses Merriam-Webster APIs (Learner's and Collegiate Dictionaries) for child-friendly definitions, examples, and word origins.
- **Cartoon Illustrations**: Automated image enrichment for word lists via Pixabay API, stored in Replit Object Storage.
- **Scoring System & Leaderboard**: Points, streak bonuses, and leaderboards.
- **Progress Tracking**: Session-based tracking of words, accuracy, and streaks.
- **My Stats Page**: Provides aggregate performance metrics with date filtering, lifetime metrics (streaks, favorite game mode), and a "Most Misspelled Words Play Feature" for re-practicing specific words. Implements security measures and UTC date boundaries for accurate tracking.
- **Report Inappropriate Content**: Users can flag word content (definition, sentence, or word origin) during gameplay in Practice, Timed Challenge, Quiz, and Word Scramble modes. Reports are stored in the `flagged_words` table with the word ID, content types flagged, optional comments, user ID (if logged in), and game mode.

### System Design Choices
- **Client-Server Architecture**: React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data, game sessions, leaderboards, custom word lists (with new fields for groups, images, visibility), word illustrations, and background job tracking. Word metadata is populated on-demand from Merriam-Webster APIs.
- **Word Management**: All words are dynamically added by users through custom word lists.
- **Authentication Flow**: Passport.js manages user authentication and session persistence.
- **Object Storage Architecture**: Replit Object Storage hosts all word illustration images publicly.
- **API Endpoints**: RESTful APIs for core functionalities, supporting unlimited word fetching.
- **Background Job System**: Asynchronously processes Pixabay image enrichment for custom word lists with real-time UI updates. Jobs are tracked in-memory only (not persisted to database) with 30-minute retention after completion. Backfill jobs have concurrency protection to prevent overlapping executions. Note: Job history is intentionally ephemeral - it is lost after 30 minutes or server restart per design requirements.
- **React Query Caching**: Uses prefix-based and tuple-based query keys for efficient and accurate cache management.
- **Dictionary Validation System**: Utilizes a precedence hierarchy for Merriam-Webster dictionaries, robust error handling, in-memory caching, and concurrency control for API requests. Includes verb tense detection that adds tense prefixes to part of speech (e.g., "past tense verb", "present participle verb", "past participle verb"). Detection uses: (1) MW API inflection labels (`il`) for verbs like "was" and "been", (2) special case handling for "were", (3) suffix-based heuristics (-ed for past, -ing for present participle, -en for past participle), and (4) position-based detection in the inflection array for irregular verbs (e.g., ate, slept, ran, went, took, gone). Homograph ordering: entries are sorted by MW API homograph number (from id field) and definitions are limited to 1 per homograph entry (meta.id like "bat:1", "bat:2", "bat:3"). Filters exclude abbreviations (ending with ".") and secondary spellings ("or" alternatives and apostrophe forms like "i's"). Cognate cross-references (cxs) are handled for verb conjugations like "is", "am", "are" that only have cross-references to "be" without their own definitions - these are stored with definitions like `present tense third-person singular of "be"`. **Stem matching**: Words that appear in the `stems` array (e.g., "coastal" appears in stems of "coast", "cannellini" in stems of "cannellini bean") are correctly validated and their metadata is extracted from the parent entry.
- **Game Session Tracking**: The `game_sessions` table accurately tracks `total_words`, `correct_words`, `is_complete` status, and `score` for various game modes, with detailed accuracy calculation logic. Partial sessions (from clicking Restart or Home mid-game) are saved with `isComplete=false` and included in accuracy metrics calculations.

## External Dependencies

- **React**: Frontend UI library.
- **Wouter**: Client-side routing.
- **TanStack Query**: Data fetching and caching.
- **Framer Motion**: Animations library.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Web Speech API**: Browser-native text-to-speech.
- **Express.js**: Backend web framework.
- **TypeScript**: JavaScript superset.
- **PostgreSQL**: Relational database.
- **Passport.js**: Authentication middleware.
- **Scrypt**: Password hashing library.
- **Drizzle ORM**: Type-safe ORM.
- **Pixabay API**: Provides kid-friendly cartoon illustrations.
- **Replit Object Storage**: Cloud storage for permanent image hosting.
- **bad-words**: Profanity filter library.
- **Merriam-Webster APIs**: Learner's Dictionary (primary) and Collegiate Dictionary (fallback) for word definitions and metadata. API keys are securely stored in Replit Secrets.
- **pdfjs-dist**: Client-side PDF text extraction for word list imports.