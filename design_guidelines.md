# Design Guidelines: Kids' Spelling Practice App

## Design Approach

**Reference-Based Approach:** Drawing inspiration from gamified educational platforms like Duolingo, Khan Academy Kids, and Prodigy. These apps excel at making learning engaging through playful interfaces, clear feedback systems, and reward mechanisms that motivate young learners.

**Core Principles:**
- Playful yet functional - prioritize clarity in spelling input areas
- Generous spacing for young users with developing motor skills
- Large, tappable interactive elements
- Immediate visual feedback for all actions
- Progressive disclosure to avoid overwhelming users

## Typography

**Font Selection:**
- Primary: Rounded sans-serif (e.g., "Nunito", "Fredoka", "Quicksand" from Google Fonts)
- Display/Headings: Bold, playful weights (700-800)
- Body/UI: Medium weight (500-600) for readability

**Type Scale:**
- Large display text for word challenges (text-4xl to text-6xl)
- Button/Interactive labels: text-xl to text-2xl
- Body text: text-lg (kids need larger type)
- Feedback messages: text-2xl to text-3xl

## Layout System

**Spacing Primitives:** Use Tailwind units of 4, 6, 8, and 12 for consistent rhythm (p-4, m-6, gap-8, py-12)

**Container Strategy:**
- Max width: max-w-4xl for main game area (not too wide for kids to scan)
- Centered layouts with mx-auto
- Generous padding: px-6 to px-8 on mobile, px-12 on desktop
- Vertical spacing between sections: space-y-8 to space-y-12

## Component Library

### Main Game Interface
**Spelling Challenge Card:**
- Prominent card container (rounded-3xl, elevated shadow)
- Large word display area (when showing feedback)
- Audio playback button with speaker icon (extra large, min 80px)
- Text input field: Large (h-16 to h-20), rounded corners (rounded-2xl), centered text (text-center text-2xl)
- Submit button: Full-width on mobile, inline on desktop (h-14, rounded-xl)

**Score Display:**
- Fixed position header showing current points
- Star/trophy icons from Heroicons
- Animated point counter
- Progress bar showing words completed vs total

**Feedback System:**
- Full-screen overlay for correct answers (celebration style)
- Inline feedback for incorrect attempts
- "Try Again" vs "Show Answer" options
- Encouraging messages with emojis/icons

### Navigation & Structure
**Header:**
- Logo/app name (left)
- Current score display (right)
- Settings/profile icon (right)
- Minimal to keep focus on game

**Game Mode Selection:**
- Grid of cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Each mode card includes icon, title, difficulty indicator
- Clear visual hierarchy for recommended difficulty

**Footer:**
- Minimal presence during gameplay
- Progress tracker
- Pause/exit options

### Interactive Elements
**Buttons:**
- Primary actions: Large (h-12 to h-14), rounded-xl, bold text
- Icon buttons: Square (w-16 h-16 to w-20 h-20), rounded-full
- Audio playback: Extra prominent with pulsing animation hint

**Input Fields:**
- Spelling input: Extra large with letter spacing for clarity
- Auto-focus on load
- Clear button inside input (×)
- Real-time character count for longer words

**Cards:**
- Rounded corners (rounded-2xl to rounded-3xl)
- Soft shadows (shadow-lg to shadow-xl)
- Hover lift effect (transform scale-105)

### Progress & Rewards
**Achievement Display:**
- Badge collection grid
- Milestone celebrations
- Streak counter (consecutive correct answers)
- Level progression indicator

**Statistics Dashboard:**
- Large number displays for total words, accuracy percentage
- Chart showing progress over time (simple bar chart)
- Grid layout for stat cards (grid-cols-2 gap-6)

## Animations

**Strategic Animation Points:**
- Celebration confetti/stars on correct answer (brief, 1-2s)
- Subtle shake on incorrect answer
- Point counter increment animation
- Button press feedback (scale down slightly)
- Card entrance animations (stagger for game mode selection)
- Progress bar fill animation

**Performance Note:** Keep animations lightweight - CSS transforms only, no heavy libraries

## Accessibility

- All interactive elements minimum 44px touch target
- High contrast between text and backgrounds (WCAG AA minimum)
- Keyboard navigation for all game functions
- Screen reader announcements for score updates
- Focus indicators clearly visible (ring-4 ring-offset-2)
- Reduced motion respect (prefers-reduced-motion)

## Images

No hero image needed for this application-focused interface. Focus remains on interactive game elements and clear typography. Icon library (Heroicons) provides all necessary visual elements for buttons, achievements, and feedback states.