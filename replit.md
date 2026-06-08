# Spelling Playground

## Overview
Spelling Playground is an interactive educational application designed to enhance children's spelling abilities through engaging games. It incorporates text-to-speech, immediate feedback, and a scoring system. The application utilizes custom, user-generated word lists, fostering collaborative learning through leaderboards and list sharing. The project's vision is to deliver a comprehensive and enjoyable platform for spelling development, with recent expansions including user groups, an audio-only crossword puzzle mode, realistic misspelling challenges, and robust content moderation for child safety.

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## System Architecture

### UI/UX Decisions
The application features a bright, responsive rainbow-themed design optimized for mobile and desktop, with a semi-transparent overlay for readability in both light and dark modes. Content is presented on theme-aware cards with rounded corners and soft shadows. Text elements utilize backdrop blur for enhanced readability. The design adheres to WCAG AA accessibility standards, including keyboard navigation and high contrast support, and uses Framer Motion for smooth animations. Practice mode includes automatic viewport centering and smooth scrolling for game cards on mobile.

### Technical Implementations
The frontend is built with React, utilizing Wouter for routing, TanStack Query for data fetching, Framer Motion for animations, Shadcn UI for components, and Tailwind CSS for styling. Text-to-speech uses the Web Speech API on the web and `@capacitor-community/text-to-speech` on native iOS/Android (routed via `client/src/lib/platform.ts` + `native-speech.ts`). The backend uses Express.js with TypeScript and PostgreSQL as the database, managed by Drizzle ORM. Passport.js handles authentication with Scrypt for password hashing. Content moderation uses the `bad-words` library.

**Capacitor Mobile Port (Option B — native IAP + Stripe on web):**
- `capacitor.config.ts` at project root configures appId `com.spellingplayground.app`, webDir `dist/public`.
- CORS middleware in `server/index.ts` allows `capacitor://localhost` (iOS) and `http://localhost` (Android).
- Session cookies use `SameSite=None; Secure` in production so the cross-origin native WebView can authenticate.
- API base URL is centralized in `client/src/lib/apiBase.ts`. On web it is empty (relative/same-origin). On native (Capacitor) it prefers the build-time `VITE_API_BASE_URL`, and falls back to the hardcoded Replit-managed production URL `https://spell-champ-tgs4.replit.app` if that env var was omitted at build time — so the iPad/Android app still reaches the backend even when the Mac Mini build forgets to `export VITE_API_BASE_URL`. IMPORTANT: the native app intentionally uses the `.replit.app` domain, NOT the custom domain `spellingplayground.com`, because the custom domain currently has no valid TLS certificate ("no peer certificate available") — HTTPS calls to it fail and break every server request inside the native app (this was the real cause of guest-mode "Failed to validate words" on iPad). Switch back to the custom domain only after its certificate is provisioned.
- A global fetch interceptor in `client/src/lib/native-fetch.ts` (imported first in `main.tsx`) rewrites relative `/api` requests to `API_BASE` and defaults `credentials: include`. This covers raw `fetch("/api/...")` calls that bypass the `queryClient`/`apiRequest` helpers; without it those resolve to `capacitor://localhost` on native and the request throws (e.g. guest-mode word list validation via `/api/validate-words` showed "Failed to validate words"). No-op on web since `API_BASE` is empty.
- Native platform folders `ios/` and `android/` are generated on the Mac Mini via `npx cap add ios/android` and are gitignored.
- Full Mac Mini build instructions are in `CAPACITOR_SETUP.md`.

### Feature Specifications
- **User Management**: Secure authentication, enhanced user profiles, support for user groups with membership and to-do notifications, and a `stars` column for in-app purchases. Teachers can delegate co-owners for word lists and user groups.
- **Three-Tier Account System**: Offers Free (Guest) mode with localStorage persistence, Family accounts via Stripe subscription ($1.99/month or $19.99/year), and School accounts with a 4-step signup wizard including legal compliance checks (School TOS, Student DPA, COPPA certification) and a simulated $0.99 adult verification payment. School accounts have a dedicated dashboard for managing teachers and students.
- **Legal Compliance System**: Clickwrap acceptance for school-related legal documents during signup, with versioned text and SHA256 hashes stored for `coppa_certification`, `school_tos`, and `student_dpa`. Includes structured boolean fields for COPPA compliance.
- **Star Shop**: Users can purchase power-ups like "Do Over" and "2nd Chance" with earned stars, tracked in the `user_items` table.
- **Theme System**: Purchasable themes change game backgrounds and mascot characters, requiring updates to shared schema, asset imports, and UI mappings.
- **Custom Word Lists**: Users create, share, and manage custom word lists with assignable grade levels, image assignment, and visibility controls. Supports importing words from .txt, .csv, and .pdf files with profanity filtering.
- **Game Modes**: Includes Practice, Timed Challenge, Quiz Mode, Word Scramble, Find the Mistake, and Crossword Puzzle (interactive, audio-only). All modes use Durstenfeld shuffle for randomization.
- **Responsive Font Scaling**: Dynamic font sizing to ensure long words fit within input fields.
- **Text-to-Speech**: Pronounces words, definitions, and parts of speech.
- **Dictionary Integration**: Uses a two-tier Free Dictionary lookup by default: primary v1 endpoint (`freedictionaryapi.com/api/v1`, the official documented API with broader word coverage) with automatic fallback to v2 (`api.dictionaryapi.dev/api/v2`) only when v1 has a transient error. Both are key-free. The two endpoints have different JSON shapes, so each has its own parser (`parseFreeDictionaryV1Response` for v1, `parseFreeDictionaryResponse` for v2). Etymology/word-origin is sourced from Wiktionary directly (via the MediaWiki parse API, two HTTP calls: sections list + section HTML) since neither Free Dictionary endpoint exposes it. Merriam-Webster APIs (Learner's + Collegiate) are preserved as a config-switchable alternative; activate by setting `DICTIONARY_SOURCE = 'merriam-webster'` in `server/services/dictionaryConfig.ts`.
- **Cartoon Illustrations**: Automated image enrichment for word lists via Pixabay API, stored in Replit Object Storage.
- **Scoring System & Leaderboard**: Implements points, streak bonuses, and leaderboards.
- **Progress Tracking**: Session-based tracking of words, accuracy, and streaks, with a "My Stats Page" for aggregate performance metrics, date filtering, lifetime metrics, and re-practicing misspelled words.
- **Report Inappropriate Content**: Users can flag word content during gameplay; reports are stored in the `flagged_words` table.

### System Design Choices
- **Client-Server Architecture**: React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data, game sessions, leaderboards, word lists, word illustrations, and background job tracking, managed by Drizzle ORM.
- **Word Management**: All words are dynamically added by users through custom word lists.
- **Authentication Flow**: Passport.js manages user authentication and session persistence.
- **Object Storage Architecture**: Replit Object Storage hosts all word illustration images publicly.
- **API Endpoints**: RESTful APIs for core functionalities.
- **Background Job System**: Asynchronously processes Pixabay image enrichment for custom word lists with real-time UI updates. Jobs are in-memory with 30-minute retention.
- **React Query Caching**: Uses prefix-based and tuple-based query keys for cache management.
- **Dictionary Validation System**: Provider-switchable via `server/services/dictionaryConfig.ts`. Free Dictionary mode (default) is simple and key-free. Merriam-Webster mode uses a Learner's→Collegiate hierarchy with verb tense detection, homograph ordering, stem matching, and abbreviation filtering. Both modes share the same caching, concurrency control, and kid-content filtering.
- **Game Session Tracking**: The `game_sessions` table accurately tracks `total_words`, `correct_words`, `is_complete` status, and `score` for various game modes, including partial sessions.

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
- **Pixabay API**: Kid-friendly cartoon illustrations.
- **Replit Object Storage**: Cloud storage for permanent image hosting.
- **bad-words**: Profanity filter library.
- **Free Dictionary API**: Default dictionary provider (dictionaryapi.dev) — no API key required; provides definitions, examples, and parts of speech.
- **Merriam-Webster APIs**: Preserved alternative dictionary provider (Learner's + Collegiate); activated by setting `DICTIONARY_SOURCE = 'merriam-webster'` in `server/services/dictionaryConfig.ts`.
- **Stripe**: Payment processing for Family account subscriptions.
- **pdfjs-dist**: Client-side PDF text extraction for word list imports.