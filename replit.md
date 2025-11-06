# Spelling Champions

A colorful, interactive spelling practice app for kids using words from the Scripps "Words of the Champions" list.

## Overview

Spelling Champions is a fun and engaging educational app that helps children practice their spelling skills through interactive games. The app features three difficulty levels (Easy, Medium, Hard), text-to-speech pronunciation, immediate feedback, and a rewarding scoring system.

## Features

### Core Features
- **User Authentication**: Create accounts with unique usernames, passwords, and avatar selection from 12 emoji options
- **User Profiles**: Display logged-in user with avatar in header, personalized leaderboard entries
- **Three Difficulty Levels**: Easy, Medium, and Hard modes tailored to different skill levels
- **Four Game Modes**: Standard, Practice, Timed Challenge, and Quiz Mode
- **Custom Word Lists**: Create and share your own spelling word lists (NEW!)
  - Create lists with 5-100 custom words
  - Import words from .txt or .csv files (NEW!)
  - Make lists public to share with the community
  - Play games with your custom lists or lists shared by others
  - Edit and delete your own lists
  - Browse all public lists from other users
- **Text-to-Speech**: Words are pronounced using the Web Speech API with customizable voice selection
- **Interactive Gameplay**: Type the word, submit, and get instant feedback
- **Scoring System**: Earn points for correct answers (10/20/30 based on difficulty, 20 for custom lists) plus streak bonuses
- **Visual Feedback**: Animated success and error states with encouraging messages
- **Progress Tracking**: See how many words completed and current accuracy
- **Celebration Results**: Final score display with accuracy percentage and streak information
- **Competitive Leaderboard**: View all players' scores with usernames, avatars, and filterable by difficulty

### Design Highlights
- **Kid-Friendly Interface**: Large buttons, generous spacing, vibrant colors
- **Nunito Typography**: Rounded, playful font perfect for young learners
- **Responsive Design**: Works beautifully on mobile, tablet, and desktop
- **Smooth Animations**: Framer Motion for delightful transitions and celebrations
- **Accessible**: High contrast, keyboard navigation, screen reader friendly

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── home.tsx          # Landing page with mode selection
│   │   │   ├── game.tsx          # Main spelling game interface
│   │   │   ├── auth-page.tsx     # Login and registration
│   │   │   ├── leaderboard.tsx   # Competitive leaderboard
│   │   │   ├── word-lists.tsx    # Custom word lists management
│   │   │   └── not-found.tsx     # 404 page
│   │   ├── hooks/
│   │   │   └── use-auth.tsx      # Auth context and hooks
│   │   ├── lib/
│   │   │   └── protected-route.tsx # Route protection
│   │   ├── components/ui/        # Shadcn UI components
│   │   ├── App.tsx               # Main app with routing
│   │   └── index.css             # Design tokens and styles
│   └── index.html                # HTML entry point
├── server/
│   ├── routes.ts                 # API endpoints
│   ├── auth.ts                   # Authentication logic
│   ├── storage.ts                # Database with PostgreSQL
│   └── index.ts                  # Express server setup
├── shared/
│   └── schema.ts                 # Shared TypeScript types
└── design_guidelines.md          # UI/UX design specifications
```

## Technology Stack

### Frontend
- **React** - UI framework
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **Framer Motion** - Animations
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling
- **Web Speech API** - Text-to-speech

### Backend
- **Express.js** - Web server
- **TypeScript** - Type safety
- **PostgreSQL** - Database for users, sessions, and scores
- **Passport.js** - Authentication middleware
- **Scrypt** - Password hashing with random salts
- **Drizzle ORM** - Type-safe database queries

## API Endpoints

### Authentication
- `POST /api/register` - Create new user account with username, password, avatar
- `POST /api/login` - Authenticate user with passport LocalStrategy
- `POST /api/logout` - Destroy user session
- `GET /api/user` - Get currently authenticated user

### Game & Words
- `GET /api/words/:difficulty` - Fetch 10 random words for specified difficulty
- `GET /api/words` - Fetch all words
- `POST /api/sessions` - Create a new game session (linked to user)
- `GET /api/sessions/:id` - Get game session details
- `PATCH /api/sessions/:id` - Update game session

### Leaderboard
- `GET /api/leaderboard` - Get all leaderboard entries with usernames/avatars
- `POST /api/leaderboard` - Save score (linked to user and session)

### Custom Word Lists
- `POST /api/word-lists` - Create a new custom word list (requires authentication)
- `GET /api/word-lists` - Get user's custom word lists (requires authentication)
- `GET /api/word-lists/public` - Get all public custom word lists
- `GET /api/word-lists/:id` - Get specific word list (public or owned)
- `PUT /api/word-lists/:id` - Update a custom word list (requires ownership)
- `DELETE /api/word-lists/:id` - Delete a custom word list (requires ownership)

## Word Lists

The app includes curated word lists inspired by the Scripps "Words of the Champions":

- **Easy Mode**: 30 simple words perfect for beginners
- **Medium Mode**: 30 intermediate words for growing vocabularies
- **Hard Mode**: 30 challenging words for spelling champions

Words are randomly selected (10 per game) to provide variety across sessions.

## User Journey

1. **Authentication Page**: 
   - New users: Sign up with unique username, password, and choose avatar from 12 options
   - Returning users: Log in with username and password
   - Protected routes redirect unauthenticated users here
2. **Home Page**: 
   - Logged-in user displayed in header with avatar and logout button
   - User selects difficulty level (Easy, Medium, or Hard)
   - User selects game mode (Standard, Practice, Timed, Quiz)
3. **Game Page**: 
   - Word is automatically spoken using customizable text-to-speech voice
   - User can replay audio by clicking the speaker button
   - User can customize voice in settings panel
   - User types their answer in the large input field
   - Submit button checks the answer
   - Immediate feedback shows if correct or incorrect
   - For correct answers: celebration animation and points awarded
   - For incorrect answers: shows correct spelling with option to try again (except Quiz mode)
   - Progress bar shows completion status
   - Timed Challenge: 60-second countdown for entire game
   - Quiz Mode: All 10 words before showing results
4. **Results Page**: 
   - Final score displayed
   - Accuracy percentage calculated
   - Best streak highlighted
   - Score automatically saved to leaderboard with user's name
   - Options to play again, view leaderboard, or return home
5. **Leaderboard**: 
   - View all players' scores
   - Filter by difficulty level
   - See rankings with username, avatar, score, accuracy, mode
   - Navigate home or start new game

## Scoring System

- **Easy Mode**: 10 points per correct word
- **Medium Mode**: 20 points per correct word
- **Hard Mode**: 30 points per correct word
- **Streak Bonus**: +5 points for each consecutive correct answer

## Design Philosophy

The app follows these key design principles from `design_guidelines.md`:

- **Playful yet Functional**: Clear, intuitive interface with fun visual elements
- **Generous Spacing**: Large touch targets and ample whitespace for young users
- **Immediate Feedback**: Visual and textual confirmation for every action
- **Progressive Disclosure**: Information revealed as needed to avoid overwhelming
- **Accessibility First**: WCAG AA compliant with keyboard navigation support

## Color Palette

- **Primary (Purple)**: Main brand color for buttons and highlights
- **Secondary (Yellow)**: Accent color for special elements
- **Accent (Green)**: Success states and positive feedback
- **Background**: Light, airy blue-tinted white
- **Foreground**: Dark blue for excellent readability

## Development

The app uses the standard fullstack JavaScript template:

```bash
npm run dev  # Starts both frontend and backend
```

Server runs on port 5000, Vite handles hot module replacement for instant updates during development.

## Authentication & Security

### User Accounts
- **Registration**: Users create accounts with globally unique usernames
- **Login**: Passport.js LocalStrategy handles authentication
- **Avatars**: 12 emoji options for personalization (🐶🐱🐻🦊🐼🦁🐯🐸🐵🦉🦄🐲)
- **Sessions**: PostgreSQL session store for persistence across server restarts

### Security Measures
- **Password Hashing**: Scrypt with random salts (never plaintext storage)
- **Timing-Safe Comparison**: Prevents timing attacks during login
- **Session Secret**: Environment variable `SESSION_SECRET` required
- **Unique Usernames**: Database constraint enforces globally unique usernames
- **Protected Routes**: All pages except /auth require authentication

### Database Schema
- **Users**: id, username (unique), password (hashed), selectedAvatar
- **Sessions**: Managed by connect-pg-simple with PostgreSQL
- **Game Sessions**: userId links to users table
- **Leaderboard**: userId links to users table for display
- **Custom Word Lists**: id, userId (foreign key), name, description, words (array), isPublic (boolean), createdAt

## Future Enhancements

- Progress tracking dashboard per user
- More difficulty levels or custom word lists
- Multiplayer competitive mode
- Word usage examples and definitions
- Achievement badges and rewards
- Parental dashboard with progress reports
- Password reset functionality
- Email verification

## Recent Updates

- **November 6, 2025**: Enhanced custom word lists with file import
  - Added file import functionality for .txt and .csv files
  - Supports one-word-per-line .txt files and comma-separated .csv files
  - Automatic validation: minimum 5 words, maximum 100 words
  - Auto-truncates files with > 100 words to first 100 with notification
  - Clear toast notifications for success and error states
- **November 6, 2025**: Implemented custom word lists feature
  - Users can create custom spelling word lists with 5-100 words
  - Lists can be made public to share with other users
  - Full CRUD functionality (create, read, update, delete)
  - Proper authentication and authorization (users can only edit/delete their own lists)
  - Private lists are only accessible to the owner
  - Public lists appear in a dedicated "Public Lists" tab for all users to browse
  - Custom lists integrate seamlessly with the game - play any game mode with custom words
  - Custom lists award 20 points per word (same as medium difficulty)
  - Word lists management page with tabs for "My Lists" and "Public Lists"
- **November 6, 2025**: Implemented complete user authentication system
  - Added username/password authentication with passport.js
  - Password hashing with scrypt and random salts
  - User profiles with avatar selection (12 emoji options)
  - Protected routes redirecting unauthenticated users
  - Leaderboard now shows usernames and avatars instead of "Anonymous"
  - Game sessions and scores linked to user accounts
  - Login/logout functionality with session persistence
- Implemented four game modes: Standard, Practice, Timed Challenge, and Quiz Mode
- Created competitive leaderboard system with difficulty filtering and rankings
- Added PostgreSQL database with game sessions and leaderboard tracking
- Added Web Speech API integration with customizable voice selection
- Created vibrant, kid-friendly design with Nunito typography
- Built responsive layouts for all screen sizes
- Implemented scoring system with streak bonuses
- Added smooth animations and transitions

---

Built with ❤️ for young spelling champions!
