# Spelling Champions

## Overview
Spelling Champions is an interactive educational app designed to improve children's spelling skills through engaging games. It features multiple difficulty levels, text-to-speech, immediate feedback, and a scoring system. The app leverages words inspired by the Scripps "Words of the Champions" list, promotes competitive learning via leaderboards, and allows users to create and share custom word lists. The core vision is to provide a comprehensive and enjoyable platform for children's spelling development, with recent enhancements focusing on user groups, an audio-only crossword puzzle mode, realistic misspelling challenges, and robust content moderation for child safety.

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.

## System Architecture

### UI/UX Decisions
The application uses a vibrant, hand-drawn crayon aesthetic inspired by Crayola.com, featuring a clean white background with large, school-themed decorative elements at 50% opacity. It uses Fredoka for titles and Nunito for body text. The color palette includes Bright Purple, Vibrant Yellow, and Fresh Green. Content is displayed on white cards with a school pattern overlay. Word illustrations are dynamically loaded. The design is responsive, accessible (WCAG AA compliant) with high contrast and keyboard navigation, and utilizes Framer Motion for smooth spring animations.

### Technical Implementations
The frontend is built with **React**, using **Wouter** for routing, **TanStack Query** for data fetching, **Framer Motion** for animations, **Shadcn UI** for components, and **Tailwind CSS** for styling. Text-to-speech functionality is provided by the **Web Speech API**.

The backend uses **Express.js** with **TypeScript**. **PostgreSQL** serves as the database, managed with **Drizzle ORM**. User authentication is handled by **Passport.js** with **Scrypt** for password hashing. Content moderation is implemented using the `bad-words` library.

### Feature Specifications
- **User Management**: Secure authentication, enhanced user profiles, and support for user groups with membership management and to-do notifications.
- **Custom Word Lists**: Users create, share, and manage custom word lists with assignable difficulty and grade levels. Lists can control image assignment and visibility (public, private, groups). Profanity filtering is applied to all user-submitted content.
- **Game Modes**:
    - **Practice**: Classic mode with immediate feedback. Uses full word lists with randomized order.
    - **Timed Challenge**: 60-second countdown. Uses full word lists with randomized order.
    - **Quiz Mode**: No hints, results after all words. Defaults to "All Words" but offers option to limit to "10 Words" for shorter quizzes. Words are randomized before optional limiting.
    - **Word Scramble**: Drag-and-drop letters. Uses full word lists with randomized order.
    - **Find the Mistake**: Identifies misspelled words from realistic, randomized errors with educational feedback. Limited to 4 words per session (mode-specific).
    - **Crossword Puzzle**: Interactive, audio-only crossword puzzles with client-side grid generation, prioritizing word connectivity. Limited to 15 words for grid generation (mode-specific).
- **Word Randomization**: All game modes use the Durstenfeld shuffle algorithm to randomize word order, ensuring every playthrough offers a fresh experience with different word sequences from the full available list.
- **Text-to-Speech**: Pronounces words, definitions, and sentences; includes dedicated button for parts of speech.
- **Dictionary Integration**: Uses Simple English Wiktionary and Free Dictionary API for age-appropriate definitions and sentences.
- **Cartoon Illustrations**: Automated enrichment of custom word lists with kid-friendly cartoon images via Pixabay API, stored permanently in Replit Object Storage.
- **Scoring System & Leaderboard**: Points based on list difficulty with streak bonuses, displayed on filterable leaderboards.
- **Progress Tracking**: Session-based tracking of words, accuracy, and streaks.

### System Design Choices
- **Client-Server Architecture**: React frontend communicates with an Express.js backend.
- **Database Schema**: PostgreSQL stores user data, game sessions, leaderboards, custom word lists (with new fields for user groups, image assignment, and visibility), word illustrations, and background job tracking.
- **Authentication Flow**: Passport.js manages user registration, login, and session persistence.
- **Object Storage Architecture**: Replit Object Storage stores all word illustration images permanently with public ACL visibility, served via a dedicated backend route.
- **API Endpoints**: RESTful APIs for authentication, game management, leaderboards, CRUD operations for word lists, user groups, to-do items, illustration job status, and image retrieval. Backend supports unlimited word fetching by treating missing or zero `limit` parameters as "no cap."
- **Background Job System**: Asynchronously processes Pixabay image enrichment for custom word lists, providing real-time UI updates.
- **React Query Caching**: Uses stable tuple-based query keys including game mode and quiz count parameters to prevent cache collisions when switching between different game modes or quiz settings.

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