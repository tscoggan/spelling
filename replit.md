# Spelling Champions

A colorful, interactive spelling practice app for kids using words from the Scripps "Words of the Champions" list.

## Overview

Spelling Champions is a fun and engaging educational app that helps children practice their spelling skills through interactive games. The app features three difficulty levels (Easy, Medium, Hard), text-to-speech pronunciation, immediate feedback, and a rewarding scoring system.

## Features

### Core Features
- **Three Difficulty Levels**: Easy, Medium, and Hard modes tailored to different skill levels
- **Text-to-Speech**: Words are pronounced using the Web Speech API with a female voice for clear, friendly pronunciation
- **Interactive Gameplay**: Type the word, submit, and get instant feedback
- **Scoring System**: Earn points for correct answers (10/20/30 based on difficulty) plus streak bonuses
- **Visual Feedback**: Animated success and error states with encouraging messages
- **Progress Tracking**: See how many words completed and current accuracy
- **Celebration Results**: Final score display with accuracy percentage and streak information

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
│   │   │   └── not-found.tsx     # 404 page
│   │   ├── components/ui/        # Shadcn UI components
│   │   ├── App.tsx               # Main app with routing
│   │   └── index.css             # Design tokens and styles
│   └── index.html                # HTML entry point
├── server/
│   ├── routes.ts                 # API endpoints
│   ├── storage.ts                # In-memory data storage
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
- **In-memory Storage** - Fast data access for development

## API Endpoints

- `GET /api/words/:difficulty` - Fetch 10 random words for specified difficulty
- `GET /api/words` - Fetch all words
- `POST /api/sessions` - Create a new game session
- `GET /api/sessions/:id` - Get game session details
- `PATCH /api/sessions/:id` - Update game session

## Word Lists

The app includes curated word lists inspired by the Scripps "Words of the Champions":

- **Easy Mode**: 30 simple words perfect for beginners
- **Medium Mode**: 30 intermediate words for growing vocabularies
- **Hard Mode**: 30 challenging words for spelling champions

Words are randomly selected (10 per game) to provide variety across sessions.

## User Journey

1. **Home Page**: User selects difficulty level (Easy, Medium, or Hard)
2. **Game Page**: 
   - Word is automatically spoken using text-to-speech
   - User can replay audio by clicking the speaker button
   - User types their answer in the large input field
   - Submit button checks the answer
   - Immediate feedback shows if correct or incorrect
   - For correct answers: celebration animation and points awarded
   - For incorrect answers: shows correct spelling with option to try again
   - Progress bar shows completion status
3. **Results Page**: 
   - Final score displayed
   - Accuracy percentage calculated
   - Best streak highlighted
   - Options to play again or return home

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

## Future Enhancements

- User accounts and progress tracking
- More difficulty levels or custom word lists
- Timed challenges
- Multiplayer mode
- Word usage examples and definitions
- Achievement badges and rewards
- Parental dashboard with progress reports

## Recent Updates

- Implemented complete MVP with three difficulty levels
- Added Web Speech API integration with female voice selection for word pronunciation
- Created vibrant, kid-friendly design with Nunito typography
- Built responsive layouts for all screen sizes
- Implemented scoring system with streak bonuses
- Added smooth animations and transitions
- Replaced emojis with Lucide icons for consistency
- Fixed duplicate words in hard mode word list
- Added PostgreSQL database with game sessions and leaderboard tracking
- Implemented four game modes: Standard, Practice, Timed Challenge, and Quiz Mode
- Created competitive leaderboard system with difficulty filtering and rankings

---

Built with ❤️ for young spelling champions!
