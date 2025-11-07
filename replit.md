# Spelling Champions

## Overview

Spelling Champions is an interactive and engaging educational app designed to help children practice and improve their spelling skills. It features interactive games, multiple difficulty levels, text-to-speech pronunciation, immediate feedback, and a rewarding scoring system. The app aims to make learning fun and effective by utilizing words inspired by the Scripps "Words of the Champions" list, promoting competitive learning through leaderboards, and allowing users to create and share custom word lists. The business vision is to provide a comprehensive and enjoyable platform for children's spelling development.

## User Preferences

- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## System Architecture

### UI/UX Decisions
The application features a kid-friendly interface with large buttons, generous spacing, and a vibrant color palette (Primary: Purple, Secondary: Yellow, Accent: Green, Background: Light Blue-tinted White, Foreground: Dark Blue). It uses Nunito typography for a playful yet readable font. The design is responsive, ensuring functionality across mobile, tablet, and desktop devices. Smooth animations, powered by Framer Motion, enhance user experience. Accessibility is a priority, with high contrast, keyboard navigation, and screen reader support (WCAG AA compliant).

### Technical Implementations
The frontend is built with **React**, utilizing **Wouter** for routing, **TanStack Query** for data fetching, **Framer Motion** for animations, **Shadcn UI** for components, and **Tailwind CSS** for styling. The **Web Speech API** provides text-to-speech functionality.

The backend uses **Express.js** with **TypeScript** for type safety. **PostgreSQL** serves as the database, managed with **Drizzle ORM**. User authentication is handled by **Passport.js** with **Scrypt** for secure password hashing.

### Feature Specifications
- **User Authentication**: Secure accounts with unique usernames, hashed passwords, and avatar selection.
- **Custom Word Lists Only**: The app exclusively uses custom word lists (built-in lists removed). Users create lists with required difficulty levels (Easy, Medium, Hard), organize by grade level (K-12), and can share them publicly. Lists require 5-500 words.
- **Difficulty Levels**: Each custom word list must have an assigned difficulty (Easy, Medium, or Hard) selected via dropdown during creation. This determines point values.
- **Game Modes**: Three modes available - Standard (classic with immediate feedback), Timed Challenge (60 seconds), and Quiz Mode (answer all 10 words before seeing results).
- **Text-to-Speech**: Words are pronounced using the Web Speech API with customizable voice options. Dictionary "Definition" and "Use in Sentence" buttons speak through TTS (audio-only, no visual text display).
- **Auto-Focus Input**: Input field automatically receives focus on new word load (via HTML autoFocus attribute) and after clicking any audio button (Play Audio, Repeat, Definition, Use in Sentence) using a shared `speakWithRefocus()` helper with button blur + dual timeout strategy (TTS callback + backup). Input uses transparent styling to display word hints while remaining fully focusable.
- **Dictionary Integration**: Free Dictionary API (dictionaryapi.dev) provides definitions and example sentences. When API lacks examples, app generates age-appropriate fallback sentences using 10 kid-friendly templates. "Use in Sentence" button always enabled (real or fallback examples).
- **Word Hints**: Visual letter placeholders with underlines show word length. Typed letters appear above blanks. Input field remains transparent but focusable (text-transparent, pointer-events-auto).
- **Scoring System**: Points awarded based on the custom list's difficulty (Easy: 10, Medium: 20, Hard: 30 points per word) with streak bonuses (+5 points per consecutive correct answer).
- **Leaderboard**: Displays all players' scores, filterable by difficulty, showing usernames, avatars, and game statistics.
- **Progress Tracking**: Shows words completed, accuracy, and streak information per game session.

### System Design Choices
- **Client-Server Architecture**: A React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data (id, username, password, avatar), game sessions, leaderboard entries, and custom word lists (id, userId, name, difficulty, words, isPublic, gradeLevel, createdAt).
- **Authentication Flow**: User registration and login managed by Passport.js, with session persistence. Protected routes ensure authenticated access to game features.
- **API Endpoints**: A comprehensive set of RESTful APIs for authentication, game management, leaderboard interactions, and CRUD operations for custom word lists.

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