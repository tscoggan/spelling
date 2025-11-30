import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, Home, ArrowRight, CheckCircle2, XCircle, Sparkles, Flame, Clock, SkipForward, Trophy, Settings, BookOpen, MessageSquare, Globe, RotateCcw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Word, GameMode } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WordIllustration } from "@shared/schema";
import { generateCrossword, type CrosswordGrid, type CrosswordEntry } from "@/lib/crosswordGenerator";
import { useTheme } from "@/hooks/use-theme";

// Import sound effects
import incorrectSoundUrl from "@assets/Incorrect spelling_1763574108566.mp3";

// Import custom Play Word button image
import playWordImage from "@assets/Play word icon_1763580897427.png";
import playWordIconWithBorder from "@assets/Play word icon with border_1763670707710.png";

// Import bee result images
import trophyBeeImage from "@assets/Bee with trophy_1763852047681.png";
import goodTryBeeImage from "@assets/Bee with good try_1763852047680.png";

// Import achievement star
import achievementStar from "@assets/1 star_1763913172283.png";

// Import Star Shop item images
import doOverImage from "@assets/Do Over (1 Word) item_1764449029422.png";
import secondChanceImage from "@assets/2nd Chance (All Mistakes) item_1764449029422.png";

// Import dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserItem {
  id: number;
  userId: number;
  itemId: string;
  quantity: number;
}

interface ShopData {
  stars: number;
  inventory: UserItem[];
  catalog: Record<string, any>;
}

interface QuizAnswer {
  word: Word;
  userAnswer: string;
  isCorrect: boolean;
}

// Helper function for robust iOS detection (including iPads requesting desktop sites)
const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check user agent for iOS devices
  const userAgent = navigator.userAgent;
  const isIOSUserAgent = /iPhone|iPad|iPod/i.test(userAgent);
  
  // Additional check for iPads that request desktop site
  // iPadOS 13+ may report as Mac, but has touch support
  const isMacWithTouch = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
  
  // Check platform (iOS 13+)
  const isIOSPlatform = /iPhone|iPad|iPod/.test(navigator.platform);
  
  return isIOSUserAgent || isMacWithTouch || isIOSPlatform;
};

// Helper function for iPad detection specifically
const isIPadDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent;
  // Check for explicit iPad in user agent
  const isIPadUserAgent = /iPad/i.test(userAgent);
  
  // iPadOS 13+ may report as Mac, but has touch support
  const isMacWithTouch = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
  
  return isIPadUserAgent || isMacWithTouch;
};

// Helper function for general mobile detection
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Include iOS devices plus other mobile platforms
  return isIOSDevice() || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Wrapper component that validates listId or virtualWords before rendering game logic
// This prevents React Query hooks from running when neither is present
export default function Game() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const listId = params.get("listId");
  const virtualWords = params.get("virtualWords");
  const gameMode = (params.get("mode") || "practice") as GameMode;
  const quizCount = params.get("quizCount") || "all";
  
  // Key for forcing GameContent remount on restart (resets all game state cleanly)
  const [gameResetKey, setGameResetKey] = useState(0);
  
  // Handler to restart game by incrementing key (causes full remount with fresh state)
  const handleRestart = useCallback(() => {
    setGameResetKey(prev => prev + 1);
  }, []);

  // Defense-in-depth: Redirect if no listId and no virtualWords
  useEffect(() => {
    if (!listId && !virtualWords) {
      console.warn("Game component accessed without listId or virtualWords - redirecting to home");
      setLocation("/");
    }
  }, [listId, virtualWords, setLocation]);

  // Safety fallback if no listId and no virtualWords - prevents hooks from running
  if (!listId && !virtualWords) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl mb-4">Please select a word list to play</p>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Only render game content when listId or virtualWords is confirmed
  // Pass all parameters as props to avoid GameContent parsing them
  // Key prop forces complete remount when gameResetKey changes (clean restart)
  return <GameContent key={gameResetKey} listId={listId || undefined} virtualWords={virtualWords || undefined} gameMode={gameMode} quizCount={quizCount} onRestart={handleRestart} />;
}

// Actual game component with all the hooks - only rendered when listId or virtualWords exists
// Receives all parameters as props to ensure hooks always have valid data
function GameContent({ listId, virtualWords, gameMode, quizCount, onRestart }: { listId?: string; virtualWords?: string; gameMode: GameMode; quizCount: string; onRestart: () => void }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets } = useTheme();
  
  const [userInput, setUserInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [incorrectWords, setIncorrectWords] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [achievementEarned, setAchievementEarned] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWordHints, setShowWordHints] = useState(() => {
    const saved = localStorage.getItem('showWordHints');
    return saved !== null ? saved === 'true' : true;
  });
  const [wordDefinition, setWordDefinition] = useState<string | null>(null);
  const [wordExample, setWordExample] = useState<string | null>(null);
  const [wordPartsOfSpeech, setWordPartsOfSpeech] = useState<string | null>(null);
  const [wordOrigin, setWordOrigin] = useState<string | null>(null);
  const [loadingDictionary, setLoadingDictionary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentWordRef = useRef<string | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const gameCardRef = useRef<HTMLDivElement>(null);
  const wordImageRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Callback ref for iOS keyboard - transfers focus from hidden trigger input
  // The hidden input in App.tsx was focused BEFORE navigation to maintain gesture context
  // Now we transfer focus to the real input element
  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    // Update the ref for other code to use
    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    
    if (node && isIOSDevice()) {
      // Transfer focus from hidden input to real input
      // The gesture context was maintained through the hidden input
      // Use requestAnimationFrame to ensure DOM is fully ready
      requestAnimationFrame(() => {
        node.focus();
        node.click(); // Trigger click to ensure keyboard opens
      });
    }
  }, []);
  
  // Track viewport size for responsive scaling
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [inputContainerWidth, setInputContainerWidth] = useState(600); // Default fallback
  
  // Scramble mode states
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedLetters, setPlacedLetters] = useState<({letter: string; sourceIndex: number} | null)[]>([]);
  const [draggedLetter, setDraggedLetter] = useState<{letter: string; sourceIndex: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false); // Track if drag operation is in progress
  
  // Touch event states for mobile
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState<{x: number; y: number} | null>(null);
  const [draggedLetterElement, setDraggedLetterElement] = useState<string | null>(null);
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Container ref for measuring width in scramble mode (for drag/drop positioning)
  const scrambleContainerRef = useRef<HTMLDivElement>(null);
  
  // Mistake mode states
  const [mistakeChoices, setMistakeChoices] = useState<string[]>([]);
  const [misspelledIndex, setMisspelledIndex] = useState<number>(-1);
  const [correctSpelling, setCorrectSpelling] = useState<string>("");
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number>(-1);
  
  // Crossword mode states
  const [loadingCrossword, setLoadingCrossword] = useState(false);
  const [crosswordGrid, setCrosswordGrid] = useState<CrosswordGrid | null>(null);
  const [crosswordInputs, setCrosswordInputs] = useState<{[key: string]: string}>({});
  const [activeEntry, setActiveEntry] = useState<number | null>(null);
  const [crosswordClues, setCrosswordClues] = useState<{word: string; clue: string}[]>([]);
  const [highlightedMistakes, setHighlightedMistakes] = useState<Set<string>>(new Set());
  const [completedGrid, setCompletedGrid] = useState<{inputs: {[key: string]: string}, grid: CrosswordGrid} | null>(null);
  const [finalAccuracy, setFinalAccuracy] = useState<number>(0);
  
  // Do Over and 2nd Chance states
  const [showDoOverDialog, setShowDoOverDialog] = useState(false);
  const [doOverPendingResult, setDoOverPendingResult] = useState<{
    userAnswer: string;
    correctWord: string;
    wordIndex: number;
  } | null>(null);
  const [secondChanceMode, setSecondChanceMode] = useState(false);
  const [secondChanceWords, setSecondChanceWords] = useState<Word[]>([]);
  const [secondChanceIndex, setSecondChanceIndex] = useState(0);
  const [secondChanceAnswers, setSecondChanceAnswers] = useState<QuizAnswer[]>([]);
  // Store original game metrics before 2nd Chance to merge results
  const [originalGameMetrics, setOriginalGameMetrics] = useState<{
    totalWords: number;
    correctCount: number;
    incorrectWords: string[];
  } | null>(null);
  
  // Cache for mistake mode questions to preserve misspellings for Do Over and 2nd Chance
  const mistakeQuestionCacheRef = useRef<Map<string, {
    choices: string[];
    misspelledIndex: number;
    correctSpelling: string;
  }>>(new Map());
  
  // Ref for crossword overflow container to center grid
  const crosswordScrollRef = useRef<HTMLDivElement>(null);
  
  // Mobile keyboard management
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Generate a unique session timestamp for each game to ensure fresh word shuffling
  const [sessionTimestamp] = useState(() => Date.now());

  // Create a single shared AudioContext for all sound effects
  const audioContextRef = useRef<AudioContext | null>(null);
  const incorrectSoundBufferRef = useRef<AudioBuffer | null>(null);
  
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Load and cache the incorrect sound MP3
  const loadIncorrectSound = async () => {
    if (incorrectSoundBufferRef.current) return;
    
    try {
      const audioContext = getAudioContext();
      const response = await fetch(incorrectSoundUrl);
      const arrayBuffer = await response.arrayBuffer();
      incorrectSoundBufferRef.current = await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading incorrect sound:', error);
    }
  };

  // Load sound on mount
  useEffect(() => {
    loadIncorrectSound();
  }, []);

  // Sound effect functions using Web Audio API
  const playCorrectSound = () => {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  };

  const playIncorrectSound = () => {
    if (!incorrectSoundBufferRef.current) {
      // Fallback to loading if not yet loaded
      loadIncorrectSound().then(() => {
        if (incorrectSoundBufferRef.current) {
          playIncorrectSound();
        }
      });
      return;
    }
    
    const audioContext = getAudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = incorrectSoundBufferRef.current;
    source.connect(audioContext.destination);
    source.start(0);
  };

  const playCelebrationSound = () => {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.50]; // C, D, E, G, C
    notes.forEach((freq, i) => {
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + (i * 0.15));
    });
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.9);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.9);
  };

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { gameMode: string; userId: number | null; wordListId?: number }) => {
      const response = await apiRequest("POST", "/api/sessions", sessionData);
      return await response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (sessionData: { sessionId: number; score: number; totalWords: number; correctWords: number; bestStreak: number; incorrectWords: string[]; isComplete: boolean; completedAt: Date; starsEarned?: number }) => {
      const response = await apiRequest("PATCH", `/api/sessions/${sessionData.sessionId}`, {
        score: sessionData.score,
        totalWords: sessionData.totalWords,
        correctWords: sessionData.correctWords,
        bestStreak: sessionData.bestStreak,
        incorrectWords: sessionData.incorrectWords,
        isComplete: sessionData.isComplete,
        completedAt: sessionData.completedAt,
        ...(sessionData.starsEarned !== undefined && { starsEarned: sessionData.starsEarned }),
      });
      return await response.json();
    },
  });

  const incrementWordStreakMutation = useMutation({
    mutationFn: async () => {
      // Skip streak tracking for virtual word lists
      if (virtualWords) return null;
      
      const response = await apiRequest("POST", "/api/streaks/increment");
      return await response.json();
    },
  });

  const resetWordStreakMutation = useMutation({
    mutationFn: async () => {
      // Skip streak tracking for virtual word lists
      if (virtualWords) return null;
      
      const response = await apiRequest("POST", "/api/streaks/reset");
      return await response.json();
    },
  });

  // Fetch user's Star Shop items (Do Over, 2nd Chance)
  const { data: shopData, refetch: refetchShopData } = useQuery<ShopData>({
    queryKey: ["/api/user-items"],
    enabled: !!user,
  });

  // Helper to get item quantity from inventory
  const getItemQuantity = (itemId: string): number => {
    if (!shopData?.inventory) return 0;
    const item = shopData.inventory.find(i => i.itemId === itemId);
    return item?.quantity || 0;
  };

  // Mutation for using Star Shop items
  const useItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity = 1 }: { itemId: string; quantity?: number }) => {
      const response = await apiRequest("POST", "/api/user-items/use", { itemId, quantity });
      return await response.json();
    },
    onSuccess: () => {
      // Refetch user items to update quantity display
      refetchShopData();
      queryClient.invalidateQueries({ queryKey: ["/api/user-items"] });
    },
  });

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: { score: number; accuracy: number; gameMode: GameMode; userId: number | null; sessionId: number }) => {
      const response = await apiRequest("POST", "/api/leaderboard", scoreData);
      return await response.json();
    },
    onSuccess: async (data, variables) => {
      // Skip achievement tracking for virtual word lists
      if (virtualWords) return;
      
      // Track achievements for Word List Mastery
      if (variables.userId && listId && variables.gameMode !== "practice") {
        await checkAndAwardAchievement(variables);
      }
    },
  });

  const checkAndAwardAchievement = async (scoreData: { score: number; accuracy: number; gameMode: GameMode; userId: number | null; sessionId: number }) => {
    // Reset achievement earned state at start of check
    setAchievementEarned(false);
    
    // Skip achievement tracking for virtual word lists
    if (virtualWords) return;
    
    if (!scoreData.userId || !listId) return;

    let earnedStar = false;

    // Determine if star should be awarded based on game mode and performance
    if (scoreData.gameMode === "timed") {
      // Timed: Need 10+ words correct (or all words for lists <10) with 100% accuracy on attempted words
      const totalWords = activeWords?.length || 0;
      const minRequired = Math.min(10, totalWords);
      earnedStar = correctCount >= minRequired && scoreData.accuracy === 100;
      console.log("🏆 Timed mode achievement check:", { correctCount, minRequired, accuracy: scoreData.accuracy, earnedStar });
    } else if (["quiz", "scramble", "mistake", "crossword"].includes(scoreData.gameMode)) {
      // Other modes: Need 100% accuracy
      earnedStar = scoreData.accuracy === 100;
      console.log("🏆 Achievement check:", { gameMode: scoreData.gameMode, accuracy: scoreData.accuracy, earnedStar });
    }

    if (earnedStar) {
      try {
        console.log("🌟 Fetching current achievements for user:", scoreData.userId);
        // Fetch current achievements for this word list
        const achievementsResponse = await fetch(`/api/achievements/user/${scoreData.userId}`);
        const allAchievements = await achievementsResponse.json();
        console.log("📋 Current achievements:", allAchievements);
        
        // Find existing Word List Mastery achievement for this word list
        const existingAchievement = allAchievements.find(
          (a: any) => a.wordListId === Number(listId) && a.achievementType === "Word List Mastery"
        );
        console.log("🔍 Existing achievement for this list:", existingAchievement);

        // Track which modes have been completed with 100% for this word list
        const completedModes = new Set<string>(existingAchievement?.completedModes || []);
        console.log("✅ Completed modes before:", Array.from(completedModes));
        
        // Only award star if this mode hasn't been completed before
        if (!completedModes.has(scoreData.gameMode)) {
          completedModes.add(scoreData.gameMode);
          const totalStars = Math.min(completedModes.size, 3); // Cap at 3 stars
          console.log("⭐ Awarding new star! Total stars:", totalStars, "Completed modes:", Array.from(completedModes));
          
          // Update or create achievement
          const achievementResult = await apiRequest("POST", "/api/achievements", {
            userId: scoreData.userId,
            wordListId: parseInt(listId, 10), // Convert listId to number
            achievementType: "Word List Mastery",
            achievementValue: `${totalStars} ${totalStars === 1 ? "Star" : "Stars"}`,
            completedModes: Array.from(completedModes),
          });
          console.log("💾 Achievement saved:", await achievementResult.json());
          
          // Invalidate achievements cache to refresh UI
          queryClient.invalidateQueries({ queryKey: ["/api/achievements/user", scoreData.userId] });
          
          // Update the game session to record that a star was earned
          await apiRequest("PATCH", `/api/sessions/${scoreData.sessionId}`, {
            starsEarned: 1,
          });
          console.log("⭐ Updated session with starsEarned=1");
          
          // Set achievement earned flag to show notification on results screen
          // Only set to true if this is a NEW achievement
          setAchievementEarned(true);
        } else {
          console.log("ℹ️ Achievement already earned for this mode");
        }
      } catch (error) {
        console.error("❌ Error saving achievement:", error);
      }
    } else {
      console.log("❌ Did not earn achievement");
    }
  };

  // Seeded random number generator using current timestamp
  const createSeededRandom = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };

  // Durstenfeld shuffle algorithm for randomizing word order with timestamp seed
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    const random = createSeededRandom(Date.now());
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: ['/api/word-lists', listId, virtualWords, gameMode, quizCount, sessionTimestamp],
    queryFn: async () => {
      // Handle virtual word lists (from Most Misspelled Words)
      if (virtualWords) {
        const wordList = virtualWords.split(',');
        let wordsArray = wordList.map((word: string, index: number) => ({
          id: index + 1,
          word: word.trim(),
        }));
        
        // Randomize word order
        wordsArray = shuffleArray(wordsArray);
        
        // For quiz mode, limit to 10 words if quizCount is "10"
        if (gameMode === "quiz" && quizCount === "10") {
          wordsArray = wordsArray.slice(0, 10);
        }
        
        return wordsArray;
      }
      
      // Safety check: This should never execute without listId due to enabled guard,
      // but we handle it gracefully just in case
      if (!listId) {
        console.warn('Query executed without listId - returning empty array');
        return [];
      }
      
      const response = await fetch(`/api/word-lists/${listId}`);
      if (!response.ok) throw new Error('Failed to fetch custom word list');
      const listData = await response.json();
      let wordsArray = listData.words.map((word: string, index: number) => ({
        id: index + 1,
        word,
      }));
      
      // Randomize word order
      wordsArray = shuffleArray(wordsArray);
      
      // For quiz mode, limit to 10 words if quizCount is "10"
      if (gameMode === "quiz" && quizCount === "10") {
        wordsArray = wordsArray.slice(0, 10);
      }
      
      return wordsArray;
    },
    enabled: !!listId || !!virtualWords,
  });

  // Use the custom list ID for illustrations
  const effectiveWordListId = listId ? parseInt(listId) : undefined;

  const { data: wordIllustrations } = useQuery<WordIllustration[]>({
    queryKey: ['/api/word-lists', effectiveWordListId, 'illustrations'],
    queryFn: async () => {
      const response = await fetch(`/api/word-lists/${effectiveWordListId}/illustrations`);
      if (!response.ok) {
        console.warn('Failed to fetch word illustrations, using empty array');
        return [];
      }
      return response.json();
    },
    // Only enable query when we have a valid word list ID
    enabled: !!effectiveWordListId,
    // Provide a default value to prevent errors during initial load
    placeholderData: [],
  });

  useEffect(() => {
    // Skip session creation for virtual word lists (no stats tracking)
    if (virtualWords) {
      return;
    }
    
    if (listId && gameMode && !sessionId && user) {
      createSessionMutation.mutate({ 
        gameMode, 
        userId: user.id,
        wordListId: listId ? parseInt(listId, 10) : undefined
      });
    }
  }, [gameMode, sessionId, user, listId, virtualWords]);

  // Handler to save partial progress before restarting
  const handleRestartWithSave = useCallback(async () => {
    // Only save if we have a session and user is logged in
    if (sessionId && user) {
      try {
        // Calculate words attempted:
        // - currentWordIndex is 0-based, representing how many words we've moved past
        // - If showFeedback is true, we've also attempted the current word
        const wordsAttempted = showFeedback ? currentWordIndex + 1 : currentWordIndex;
        
        // Only save if at least one word was attempted or there are incorrect words
        if (wordsAttempted > 0 || incorrectWords.length > 0 || correctCount > 0) {
          // Ensure totalWords reflects actual activity (correctWords + incorrectWords count)
          // This handles edge cases where the counting differs
          const actualWordsAttempted = Math.max(wordsAttempted, correctCount + incorrectWords.length);
          
          await apiRequest("PATCH", `/api/sessions/${sessionId}`, {
            totalWords: actualWordsAttempted,
            correctWords: correctCount,
            bestStreak: bestStreak,
            incorrectWords: incorrectWords,
            isComplete: false, // Mark as incomplete since it was restarted
            // Don't set completedAt for partial sessions - createdAt will be used for ordering
          });
          console.log(`💾 Saved partial progress on restart: ${actualWordsAttempted} words attempted, ${correctCount} correct`);
        }
      } catch (error) {
        console.error("Failed to save partial progress:", error);
        // Continue with restart even if save fails
      }
    }
    
    // Trigger the restart (remount)
    onRestart();
  }, [sessionId, currentWordIndex, correctCount, bestStreak, incorrectWords, showFeedback, user, onRestart]);

  // Handler to save partial progress before going home
  const handleHomeWithSave = useCallback(async () => {
    // Only save if we have a session and user is logged in
    if (sessionId && user) {
      try {
        // Calculate words attempted:
        // - currentWordIndex is 0-based, representing how many words we've moved past
        // - If showFeedback is true, we've also attempted the current word
        const wordsAttempted = showFeedback ? currentWordIndex + 1 : currentWordIndex;
        
        // Only save if at least one word was attempted or there are incorrect words
        if (wordsAttempted > 0 || incorrectWords.length > 0 || correctCount > 0) {
          // Ensure totalWords reflects actual activity (correctWords + incorrectWords count)
          const actualWordsAttempted = Math.max(wordsAttempted, correctCount + incorrectWords.length);
          
          await apiRequest("PATCH", `/api/sessions/${sessionId}`, {
            totalWords: actualWordsAttempted,
            correctWords: correctCount,
            bestStreak: bestStreak,
            incorrectWords: incorrectWords,
            isComplete: false, // Mark as incomplete since it was aborted
          });
          console.log(`💾 Saved partial progress on home: ${actualWordsAttempted} words attempted, ${correctCount} correct`);
        }
      } catch (error) {
        console.error("Failed to save partial progress:", error);
        // Continue with navigation even if save fails
      }
    }
    
    // Navigate to home
    setLocation("/");
  }, [sessionId, currentWordIndex, correctCount, bestStreak, incorrectWords, showFeedback, user, setLocation]);

  // Load available voices
  useEffect(() => {
    // Feature detection - check if speechSynthesis is available
    if (!('speechSynthesis' in window)) {
      setAvailableVoices([]);
      return;
    }

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        
        // Filter to English voices only (both male and female)
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        
        setAvailableVoices(englishVoices);
        
        // Load voice preference from user profile first, then localStorage as fallback
        const userPreference = user?.preferredVoice;
        const localStoragePreference = localStorage.getItem('preferredVoice');
        const savedVoice = userPreference || localStoragePreference;
        
        if (savedVoice && englishVoices.find(v => v.name === savedVoice)) {
          setSelectedVoice(savedVoice);
        } else if (englishVoices.length > 0) {
          // On iOS devices, default to Samantha if available
          if (isIOSDevice()) {
            const samanthaVoice = englishVoices.find(v => 
              v.name.toLowerCase().includes('samantha')
            );
            if (samanthaVoice) {
              setSelectedVoice(samanthaVoice.name);
              return;
            }
          }
          // Fallback to first available voice
          setSelectedVoice(englishVoices[0].name);
        }
      } catch (error) {
        console.error('Error loading voices:', error);
        setAvailableVoices([]);
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [user]);

  // Mutation to update voice preference in user profile
  const updateVoicePreferenceMutation = useMutation({
    mutationFn: async (voiceName: string) => {
      return await apiRequest("PATCH", "/api/user", { preferredVoice: voiceName });
    },
    onSuccess: () => {
      // Invalidate user query to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      console.error("Failed to save voice preference:", error);
      // Silently fail - localStorage fallback will be used on next load
    }
  });

  // Save voice preference to user profile and localStorage
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    // Save to localStorage as immediate fallback
    localStorage.setItem('preferredVoice', voiceName);
    // Save to user profile via API
    if (user) {
      updateVoicePreferenceMutation.mutate(voiceName);
    }
  };

  // Save showWordHints preference to localStorage
  useEffect(() => {
    localStorage.setItem('showWordHints', String(showWordHints));
  }, [showWordHints]);

  // Use secondChanceWords when in second chance mode, otherwise use regular words
  const activeWords = secondChanceMode ? secondChanceWords : words;
  const currentWord = activeWords?.[currentWordIndex];

  const speakWord = (word: string, onComplete?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      if (onComplete) {
        utterance.onend = onComplete;
      }
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Use selected voice if available
        let voiceToUse = null;
        if (selectedVoice) {
          voiceToUse = voices.find(v => v.name === selectedVoice);
        }
        
        // Fallback to priority list if no selected voice
        if (!voiceToUse) {
          const femaleVoiceNames = [
            'google uk english female',
            'microsoft libby',
            'samantha',
            'karen',
            'serena',
            'fiona',
            'tessa',
            'victoria',
            'susan',
            'zira',
            'female'
          ];
          
          for (const voiceName of femaleVoiceNames) {
            voiceToUse = voices.find(voice => 
              voice.name.toLowerCase().includes(voiceName) &&
              voice.lang.startsWith('en')
            );
            if (voiceToUse) break;
          }
        }
        
        if (voiceToUse) {
          utterance.voice = voiceToUse;
        }
        
        window.speechSynthesis.speak(utterance);
      };
      
      // Voices may load asynchronously
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoiceAndSpeak();
      } else {
        // Wait for voices to load
        window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
        // Fallback timeout in case voiceschanged doesn't fire
        setTimeout(setVoiceAndSpeak, 100);
      }
    } else if (onComplete) {
      // If speech synthesis is not available, still call the callback
      onComplete();
    }
  };

  const fetchWordData = async (word: string) => {
    if (!word) return;
    
    const fetchWord = word.toLowerCase();
    setLoadingDictionary(true);
    setWordDefinition(null);
    setWordExample(null);
    setWordPartsOfSpeech(null);
    
    // Set word origin from currentWord if available
    if (currentWord?.wordOrigin) {
      setWordOrigin(currentWord.wordOrigin);
    } else {
      setWordOrigin(null);
    }
    
    // Set part of speech from currentWord if available
    if (currentWord?.partOfSpeech) {
      setWordPartsOfSpeech(currentWord.partOfSpeech);
    }
    
    try {
      // First, check if we have this word in the database
      console.log(`🔍 Checking database for "${fetchWord}"...`);
      try {
        const dbResponse = await fetch(`/api/words/by-text/${encodeURIComponent(fetchWord)}`);
        if (dbResponse.ok) {
          const dbWord = await dbResponse.json();
          console.log(`✅ Found word in database with metadata:`, {
            hasDefinition: !!dbWord.definition,
            hasExample: !!dbWord.sentenceExample,
            hasOrigin: !!dbWord.wordOrigin
          });
          
          // Check if we're still on the same word before updating state
          if (currentWordRef.current?.toLowerCase() !== fetchWord) {
            return;
          }
          
          // Use database data if available
          let hasCompleteData = false;
          if (dbWord.definition) {
            setWordDefinition(dbWord.definition);
            console.log(`✅ Using definition from database`);
            hasCompleteData = true;
          }
          if (dbWord.sentenceExample) {
            setWordExample(dbWord.sentenceExample);
            console.log(`✅ Using example from database`);
          } else if (hasCompleteData) {
            // Generate fallback example if we have definition but no example
            const fallbackExample = generateFallbackExample(fetchWord);
            setWordExample(fallbackExample);
            console.log(`✨ Generated fallback example: "${fallbackExample}"`);
          }
          if (dbWord.wordOrigin) {
            setWordOrigin(dbWord.wordOrigin);
            console.log(`✅ Using origin from database`);
          }
          if (dbWord.partOfSpeech) {
            setWordPartsOfSpeech(dbWord.partOfSpeech);
            console.log(`✅ Using partOfSpeech from database`);
          }
          
          // Check if we have all critical metadata (definition AND partOfSpeech)
          // Check both dbWord and currentWord for partOfSpeech
          const hasPartOfSpeech = dbWord.partOfSpeech || currentWord?.partOfSpeech;
          
          // If we have definition and partOfSpeech from DB, we're done
          if (hasCompleteData && hasPartOfSpeech) {
            setLoadingDictionary(false);
            console.log(`✅ Using complete data from database, skipping dictionary APIs`);
            return;
          }
          
          // If we have definition but missing partOfSpeech, continue to API fallback
          if (hasCompleteData && !hasPartOfSpeech) {
            console.log(`⚠️ Definition found but partOfSpeech missing, fetching from dictionary APIs`);
          }
        } else if (dbResponse.status !== 404) {
          console.log(`⚠️ Database error (${dbResponse.status}), falling back to dictionary APIs`);
        }
      } catch (dbError) {
        console.log(`⚠️ Database lookup failed for "${fetchWord}", falling back to dictionary APIs:`, dbError);
      }
      
      // If we don't have complete data from database, try Simple English Wiktionary using MediaWiki API
      console.log(`🔍 Trying Simple English Wiktionary for "${fetchWord}"...`);
      const wiktionaryResponse = await fetch(
        `https://simple.wiktionary.org/w/api.php?action=query&titles=${fetchWord}&prop=extracts&explaintext=1&format=json&origin=*`
      );
      
      if (wiktionaryResponse.ok) {
        const wiktionaryData = await wiktionaryResponse.json();
        
        // Check if we're still on the same word
        if (currentWordRef.current?.toLowerCase() !== fetchWord) {
          return;
        }
        
        // Parse Simple English Wiktionary MediaWiki format
        const pages = wiktionaryData?.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const pageData = pages[pageId];
          
          if (pageData && pageData.extract && !pageData.missing) {
            const extract = pageData.extract;
            
            // Parse the extract text to find definitions and examples
            // Format: "== Noun ==\n\n(countable) An apple is a sweet fruit.\nI gave my teacher an apple."
            const lines = extract.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
            
            let foundDefinition = false;
            let foundExample = false;
            const partsOfSpeechFound = new Set<string>();
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Extract parts of speech from headers like "== Noun ==" or "== Verb =="
              if (line.startsWith('==') && line.endsWith('==')) {
                const partOfSpeech = line.replace(/=/g, '').trim().toLowerCase();
                const validParts = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'];
                if (validParts.includes(partOfSpeech)) {
                  partsOfSpeechFound.add(partOfSpeech);
                }
              }
              
              // Skip headers and pronunciation sections
              if (line.startsWith('==') || line.startsWith('Pronunciation') || 
                  line.startsWith('enPR:') || line.startsWith('IPA') || line.startsWith('SAMPA')) {
                continue;
              }
              
              // Look for definition lines (multiple patterns)
              if (!foundDefinition) {
                // Remove grammatical markers like "(countable)", "(uncountable)", "(transitive)", "(vehicle)" etc.
                // Remove all parenthetical content at the start of the line
                let cleanLine = line.replace(/^\(.*?\)\s*/g, '').trim();
                
                const isDefinition = (
                  // Pattern 1: "An apple is..." or "A throw is..."
                  (cleanLine.includes(' is ') && !cleanLine.startsWith('I ') && !cleanLine.startsWith('The ')) ||
                  // Pattern 2: "When you throw..." (verb definitions)
                  cleanLine.startsWith('When you ') ||
                  // Pattern 3: "If you throw..." (verb definitions)
                  cleanLine.startsWith('If you ') ||
                  // Pattern 4: "To throw..." (infinitive verb definitions)
                  cleanLine.startsWith('To ' + fetchWord)
                );
                
                if (isDefinition && cleanLine.length > 10 && cleanLine.length < 200) {
                  // Remove any remaining parenthetical content from the entire line
                  const finalDefinition = cleanLine.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
                  setWordDefinition(finalDefinition);
                  foundDefinition = true;
                  console.log(`✅ Found definition in Simple English Wiktionary for "${fetchWord}": ${finalDefinition}`);
                  continue;
                }
              }
              
              // Look for example sentences (must contain the word and be a complete sentence)
              if (!foundExample && line.match(/^[A-Z].*\.$/) && line.length > 10 && line.length < 150) {
                // Must contain the target word and not be a definition-like line
                if (line.toLowerCase().includes(fetchWord) && 
                    !line.startsWith('Related') && 
                    !line.startsWith('When you') &&
                    !line.startsWith('If you') &&
                    !line.startsWith('To ')) {
                  setWordExample(line);
                  foundExample = true;
                  console.log(`✅ Found example in Simple English Wiktionary for "${fetchWord}": ${line}`);
                  
                  // If we also found a definition, we're done
                  if (foundDefinition) {
                    break;
                  }
                }
              }
            }
            
            // If we found a definition, return early (even if no example found)
            if (foundDefinition) {
              if (!foundExample) {
                console.log(`⚠️ No example in Simple English Wiktionary for "${fetchWord}" - generating fallback`);
                const fallbackExample = generateFallbackExample(fetchWord);
                setWordExample(fallbackExample);
                console.log(`✨ Generated fallback example: "${fallbackExample}"`);
              }
              if (partsOfSpeechFound.size > 0) {
                const partsArray = Array.from(partsOfSpeechFound);
                const partsString = partsArray.join(' or ');
                setWordPartsOfSpeech(partsString);
                console.log(`✅ Found parts of speech in Simple English Wiktionary for "${fetchWord}": ${partsArray.join(', ')}`);
                // Save to database
                savePartsOfSpeech(fetchWord, partsString);
              }
              return;
            }
          }
        }
      }
      
      // If Simple English Wiktionary failed, fall back to regular dictionary API
      console.log(`⚠️ Simple English Wiktionary not available for "${fetchWord}" - trying standard dictionary...`);
      
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${fetchWord}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if we're still on the same word before updating state
        if (currentWordRef.current?.toLowerCase() !== fetchWord) {
          return;
        }
        
        if (data && data.length > 0) {
          const entry = data[0];
          
          // Extract all parts of speech
          const partsOfSpeech = new Set<string>();
          if (entry.meanings && Array.isArray(entry.meanings)) {
            entry.meanings.forEach((meaning: any) => {
              if (meaning.partOfSpeech) {
                partsOfSpeech.add(meaning.partOfSpeech.toLowerCase());
              }
            });
          }
          if (partsOfSpeech.size > 0) {
            const partsArray = Array.from(partsOfSpeech);
            const partsString = partsArray.join(' or ');
            setWordPartsOfSpeech(partsString);
            console.log(`✅ Found parts of speech in standard dictionary for "${fetchWord}": ${partsArray.join(', ')}`);
            // Save to database
            savePartsOfSpeech(fetchWord, partsString);
          }
          
          // Extract word origin if available
          if (entry.origin) {
            setWordOrigin(entry.origin);
            console.log(`✅ Found word origin in standard dictionary for "${fetchWord}"`);
          }
          
          // Collect ALL definitions grouped by part of speech
          const allDefinitions: string[] = [];
          const definitionSet = new Set<string>();
          
          if (entry.meanings && Array.isArray(entry.meanings)) {
            entry.meanings.forEach((meaning: any) => {
              const partOfSpeech = meaning.partOfSpeech || '';
              if (meaning.definitions && Array.isArray(meaning.definitions)) {
                meaning.definitions.forEach((def: any, index: number) => {
                  if (def.definition && !definitionSet.has(def.definition)) {
                    definitionSet.add(def.definition);
                    // Format: "noun: definition" or just "definition" if no part of speech
                    const prefix = partOfSpeech && index === 0 ? `${partOfSpeech}: ` : '';
                    allDefinitions.push(prefix + def.definition);
                  }
                });
              }
            });
          }
          
          if (allDefinitions.length > 0) {
            // Join multiple definitions with bullet points
            const formattedDefinitions = allDefinitions.length === 1 
              ? allDefinitions[0]
              : allDefinitions.map((def, i) => `${i + 1}. ${def}`).join('\n');
            setWordDefinition(formattedDefinitions);
            console.log(`✅ Found ${allDefinitions.length} definition(s) in standard dictionary for "${fetchWord}"`);
          }
          
          // Get example sentence from any definition
          let foundExample = false;
          for (const meaning of entry.meanings || []) {
            if (foundExample) break;
            for (const def of meaning.definitions || []) {
              if (def.example) {
                setWordExample(def.example);
                foundExample = true;
                console.log(`✅ Found example in dictionary for "${fetchWord}":`, def.example);
                break;
              }
            }
          }
          
          // Generate fallback if no example found
          if (!foundExample) {
            console.log(`❌ No example found for "${fetchWord}" (checked ${entry.meanings?.length || 0} meanings) - generating fallback`);
            const fallbackExample = generateFallbackExample(fetchWord);
            setWordExample(fallbackExample);
            console.log(`✨ Generated fallback example: "${fallbackExample}"`);
          }
        }
      } else {
        // Both APIs returned non-OK response
        console.log(`⚠️ Both dictionary APIs returned errors for "${fetchWord}" - generating fallback`);
        if (currentWordRef.current?.toLowerCase() === fetchWord) {
          const fallbackExample = generateFallbackExample(fetchWord);
          setWordExample(fallbackExample);
          console.log(`✨ Generated fallback example (API ${response.status}): "${fallbackExample}"`);
        }
      }
    } catch (error) {
      console.error('Error fetching dictionary data:', error);
      // Generate fallback example if API fails
      if (currentWordRef.current?.toLowerCase() === fetchWord) {
        const fallbackExample = generateFallbackExample(fetchWord);
        setWordExample(fallbackExample);
        console.log(`✨ Generated fallback example (API error): "${fallbackExample}"`);
      }
    } finally {
      // Only clear loading if we're still on the same word
      if (currentWordRef.current?.toLowerCase() === fetchWord) {
        setLoadingDictionary(false);
      }
    }
  };

  const generateFallbackExample = (word: string): string => {
    const templates = [
      `I saw a ${word} today.`,
      `The ${word} was very interesting.`,
      `Can you find the ${word}?`,
      `Look at that ${word}!`,
      `My friend has a ${word}.`,
      `We learned about ${word} in school.`,
      `The ${word} is important.`,
      `I like to use ${word}.`,
      `Let me tell you about ${word}.`,
      `Everyone needs ${word}.`,
    ];
    
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  };

  // Helper to keep input focused on mobile when clicking buttons
  const handleKeepInputFocused = (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  };

  const speakWithRefocus = (text: string, buttonElement?: HTMLElement) => {
    if (!text) return;
    const isIOS = isIOSDevice();
    
    // Blur the button immediately to allow focus elsewhere
    if (buttonElement) {
      buttonElement.blur();
    }
    
    // For iOS, focus immediately and synchronously to maintain gesture context
    if (isIOS && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.click();
    }
    
    speakWord(text, () => {
      // Focus after TTS completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (isIOS) {
            inputRef.current.click();
          }
        }
      }, 150);
    });
    
    // Also focus immediately as backup (in case TTS callback fails)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (isIOS) {
          inputRef.current.click();
        }
      }
    }, 200);
  };

  const speakDefinition = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordDefinition && currentWord) {
      speakWithRefocus(wordDefinition, e?.currentTarget);
      centerGameCard();
    }
  };

  const speakExample = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordExample && currentWord) {
      speakWithRefocus(wordExample, e?.currentTarget);
      centerGameCard();
    }
  };

  const speakPartsOfSpeech = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordPartsOfSpeech && currentWord) {
      speakWithRefocus(wordPartsOfSpeech, e?.currentTarget);
      centerGameCard();
    }
  };

  const speakOrigin = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordOrigin && currentWord) {
      speakWithRefocus(wordOrigin, e?.currentTarget);
      centerGameCard();
    }
  };

  const savePartsOfSpeech = async (word: string, partsOfSpeech: string) => {
    try {
      await apiRequest("PATCH", `/api/word-illustrations/${encodeURIComponent(word.toLowerCase())}/parts-of-speech`, {
        partsOfSpeech,
      });
    } catch (error) {
      console.error("Failed to save parts of speech:", error);
      // Silently fail - this is not critical to gameplay
    }
  };

  useEffect(() => {
    if (currentWord) {
      currentWordRef.current = currentWord.word;
      fetchWordData(currentWord.word);
    }
  }, [currentWord]);

  // Auto-focus input when word changes
  useEffect(() => {
    if (currentWord && !showFeedback) {
      const isIOS = isIOSDevice();
      
      // Focus input with multiple attempts for reliability
      const focusInput = () => {
        if (inputRef.current) {
          const input = inputRef.current;
          
          // Standard focus first
          input.focus();
          
          // iOS-specific: setSelectionRange can help trigger keyboard
          if (isIOS) {
            try {
              // Move cursor to end of input
              const length = input.value.length;
              input.setSelectionRange(length, length);
              
              // Trigger click as additional fallback
              input.click();
              
              // Force readonly toggle trick (iOS specific)
              const wasReadOnly = input.readOnly;
              input.readOnly = false;
              input.focus();
              input.readOnly = wasReadOnly;
            } catch (e) {
              // Silently handle any errors
            }
          }
        }
      };
      
      // Try immediately
      focusInput();
      
      // Try after animation completes (400ms Framer Motion + buffer)
      setTimeout(focusInput, 450);
    }
  }, [currentWordIndex, showFeedback]);

  useEffect(() => {
    if (currentWord && !showFeedback && gameMode !== "quiz" && gameMode !== "mistake" && gameMode !== "crossword") {
      speakWord(currentWord.word, () => {
        // Re-focus after TTS completes
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      });
    }
  }, [currentWord, showFeedback, gameMode]);

  useEffect(() => {
    if (currentWord && gameMode === "quiz") {
      speakWord(currentWord.word, () => {
        // Re-focus after TTS completes
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      });
    }
  }, [currentWord, gameMode, currentWordIndex]);

  // Auto-focus Next Word button when feedback appears in Practice mode
  useEffect(() => {
    if (showFeedback && gameMode === "practice") {
      const focusButton = () => {
        if (nextButtonRef.current) {
          nextButtonRef.current.focus();
        }
      };

      // Multiple focus attempts to handle animation timing
      setTimeout(focusButton, 100);
      setTimeout(focusButton, 300);
      setTimeout(focusButton, 500);
    }
  }, [showFeedback, gameMode]);

  useEffect(() => {
    // Skip score saving and session updates for virtual word lists
    if (virtualWords) {
      if (gameComplete && !scoreSaved) {
        setScoreSaved(true);
      }
      return;
    }
    
    if (gameComplete && !scoreSaved && sessionId && user) {
      // Calculate actual words used based on game mode
      // Use activeWords for second chance mode, otherwise use words
      let actualWordsCount = activeWords?.length || 0;
      if (gameMode === "mistake") {
        // Mistake: Use actual number of questions attempted (answered + current if answered)
        // currentWordIndex tracks current question being shown, so +1 for total attempted
        actualWordsCount = currentWordIndex + 1;
      } else if (gameMode === "crossword") {
        // Crossword: Use actual number of words placed in the grid
        actualWordsCount = crosswordGrid?.entries.length || 0;
      } else if (gameMode === "timed") {
        // Timed: Only count words where Check button was pressed (correct + incorrect)
        // If timer expired (timeLeft === 0): currentWordIndex = words checked
        // If all words checked (timeLeft > 0): currentWordIndex + 1 = words checked
        actualWordsCount = timeLeft === 0 ? currentWordIndex : currentWordIndex + 1;
      }
      // For practice/quiz/scramble: activeWords?.length is already the actual game words count
      
      // If in second chance mode, merge with original game metrics
      // Example: Original game had 10 words, 7 correct, 3 wrong
      // 2nd Chance: user retries 3 wrong words, gets 2 right
      // Final result: 10 total, 9 correct (7 original + 2 from 2nd chance), 1 still wrong
      let mergedTotalWords = actualWordsCount;
      let mergedCorrectCount = correctCount;
      let mergedIncorrectWords = incorrectWords;
      
      if (originalGameMetrics) {
        // Use original total words count (not just 2nd chance words)
        mergedTotalWords = originalGameMetrics.totalWords;
        // Combine original correct count with 2nd chance correct count
        mergedCorrectCount = originalGameMetrics.correctCount + correctCount;
        // Only the words still wrong after 2nd chance
        mergedIncorrectWords = incorrectWords;
        
        console.log("🔄 Merging 2nd Chance results:", {
          originalTotal: originalGameMetrics.totalWords,
          originalCorrect: originalGameMetrics.correctCount,
          originalIncorrect: originalGameMetrics.incorrectWords.length,
          secondChanceCorrect: correctCount,
          mergedTotal: mergedTotalWords,
          mergedCorrect: mergedCorrectCount,
          stillIncorrect: mergedIncorrectWords.length
        });
      }
      
      // Calculate accuracy using merged values
      const accuracy = gameMode === "crossword"
        ? (mergedTotalWords > 0 ? Math.round((mergedCorrectCount / mergedTotalWords) * 100) : finalAccuracy)
        : Math.round((mergedCorrectCount / (mergedTotalWords || 1)) * 100);
      
      console.log("Saving score to leaderboard:", { score, accuracy, gameMode, sessionId, correctCount: mergedCorrectCount, actualWordsCount: mergedTotalWords });
      
      // Update game session with final stats first, then save score
      const updateAndSave = async () => {
        try {
          // Update game session with final stats
          await updateSessionMutation.mutateAsync({
            sessionId,
            score,
            totalWords: mergedTotalWords,
            correctWords: mergedCorrectCount,
            bestStreak: streak,
            incorrectWords: mergedIncorrectWords,
            isComplete: true,
            completedAt: new Date(),
          });
          
          // Invalidate word list stats cache to refresh accuracy metrics
          if (listId) {
            queryClient.invalidateQueries({ queryKey: ["/api/word-lists", parseInt(listId, 10), "stats"] });
          }
          
          // Invalidate user stats cache to refresh My Stats page
          queryClient.invalidateQueries({ queryKey: [`/api/stats/user/${user.id}`] });
          
          // After session update succeeds, save score to leaderboard (except for practice mode)
          if (gameMode !== "practice") {
            saveScoreMutation.mutate({
              score,
              accuracy,
              gameMode,
              userId: user.id,
              sessionId,
            });
          }
        } catch (error) {
          console.error("Failed to update game session:", error);
          // Still save to leaderboard even if session update fails (except for practice mode)
          if (gameMode !== "practice") {
            saveScoreMutation.mutate({
              score,
              accuracy,
              gameMode,
              userId: user.id,
              sessionId,
            });
          }
        }
      };
      
      updateAndSave();
      setScoreSaved(true);
    }
  }, [gameComplete, scoreSaved, score, gameMode, correctCount, finalAccuracy, words, sessionId, user, streak, virtualWords, originalGameMetrics]);

  // Timed mode: Single 60-second timer for entire game
  useEffect(() => {
    if (gameMode === "timed" && !gameComplete) {
      // Start timer on first mount
      if (!timerActive) {
        setTimerActive(true);
        setTimeLeft(60);
      }
      
      // Countdown
      if (timerActive && timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      }
      
      // Time's up - end game
      if (timeLeft === 0) {
        setGameComplete(true);
      }
    }
  }, [timeLeft, timerActive, gameMode, gameComplete]);

  // Scramble mode: Initialize scrambled letters when word changes
  useEffect(() => {
    if (gameMode === "scramble" && currentWord) {
      const word = currentWord.word;
      const letters = word.split('');
      
      console.log(`🔄 Initializing scramble for word: "${word}"`, letters);
      
      // Fisher-Yates shuffle algorithm
      const shuffled = [...letters];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Ensure scrambled is different from original (for words with unique letters)
      let attempts = 0;
      while (shuffled.join('') === word && attempts < 10) {
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        attempts++;
      }
      
      console.log(`✅ Scrambled letters:`, shuffled, `Placed letters initialized to:`, new Array(word.length).fill(null));
      setScrambledLetters(shuffled);
      setPlacedLetters(new Array(word.length).fill(null));
    }
  }, [gameMode, currentWord, currentWordIndex]);

  // Scramble mode: Reset isDragging on cancellation events (Escape key, window blur)
  useEffect(() => {
    if (gameMode !== "scramble") return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDragging) {
        setIsDragging(false);
        setDraggedLetter(null);
      }
    };

    const handleWindowBlur = () => {
      if (isDragging) {
        setIsDragging(false);
        setDraggedLetter(null);
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [gameMode, isDragging]);

  // Monitor visualViewport to detect keyboard and adjust layout (mobile only)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }
    
    // Only apply for mobile devices and typing game modes
    const isMobile = isMobileDevice();
    const isTypingMode = gameMode !== "mistake" && gameMode !== "scramble" && gameMode !== "crossword";
    
    if (!isMobile || !isTypingMode) {
      setKeyboardHeight(0);
      return;
    }
    
    const updateKeyboardHeight = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      
      // Only set keyboard height if viewport is actually smaller than window (keyboard is open)
      const potentialKeyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop;
      
      // Only apply if it's a meaningful difference (keyboard likely open)
      if (viewport.height < window.innerHeight && potentialKeyboardHeight > 50) {
        setKeyboardHeight(potentialKeyboardHeight);
      } else {
        setKeyboardHeight(0);
      }
    };
    
    // Listen for viewport changes (keyboard open/close)
    window.visualViewport.addEventListener('resize', updateKeyboardHeight);
    window.visualViewport.addEventListener('scroll', updateKeyboardHeight);
    
    // Initial check
    updateKeyboardHeight();
    
    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardHeight);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardHeight);
    };
  }, [gameMode]);

  // Function to scroll to word image on mobile, hiding header/progress bar
  const centerGameCard = useCallback(() => {
    if (window.innerWidth < 768) {
      // 500ms delay ensures Framer Motion animations (400ms) complete before scrolling
      // This prevents race conditions on slower Android devices
      setTimeout(() => {
        // Scroll to word image with block: 'start' to hide header, progress bar, and title
        // This shows only the word image and buttons, matching user's expectation
        wordImageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 500);
    }
  }, []);

  // Calculate dynamic font size for input fields based on word length
  // Returns inline font size to override Input component's default text-base/text-sm
  // Font sizes match hint letter sizes for consistency
  const getInputFontSize = (wordLength: number): { className: string; fontSize: string } => {
    const isIPad = isIPadDevice();
    
    // Use same sizing logic as hint letters for consistent appearance
    // Tailwind text sizes: 4xl=36px, 3xl=30px, 2xl=24px, xl=20px, lg=18px, base=16px
    // Must use inline styles because Input component has text-base/md:text-sm that override classes
    if (isIPad) {
      // iPad uses larger font sizes for better readability
      if (wordLength <= 8) {
        return { className: 'uppercase', fontSize: '36px' }; // text-4xl equivalent
      } else if (wordLength <= 12) {
        return { className: 'uppercase', fontSize: '30px' }; // text-3xl equivalent
      } else if (wordLength <= 16) {
        return { className: 'uppercase', fontSize: '24px' }; // text-2xl equivalent
      } else if (wordLength <= 20) {
        return { className: 'uppercase', fontSize: '20px' }; // text-xl equivalent
      } else {
        // For very long words, calculate to ensure fit
        const charWidth = inputContainerWidth / wordLength;
        const fontSize = Math.max(charWidth * 0.85, 14);
        return { className: 'uppercase', fontSize: `${fontSize}px` };
      }
    } else if (isMobileViewport) {
      if (wordLength <= 8) {
        return { className: 'uppercase', fontSize: '24px' }; // text-2xl equivalent
      } else if (wordLength <= 12) {
        return { className: 'uppercase', fontSize: '20px' }; // text-xl equivalent
      } else if (wordLength <= 16) {
        return { className: 'uppercase', fontSize: '18px' }; // text-lg equivalent
      } else if (wordLength <= 20) {
        return { className: 'uppercase', fontSize: '16px' }; // text-base equivalent
      } else {
        // For very long words, calculate to ensure fit
        const charWidth = inputContainerWidth / wordLength;
        const fontSize = Math.max(charWidth * 0.85, 12);
        return { className: 'uppercase', fontSize: `${fontSize}px` };
      }
    } else {
      // Desktop
      if (wordLength <= 8) {
        return { className: 'uppercase', fontSize: '36px' }; // text-4xl equivalent
      } else if (wordLength <= 12) {
        return { className: 'uppercase', fontSize: '30px' }; // text-3xl equivalent
      } else if (wordLength <= 16) {
        return { className: 'uppercase', fontSize: '24px' }; // text-2xl equivalent
      } else if (wordLength <= 20) {
        return { className: 'uppercase', fontSize: '20px' }; // text-xl equivalent
      } else {
        // For very long words, calculate to ensure fit
        const charWidth = inputContainerWidth / wordLength;
        const fontSize = Math.max(charWidth * 0.85, 14);
        return { className: 'uppercase', fontSize: `${fontSize}px` };
      }
    }
  };

  // Calculate dynamic sizing for word hint letters based on word length and container width
  // Returns concrete Tailwind classes and CSS values that fit within container
  const getHintLetterSize = (wordLength: number): { fontClass: string; minWidth: string; gapClass: string; useInline?: boolean; fontSize?: string } => {
    // Calculate space needed for default sizes
    const defaultMinWidth = isMobileViewport ? 24 : 32; // px equivalent of 1.5rem / 2rem
    const defaultGap = isMobileViewport ? 8 : 12; // px equivalent of gap-2 / gap-3
    const totalSpaceNeeded = (wordLength * defaultMinWidth) + ((wordLength - 1) * defaultGap);
    
    // If we need to scale down to fit
    if (totalSpaceNeeded > inputContainerWidth || wordLength > 20) {
      // Calculate how much space each letter can have
      const spacePerLetter = inputContainerWidth / wordLength;
      const minWidth = Math.max(spacePerLetter * 0.7, 12); // 70% for letter, rest for gap, min 12px
      const fontSize = Math.max(minWidth * 1.2, 14); // Font slightly larger than minWidth, min 14px
      
      return {
        fontClass: '', // Will use inline fontSize instead
        minWidth: `${minWidth}px`,
        gapClass: 'gap-0.5',
        useInline: true,
        fontSize: `${fontSize}px`
      };
    }
    
    // Use Tailwind classes for common word lengths that fit
    if (wordLength <= 8) {
      return {
        fontClass: isMobileViewport ? 'text-2xl' : 'text-4xl',
        minWidth: isMobileViewport ? '1.5rem' : '2rem',
        gapClass: isMobileViewport ? 'gap-2' : 'gap-3'
      };
    } else if (wordLength <= 12) {
      return {
        fontClass: isMobileViewport ? 'text-xl' : 'text-3xl',
        minWidth: isMobileViewport ? '1.25rem' : '1.75rem',
        gapClass: isMobileViewport ? 'gap-1.5' : 'gap-2.5'
      };
    } else if (wordLength <= 16) {
      return {
        fontClass: isMobileViewport ? 'text-lg' : 'text-2xl',
        minWidth: isMobileViewport ? '1rem' : '1.5rem',
        gapClass: isMobileViewport ? 'gap-1' : 'gap-2'
      };
    } else {
      return {
        fontClass: isMobileViewport ? 'text-base' : 'text-xl',
        minWidth: isMobileViewport ? '0.875rem' : '1.25rem',
        gapClass: 'gap-1'
      };
    }
  };

  // Track viewport size responsively
  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    
    // Set initial value
    updateViewport();
    
    // Listen for resize
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  // Mobile auto-scroll: Center game card when new word is displayed
  useEffect(() => {
    // Only scroll on mobile when showing new word input (not feedback)
    if (currentWord && !showFeedback && window.innerWidth < 768 && gameCardRef.current) {
      // 500ms delay ensures Framer Motion animations (400ms) complete before scrolling
      // This prevents race conditions on slower Android devices
      const timeoutId = setTimeout(() => {
        gameCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 500);
      
      // Cleanup: Cancel pending scroll if word changes again before timeout fires
      return () => clearTimeout(timeoutId);
    }
  }, [currentWordIndex, showFeedback, currentWord]);

  // Desktop auto-scroll: Show progress bar but hide header
  // Use useLayoutEffect to ensure progressBarRef is attached before checking
  useLayoutEffect(() => {
    // Only apply on desktop devices (viewport width >= 768px)
    const isDesktop = window.innerWidth >= 768;
    
    if (isDesktop && progressBarRef.current && currentWord && !showFeedback) {
      // Small delay to allow content to render/animate
      const timeoutId = setTimeout(() => {
        // Scroll to progress bar element, which puts it at top of viewport
        // This hides the header (above progress bar) and shows the progress bar + game card
        progressBarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start', // Aligns top of progress bar with top of viewport
          inline: 'nearest'
        });
      }, 150);
      
      // Cleanup: Cancel pending scroll if word changes before timeout fires
      return () => clearTimeout(timeoutId);
    }
  }, [currentWordIndex, showFeedback, currentWord]);

  // Measure input element's actual available width for dynamic font sizing
  useLayoutEffect(() => {
    const measureWidth = () => {
      // Prioritize measuring from the actual input element to get true editable width
      const element = inputRef.current || inputContainerRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0) {
          // Get actual computed styles to calculate available width
          const computedStyle = window.getComputedStyle(element);
          const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
          const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const availableWidth = rect.width - paddingLeft - paddingRight - borderLeft - borderRight;
          
          // Set width with reasonable minimum
          setInputContainerWidth(Math.max(availableWidth, 200));
        }
      }
    };

    // Measure immediately after render (input should exist by now)
    measureWidth();

    // Listen to window resize and orientation change for responsive updates
    window.addEventListener('resize', measureWidth);
    window.addEventListener('orientationchange', measureWidth);

    return () => {
      window.removeEventListener('resize', measureWidth);
      window.removeEventListener('orientationchange', measureWidth);
    };
  }, [currentWordIndex, gameMode, showWordHints]); // Remeasure on word change, mode change, or hints toggle


  // Mobile: Keep keyboard open for typing game modes
  useEffect(() => {
    const isMobile = isMobileDevice();
    const isIOS = isIOSDevice();
    const isTypingMode = gameMode !== "mistake" && gameMode !== "scramble" && gameMode !== "crossword";
    
    if (!isMobile || !isTypingMode || gameComplete || showFeedback) {
      return;
    }
    
    // Focus the input to keep keyboard open
    const focusInput = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
        // For iOS, also trigger click to ensure keyboard opens
        if (isIOS) {
          inputRef.current.click();
        }
      }
    };
    
    // Initial focus
    focusInput();
    
    // Re-focus if keyboard closes (user taps away)
    const handleBlur = () => {
      setTimeout(focusInput, 100);
    };
    
    const input = inputRef.current;
    if (input) {
      input.addEventListener('blur', handleBlur);
      
      return () => {
        input.removeEventListener('blur', handleBlur);
      };
    }
  }, [gameMode, gameComplete, showFeedback]);

  // Play celebration sound when game completes with all words correct (for practice/timed/scramble/mistake modes)
  useEffect(() => {
    if (gameComplete && words && gameMode !== "quiz" && gameMode !== "crossword") {
      // For practice, timed, scramble, and mistake modes
      if (correctCount === words.length) {
        playCelebrationSound();
      }
    }
  }, [gameComplete, correctCount, words, gameMode]);

  // Helper to check if a word exists in the dictionary
  const checkWordExists = async (word: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
      // If the word exists, API returns 200; if not, it returns 404
      return response.ok;
    } catch (error) {
      // If there's a network error, assume word doesn't exist (safer for misspellings)
      return false;
    }
  };

  // Helper to create realistic spelling mistakes (async to check dictionary)
  const misspellWordAsync = async (word: string, otherWords: string[]): Promise<string> => {
    const wordLower = word.toLowerCase();
    const otherWordsLower = otherWords.map(w => w.toLowerCase());
    
    const preserveCapitalization = (misspelled: string): string => {
      if (word === word.toUpperCase()) {
        return misspelled.toUpperCase();
      }
      if (word[0] === word[0].toUpperCase()) {
        return misspelled.charAt(0).toUpperCase() + misspelled.slice(1);
      }
      return misspelled;
    };
    
    const tryMisspelling = async (misspelled: string): Promise<string | null> => {
      if (misspelled !== wordLower && !otherWordsLower.includes(misspelled)) {
        // Check if misspelling contains 3 consecutive identical letters (e.g., "ooo", "lll")
        const hasTripleLetters = /(.)\1{2,}/.test(misspelled);
        if (hasTripleLetters) {
          return null; // Reject misspellings with 3+ consecutive identical letters
        }
        
        // Check if the misspelling is actually a real word in the dictionary
        const isRealWord = await checkWordExists(misspelled);
        if (!isRealWord) {
          return preserveCapitalization(misspelled);
        }
      }
      return null;
    };
    
    // Strategy 1: Realistic spelling mistakes
    const realisticStrategies = [
      // ie/ei confusion (receive -> recieve, friend -> freind)
      () => {
        if (wordLower.includes('ie')) {
          return wordLower.replace('ie', 'ei');
        }
        if (wordLower.includes('ei')) {
          return wordLower.replace('ei', 'ie');
        }
        return null;
      },
      
      // Remove silent letters (knife -> nife, gnaw -> naw, column -> colum)
      () => {
        const silentPatterns = [
          { pattern: 'kn', replacement: 'n' },  // knife -> nife, know -> now
          { pattern: 'gn', replacement: 'n' },  // gnaw -> naw, gnat -> nat
          { pattern: 'wr', replacement: 'r' },  // write -> rite, wrong -> rong
          { pattern: 'mb', replacement: 'm' },  // lamb -> lam, climb -> clim
          { pattern: 'mn', replacement: 'm' },  // column -> colum, autumn -> autum
          { pattern: 'gh', replacement: '' },   // light -> lit, night -> nit
          { pattern: 'ck', replacement: 'k' },  // back -> bak, stick -> stik
        ];
        for (const { pattern, replacement } of silentPatterns) {
          if (wordLower.includes(pattern)) {
            return wordLower.replace(pattern, replacement);
          }
        }
        return null;
      },
      
      // Use wrong silent letters (knife -> gnife, gnat -> knat)
      () => {
        if (wordLower.startsWith('kn')) {
          return 'gn' + wordLower.slice(2);  // knife -> gnife
        }
        if (wordLower.startsWith('gn')) {
          return 'kn' + wordLower.slice(2);  // gnat -> knat
        }
        if (wordLower.startsWith('wr')) {
          return 'rh' + wordLower.slice(2);  // write -> rhite
        }
        return null;
      },
      
      // "cious" / "shus" / "shis" (delicious -> delishus or delishis)
      () => {
        if (wordLower.endsWith('cious')) {
          return Math.random() > 0.5 
            ? wordLower.replace(/cious$/, 'shus')
            : wordLower.replace(/cious$/, 'shis');
        }
        if (wordLower.endsWith('tious')) {
          return Math.random() > 0.5 
            ? wordLower.replace(/tious$/, 'shus')
            : wordLower.replace(/tious$/, 'shis');
        }
        return null;
      },
      
      // Double a single consonant (top -> topp, banana -> bananna)
      // Don't double the first letter if it's a consonant (cat -> catt not ccat)
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = wordLower.length - 2; i >= 1; i--) {  // Start from position 1, not 0
          if (consonants.includes(wordLower[i]) && wordLower[i] !== wordLower[i + 1]) {
            return wordLower.slice(0, i + 1) + wordLower[i] + wordLower.slice(i + 1);
          }
        }
        return null;
      },
      
      // Remove one of a pair of consonants (terrific -> terific, rabbit -> rabit)
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = 0; i < wordLower.length - 1; i++) {
          if (wordLower[i] === wordLower[i + 1] && consonants.includes(wordLower[i])) {
            return wordLower.slice(0, i) + wordLower.slice(i + 1);
          }
        }
        return null;
      },
      
      // "oo" / "u" swaps (balloon -> balune, spoon -> spune, rune -> roon)
      () => {
        // Handle 'oon' ending -> 'une' ending (balloon -> balune, spoon -> spune)
        if (wordLower.endsWith('oon')) {
          return wordLower.slice(0, -3) + 'une';
        }
        // Handle 'une' ending -> 'oon' ending (rune -> roon)
        if (wordLower.endsWith('une')) {
          return wordLower.slice(0, -3) + 'oon';
        }
        // Handle 'oo' in middle -> 'u' (moon -> mun, food -> fud)
        if (wordLower.includes('oo')) {
          return wordLower.replace('oo', 'u');
        }
        // Handle 'u' in middle -> 'oo' (but -> boot)
        if (wordLower.includes('u') && !wordLower.includes('oo')) {
          return wordLower.replace('u', 'oo');
        }
        return null;
      },
      
      // vowel + "c" / vowel + "ck" swaps (fantastic -> fantastick, havoc -> havock, muck -> muc)
      () => {
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        for (const vowel of vowels) {
          // Check for vowel+c ending (not followed by k)
          if (wordLower.endsWith(vowel + 'c') && !wordLower.endsWith(vowel + 'ck')) {
            return wordLower + 'k';
          }
          // Check for vowel+ck ending
          if (wordLower.endsWith(vowel + 'ck')) {
            return wordLower.slice(0, -1);
          }
        }
        return null;
      },
      
      // "eur" / "ure" swaps (amateur -> amature, allure -> alleur)
      () => {
        if (wordLower.includes('eur')) {
          return wordLower.replace('eur', 'ure');
        }
        if (wordLower.includes('ure')) {
          return wordLower.replace('ure', 'eur');
        }
        return null;
      },
      
      // Double the wrong consonant (tomorrow -> tommorow, beginning -> beggining)
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        // Find existing double consonants
        let doublePos = -1;
        for (let i = 0; i < wordLower.length - 1; i++) {
          if (wordLower[i] === wordLower[i + 1] && consonants.includes(wordLower[i])) {
            doublePos = i;
            break;
          }
        }
        
        // If found a double consonant, swap which consonant is doubled
        if (doublePos >= 0) {
          const doubledChar = wordLower[doublePos];
          
          // Find a different single consonant to double (skip first position)
          for (let i = 1; i < wordLower.length; i++) {
            if (i !== doublePos && i !== doublePos + 1 && // not the current double
                consonants.includes(wordLower[i]) &&
                wordLower[i] !== doubledChar && // different consonant
                wordLower[i] !== wordLower[i - 1] && // not already doubled
                (i === wordLower.length - 1 || wordLower[i] !== wordLower[i + 1])) { // check next char too
              
              // Build result: remove one instance of doubled consonant, add double of new consonant
              let result = wordLower.slice(0, doublePos) + wordLower.slice(doublePos + 1); // remove first of double
              // Now double the target consonant in the result string
              // Adjust index if target was after the removed character
              let targetIdx = i > doublePos ? i - 1 : i;
              
              // Double the target consonant in the result string (not wordLower!)
              return result.slice(0, targetIdx + 1) + result[targetIdx] + result.slice(targetIdx + 1);
            }
          }
        }
        return null;
      },
      
      // Trailing "er" / "ar" / "or" swaps (calendar -> calender, calender -> calendor)
      () => {
        if (wordLower.endsWith('ar') && wordLower.length > 2) {
          return Math.random() > 0.5 
            ? wordLower.slice(0, -2) + 'er'
            : wordLower.slice(0, -2) + 'or';
        }
        if (wordLower.endsWith('er') && wordLower.length > 2) {
          return Math.random() > 0.5 
            ? wordLower.slice(0, -2) + 'ar'
            : wordLower.slice(0, -2) + 'or';
        }
        if (wordLower.endsWith('or') && wordLower.length > 2) {
          return Math.random() > 0.5 
            ? wordLower.slice(0, -2) + 'ar'
            : wordLower.slice(0, -2) + 'er';
        }
        return null;
      },
      
      // "ngth" / "nth" swaps (length -> lenth, strength -> strenth)
      () => {
        if (wordLower.includes('ngth')) {
          return wordLower.replace('ngth', 'nth');
        }
        if (wordLower.includes('nth') && !wordLower.includes('ngth')) {
          return wordLower.replace('nth', 'ngth');
        }
        return null;
      },
      
      // "e" / "ea" swaps (weather -> wether, sweater -> sweter, tether -> teather)
      () => {
        if (wordLower.includes('ea')) {
          return wordLower.replace('ea', 'e');
        }
        // Only add 'a' after 'e' in the middle of words
        const eIndex = wordLower.indexOf('e', 1);
        if (eIndex > 0 && eIndex < wordLower.length - 1 && wordLower[eIndex + 1] !== 'a') {
          return wordLower.slice(0, eIndex) + 'ea' + wordLower.slice(eIndex + 1);
        }
        return null;
      },
      
      // "eed" / "ede" swaps (exceed -> excede, succeed -> succede)
      () => {
        if (wordLower.endsWith('eed')) {
          return wordLower.slice(0, -3) + 'ede';
        }
        if (wordLower.endsWith('ede')) {
          return wordLower.slice(0, -3) + 'eed';
        }
        return null;
      },
      
      // "aught" / "ought" swaps (daughter -> doughter,ought -> aught)
      () => {
        if (wordLower.includes('aught')) {
          return wordLower.replace('aught', 'ought');
        }
        if (wordLower.includes('ought')) {
          return wordLower.replace('ought', 'aught');
        }
        return null;
      },
      
      // "or" / "our" swaps (forty -> fourty, color -> colour)
      () => {
        if (wordLower.includes('or') && !wordLower.includes('our')) {
          return wordLower.replace('or', 'our');
        }
        if (wordLower.includes('our')) {
          return wordLower.replace('our', 'or');
        }
        return null;
      },
      
      // "able" / "ible" / "eable" / "abel" / "uble" swaps (desirable -> desirible/desireable/desirabel/desiruble)
      () => {
        const endings = ['able', 'ible', 'eable', 'abel', 'uble'];
        for (const ending of endings) {
          if (wordLower.endsWith(ending)) {
            // Pick a different random ending
            const otherEndings = endings.filter(e => e !== ending);
            const newEnding = otherEndings[Math.floor(Math.random() * otherEndings.length)];
            return wordLower.slice(0, -ending.length) + newEnding;
          }
        }
        return null;
      },
      
      // "oble" / "obel" swaps (noble -> nobel, problem -> priblem if it had oble)
      () => {
        if (wordLower.endsWith('oble')) {
          return wordLower.slice(0, -4) + 'obel';
        }
        if (wordLower.endsWith('obel')) {
          return wordLower.slice(0, -4) + 'oble';
        }
        return null;
      },
      
      // "sh" / "sch" swaps (fish -> fisch, wash -> wasch, school -> shool)
      () => {
        if (wordLower.includes('sh') && !wordLower.includes('sch')) {
          return wordLower.replaceAll('sh', 'sch');
        }
        if (wordLower.includes('sch')) {
          return wordLower.replaceAll('sch', 'sh');
        }
        return null;
      },
      
      // Drop silent e (make -> mak, like -> lik)
      () => {
        if (wordLower.length > 3 && wordLower.endsWith('e')) {
          return wordLower.slice(0, -1);
        }
        return null;
      },
      
      // Add unnecessary e (cat -> cate, dog -> doge)
      () => {
        if (wordLower.length > 2 && !wordLower.endsWith('e')) {
          return wordLower + 'e';
        }
        return null;
      },
      
      // Common vowel drops (delicious -> delicius, beautiful -> beautful)
      // Don't drop vowels surrounded by consonants (surround -> surrund not srround, barn stays as barn)
      () => {
        const vowels = 'aeiou';
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = 1; i < wordLower.length - 1; i++) {
          if (vowels.includes(wordLower[i])) {
            // Skip if vowel is surrounded by consonants on both sides
            const beforeIsConsonant = i > 0 && consonants.includes(wordLower[i - 1]);
            const afterIsConsonant = i < wordLower.length - 1 && consonants.includes(wordLower[i + 1]);
            if (beforeIsConsonant && afterIsConsonant) {
              continue;  // Skip this vowel
            }
            // Drop this vowel (it has at least one vowel neighbor)
            return wordLower.slice(0, i) + wordLower.slice(i + 1);
          }
        }
        return null;
      }
    ];
    
    // Shuffle realistic strategies using Fisher-Yates algorithm for randomization
    const shuffledRealistic = [...realisticStrategies];
    for (let i = shuffledRealistic.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRealistic[i], shuffledRealistic[j]] = [shuffledRealistic[j], shuffledRealistic[i]];
    }
    
    // Try realistic strategies in random order
    for (const strategy of shuffledRealistic) {
      const result = strategy();
      if (result) {
        const validated = await tryMisspelling(result);
        if (validated) return validated;
      }
    }
    
    // Strategy 2: Phonetic misspellings (if realistic strategies fail or create conflicts)
    const phoneticStrategies = [
      // c -> k (cat -> kat, can -> kan)
      () => wordLower.includes('c') ? wordLower.replace('c', 'k') : null,
      
      // k -> c (kite -> cite, keep -> ceep)
      () => wordLower.includes('k') ? wordLower.replace('k', 'c') : null,
      
      // ph -> f (phonics -> fonics, phone -> fone)
      () => wordLower.includes('ph') ? wordLower.replace('ph', 'f') : null,
      
      // f -> ph (feel -> pheel, fun -> phun)
      () => wordLower.includes('f') && !wordLower.includes('ph') ? wordLower.replace('f', 'ph') : null,
      
      // Double a consonant (pig -> pigg, run -> runn)
      // Don't double the first letter if it's a consonant (cat -> catt not ccat)
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = wordLower.length - 2; i >= 1; i--) {  // Start from position 1, not 0
          if (consonants.includes(wordLower[i]) && wordLower[i] !== wordLower[i + 1]) {
            return wordLower.slice(0, i + 1) + wordLower[i] + wordLower.slice(i + 1);
          }
        }
        return null;
      },
      
      // s -> c / c -> sc (see -> cee, sun -> cun, incense -> inscense)
      () => {
        const hasS = wordLower.includes('s');
        const hasC = wordLower.includes('c');
        
        // Randomly choose which transformation to attempt
        const useScTransform = Math.random() > 0.5;
        
        if (useScTransform && hasC) {
          // Option: c -> sc (insert s before c, only if not already sc)
          const cIndex = wordLower.indexOf('c');
          if (cIndex >= 0 && (cIndex === 0 || wordLower[cIndex - 1] !== 's')) {
            return wordLower.slice(0, cIndex) + 's' + wordLower.slice(cIndex);
          }
        }
        
        // Fallback or first option: s -> c (replace s with c)
        if (hasS) {
          const sIndex = wordLower.indexOf('s');
          return wordLower.slice(0, sIndex) + 'c' + wordLower.slice(sIndex + 1);
        }
        
        return null;
      },
      
      // O surrounded by consonants -> AU/AW/OU (dog -> daug, dawg, doug)
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = 1; i < wordLower.length - 1; i++) {
          if (wordLower[i] === 'o' &&
              consonants.includes(wordLower[i - 1]) &&
              consonants.includes(wordLower[i + 1])) {
            // Randomly choose AU, AW, or OU
            const replacements = ['au', 'aw', 'ou'];
            const replacement = replacements[Math.floor(Math.random() * replacements.length)];
            return wordLower.slice(0, i) + replacement + wordLower.slice(i + 1);
          }
        }
        return null;
      },
      
      // AU <-> AW swap (dawn -> daun, haul -> hawl)
      () => {
        if (wordLower.includes('au')) {
          const auIndex = wordLower.indexOf('au');
          return wordLower.slice(0, auIndex) + 'aw' + wordLower.slice(auIndex + 2);
        }
        if (wordLower.includes('aw')) {
          const awIndex = wordLower.indexOf('aw');
          return wordLower.slice(0, awIndex) + 'au' + wordLower.slice(awIndex + 2);
        }
        return null;
      },
      
      // Replace vowel with similar sound (cat -> cet, dog -> dag)
      () => {
        const vowelMap: { [key: string]: string } = {
          'a': 'e', 'e': 'i', 'i': 'e', 'o': 'u', 'u': 'o'
        };
        for (let i = 0; i < wordLower.length; i++) {
          if (vowelMap[wordLower[i]]) {
            return wordLower.slice(0, i) + vowelMap[wordLower[i]] + wordLower.slice(i + 1);
          }
        }
        return null;
      }
    ];
    
    // Shuffle phonetic strategies for randomization
    const shuffledPhonetic = [...phoneticStrategies];
    for (let i = shuffledPhonetic.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPhonetic[i], shuffledPhonetic[j]] = [shuffledPhonetic[j], shuffledPhonetic[i]];
    }
    
    // Try phonetic strategies in random order
    for (const strategy of shuffledPhonetic) {
      const result = strategy();
      if (result) {
        const validated = await tryMisspelling(result);
        if (validated) return validated;
      }
    }
    
    // Fallback: Swap first two letters (but not for short words ≤4 letters)
    const letters = wordLower.split('');
    if (letters.length > 4) {
      [letters[0], letters[1]] = [letters[1], letters[0]];
      return preserveCapitalization(letters.join(''));
    }
    
    // For short words, prefer doubling the last consonant (dog -> dogg, not ddog)
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    for (let i = wordLower.length - 1; i >= 0; i--) {
      if (consonants.includes(wordLower[i]) && 
          (i === wordLower.length - 1 || wordLower[i] !== wordLower[i + 1])) {
        return preserveCapitalization(
          wordLower.slice(0, i + 1) + wordLower[i] + wordLower.slice(i + 1)
        );
      }
    }
    
    // Ultimate fallback: add extra letter at end
    return preserveCapitalization(wordLower + wordLower[wordLower.length - 1]);
  };

  // Mistake mode: Initialize 4 word choices when word changes
  useEffect(() => {
    if (gameMode === "mistake" && currentWord && words && words.length >= 4) {
      const initializeMistakeChoices = async () => {
        // Check cache first - use the current word as the cache key
        const cacheKey = currentWord.word;
        const cached = mistakeQuestionCacheRef.current.get(cacheKey);
        
        console.log(`🔍 Mistake mode cache check: key="${cacheKey}", cacheSize=${mistakeQuestionCacheRef.current.size}, found=${!!cached}`);
        
        if (cached) {
          // Use cached data for Do Over and 2nd Chance retries
          console.log(`🔄 Mistake mode: Using cached question for "${cacheKey}"`);
          setMistakeChoices(cached.choices);
          setMisspelledIndex(cached.misspelledIndex);
          setCorrectSpelling(cached.correctSpelling);
          return;
        }
        
        // Get 4 random words from the word list (not just current word)
        const availableWords = [...words];
        const selectedWords: string[] = [];
        
        for (let i = 0; i < 4 && availableWords.length > 0; i++) {
          const randomIdx = Math.floor(Math.random() * availableWords.length);
          selectedWords.push(availableWords[randomIdx].word);
          availableWords.splice(randomIdx, 1);
        }
        
        // Choose one to misspell
        const misspellIdx = Math.floor(Math.random() * selectedWords.length);
        const correctWord = selectedWords[misspellIdx]; // Store correct spelling
        
        // Generate misspelling asynchronously (checks dictionary API)
        const misspelledWord = await misspellWordAsync(
          selectedWords[misspellIdx], 
          selectedWords.filter((_, i) => i !== misspellIdx)
        );
        
        // Create choices array with the misspelled word
        const choices = selectedWords.map((word, idx) => 
          idx === misspellIdx ? misspelledWord : word
        );
        
        console.log(`🎯 Mistake mode: Selected words:`, selectedWords);
        console.log(`❌ Misspelled word at index ${misspellIdx}:`, choices[misspellIdx], `(correct: ${correctWord})`);
        
        // Cache the generated question using the misspelled word as key
        // so 2nd Chance can look it up when replaying incorrect words
        mistakeQuestionCacheRef.current.set(cacheKey, {
          choices,
          misspelledIndex: misspellIdx,
          correctSpelling: correctWord,
        });
        
        setMistakeChoices(choices);
        setMisspelledIndex(misspellIdx);
        setCorrectSpelling(correctWord);
      };
      
      initializeMistakeChoices();
    }
  }, [gameMode, currentWordIndex, words, currentWord]);

  // Set loading state immediately when entering crossword mode
  useEffect(() => {
    if (gameMode === "crossword") {
      setLoadingCrossword(true);
      setCrosswordGrid(null);
    }
  }, [gameMode]);

  // Crossword mode: Initialize grid and fetch clues
  useEffect(() => {
    if (gameMode === "crossword" && words && words.length >= 5) {
      if (!loadingCrossword) {
        setLoadingCrossword(true);
      }
      setCrosswordGrid(null); // Clear any previous grid
      
      const wordList = words.map(w => w.word);
      const limitedWords = wordList.slice(0, Math.min(15, wordList.length));
      
      console.log('🧩 Initializing crossword with words:', limitedWords);
      
      // Fetch definitions for all words in parallel
      const fetchClues = async () => {
        const cluePromises = limitedWords.map(async (word) => {
          try {
            const response = await fetch(`https://simple.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word.toLowerCase())}&prop=wikitext&format=json&origin=*`);
            const data = await response.json();
            
            if (data.parse && data.parse.wikitext) {
              const wikitext = data.parse.wikitext['*'];
              const defMatch = wikitext.match(/\#\s*([^#\n]+)/);
              if (defMatch) {
                const definition = defMatch[1].replace(/<[^>]*>/g, '').trim();
                return { word, clue: definition };
              }
            }
            
            // Fallback to Free Dictionary API
            const freeDictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
            const freeDictData = await freeDictResponse.json();
            
            if (Array.isArray(freeDictData) && freeDictData[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
              return { word, clue: freeDictData[0].meanings[0].definitions[0].definition };
            }
            
            return { word, clue: "Spell this word" };
          } catch (error) {
            console.error(`Error fetching clue for ${word}:`, error);
            return { word, clue: "Spell this word" };
          }
        });
        
        const cluesData = await Promise.all(cluePromises);
        setCrosswordClues(cluesData);
        
        // Generate crossword grid with clues
        const cluesArray = cluesData.map(c => c.clue);
        const grid = generateCrossword(limitedWords, cluesArray);
        console.log('✅ Generated crossword grid:', grid);
        setCrosswordGrid(grid);
        
        // Initialize empty inputs for all cells
        const initialInputs: {[key: string]: string} = {};
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            if (!grid.cells[r][c].isBlank) {
              initialInputs[`${r}-${c}`] = '';
            }
          }
        }
        setCrosswordInputs(initialInputs);
        
        // Set first entry as active
        if (grid.entries.length > 0) {
          setActiveEntry(grid.entries[0].number);
        }
        
        setLoadingCrossword(false);
      };
      
      fetchClues();
    }
  }, [gameMode, words]);

  // Center crossword grid horizontally when it's loaded
  useLayoutEffect(() => {
    if (crosswordScrollRef.current && crosswordGrid && gameMode === "crossword") {
      const container = crosswordScrollRef.current;
      const gridWidth = crosswordGrid.cols * 40 + (crosswordGrid.cols - 1) * 2; // 2.5rem = 40px, 2px gap
      const containerWidth = container.clientWidth;
      
      // Center the grid if it's wider than the container
      if (gridWidth > containerWidth) {
        container.scrollLeft = (gridWidth - containerWidth) / 2;
      }
    }
  }, [crosswordGrid, gameMode]);

  const handleTimerExpired = () => {
    // Not used in new timed mode
    setGameComplete(true);
  };

  // Helper function to check if Do Over should be offered
  const shouldOfferDoOver = (mode: GameMode): boolean => {
    // Do Over is not available in Practice or Crossword modes
    return mode !== "practice" && mode !== "crossword" && getItemQuantity("do_over") > 0;
  };

  // Process incorrect answer (common logic extracted)
  const processIncorrectAnswer = () => {
    playIncorrectSound();
    setStreak(0);
    if (currentWord) {
      setIncorrectWords([...incorrectWords, currentWord.word]);
    }
    resetWordStreakMutation.mutate();
  };

  // Handle using Do Over item
  const handleUseDoOver = () => {
    if (!doOverPendingResult) return;
    
    // Use the Do Over item
    useItemMutation.mutate({ itemId: "do_over", quantity: 1 });
    
    // Close dialog
    setShowDoOverDialog(false);
    setDoOverPendingResult(null);
    
    // Handle based on game mode
    if (gameMode === "scramble" && currentWord) {
      // Reset placed letters to allow retry
      setPlacedLetters(new Array(currentWord.word.length).fill(null));
    } else if (gameMode === "mistake") {
      // Reset selection to allow retry
      setSelectedChoiceIndex(-1);
    } else {
      // Quiz, Timed, Standard modes - reset input and allow retry
      setUserInput("");
      
      // Keep focus on input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle using 2nd Chance item
  const handleUseSecondChance = () => {
    if (!words) return;
    
    // Use the 2nd Chance item
    useItemMutation.mutate({ itemId: "second_chance", quantity: 1 });
    
    // Crossword mode has special handling - keep grid, highlight mistakes
    if (gameMode === "crossword") {
      // Store original crossword metrics before 2nd Chance
      const originalTotal = crosswordGrid?.entries.length || 0;
      const originalCorrect = originalTotal - incorrectWords.length;
      setOriginalGameMetrics({
        totalWords: originalTotal,
        correctCount: originalCorrect,
        incorrectWords: [...incorrectWords],
      });
      
      // CROSSWORD 2ND CHANCE: Keep grid intact, highlight mistakes, allow corrections
      setGameComplete(false);  // Exit results screen
      setScoreSaved(false);    // Allow new score to be saved
      setCompletedGrid(null);  // Clear completed grid to return to editing mode
      setIncorrectWords([]);   // Clear for fresh tracking on re-submit
      setAchievementEarned(false);
      setSecondChanceMode(true);
      
      // Highlight the incorrect cells
      handleShowMistakes();
      
      return;
    }
    
    // For other modes: Filter words to only include incorrect ones
    const incorrectWordObjects = words.filter(w => incorrectWords.includes(w.word));
    
    if (incorrectWordObjects.length === 0) return;
    
    // Store original game metrics before 2nd Chance to merge results later
    // Calculate original totalWords based on game mode
    let originalTotal = words.length;
    if (gameMode === "timed") {
      // Timed mode: only count words that were actually attempted
      originalTotal = timeLeft === 0 ? currentWordIndex : currentWordIndex + 1;
    } else if (gameMode === "mistake") {
      originalTotal = currentWordIndex + 1;
    }
    
    setOriginalGameMetrics({
      totalWords: originalTotal,
      correctCount: correctCount,
      incorrectWords: [...incorrectWords],
    });
    
    // Set second chance words FIRST before setting mode (order matters for activeWords)
    setSecondChanceWords(incorrectWordObjects);
    
    // Reset ALL game state for second chance round
    // CRITICAL: Reset these in the right order to avoid race conditions
    setGameComplete(false);  // Must be first to exit results screen
    setScoreSaved(false);    // Allow new score to be saved
    setCurrentWordIndex(0);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setUserInput("");
    setShowFeedback(false);
    setIsCorrect(false);
    setIncorrectWords([]);
    setQuizAnswers([]);
    setSecondChanceAnswers([]);
    setDoOverPendingResult(null);
    setShowDoOverDialog(false);
    setAchievementEarned(false);
    
    // Enter second chance mode AFTER resetting state
    setSecondChanceMode(true);
    
    // For scramble mode, reset placed letters and scramble the first word
    if (gameMode === "scramble" && incorrectWordObjects[0]) {
      const word = incorrectWordObjects[0].word;
      setPlacedLetters(new Array(word.length).fill(null));
      // Shuffle letters for the first word
      const letters = word.split('');
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      setScrambledLetters(letters);
    }
    
    // For mistake mode, reset selection
    if (gameMode === "mistake") {
      setSelectedChoiceIndex(-1);
    }
    
    // Focus input for typing modes
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Handle declining Do Over
  const handleDeclineDoOver = () => {
    if (!doOverPendingResult) return;
    
    // Process the incorrect answer (sound, streak reset, add to incorrectWords)
    processIncorrectAnswer();
    
    // Close dialog
    setShowDoOverDialog(false);
    setDoOverPendingResult(null);
    
    // Continue with normal flow based on game mode
    if (gameMode === "quiz") {
      const newAnswer: QuizAnswer = {
        word: currentWord!,
        userAnswer: doOverPendingResult.userAnswer,
        isCorrect: false,
      };
      setQuizAnswers([...quizAnswers, newAnswer]);
      setUserInput("");
      
      if (currentWordIndex < (activeWords?.length || 10) - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        const allAnswers = [...quizAnswers, newAnswer];
        const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
        setScore(totalCorrect * 20);
        setGameComplete(true);
      }
    } else if (gameMode === "timed") {
      setUserInput("");
      if (activeWords && currentWordIndex < activeWords.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        setGameComplete(true);
      }
    } else if (gameMode === "scramble") {
      // Show feedback for scramble mode
      setIsCorrect(false);
      setShowFeedback(true);
    } else if (gameMode === "mistake") {
      // Show feedback for mistake mode
      setIsCorrect(false);
      setShowFeedback(true);
    } else {
      // Standard mode with feedback
      setIsCorrect(false);
      setShowFeedback(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    const correct = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    
    if (gameMode === "quiz") {
      if (correct) {
        const newAnswer: QuizAnswer = {
          word: currentWord,
          userAnswer: userInput.trim(),
          isCorrect: true,
        };
        setQuizAnswers([...quizAnswers, newAnswer]);
        
        playCorrectSound();
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        incrementWordStreakMutation.mutate();
        
        setUserInput("");
        
        if (currentWordIndex < (activeWords?.length || 10) - 1) {
          setCurrentWordIndex(currentWordIndex + 1);
        } else {
          const allAnswers = [...quizAnswers, newAnswer];
          const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
          setScore(totalCorrect * 20);
          playCelebrationSound();
          setGameComplete(true);
        }
      } else {
        // Incorrect - check for Do Over
        if (shouldOfferDoOver(gameMode)) {
          setDoOverPendingResult({
            userAnswer: userInput.trim(),
            correctWord: currentWord.word,
            wordIndex: currentWordIndex,
          });
          setShowDoOverDialog(true);
        } else {
          processIncorrectAnswer();
          
          const newAnswer: QuizAnswer = {
            word: currentWord,
            userAnswer: userInput.trim(),
            isCorrect: false,
          };
          setQuizAnswers([...quizAnswers, newAnswer]);
          setUserInput("");
          
          if (currentWordIndex < (activeWords?.length || 10) - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
          } else {
            const allAnswers = [...quizAnswers, newAnswer];
            const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
            setScore(totalCorrect * 20);
            setGameComplete(true);
          }
        }
      }
    } else if (gameMode === "timed") {
      // Timed mode: No feedback, immediate next word
      if (correct) {
        playCorrectSound();
        const points = 20;
        setScore(score + points + (streak * 5));
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        incrementWordStreakMutation.mutate();
        
        setUserInput("");
        
        if (activeWords && currentWordIndex < activeWords.length - 1) {
          setCurrentWordIndex(currentWordIndex + 1);
        } else {
          setGameComplete(true);
        }
      } else {
        // Incorrect - check for Do Over
        if (shouldOfferDoOver(gameMode)) {
          setDoOverPendingResult({
            userAnswer: userInput.trim(),
            correctWord: currentWord.word,
            wordIndex: currentWordIndex,
          });
          setShowDoOverDialog(true);
        } else {
          processIncorrectAnswer();
          setUserInput("");
          
          if (activeWords && currentWordIndex < activeWords.length - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
          } else {
            setGameComplete(true);
          }
        }
      }
    } else {
      // Standard and Practice modes: Show feedback
      setIsCorrect(correct);

      if (correct) {
        playCorrectSound();
        const points = 20;
        setScore(score + points + (streak * 5));
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        incrementWordStreakMutation.mutate();
        setShowFeedback(true);
      } else {
        // Incorrect - check for Do Over (but not in practice mode)
        if (shouldOfferDoOver(gameMode)) {
          setDoOverPendingResult({
            userAnswer: userInput.trim(),
            correctWord: currentWord.word,
            wordIndex: currentWordIndex,
          });
          setShowDoOverDialog(true);
        } else {
          processIncorrectAnswer();
          setShowFeedback(true);
        }
      }
    }
  };

  const handleNext = () => {
    setUserInput("");
    setShowFeedback(false);
    
    // Scroll word image into view on mobile to ensure it appears at top
    setTimeout(() => {
      if (wordImageRef.current) {
        wordImageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (gameCardRef.current) {
        // Fallback if no image exists
        gameCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    if (activeWords && currentWordIndex < activeWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setGameComplete(true);
    }
  };

  const handleTryAgain = () => {
    setUserInput("");
    setShowFeedback(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSkip = () => {
    setUserInput("");
    if (activeWords && currentWordIndex < activeWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setGameComplete(true);
    }
  };

  // Scramble mode drag-and-drop handlers
  const handleDragStart = (letter: string, sourceIndex: number) => {
    setDraggedLetter({ letter, sourceIndex });
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (targetIndex: number) => {
    if (!draggedLetter) return;

    const newPlaced = [...placedLetters];
    const newScrambled = [...scrambledLetters];

    // If dropping on a filled slot, swap with the displaced letter
    if (newPlaced[targetIndex] !== null) {
      const displaced = newPlaced[targetIndex]!;
      // Put displaced letter back to its original source position in the tray
      newScrambled[displaced.sourceIndex] = displaced.letter;
      // Place the dragged letter in the target slot
      newPlaced[targetIndex] = { letter: draggedLetter.letter, sourceIndex: draggedLetter.sourceIndex };
      // Clear the dragged letter's source slot in the tray
      newScrambled[draggedLetter.sourceIndex] = '';
    } else {
      // Dropping on empty slot - just move the letter
      newPlaced[targetIndex] = { letter: draggedLetter.letter, sourceIndex: draggedLetter.sourceIndex };
      // Clear the source slot only (the tile has moved from tray to placement)
      newScrambled[draggedLetter.sourceIndex] = '';
    }

    setPlacedLetters(newPlaced);
    setScrambledLetters(newScrambled);
    setDraggedLetter(null);
    setIsDragging(false);
  };

  const handleRemoveLetter = (targetIndex: number) => {
    if (placedLetters[targetIndex] === null) return;

    const placed = placedLetters[targetIndex]!;
    const newPlaced = [...placedLetters];
    const newScrambled = [...scrambledLetters];

    // Return letter to its original source position
    newScrambled[placed.sourceIndex] = placed.letter;
    newPlaced[targetIndex] = null;

    setPlacedLetters(newPlaced);
    setScrambledLetters(newScrambled);
  };

  // Handle clicking/tapping a scrambled letter to place it in the next open slot
  const handlePlaceLetter = (sourceIndex: number) => {
    // Ignore clicks if a drag operation is in progress
    if (isDragging) {
      return;
    }

    const letter = scrambledLetters[sourceIndex];
    if (!letter) return;

    const newPlaced = [...placedLetters];
    const newScrambled = [...scrambledLetters];

    // Find first empty spot in placed letters
    const emptyIndex = newPlaced.findIndex(l => l === null);
    if (emptyIndex !== -1) {
      newPlaced[emptyIndex] = { letter, sourceIndex };
      newScrambled[sourceIndex] = '';
      setPlacedLetters(newPlaced);
      setScrambledLetters(newScrambled);
    }
  };

  // Handle drag end to reset isDragging flag (prevents stuck state)
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedLetter(null);
  };

  // Clear all placed letters and return them to the scrambled letters tray
  const handleClearScramble = () => {
    const newScrambled = [...scrambledLetters];
    
    // Return all placed letters to their source positions
    placedLetters.forEach((placed) => {
      if (placed) {
        newScrambled[placed.sourceIndex] = placed.letter;
      }
    });
    
    // Clear all placed letters
    setScrambledLetters(newScrambled);
    setPlacedLetters(new Array(currentWord?.word.length || 0).fill(null));
  };

  // Calculate dynamic tile size for scramble mode to fit all letters in one row
  const getTileSize = (wordLength: number) => {
    // Default tile sizes
    const defaultWidth = 60;
    const defaultHeight = 90;
    const defaultFontSize = 40;
    const defaultLineWidth = 30;
    
    // Measure Card width and subtract padding to get available width
    // Card has p-6 (48px total) on mobile, md:px-12 (96px total) on desktop
    const isMobile = window.innerWidth < 768;
    const cardPadding = isMobile ? 48 : 96; // 24px * 2 or 48px * 2
    const cardWidth = gameCardRef.current?.clientWidth || (isMobile ? 400 : 700);
    const containerWidth = Math.max(cardWidth - cardPadding, 200);
    
    // Default gap size (gap-2 = 8px on mobile, gap-3 = 12px on desktop)
    const defaultGapSize = isMobile ? 8 : 12;
    
    // Calculate total width needed with default sizes
    const totalGaps = (wordLength - 1) * defaultGapSize;
    const neededWidth = (wordLength * defaultWidth) + totalGaps;
    
    // If word fits with default sizes, use them
    if (neededWidth <= containerWidth) {
      return {
        width: defaultWidth,
        height: defaultHeight,
        fontSize: defaultFontSize,
        lineWidth: defaultLineWidth
      };
    }
    
    // Word is too long - scale down to fit in single row
    // Try reducing gap size first
    let gapSize = defaultGapSize;
    let availableWidth = containerWidth - ((wordLength - 1) * gapSize);
    
    while (availableWidth < wordLength * defaultWidth && gapSize > 0) {
      gapSize--;
      availableWidth = containerWidth - ((wordLength - 1) * gapSize);
    }
    
    // If still doesn't fit, scale down tile sizes proportionally
    if (availableWidth < wordLength * defaultWidth) {
      const scaledWidth = Math.max(1, Math.floor(availableWidth / wordLength));
      const scaleFactor = scaledWidth / defaultWidth;
      
      return {
        width: scaledWidth,
        height: Math.max(1, Math.floor(defaultHeight * scaleFactor)),
        fontSize: Math.max(1, Math.floor(defaultFontSize * scaleFactor)),
        lineWidth: Math.max(1, Math.floor(defaultLineWidth * scaleFactor))
      };
    }
    
    // Gaps reduced enough to fit with default tile sizes
    return {
      width: defaultWidth,
      height: defaultHeight,
      fontSize: defaultFontSize,
      lineWidth: defaultLineWidth
    };
  };

  const handleScrambleSubmit = () => {
    if (!currentWord) return;

    // Check if all letters are placed
    if (placedLetters.some(l => l === null)) {
      return; // Not all letters placed
    }

    const userAnswer = placedLetters.map(l => l!.letter).join('');
    const correct = userAnswer.toLowerCase() === currentWord.word.toLowerCase();

    if (correct) {
      setIsCorrect(true);
      setShowFeedback(true);
      playCorrectSound();
      const points = 20;
      setScore(score + points + (streak * 5));
      setCorrectCount(correctCount + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }
      incrementWordStreakMutation.mutate();
    } else {
      // Incorrect - check for Do Over
      if (shouldOfferDoOver("scramble")) {
        setDoOverPendingResult({
          userAnswer: userAnswer,
          correctWord: currentWord.word,
          wordIndex: currentWordIndex,
        });
        setShowDoOverDialog(true);
      } else {
        setIsCorrect(false);
        setShowFeedback(true);
        playIncorrectSound();
        setStreak(0);
        setIncorrectWords([...incorrectWords, currentWord.word]);
        resetWordStreakMutation.mutate();
      }
    }
  };

  const handleMistakeChoice = (choiceIndex: number) => {
    centerGameCard();
    const correct = choiceIndex === misspelledIndex;
    
    setSelectedChoiceIndex(choiceIndex);

    if (correct) {
      setIsCorrect(true);
      setShowFeedback(true);
      playCorrectSound();
      const points = 20;
      setScore(score + points + (streak * 5));
      setCorrectCount(correctCount + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }
      incrementWordStreakMutation.mutate();
    } else {
      // Incorrect - check for Do Over
      if (shouldOfferDoOver("mistake")) {
        setDoOverPendingResult({
          userAnswer: mistakeChoices[choiceIndex] || "",
          correctWord: correctSpelling,
          wordIndex: currentWordIndex,
        });
        setShowDoOverDialog(true);
      } else {
        setIsCorrect(false);
        setShowFeedback(true);
        // Use common incorrect answer processing to track for 2nd Chance
        processIncorrectAnswer();
      }
    }
  };

  // Crossword mode handlers
  const focusFirstCellOfEntry = (entryNumber: number) => {
    if (!crosswordGrid) return;
    
    const entry = crosswordGrid.entries.find(e => e.number === entryNumber);
    if (entry) {
      setActiveEntry(entryNumber);
      
      // Focus first cell SYNCHRONOUSLY to maintain user gesture context (critical for mobile keyboard)
      const firstInput = document.querySelector(`input[data-row="${entry.row}"][data-col="${entry.col}"]`) as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }
  };

  const handleCrosswordCellFocus = (row: number, col: number) => {
    if (!crosswordGrid) return;
    
    // Check if this cell is part of the current active entry
    if (activeEntry !== null) {
      const currentEntry = crosswordGrid.entries.find(e => e.number === activeEntry);
      if (currentEntry) {
        // Check if the focused cell belongs to the current active entry
        for (let i = 0; i < currentEntry.word.length; i++) {
          const r = currentEntry.direction === "across" ? currentEntry.row : currentEntry.row + i;
          const c = currentEntry.direction === "across" ? currentEntry.col + i : currentEntry.col;
          if (r === row && c === col) {
            // Cell is part of current active entry, keep the same activeEntry
            return;
          }
        }
      }
    }
    
    // Cell is not part of current active entry, find all entries that contain this cell
    const containingEntries = crosswordGrid.entries.filter(entry => {
      for (let i = 0; i < entry.word.length; i++) {
        const r = entry.direction === "across" ? entry.row : entry.row + i;
        const c = entry.direction === "across" ? entry.col + i : entry.col;
        if (r === row && c === col) return true;
      }
      return false;
    });
    
    // Prefer "across" entries over "down" entries
    const entryToActivate = containingEntries.find(e => e.direction === "across") || containingEntries[0];
    
    if (entryToActivate) {
      setActiveEntry(entryToActivate.number);
    }
  };

  const handleCrosswordCellInput = (row: number, col: number, value: string) => {
    if (!crosswordGrid) return;
    
    const key = `${row}-${col}`;
    
    // Clear mistake highlight for THIS specific cell if it exists
    if (highlightedMistakes.has(key)) {
      const newHighlights = new Set(highlightedMistakes);
      newHighlights.delete(key);
      setHighlightedMistakes(newHighlights);
    }
    
    const newInputs = { ...crosswordInputs };
    
    // Only allow single letters
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    newInputs[key] = value.toUpperCase();
    setCrosswordInputs(newInputs);
    
    // Auto-advance to next cell in active entry (except for last letter)
    if (value && activeEntry !== null) {
      const entry = crosswordGrid.entries.find(e => e.number === activeEntry);
      if (entry) {
        const cells = [];
        for (let i = 0; i < entry.word.length; i++) {
          const r = entry.direction === "across" ? entry.row : entry.row + i;
          const c = entry.direction === "across" ? entry.col + i : entry.col;
          cells.push({ r, c });
        }
        
        const currentIndex = cells.findIndex(cell => cell.r === row && cell.c === col);
        // Only advance if NOT on the last letter
        if (currentIndex >= 0 && currentIndex < cells.length - 1) {
          const nextCell = cells[currentIndex + 1];
          // Focus next input
          setTimeout(() => {
            const nextInput = document.querySelector(`input[data-row="${nextCell.r}"][data-col="${nextCell.c}"]`) as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
            }
          }, 10);
        }
      }
    }
  };

  const handleCrosswordKeyDown = (row: number, col: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!crosswordGrid) return;
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const key = `${row}-${col}`;
      const currentValue = crosswordInputs[key] || '';
      
      // If cell has a value, just clear it (don't move)
      if (currentValue) {
        e.preventDefault();
        const newInputs = { ...crosswordInputs };
        newInputs[key] = '';
        setCrosswordInputs(newInputs);
        
        // Clear highlight for this cell if it exists
        if (highlightedMistakes.has(key)) {
          const newHighlights = new Set(highlightedMistakes);
          newHighlights.delete(key);
          setHighlightedMistakes(newHighlights);
        }
        return;
      }
      
      // If cell is empty, move to previous cell
      e.preventDefault();
      
      // Find which entry this cell belongs to
      let currentEntry = activeEntry ? crosswordGrid.entries.find(e => e.number === activeEntry) : null;
      
      // If no active entry, find entry containing this cell
      if (!currentEntry) {
        currentEntry = crosswordGrid.entries.find(entry => {
          for (let i = 0; i < entry.word.length; i++) {
            const r = entry.direction === "across" ? entry.row : entry.row + i;
            const c = entry.direction === "across" ? entry.col + i : entry.col;
            if (r === row && c === col) return true;
          }
          return false;
        });
      }
      
      if (currentEntry) {
        const cells = [];
        for (let i = 0; i < currentEntry.word.length; i++) {
          const r = currentEntry.direction === "across" ? currentEntry.row : currentEntry.row + i;
          const c = currentEntry.direction === "across" ? currentEntry.col + i : currentEntry.col;
          cells.push({ r, c });
        }
        
        const currentIndex = cells.findIndex(cell => cell.r === row && cell.c === col);
        
        // Move to previous cell if not at start
        if (currentIndex > 0) {
          const prevCell = cells[currentIndex - 1];
          const prevKey = `${prevCell.r}-${prevCell.c}`;
          const prevInput = document.querySelector(`input[data-row="${prevCell.r}"][data-col="${prevCell.c}"]`) as HTMLInputElement;
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
            
            // Clear the previous cell
            const newInputs = { ...crosswordInputs };
            newInputs[prevKey] = '';
            setCrosswordInputs(newInputs);
            
            // Clear highlights for both current and previous cells if they exist
            if (highlightedMistakes.has(key) || highlightedMistakes.has(prevKey)) {
              const newHighlights = new Set(highlightedMistakes);
              newHighlights.delete(key);
              newHighlights.delete(prevKey);
              setHighlightedMistakes(newHighlights);
            }
          }
        }
      }
    }
  };

  const handleShowMistakes = () => {
    if (!crosswordGrid) return;
    
    const mistakes = new Set<string>();
    
    crosswordGrid.entries.forEach(entry => {
      for (let i = 0; i < entry.word.length; i++) {
        const r = entry.direction === "across" ? entry.row : entry.row + i;
        const c = entry.direction === "across" ? entry.col + i : entry.col;
        const userLetter = crosswordInputs[`${r}-${c}`] || '';
        
        // Only highlight if user typed something AND it's wrong (not empty cells)
        if (userLetter && userLetter.toUpperCase() !== entry.word[i].toUpperCase()) {
          mistakes.add(`${r}-${c}`);
        }
      }
    });
    
    setHighlightedMistakes(mistakes);
  };

  const handleCrosswordSubmit = () => {
    if (!crosswordGrid) return;
    
    let correctWords = 0;
    let incorrectWords = 0;
    let totalScore = 0;
    const points = 20;
    
    // Check each entry
    crosswordGrid.entries.forEach(entry => {
      let entryCorrect = true;
      const userWord: string[] = [];
      
      for (let i = 0; i < entry.word.length; i++) {
        const r = entry.direction === "across" ? entry.row : entry.row + i;
        const c = entry.direction === "across" ? entry.col + i : entry.col;
        const userLetter = crosswordInputs[`${r}-${c}`] || '';
        userWord.push(userLetter);
        
        if (userLetter.toUpperCase() !== entry.word[i].toUpperCase()) {
          entryCorrect = false;
        }
      }
      
      if (entryCorrect) {
        correctWords++;
        totalScore += points;
        incrementWordStreakMutation.mutate();
      } else {
        incorrectWords++;
        setIncorrectWords(prev => [...prev, entry.word]);
        resetWordStreakMutation.mutate();
      }
      
      console.log(`Entry ${entry.number} (${entry.word}): User entered "${userWord.join('')}", Correct: ${entryCorrect}`);
    });
    
    const totalWords = crosswordGrid.entries.length;
    const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
    
    setCorrectCount(correctWords);
    setScore(totalScore);
    setFinalAccuracy(accuracy);
    
    // Add completion bonus if all words correct
    if (correctWords === totalWords) {
      playCelebrationSound();
      setScore(totalScore + points * 2); // 2x bonus for completing puzzle
      console.log('🎉 Crossword complete! Bonus applied');
    }
    
    // Save completed grid state (deep copy to avoid mutations)
    setCompletedGrid({
      inputs: { ...crosswordInputs },
      grid: { ...crosswordGrid }
    });
    
    setGameComplete(true);
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent, letter: string, sourceIndex: number) => {
    const touch = e.touches[0];
    setTouchDragging(true);
    setIsDragging(true);
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    setDraggedLetter({ letter, sourceIndex });
    setDraggedLetterElement(letter);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragging || !draggedLetter) {
      setTouchDragging(false);
      setIsDragging(false);
      setTouchPosition(null);
      setDraggedLetterElement(null);
      return;
    }

    const touch = e.changedTouches[0];
    
    // Find which drop zone the touch ended over
    let targetIndex = -1;
    for (let i = 0; i < dropZoneRefs.current.length; i++) {
      const dropZone = dropZoneRefs.current[i];
      if (dropZone) {
        const rect = dropZone.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          targetIndex = i;
          break;
        }
      }
    }

    // If dropped on a valid drop zone, place the letter
    if (targetIndex !== -1) {
      const newPlaced = [...placedLetters];
      const newScrambled = [...scrambledLetters];

      // If dropping on a filled slot, swap with the displaced letter
      if (newPlaced[targetIndex] !== null) {
        const displaced = newPlaced[targetIndex]!;
        // Put displaced letter back to its original source position in the tray
        newScrambled[displaced.sourceIndex] = displaced.letter;
        // Place the dragged letter in the target slot
        newPlaced[targetIndex] = { letter: draggedLetter.letter, sourceIndex: draggedLetter.sourceIndex };
        // Clear the dragged letter's source slot in the tray
        newScrambled[draggedLetter.sourceIndex] = '';
      } else {
        // Dropping on empty slot - just move the letter
        newPlaced[targetIndex] = { letter: draggedLetter.letter, sourceIndex: draggedLetter.sourceIndex };
        // Clear the source slot only (the tile has moved from tray to placement)
        newScrambled[draggedLetter.sourceIndex] = '';
      }

      setPlacedLetters(newPlaced);
      setScrambledLetters(newScrambled);
    }

    // Reset touch state
    setTouchDragging(false);
    setIsDragging(false);
    setTouchPosition(null);
    setDraggedLetter(null);
    setDraggedLetterElement(null);
  };

  // Note: listId validation is handled by Game wrapper component above
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--page-game-bg))' }}>
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-2xl font-semibold">Loading words...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (gameComplete) {
    // For timed mode, only count words where Check button was pressed (correct + incorrect)
    // If timer expired (timeLeft === 0): currentWordIndex = words checked
    // If all words checked (timeLeft > 0): currentWordIndex + 1 = words checked
    // Use activeWords.length for second chance mode
    const totalWords = gameMode === "timed" 
      ? (timeLeft === 0 ? currentWordIndex : currentWordIndex + 1)
      : (activeWords?.length || 10);
    // Use stored accuracy for crossword mode, calculate for other modes
    const accuracy = gameMode === "crossword" 
      ? finalAccuracy 
      : (totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0);
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        {/* Portrait background */}
        <div 
          className="fixed inset-0 portrait:block landscape:hidden pointer-events-none"
          style={{
            backgroundImage: `url(${themeAssets.backgroundPortrait})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
          }}
        ></div>
        {/* Landscape background */}
        <div 
          className="fixed inset-0 portrait:hidden landscape:block pointer-events-none"
          style={{
            backgroundImage: `url(${themeAssets.backgroundLandscape})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
          }}
        ></div>
        <div className="fixed inset-0 bg-white/5 dark:bg-black/50 pointer-events-none"></div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl relative z-10"
        >
          <Card className="p-8 md:p-12 space-y-8">
            {gameMode !== "crossword" && (
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-center"
              >
                <motion.img 
                  src={accuracy === 100 ? themeAssets.mascotTrophy : themeAssets.mascotGoodTry} 
                  alt={accuracy === 100 ? "Trophy Mascot" : "Good Try Mascot"}
                  className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-2 object-contain"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 font-crayon" data-testid="text-game-complete">
                  {accuracy === 100 ? "Amazing Work!" : 
                    gameMode === "practice" ? "Practice Complete!" :
                    gameMode === "timed" ? "Timed Challenge Complete!" :
                    gameMode === "quiz" ? "Quiz Complete!" :
                    gameMode === "scramble" ? "Word Scramble Complete!" :
                    gameMode === "mistake" ? "Find the Mistake Complete!" :
                    "Game Complete!"}
                </h1>
              </motion.div>
            )}

            {gameMode === "crossword" ? (
              <div className="flex justify-center my-2">
                <motion.img 
                  src={accuracy === 100 ? themeAssets.mascotTrophy : themeAssets.mascotGoodTry} 
                  alt={accuracy === 100 ? "Trophy Mascot" : "Good Try Mascot"}
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-6 bg-purple-50 border-purple-200">
                  <div className="text-4xl md:text-5xl font-bold text-purple-600" data-testid="text-final-score">
                    {score}
                  </div>
                  <div className="text-lg text-gray-600 mt-2">Points</div>
                </Card>
                <Card className="p-6 bg-green-50 border-green-200">
                  <div className="text-4xl md:text-5xl font-bold text-green-600" data-testid="text-accuracy">
                    {accuracy}%
                  </div>
                  <div className="text-lg text-gray-600 mt-2">Accuracy</div>
                </Card>
              </div>
            )}

            <div className="space-y-3 text-center">
              <p className="text-lg text-gray-700">
                {gameMode === "crossword" && completedGrid ? (
                  <>You got <span className="font-bold text-gray-900" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                  <span className="font-bold text-gray-900">{completedGrid.grid.entries.length}</span> words correct! (<span className="font-bold text-gray-900" data-testid="text-accuracy">{accuracy}%</span> accuracy)</>
                ) : gameMode === "timed" ? (
                  <>You spelled <span className="font-bold text-gray-900" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                  <span className="font-bold text-gray-900">{totalWords}</span> words correctly in 60 seconds!</>
                ) : secondChanceMode ? (
                  <>2nd Chance: You spelled <span className="font-bold text-gray-900" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                  <span className="font-bold text-gray-900">{activeWords?.length}</span> words correctly!</>
                ) : (
                  <>You spelled <span className="font-bold text-gray-900" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                  <span className="font-bold text-gray-900">{activeWords?.length}</span> words correctly!</>
                )}
              </p>
              {achievementEarned && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 flex items-center justify-center gap-3"
                  data-testid="achievement-notification"
                >
                  <img 
                    src={achievementStar} 
                    alt="Achievement Star" 
                    className="w-12 h-12 object-contain"
                  />
                  <p className="text-lg font-bold text-yellow-800">
                    Achievement Earned! You earned a star for this word list!
                  </p>
                </motion.div>
              )}
              {bestStreak > 2 && (
                <p className="text-orange-600 font-semibold flex items-center justify-center gap-2 text-lg">
                  Best streak: {bestStreak} words in a row! <Flame className="w-6 h-6" />
                </p>
              )}
            </div>

            {gameMode === "crossword" && completedGrid && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 text-center">Completed Puzzle</h3>
                <div className="overflow-x-auto w-full">
                  <div className="min-w-fit mx-auto px-4">
                    <div className="inline-grid" style={{ gridTemplateColumns: `repeat(${completedGrid.grid.cols}, 2.5rem)`, gap: '2px' }}>
                    {completedGrid.grid.cells.map((row, rowIndex) => 
                      row.map((cell, colIndex) => {
                        if (cell.isBlank) {
                          return <div key={`${rowIndex}-${colIndex}`} className="w-10 h-10 bg-gray-900"></div>;
                        }
                        
                        // Find the correct letter for this cell
                        let correctLetter = '';
                        let isIncorrect = false;
                        completedGrid.grid.entries.forEach(entry => {
                          for (let i = 0; i < entry.word.length; i++) {
                            const r = entry.direction === "across" ? entry.row : entry.row + i;
                            const c = entry.direction === "across" ? entry.col + i : entry.col;
                            if (r === rowIndex && c === colIndex) {
                              correctLetter = entry.word[i];
                              const userLetter = completedGrid.inputs[`${r}-${c}`] || '';
                              if (userLetter.toUpperCase() !== correctLetter.toUpperCase()) {
                                isIncorrect = true;
                              }
                            }
                          }
                        });
                        
                        const userLetter = completedGrid.inputs[`${rowIndex}-${colIndex}`] || '';
                        
                        return (
                          <div key={`${rowIndex}-${colIndex}`} className="relative">
                            <div className={`w-10 h-10 border-2 ${isIncorrect ? 'border-red-500 bg-red-50' : 'border-gray-400 bg-white'} relative flex items-center justify-center overflow-visible`}>
                              {isIncorrect ? (
                                <>
                                  <span className="text-xl font-bold text-red-700 uppercase relative">
                                    {userLetter}
                                  </span>
                                  <span className="absolute top-0 right-0 text-sm font-bold text-gray-900 bg-white px-1 rounded-bl" style={{ fontSize: '0.75rem', lineHeight: '1' }}>
                                    {correctLetter.toUpperCase()}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xl font-bold text-gray-800 uppercase">
                                  {userLetter}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-600">
                  Incorrect letters are highlighted in red with the correct letter shown
                </p>
              </div>
            )}

            {gameMode === "quiz" && quizAnswers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-800 text-center">Quiz Review</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {quizAnswers.map((answer, index) => (
                    <Card
                      key={index}
                      className={`p-4 ${answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{answer.word.word.toUpperCase()}</div>
                          {!answer.isCorrect && (
                            <div className="text-sm text-gray-600">
                              Your answer: <span className="line-through">{answer.userAnswer}</span>
                            </div>
                          )}
                        </div>
                        {answer.isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 2nd Chance Button - only show when user has items and has incorrect words */}
            {gameMode !== "practice" && getItemQuantity("second_chance") > 0 && incorrectWords.length > 0 && !secondChanceMode && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="flex flex-col items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg border border-purple-200 dark:border-purple-700"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={secondChanceImage} 
                    alt="2nd Chance" 
                    className="w-16 h-16 object-contain"
                  />
                  <div className="text-left">
                    <p className="font-bold text-gray-800 dark:text-gray-100">Want a 2nd Chance?</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {gameMode === "crossword" 
                        ? "Fix the highlighted mistakes and re-submit"
                        : `Retry the ${incorrectWords.length} word${incorrectWords.length !== 1 ? 's' : ''} you missed`
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      You have {getItemQuantity("second_chance")} 2nd Chance{getItemQuantity("second_chance") !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUseSecondChance}
                  disabled={useItemMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                  data-testid="button-use-second-chance"
                >
                  {useItemMutation.isPending ? "Using..." : "Use 2nd Chance"}
                </Button>
              </motion.div>
            )}

            <div className="flex gap-3 flex-col sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 text-lg h-12"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                <Home className="w-5 h-5 mr-2" />
                Home
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1 text-lg h-12"
                onClick={onRestart}
                data-testid="button-play-again"
              >
                Play Again
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'hsl(var(--page-game-bg))' }}>
        <Card className="p-12 text-center space-y-6">
          <p className="text-2xl">No words available.</p>
          <Button onClick={() => setLocation("/")} size="lg" data-testid="button-back-home">
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const progress = activeWords ? ((currentWordIndex + 1) / activeWords.length) * 100 : 0;

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      {/* Portrait background */}
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      {/* Landscape background */}
      <div 
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${themeAssets.backgroundLandscape})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50"></div>
      <header className="p-4 md:px-2 md:py-2 bg-white/60 dark:bg-black/60 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 md:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="lg"
            className="md:h-8 md:text-sm md:px-2"
            onClick={handleHomeWithSave}
            data-testid="button-exit"
          >
            <Home className="w-5 h-5 md:w-4 md:h-4 mr-2 md:mr-1" />
            Home
          </Button>
          
          <div className="flex items-center gap-4 md:gap-2">
            {streak > 0 && gameMode !== "quiz" && (
              <div className="flex items-center gap-2 md:gap-1 text-orange-600">
                <Flame className="w-6 h-6 md:w-4 md:h-4" />
                <span className="text-xl md:text-sm font-bold" data-testid="text-streak">{streak}</span>
              </div>
            )}
            {gameMode !== "quiz" && (
              <div className="text-center">
                <div className="text-2xl md:text-lg font-bold text-purple-600" data-testid="text-current-score">
                  {score}
                </div>
                <div className="text-xs text-gray-600">Points</div>
              </div>
            )}
            
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="button-settings"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Customize your game experience
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="space-y-3">
                    <Label htmlFor="voice-select">Voice</Label>
                    <Select value={selectedVoice || undefined} onValueChange={handleVoiceChange}>
                      <SelectTrigger id="voice-select" data-testid="select-voice">
                        <SelectValue placeholder={availableVoices.length === 0 ? "No voices available" : "Select a voice"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.length === 0 ? (
                          <SelectItem value="none" disabled data-testid="voice-option-none">
                            No voices available
                          </SelectItem>
                        ) : (
                          availableVoices.map((voice) => (
                            <SelectItem key={voice.name} value={voice.name} data-testid={`voice-option-${voice.name}`}>
                              {voice.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedVoice && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => speakWord("Test")}
                        data-testid="button-test-voice"
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        Test Voice
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="word-hints">Word Length Hints</Label>
                        <p className="text-sm text-muted-foreground">
                          Show blank spaces for each letter
                        </p>
                      </div>
                      <Switch
                        id="word-hints"
                        checked={showWordHints}
                        onCheckedChange={setShowWordHints}
                        data-testid="switch-word-hints"
                      />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main 
        className="flex-1 flex items-center md:items-start justify-center p-4 md:px-6 md:pt-0 md:pb-0 relative z-10 overflow-auto md:min-h-screen md:overflow-visible"
        style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : undefined }}
      >
        {loadingCrossword ? (
          <div className="w-full max-w-3xl">
            <Card className="p-12 text-center space-y-4" data-testid="card-crossword-loading">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
              <p className="text-xl text-gray-600">Generating crossword puzzle...</p>
            </Card>
          </div>
        ) : gameMode === "crossword" && crosswordGrid ? (
          <div className="w-full max-w-6xl">
            <Card className="p-6 md:p-8 space-y-6 bg-white">
              {/* 2nd Chance Mode Banner */}
              {secondChanceMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-300 dark:border-purple-600 rounded-lg p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-3">
                    <img src={secondChanceImage} alt="2nd Chance" className="w-10 h-10 object-contain" />
                    <div>
                      <p className="font-bold text-purple-800 dark:text-purple-200">2nd Chance Mode</p>
                      <p className="text-sm text-purple-600 dark:text-purple-300">Fix the highlighted mistakes and re-submit</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2" data-testid="text-instruction">
                  {secondChanceMode ? "Fix Your Mistakes" : "Solve the Crossword Puzzle"}
                </h2>
                <p className="text-gray-600">
                  {secondChanceMode 
                    ? "Correct the red highlighted cells and submit again"
                    : "Click the play icon at the start of each word to hear the word"
                  }
                </p>
              </div>

              <div ref={crosswordScrollRef} className="overflow-x-auto px-4">
                {/* Crossword Grid - Horizontally centered, scrollable if too wide */}
                <div className="w-max mx-auto" style={{ display: 'grid', gridTemplateColumns: `repeat(${crosswordGrid.cols}, 2.5rem)`, gap: '2px' }}>
                  {crosswordGrid.cells.map((row, rowIndex) => 
                      row.map((cell, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const isMistake = highlightedMistakes.has(cellKey);
                        
                        return (
                          <div key={cellKey} className="relative">
                            {cell.isBlank ? (
                              <div className="w-10 h-10 bg-gray-900"></div>
                            ) : (
                              <div className={`w-10 h-10 border-2 ${isMistake ? 'border-red-600 bg-red-600' : 'border-gray-400 bg-white'} relative flex items-center justify-center overflow-visible`}>
                                {cell.number && (() => {
                                  const entry = crosswordGrid.entries.find(e => e.number === cell.number);
                                  return entry ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        speakWord(entry.word);
                                        focusFirstCellOfEntry(entry.number);
                                      }}
                                      className="absolute top-0 left-0 w-4 h-4 p-0 flex items-center justify-center hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 z-10"
                                      data-testid={`button-cell-play-${cell.number}`}
                                    >
                                      <img 
                                        src={playWordImage} 
                                        alt="Play" 
                                        className="w-3.5 h-3.5"
                                      />
                                    </button>
                                  ) : null;
                                })()}
                                <Input
                                  type="text"
                                  maxLength={1}
                                  value={crosswordInputs[cellKey] || ''}
                                  onChange={(e) => handleCrosswordCellInput(rowIndex, colIndex, e.target.value)}
                                  onKeyDown={(e) => handleCrosswordKeyDown(rowIndex, colIndex, e)}
                                  onFocus={(e) => {
                                    handleCrosswordCellFocus(rowIndex, colIndex);
                                    e.target.select();
                                  }}
                                  className={`w-full h-full text-center text-xl font-bold border-0 p-0 uppercase focus-visible:ring-1 focus-visible:ring-primary ${isMistake ? 'text-white bg-red-600' : 'bg-transparent'}`}
                                  autoComplete="one-time-code"
                                  autoCorrect="off"
                                  autoCapitalize="off"
                                  spellCheck={false}
                                  enterKeyHint="done"
                                  data-form-type="other"
                                  data-row={rowIndex}
                                  data-col={colIndex}
                                  data-testid={`cell-${rowIndex}-${colIndex}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                {!secondChanceMode && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleShowMistakes}
                    data-testid="button-show-mistakes"
                  >
                    Show Mistakes
                  </Button>
                )}
                <Button
                  size="lg"
                  onClick={handleCrosswordSubmit}
                  className={secondChanceMode ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white" : ""}
                  data-testid="button-submit-crossword"
                >
                  {secondChanceMode ? "Re-submit Puzzle" : "Check Puzzle"}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="w-full max-w-3xl space-y-6 md:space-y-0">
            {gameMode !== "crossword" && (
              <div ref={progressBarRef} className="space-y-4 md:space-y-1 md:mt-2 md:mb-2">
                <div className="flex items-center justify-between text-base md:text-sm font-semibold">
                  <span className="text-gray-600" data-testid="text-word-progress">
                    {secondChanceMode ? "2nd Chance: " : ""}Word {currentWordIndex + 1} of {activeWords?.length || 0}
                  </span>
                </div>
                <Progress value={progress} className="h-3 md:h-2" data-testid="progress-game" />
              </div>
            )}

            <AnimatePresence mode="wait">
              {gameMode === "quiz" || !showFeedback ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card ref={gameCardRef} className="p-6 md:px-12 md:pt-6 md:pb-12 space-y-4 bg-white">
                  <div className="text-center space-y-3">
                    <div className="relative">
                      {gameMode === "timed" && !showFeedback && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                          <Clock className="w-8 h-8" />
                          <span className="text-2xl font-bold" data-testid="text-timer">{timeLeft}s</span>
                        </div>
                      )}
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-800" data-testid="text-instruction">
                        {gameMode === "quiz" ? "Spell the word" : gameMode === "scramble" ? "Unscramble the letters" : gameMode === "mistake" ? "Find the misspelled word" : "Listen and spell the word"}
                      </h2>
                    </div>
                    
                    {gameMode !== "mistake" && currentWord && wordIllustrations && (() => {
                      const illustration = wordIllustrations.find(
                        (ill) => ill.word === currentWord.word.toLowerCase()
                      );
                      return illustration && illustration.imagePath ? (
                        <motion.div
                          ref={wordImageRef}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.4, type: "spring" }}
                          className="flex justify-center"
                        >
                          <img 
                            src={illustration.imagePath}
                            alt={`Cartoon ${currentWord.word}`}
                            className="w-32 h-32 md:w-48 md:h-48 object-contain"
                            data-testid="img-word-illustration"
                          />
                        </motion.div>
                      ) : null;
                    })()}
                  </div>

                  <form onSubmit={gameMode === "scramble" ? (e) => { e.preventDefault(); handleScrambleSubmit(); } : gameMode === "mistake" ? (e) => { e.preventDefault(); } : handleSubmit} className="space-y-6">
                    {gameMode === "mistake" && mistakeChoices.length === 4 && currentWord ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mistakeChoices.map((word, index) => (
                            <div key={index} className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="h-16 md:h-20 text-xl md:text-2xl font-bold border-2 w-full pr-14 md:pr-16"
                                onClick={() => handleMistakeChoice(index)}
                                data-testid={`button-choice-${index}`}
                              >
                                {word.toUpperCase()}
                              </Button>
                              <div className="absolute top-2 right-2 md:top-3 md:right-3 pointer-events-none">
                                <button
                                  type="button"
                                  className="w-10 h-10 md:w-12 md:h-12 p-0 bg-transparent border-0 hover:scale-110 transition-transform cursor-pointer pointer-events-auto"
                                  onClick={() => speakWord(index === misspelledIndex ? correctSpelling : word)}
                                  data-testid={`button-speak-${index}`}
                                  aria-label={`Hear pronunciation of ${word}`}
                                >
                                  <img 
                                    src={playWordIconWithBorder} 
                                    alt="Play" 
                                    className="w-full h-full"
                                  />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-center text-sm text-gray-600">
                          Click on the word that is spelled incorrectly
                        </div>
                      </div>
                    ) : gameMode === "scramble" && currentWord ? (
                      <div className="space-y-8 overscroll-contain">
                        {/* Drop zones - blank spaces to place letters */}
                        <div className="flex items-center justify-center gap-2 md:gap-3" ref={scrambleContainerRef}>
                          {placedLetters.map((letter, index) => {
                            const tileSize = getTileSize(currentWord.word.length);
                            
                            return (
                              <div
                                key={`target-${index}`}
                                className="relative"
                                ref={(el) => (dropZoneRefs.current[index] = el)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(index)}
                              >
                                <div
                                  className="rounded-xl border-2 border-dashed border-primary bg-purple-50 flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 touch-none"
                                  style={{
                                    width: `${tileSize.width}px`,
                                    height: `${tileSize.height}px`,
                                  }}
                                  data-testid={`drop-zone-${index}`}
                                  onClick={() => handleRemoveLetter(index)}
                                >
                                  {letter ? (
                                    <span 
                                      className="font-bold text-gray-800"
                                      style={{ fontSize: `${tileSize.fontSize}px` }}
                                    >
                                      {letter.letter.toUpperCase()}
                                    </span>
                                  ) : (
                                    <div 
                                      className="h-0.5 bg-gray-400"
                                      style={{ width: `${tileSize.lineWidth}px` }}
                                    ></div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Draggable letter tiles */}
                        <div className="flex items-center justify-center gap-2 md:gap-3" onTouchMove={handleTouchMove}>
                          {scrambledLetters.map((letter, index) => {
                            const tileSize = getTileSize(currentWord.word.length);
                            
                            return letter && (
                              <div
                                key={`source-${index}`}
                                draggable
                                onDragStart={() => handleDragStart(letter, index)}
                                onDragEnd={handleDragEnd}
                                onTouchStart={(e) => handleTouchStart(e, letter, index)}
                                onTouchEnd={handleTouchEnd}
                                onClick={() => handlePlaceLetter(index)}
                                className="rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 touch-none"
                                style={{
                                  width: `${tileSize.width}px`,
                                  height: `${tileSize.height}px`,
                                }}
                                data-testid={`letter-tile-${index}`}
                              >
                                <span 
                                  className="font-bold text-gray-800 select-none"
                                  style={{ fontSize: `${tileSize.fontSize}px` }}
                                >
                                  {letter.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearScramble}
                            className="text-xs md:text-sm"
                            data-testid="button-clear-scramble"
                          >
                            Clear
                          </Button>
                          <div className="text-center text-sm text-gray-600">
                            Click or drag the yellow tiles to fill the blank spaces above
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div ref={inputContainerRef}>
                        {/* Mobile timer - positioned above input field */}
                        {gameMode === "timed" && !showFeedback && (
                          <div className={`flex md:hidden items-center gap-2 mb-3 ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                            <Clock className="w-5 h-5" />
                            <span className="text-lg font-bold" data-testid="text-timer-mobile">{timeLeft}s</span>
                          </div>
                        )}
                        {showWordHints && currentWord && gameMode !== "quiz" ? (
                          (() => {
                            const hintSize = getHintLetterSize(currentWord.word.length);
                            const inputStyle = getInputFontSize(currentWord.word.length);
                            return (
                              <div className="relative">
                                <Input
                                  ref={inputCallbackRef}
                                  type="text"
                                  value={userInput}
                                  onChange={(e) => setUserInput(e.target.value)}
                                  onFocus={centerGameCard}
                                  className={`text-transparent caret-transparent absolute inset-0 text-center ${inputStyle.className} h-16 md:h-20 rounded-2xl bg-transparent border-transparent pointer-events-auto`}
                                  style={{ fontSize: inputStyle.fontSize, caretColor: 'transparent' }}
                                  autoComplete="one-time-code"
                                  autoCorrect="off"
                                  autoCapitalize="off"
                                  spellCheck={false}
                                  enterKeyHint="done"
                                  data-form-type="other"
                                  autoFocus
                                  data-testid="input-spelling"
                                />
                                <div 
                                  className={`h-16 md:h-20 rounded-2xl border-2 border-input bg-background flex items-center justify-center ${hintSize.gapClass} px-4 cursor-text pointer-events-none`}
                                >
                                  {Array.from({ length: Math.max(currentWord.word.length, userInput.length) }).map((_, index) => {
                                    const isExcessLetter = index >= currentWord.word.length;
                                    return (
                                      <div key={index} className="flex flex-col items-center gap-1">
                                        <div 
                                          className={`${hintSize.useInline ? '' : hintSize.fontClass} font-semibold text-gray-800 h-8 md:h-10 flex items-center justify-center uppercase`} 
                                          style={{ 
                                            minWidth: hintSize.minWidth,
                                            fontSize: hintSize.useInline ? hintSize.fontSize : undefined
                                          }}
                                        >
                                          {userInput[index] || ""}
                                        </div>
                                        <div 
                                          className={isExcessLetter ? "h-1 bg-red-600" : "h-0.5 bg-gray-400"} 
                                          style={{ width: hintSize.minWidth }}
                                        ></div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          (() => {
                            const inputStyle = getInputFontSize(currentWord?.word.length || 8);
                            return (
                              <Input
                                ref={inputCallbackRef}
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onFocus={centerGameCard}
                                className={`text-center ${inputStyle.className} h-16 md:h-20 rounded-2xl`}
                                style={{ fontSize: inputStyle.fontSize }}
                                placeholder="Type your answer..."
                                autoComplete="one-time-code"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                enterKeyHint="done"
                                data-form-type="other"
                                autoFocus
                                data-testid="input-spelling"
                              />
                            );
                          })()
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {gameMode !== "mistake" && (
                        <div className="relative">
                          {/* Hint buttons 2x2 grid */}
                          <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              tabIndex={-1}
                              className="text-sm md:text-base h-12 relative z-10"
                              onPointerDown={handleKeepInputFocused}
                              onTouchStart={handleKeepInputFocused}
                              onClick={(e) => speakPartsOfSpeech(e)}
                              disabled={!wordPartsOfSpeech || loadingDictionary}
                              data-testid="button-parts-of-speech"
                            >
                              <Sparkles className="w-4 h-4 mr-1.5" />
                              {loadingDictionary ? "Loading..." : "Part of Speech"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              tabIndex={-1}
                              className="text-sm md:text-base h-12 relative z-10"
                              onPointerDown={handleKeepInputFocused}
                              onTouchStart={handleKeepInputFocused}
                              onClick={(e) => speakOrigin(e)}
                              disabled={!wordOrigin}
                              data-testid="button-origin"
                            >
                              <Globe className="w-4 h-4 mr-1.5" />
                              Word Origin
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              tabIndex={-1}
                              className="text-sm md:text-base h-12 relative z-10"
                              onPointerDown={handleKeepInputFocused}
                              onTouchStart={handleKeepInputFocused}
                              onClick={(e) => speakDefinition(e)}
                              disabled={!wordDefinition || loadingDictionary}
                              data-testid="button-definition"
                            >
                              <BookOpen className="w-4 h-4 mr-1.5" />
                              {loadingDictionary ? "Loading..." : "Definition"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              tabIndex={-1}
                              className="text-sm md:text-base h-12 relative z-10"
                              onPointerDown={handleKeepInputFocused}
                              onTouchStart={handleKeepInputFocused}
                              onClick={(e) => speakExample(e)}
                              disabled={!wordExample || loadingDictionary}
                              data-testid="button-example"
                            >
                              <MessageSquare className="w-4 h-4 mr-1.5" />
                              {loadingDictionary ? "Loading..." : "Use in Sentence"}
                            </Button>
                          </div>
                          
                          {/* Centered play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <button
                              type="button"
                              tabIndex={-1}
                              className="w-20 h-20 md:w-24 md:h-24 p-0 bg-transparent border-0 hover:scale-110 transition-transform pointer-events-auto cursor-pointer"
                              onPointerDown={handleKeepInputFocused}
                              onTouchStart={handleKeepInputFocused}
                              onClick={(e) => {
                                if (currentWord) {
                                  speakWithRefocus(currentWord.word, e.currentTarget);
                                  centerGameCard();
                                }
                              }}
                              data-testid="button-play-audio"
                            >
                              <img 
                                src={playWordIconWithBorder} 
                                alt="Play word" 
                                className="w-full h-full"
                              />
                            </button>
                          </div>
                        </div>
                      )}

                      {gameMode !== "mistake" && (
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full text-lg h-12 md:h-14"
                          disabled={gameMode === "scramble" ? placedLetters.some(l => l === null) : !userInput.trim()}
                          data-testid="button-submit"
                        >
                          {gameMode === "quiz" || gameMode === "timed" ? "Submit" : "Check"}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      )}
                    </div>
                  </form>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className={`p-6 md:p-12 space-y-8 ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="text-center space-y-6">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-20 h-20 md:w-24 md:h-24 text-green-600 mx-auto" />
                        <h2 className="text-3xl md:text-5xl font-bold text-green-600" data-testid="text-correct">
                          Correct!
                        </h2>
                        {gameMode === "mistake" ? (
                          <div className="space-y-3">
                            <p className="text-xl md:text-2xl text-gray-600">The misspelled word was:</p>
                            <div className="text-3xl md:text-4xl font-semibold text-gray-700 line-through" data-testid="text-misspelled-word">
                              {mistakeChoices[misspelledIndex]?.toUpperCase()}
                            </div>
                            <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                            <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-word">
                              {correctSpelling.toUpperCase()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-word">
                            {currentWord?.word.toUpperCase()}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-20 h-20 md:w-24 md:h-24 text-red-600 mx-auto" />
                        <h2 className="text-3xl md:text-5xl font-bold text-red-600" data-testid="text-incorrect">
                          {gameMode === "timed" && timeLeft === 0 ? "Time's Up!" : "Not quite!"}
                        </h2>
                        <div className="space-y-3">
                          {gameMode === "mistake" ? (
                            <>
                              <p className="text-xl md:text-2xl text-gray-600">You selected:</p>
                              <div className="text-3xl md:text-4xl font-semibold text-green-600" data-testid="text-user-selected-word">
                                {mistakeChoices[selectedChoiceIndex]?.toUpperCase()}
                              </div>
                              <p className="text-lg md:text-xl text-gray-600">That word is spelled correctly!</p>
                              <div className="border-t border-gray-300 my-4"></div>
                              <p className="text-xl md:text-2xl text-gray-600">The misspelled word was:</p>
                              <div className="text-3xl md:text-4xl font-semibold text-gray-700 line-through" data-testid="text-misspelled-word">
                                {mistakeChoices[misspelledIndex]?.toUpperCase()}
                              </div>
                              <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                              <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-spelling">
                                {correctSpelling.toUpperCase()}
                              </div>
                            </>
                          ) : userInput ? (
                            <>
                              <p className="text-xl md:text-2xl text-gray-600">You wrote:</p>
                              <div className="text-3xl md:text-4xl font-semibold text-gray-700 line-through" data-testid="text-user-answer">
                                {userInput.toUpperCase()}
                              </div>
                              <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                              <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-spelling">
                                {currentWord?.word.toUpperCase()}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                              <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-spelling">
                                {currentWord?.word.toUpperCase()}
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-4 flex-col sm:flex-row">
                    <Button
                      ref={nextButtonRef}
                      variant="default"
                      size="lg"
                      className="flex-1 text-lg h-12 md:h-14"
                      onClick={handleNext}
                      data-testid="button-next"
                    >
                      {activeWords && currentWordIndex < activeWords.length - 1 ? 'Next Word' : 'See Results'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Restart button - shown during active gameplay only */}
          {!gameComplete && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartWithSave}
                data-testid="button-restart"
                className="text-gray-600 hover:text-gray-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart
              </Button>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Do Over Dialog */}
      <Dialog open={showDoOverDialog} onOpenChange={setShowDoOverDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Oops! That's not quite right</DialogTitle>
            <DialogDescription className="text-center">
              Would you like to use a Do Over to try again?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <img 
              src={doOverImage} 
              alt="Do Over" 
              className="w-24 h-24 object-contain"
            />
            <div className="text-center">
              <p className="text-lg font-medium">You have {getItemQuantity("do_over")} Do Over{getItemQuantity("do_over") !== 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">Using one lets you retry this word</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDeclineDoOver}
              className="w-full sm:w-auto"
              data-testid="button-decline-doover"
            >
              No thanks
            </Button>
            <Button
              onClick={handleUseDoOver}
              disabled={useItemMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-use-doover"
            >
              {useItemMutation.isPending ? "Using..." : "Use Do Over"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating letter element for touch dragging */}
      {touchDragging && touchPosition && draggedLetterElement && (
        <div
          style={{
            position: 'fixed',
            left: touchPosition.x - 24,
            top: touchPosition.y - 32,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="w-12 h-16 md:w-16 md:h-20 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-2xl flex items-center justify-center opacity-90"
        >
          <span className="text-2xl md:text-4xl font-bold text-gray-800 select-none">
            {draggedLetterElement.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
