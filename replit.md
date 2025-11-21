# Spelling Champions

## Overview
Spelling Champions is an interactive educational app designed to improve children's spelling skills through engaging games. It features text-to-speech, immediate feedback, and a scoring system. All words in the application are sourced from custom word lists created by users, promoting collaborative learning via leaderboards and word list sharing. The core vision is to provide a comprehensive and enjoyable platform for children's spelling development, with recent enhancements focusing on user groups, an audio-only crossword puzzle mode, realistic misspelling challenges, and robust content moderation for child safety.

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## System Architecture

### UI/UX Decisions
The application features a bright, cheerful rainbow background design with playful aesthetics optimized for both mobile and desktop viewing. The design uses a mobile-optimized portrait-oriented vibrant rainbow landscape image (featuring sky blue background with rainbow, sun, butterflies, flowers, and grass) as the main backdrop with a semi-transparent light overlay (5% white in light mode, 50% black in dark mode) to ensure readability. Background positioning is set to 'center top' to keep the rainbow and sky visible on all screen orientations. The color palette includes vibrant rainbow colors (red, orange, yellow, green, blue) with sky blue as the base. Content is displayed on white cards (white background in light mode, dark gray in dark mode) with rounded corners and soft shadows. Text elements use theme-aware utilities with backdrop blur effects for enhanced readability over the rainbow background. The "Spelling Champions" banner uses responsive sizing (smaller on mobile with max-w-sm, larger on desktop with md:max-w-xl) for optimal display across devices. The design is fully responsive, accessible (WCAG AA compliant) with support for both light and dark modes, high contrast, keyboard navigation, and utilizes Framer Motion for smooth spring animations.

**Mobile Scroll Behavior**: Practice mode implements automatic viewport centering when advancing to the next word. After clicking "Next Word" on the result screen, the game card smoothly scrolls into view using `scrollIntoView({ behavior: 'smooth', block: 'start' })` to ensure consistent positioning across mobile devices with varying keyboard behavior.

### Technical Implementations
The frontend is built with **React**, using **Wouter** for routing, **TanStack Query** for data fetching, **Framer Motion** for animations, **Shadcn UI** for components, and **Tailwind CSS** for styling. Text-to-speech functionality is provided by the **Web Speech API**.

The backend uses **Express.js** with **TypeScript**. **PostgreSQL** serves as the database, managed with **Drizzle ORM**. User authentication is handled by **Passport.js** with **Scrypt** for password hashing. Content moderation is implemented using the `bad-words` library.

### Feature Specifications
- **User Management**: Secure authentication, enhanced user profiles, and support for user groups with membership management and to-do notifications.
- **Custom Word Lists**: Users create, share, and manage custom word lists with assignable grade levels. Lists can control image assignment and visibility (public, private, groups). Supports importing words from .txt, .csv, and .pdf files with automatic text extraction. Profanity filtering is applied to all user-submitted content.
- **Game Modes**:
    - **Practice**: Classic mode with immediate feedback. Uses full word lists with randomized order.
    - **Timed Challenge**: 60-second countdown. Uses full word lists with randomized order.
    - **Quiz Mode**: No hints, results after all words. Defaults to "All Words" but offers option to limit to "10 Words" for shorter quizzes. Words are randomized before optional limiting.
    - **Word Scramble**: Drag-and-drop letters with dynamic tile sizing. Uses full word lists with randomized order. Implements responsive single-row layout with viewport-based container width measurement (useLayoutEffect), automatic gap reduction (8px/12px default, down to 0px for long words), and proportional tile scaling (width, height, fontSize, lineWidth) with 1px minimums to prevent layout breakage. Guarantees all tiles fit on one row for realistic word lengths (4-20+ letters) across all viewport sizes (320px-1920px+).
    - **Find the Mistake**: Identifies misspelled words from realistic, randomized errors with educational feedback. Limited to 4 words per session (mode-specific).
    - **Crossword Puzzle**: Interactive, audio-only crossword puzzles with client-side grid generation, prioritizing word connectivity. Limited to 15 words for grid generation (mode-specific). Implements horizontal scrolling (`overflow-x-auto`) with left-aligned grid and symmetrical padding for full scrollbar range on mobile. Mobile UX: When users click the speaker button to hear a word pronunciation, the first letter box for that word automatically receives focus and triggers the keyboard to appear, allowing immediate typing.
- **Word Randomization**: All game modes use the Durstenfeld shuffle algorithm to randomize word order, ensuring every playthrough offers a fresh experience with different word sequences from the full available list.
- **Responsive Font Scaling**: Practice, Timed Challenge, and Quiz modes implement dynamic font sizing that guarantees long words fit within the input field across all viewport sizes (320px-1920px+):
  - **Measurement System**: useLayoutEffect measures actual Input element width (including responsive padding/borders) on every word change, mode switch, hint toggle, and viewport resize/orientation change.
  - **Deterministic Calculation**: Font size = max((availableWidth / wordLength) * 0.85, 10px). Always calculates required size first, then intelligently selects Tailwind classes (text-4xl/3xl/2xl/xl/lg/base) when they fit, or applies custom inline px sizing when needed.
  - **Word Hint Mode**: Letter spacing dynamically scales based on measured container width, calculating per-letter minWidth and fontSize to ensure hint rows fit without overflow.
  - **Guarantees**: No horizontal scrolling or clipping for realistic word lengths (4-30 characters) across mobile (320px), tablet (768px), and desktop (1920px+) viewports.
- **Text-to-Speech**: Pronounces words, definitions, and sentences; includes dedicated button for parts of speech.
- **Dictionary Integration**: Uses Merriam-Webster APIs (Learner's Dictionary as primary source, Collegiate Dictionary as fallback) for child-friendly definitions, examples, word origins, and parts of speech. Implements robust error handling to distinguish word-not-found (404) from service failures (auth errors, rate limits).
- **Cartoon Illustrations**: Automated enrichment of custom word lists with kid-friendly cartoon images via Pixabay API, stored permanently in Replit Object Storage.
- **Scoring System & Leaderboard**: Points (20 per correct word) with streak bonuses, displayed on leaderboards.
- **Progress Tracking**: Session-based tracking of words, accuracy, and streaks.

### System Design Choices
- **Client-Server Architecture**: React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data, game sessions, leaderboards, custom word lists (with new fields for user groups, image assignment, and visibility), word illustrations, and background job tracking. The words table stores metadata for words (definitions, parts of speech, origins, examples) that are populated on-demand through the dictionary validation service when users create custom word lists.
- **Word Management**: No pre-seeded words exist in the database. All words are added dynamically when users create custom word lists, with metadata (definitions, parts of speech, origins, examples) fetched from Merriam-Webster APIs during list creation/update.
- **Authentication Flow**: Passport.js manages user registration, login, and session persistence.
- **Object Storage Architecture**: Replit Object Storage stores all word illustration images permanently with public ACL visibility, served via a dedicated backend route.
- **API Endpoints**: RESTful APIs for authentication, game management, leaderboards, CRUD operations for word lists, user groups, to-do items, illustration job status, and image retrieval. Backend supports unlimited word fetching by treating missing or zero `limit` parameters as "no cap."
- **Background Job System**: Asynchronously processes Pixabay image enrichment for custom word lists, providing real-time UI updates.
- **React Query Caching**: Uses prefix-based cache invalidation (e.g., `["/api/word-lists"]`) to automatically match all nested queries including illustration subqueries, ensuring thumbnails refresh after background illustration jobs complete. Uses stable tuple-based query keys including game mode and quiz count parameters to prevent cache collisions when switching between different game modes or quiz settings.
- **Dictionary Validation System** (server/services/dictionaryValidation.ts):
  - **Precedence Hierarchy**: Learner's Dictionary (primary) → Collegiate Dictionary (fallback for missing fields like etymology)
  - **Error Handling**: Distinguishes word-not-found (404 = invalid) from service failures (401/403/429/5xx = skipped)
  - **Metadata Extraction**: Parses complex Merriam-Webster JSON format with formatting codes ({bc}, {it}, {vis}, etc.)
  - **Caching**: In-memory cache with 24-hour TTL to minimize API calls
  - **Concurrency Control**: Maximum 5 concurrent API requests with 5-second timeout per word

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
- **Pixabay API**: Provides kid-friendly cartoon illustrations.
- **Replit Object Storage**: Cloud storage for permanent image hosting.
- **bad-words**: Profanity filter library for content moderation.
- **Merriam-Webster APIs**: 
  - **Learner's Dictionary** (PRIMARY): Child-friendly definitions and examples with simplified language.
  - **Collegiate Dictionary** (FALLBACK): Comprehensive dictionary with etymology/word origins, fills gaps from Learner's Dictionary.
  - **API Keys**: Stored securely in Replit Secrets (MERRIAM_WEBSTER_LEARNERS_API_KEY, MERRIAM_WEBSTER_COLLEGIATE_API_KEY).
  - **Free Tier**: 1,000 queries/day per key, non-commercial use only.
- **pdfjs-dist**: Client-side PDF text extraction library for importing word lists from PDF files. Uses Vite-compatible worker configuration with import.meta.url.

## Email Notifications

**Note**: Email integration (SendGrid/Resend) was explored but not implemented at user's request. The to-do notification system serves as the primary notification mechanism for:
- Group invitations
- Access requests
- Other user notifications

To add email notifications in the future:
1. Set up SendGrid or Resend connector integration via Replit Integrations
2. Implement email templates for invitation/notification types
3. Add email sending logic to backend routes (POST /api/user-groups/:id/invite, POST /api/user-groups/:id/request-access)
4. Consider adding email preference settings to user profiles