import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, Home, ArrowRight, CheckCircle2, XCircle, Sparkles, Flame, Clock, SkipForward, Trophy, Settings, BookOpen, MessageSquare, Globe } from "lucide-react";
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

// Import background pattern
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";

// Import sound effects
import incorrectSoundUrl from "@assets/Incorrect spelling_1763574108566.mp3";

// Import custom Play Word button image
import playWordImage from "@assets/Play word icon_1763580897427.png";
import playWordIconWithBorder from "@assets/Play word icon with border_1763670707710.png";

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

// Wrapper component that validates listId before rendering game logic
// This prevents React Query hooks from running when listId is missing
export default function Game() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const listId = params.get("listId");
  const gameMode = (params.get("mode") || "standard") as GameMode;
  const quizCount = params.get("quizCount") || "all";

  // Defense-in-depth: Redirect if no listId
  useEffect(() => {
    if (!listId) {
      console.warn("Game component accessed without listId - redirecting to home");
      setLocation("/");
    }
  }, [listId, setLocation]);

  // Safety fallback if no listId - prevents hooks from running
  if (!listId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl mb-4">Please select a word list to play</p>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Only render game content when listId is confirmed
  // Pass all parameters as props to avoid GameContent parsing them
  return <GameContent listId={listId} gameMode={gameMode} quizCount={quizCount} />;
}

// Actual game component with all the hooks - only rendered when listId exists
// Receives all parameters as props to ensure hooks always have valid data
function GameContent({ listId, gameMode, quizCount }: { listId: string; gameMode: GameMode; quizCount: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
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
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWordHints, setShowWordHints] = useState(true);
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
      node.focus();
    }
  }, []);
  
  // Track viewport size for responsive scaling
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [inputContainerWidth, setInputContainerWidth] = useState(600); // Default fallback
  
  // Scramble mode states
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedLetters, setPlacedLetters] = useState<(string | null)[]>([]);
  const [draggedLetter, setDraggedLetter] = useState<{letter: string; sourceIndex: number} | null>(null);
  
  // Touch event states for mobile
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState<{x: number; y: number} | null>(null);
  const [draggedLetterElement, setDraggedLetterElement] = useState<string | null>(null);
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Container ref for measuring width in scramble mode
  const scrambleContainerRef = useRef<HTMLDivElement>(null);
  // Initialize with viewport-based estimate to avoid zero-width fallback
  const [scrambleContainerWidth, setScrambleContainerWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth - 32 : 0
  );
  
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
    mutationFn: async (sessionData: { gameMode: string; userId: number | null; customListId?: number }) => {
      const response = await apiRequest("POST", "/api/sessions", sessionData);
      return await response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: { score: number; accuracy: number; gameMode: GameMode; userId: number | null; sessionId: number }) => {
      const response = await apiRequest("POST", "/api/leaderboard", scoreData);
      return await response.json();
    },
  });

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
    queryKey: ['/api/word-lists', listId, gameMode, quizCount, sessionTimestamp],
    queryFn: async () => {
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
    enabled: !!listId,
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
    if (listId && gameMode && !sessionId && user) {
      createSessionMutation.mutate({ gameMode, userId: user.id });
    }
  }, [gameMode, sessionId, user, listId]);

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

  const currentWord = words?.[currentWordIndex];

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

  // Auto-focus input when word changes (fallback + immediate focus)
  useEffect(() => {
    if (currentWord && !showFeedback) {
      const isIOS = isIOSDevice();
      
      // Multiple focus attempts to ensure it works
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          
          // For iOS, also trigger click to ensure keyboard opens
          if (isIOS) {
            inputRef.current.click();
          }
        }
      };
      
      // Try immediately (critical for iOS keyboard)
      focusInput();
      
      // Try after short delay (for initial render)
      setTimeout(focusInput, 100);
      
      // Try after longer delay (for slower systems)
      setTimeout(focusInput, 300);
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
    if (showFeedback && gameMode === "standard") {
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
    if (gameComplete && !scoreSaved && sessionId && user && gameMode !== "standard") {
      // Use stored accuracy for crossword mode, calculate for other modes
      const accuracy = gameMode === "crossword"
        ? finalAccuracy
        : Math.round((correctCount / (words?.length || 10)) * 100);
      
      console.log("Saving score to leaderboard:", { score, accuracy, gameMode, sessionId });
      
      saveScoreMutation.mutate({
        score,
        accuracy,
        gameMode,
        userId: user.id,
        sessionId,
      });
      setScoreSaved(true);
    }
  }, [gameComplete, scoreSaved, score, gameMode, correctCount, finalAccuracy, words, sessionId, user]);

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

  // Function to center game card on mobile when keyboard appears or word changes
  const centerGameCard = useCallback(() => {
    if (gameCardRef.current && window.innerWidth < 768) {
      // Delay to allow content (images, animations) and keyboard to stabilize
      // 300ms ensures Framer Motion animations (400ms) have time to render
      setTimeout(() => {
        gameCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
  }, []);

  // Calculate dynamic font size for input fields based on word length
  // Returns both class name and inline style for precise scaling
  const getInputFontSize = (wordLength: number): { className: string; fontSize?: string } => {
    const isIPad = isIPadDevice();
    
    // Calculate what font size we need to fit the word
    const charWidth = inputContainerWidth / wordLength;
    const calculatedFontSize = Math.max(charWidth * 0.85, 10); // 85% of char width, min 10px
    
    // Define Tailwind font sizes in px (approximate)
    // iPad gets larger font sizes for better readability
    const fontSizes = {
      mobile: { '2xl': 24, 'xl': 20, 'lg': 18, 'base': 16 },
      ipad: { '4xl': 36, '3xl': 30, '2xl': 24, 'xl': 20 },  // Same as desktop for better readability
      desktop: { '4xl': 36, '3xl': 30, '2xl': 24, 'xl': 20 }
    };
    
    // Select appropriate Tailwind class if calculated size is close to a standard size
    // This gives us better typography when possible, falls back to custom for tight fits
    if (isIPad) {
      // iPad uses desktop-sized classes
      const sizes = fontSizes.ipad;
      if (wordLength <= 8 && calculatedFontSize >= sizes['4xl']) {
        return { className: 'text-4xl uppercase' };
      } else if (wordLength <= 12 && calculatedFontSize >= sizes['3xl']) {
        return { className: 'text-3xl uppercase' };
      } else if (wordLength <= 16 && calculatedFontSize >= sizes['2xl']) {
        return { className: 'text-2xl uppercase' };
      } else if (calculatedFontSize >= sizes.xl) {
        return { className: 'text-xl uppercase' };
      }
    } else if (isMobileViewport) {
      const sizes = fontSizes.mobile;
      if (wordLength <= 8 && calculatedFontSize >= sizes['2xl']) {
        return { className: 'text-2xl uppercase' };
      } else if (wordLength <= 12 && calculatedFontSize >= sizes.xl) {
        return { className: 'text-xl uppercase' };
      } else if (wordLength <= 16 && calculatedFontSize >= sizes.lg) {
        return { className: 'text-lg uppercase' };
      } else if (calculatedFontSize >= sizes.base) {
        return { className: 'text-base uppercase' };
      }
    } else {
      const sizes = fontSizes.desktop;
      if (wordLength <= 8 && calculatedFontSize >= sizes['4xl']) {
        return { className: 'text-4xl uppercase' };
      } else if (wordLength <= 12 && calculatedFontSize >= sizes['3xl']) {
        return { className: 'text-3xl uppercase' };
      } else if (wordLength <= 16 && calculatedFontSize >= sizes['2xl']) {
        return { className: 'text-2xl uppercase' };
      } else if (calculatedFontSize >= sizes.xl) {
        return { className: 'text-xl uppercase' };
      }
    }
    
    // For any word that doesn't fit standard sizes, use calculated font size
    // For iPad, guarantee at least 30px (text-3xl equivalent) for readability
    // This ensures Quiz mode and other modes have large enough text on iPad
    const finalFontSize = isIPad ? Math.max(calculatedFontSize * 1.5, 30) : calculatedFontSize;
    return { className: 'uppercase', fontSize: `${finalFontSize}px` };
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
      // Delay matches centerGameCard() to ensure consistent behavior with hint buttons
      // 300ms allows Framer Motion animations (400ms) to render before scrolling
      const timeoutId = setTimeout(() => {
        gameCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
      
      // Cleanup: Cancel pending scroll if word changes again before timeout fires
      return () => clearTimeout(timeoutId);
    }
  }, [currentWordIndex, showFeedback, currentWord]);

  // Desktop auto-scroll: Show progress bar but hide header
  useEffect(() => {
    // Only apply on desktop devices (viewport width >= 768px)
    const isDesktop = window.innerWidth >= 768;
    
    if (isDesktop && progressBarRef.current && currentWord && !showFeedback) {
      // Small delay to allow content to render/animate
      setTimeout(() => {
        // Scroll to progress bar element, which puts it at top of viewport
        // This hides the header (above progress bar) and shows the progress bar + game card
        progressBarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start', // Aligns top of progress bar with top of viewport
          inline: 'nearest'
        });
      }, 150);
    }
  }, [currentWordIndex, showFeedback]);

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

  // Measure scramble container width for dynamic tile sizing (use useLayoutEffect to measure before render)
  useLayoutEffect(() => {
    if (gameMode !== "scramble") {
      return;
    }

    const measureWidth = () => {
      if (scrambleContainerRef.current) {
        const rect = scrambleContainerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setScrambleContainerWidth(rect.width);
        }
      }
    };

    // Measure immediately (synchronously before paint)
    measureWidth();

    // Observe size changes
    let resizeObserver: ResizeObserver | null = null;
    if (scrambleContainerRef.current) {
      resizeObserver = new ResizeObserver(measureWidth);
      resizeObserver.observe(scrambleContainerRef.current);
    }

    // Also listen to window resize and orientation change
    window.addEventListener('resize', measureWidth);
    window.addEventListener('orientationchange', measureWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureWidth);
      window.removeEventListener('orientationchange', measureWidth);
    };
  }, [gameMode]); // Only depend on gameMode, not currentWord, to persist width across word changes

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

  // Play celebration sound when game completes with all words correct (for standard/practice/timed/scramble/mistake modes)
  useEffect(() => {
    if (gameComplete && words && gameMode !== "quiz" && gameMode !== "crossword") {
      // For standard, practice, timed, scramble, and mistake modes
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
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = wordLower.length - 2; i >= 0; i--) {
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
      
      // "ic" / "ick" swaps (fantastic -> fantastick, stick -> stic)
      () => {
        if (wordLower.endsWith('ic') && !wordLower.endsWith('ick')) {
          return wordLower + 'k';
        }
        if (wordLower.endsWith('ick')) {
          return wordLower.slice(0, -1);
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
      () => {
        const vowels = 'aeiou';
        for (let i = 1; i < wordLower.length - 1; i++) {
          if (vowels.includes(wordLower[i])) {
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
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = wordLower.length - 2; i >= 0; i--) {
          if (consonants.includes(wordLower[i]) && wordLower[i] !== wordLower[i + 1]) {
            return wordLower.slice(0, i + 1) + wordLower[i] + wordLower.slice(i + 1);
          }
        }
        return null;
      },
      
      // s -> c (see -> cee, sun -> cun)
      () => wordLower.includes('s') ? wordLower.replace('s', 'c') : null,
      
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
    
    // Fallback: Swap first two letters (guaranteed to work)
    const letters = wordLower.split('');
    if (letters.length > 1) {
      [letters[0], letters[1]] = [letters[1], letters[0]];
    }
    return preserveCapitalization(letters.join(''));
  };

  // Mistake mode: Initialize 4 word choices when word changes
  useEffect(() => {
    if (gameMode === "mistake" && words && words.length >= 4) {
      const initializeMistakeChoices = async () => {
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
        
        setMistakeChoices(choices);
        setMisspelledIndex(misspellIdx);
        setCorrectSpelling(correctWord);
      };
      
      initializeMistakeChoices();
    }
  }, [gameMode, currentWordIndex, words]);

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

  const handleTimerExpired = () => {
    // Not used in new timed mode
    setGameComplete(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    const correct = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    
    if (gameMode === "quiz") {
      const newAnswer: QuizAnswer = {
        word: currentWord,
        userAnswer: userInput.trim(),
        isCorrect: correct,
      };
      
      setQuizAnswers([...quizAnswers, newAnswer]);
      
      if (correct) {
        playCorrectSound();
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
      } else {
        playIncorrectSound();
        setStreak(0);
      }
      
      setUserInput("");
      
      if (currentWordIndex < (words?.length || 10) - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        const allAnswers = [...quizAnswers, { word: currentWord, userAnswer: userInput.trim(), isCorrect: correct }];
        const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
        const points = 20;
        setScore(totalCorrect * points);
        
        // Play celebration sound if all answers correct
        if (totalCorrect === allAnswers.length) {
          playCelebrationSound();
        }
        
        setGameComplete(true);
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
      } else {
        playIncorrectSound();
        setStreak(0);
      }
      
      setUserInput("");
      
      // Move to next word if available
      if (words && currentWordIndex < words.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        // If we run out of words before timer, end game
        setGameComplete(true);
      }
    } else {
      // Standard and Practice modes: Show feedback
      setIsCorrect(correct);
      setShowFeedback(true);

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
      } else {
        playIncorrectSound();
        setStreak(0);
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
    
    if (words && currentWordIndex < words.length - 1) {
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
    if (words && currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setGameComplete(true);
    }
  };

  // Scramble mode drag-and-drop handlers
  const handleDragStart = (letter: string, sourceIndex: number) => {
    setDraggedLetter({ letter, sourceIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (targetIndex: number) => {
    if (!draggedLetter) return;

    const newPlaced = [...placedLetters];
    const newScrambled = [...scrambledLetters];

    // If dropping on a filled slot, return the displaced letter to the tray
    if (newPlaced[targetIndex] !== null) {
      const displacedLetter = newPlaced[targetIndex]!;
      // Put displaced letter back in source position before clearing it
      newScrambled[draggedLetter.sourceIndex] = displacedLetter;
      newPlaced[targetIndex] = draggedLetter.letter;
    } else {
      // Dropping on empty slot - just move the letter
      newPlaced[targetIndex] = draggedLetter.letter;
      newScrambled[draggedLetter.sourceIndex] = '';
    }

    setPlacedLetters(newPlaced);
    setScrambledLetters(newScrambled);
    setDraggedLetter(null);
  };

  const handleRemoveLetter = (targetIndex: number) => {
    if (placedLetters[targetIndex] === null) return;

    const letter = placedLetters[targetIndex]!;
    const newPlaced = [...placedLetters];
    const newScrambled = [...scrambledLetters];

    // Find first empty spot in scrambled letters
    const emptyIndex = newScrambled.findIndex(l => l === '');
    if (emptyIndex !== -1) {
      newScrambled[emptyIndex] = letter;
    }

    newPlaced[targetIndex] = null;
    setPlacedLetters(newPlaced);
    setScrambledLetters(newScrambled);
  };

  // Calculate dynamic tile size for scramble mode to fit all letters in one row
  const getTileSize = (wordLength: number) => {
    // Default tile sizes (reverted to previous settings)
    const defaultWidth = 60;
    const defaultHeight = 90;
    const defaultFontSize = 40;
    const defaultLineWidth = 30;
    
    // Use measured container width
    const containerWidth = scrambleContainerWidth;
    
    // Default gap size (gap-2 = 8px on mobile, gap-3 = 12px on desktop)
    const defaultGapSize = containerWidth < 768 ? 8 : 12;
    
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

    const userAnswer = placedLetters.join('');
    const correct = userAnswer.toLowerCase() === currentWord.word.toLowerCase();

    setIsCorrect(correct);
    setShowFeedback(true);

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
    } else {
      playIncorrectSound();
      setStreak(0);
    }
  };

  const handleMistakeChoice = (choiceIndex: number) => {
    centerGameCard();
    const correct = choiceIndex === misspelledIndex;
    
    setSelectedChoiceIndex(choiceIndex);
    setIsCorrect(correct);
    setShowFeedback(true);

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
    } else {
      playIncorrectSound();
      setStreak(0);
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
      } else {
        incorrectWords++;
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

      // If dropping on a filled slot, return the displaced letter to the tray
      if (newPlaced[targetIndex] !== null) {
        const displacedLetter = newPlaced[targetIndex]!;
        newScrambled[draggedLetter.sourceIndex] = displacedLetter;
        newPlaced[targetIndex] = draggedLetter.letter;
      } else {
        // Dropping on empty slot - just move the letter
        newPlaced[targetIndex] = draggedLetter.letter;
        newScrambled[draggedLetter.sourceIndex] = '';
      }

      setPlacedLetters(newPlaced);
      setScrambledLetters(newScrambled);
    }

    // Reset touch state
    setTouchDragging(false);
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
    // For timed mode, count words attempted (current index + 1)
    const totalWords = gameMode === "timed" 
      ? (currentWordIndex + 1) 
      : (words?.length || 10);
    // Use stored accuracy for crossword mode, calculate for other modes
    const accuracy = gameMode === "crossword" 
      ? finalAccuracy 
      : (totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0);
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'hsl(var(--page-game-bg))' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <Card className="p-8 md:p-12 space-y-8">
            {gameMode !== "crossword" && (
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-center"
              >
                <Sparkles className="w-20 h-20 md:w-24 md:h-24 text-purple-600 mx-auto mb-4" />
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 font-crayon" data-testid="text-game-complete">
                  {gameMode === "quiz" ? "Quiz Complete!" : "Amazing Work!"}
                </h1>
                <p className="text-lg text-gray-600 capitalize">
                  {gameMode === "standard" ? "Practice" : gameMode === "timed" ? "Timed Challenge" : gameMode === "quiz" ? "Quiz Mode" : gameMode === "scramble" ? "Word Scramble" : gameMode === "mistake" ? "Mistake Mode" : "Crossword"}
                </p>
              </motion.div>
            )}

            {gameMode === "crossword" ? (
              <div className="flex justify-center">
                <Card className="p-6 bg-green-50 border-green-200 w-64">
                  <div className="text-4xl md:text-5xl font-bold text-green-600" data-testid="text-accuracy">
                    {accuracy}%
                  </div>
                  <div className="text-lg text-gray-600 mt-2">Accuracy</div>
                </Card>
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
                  <span className="font-bold text-gray-900">{completedGrid.grid.entries.length}</span> words correct!</>
                ) : gameMode === "timed" ? (
                  <>You spelled <span className="font-bold text-gray-900" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                  <span className="font-bold text-gray-900">{totalWords}</span> words correctly in 60 seconds!</>
                ) : (
                  <>You spelled <span className="font-bold text-gray-900" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                  <span className="font-bold text-gray-900">{words?.length}</span> words correctly!</>
                )}
              </p>
              {bestStreak > 2 && (
                <p className="text-orange-600 font-semibold flex items-center justify-center gap-2 text-lg">
                  Best streak: {bestStreak} words in a row! <Flame className="w-6 h-6" />
                </p>
              )}
            </div>

            {gameMode === "crossword" && completedGrid && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 text-center">Completed Puzzle</h3>
                <div className="overflow-x-auto px-4 md:flex md:justify-center">
                  <div className="inline-block min-w-fit" style={{ display: 'grid', gridTemplateColumns: `repeat(${completedGrid.grid.cols}, 2.5rem)`, gap: '2px' }}>
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
                          <div className="font-semibold text-gray-800">{answer.word.word}</div>
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
                variant="outline"
                size="lg"
                className="flex-1 text-lg h-12"
                onClick={() => setLocation("/leaderboard")}
                data-testid="button-leaderboard"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Leaderboard
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1 text-lg h-12"
                onClick={() => window.location.reload()}
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

  const progress = ((currentWordIndex + 1) / words.length) * 100;

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      {/* Portrait background */}
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${rainbowBackgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      {/* Landscape background */}
      <div 
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${rainbowBackgroundLandscape})`,
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
            onClick={() => setLocation("/")}
            data-testid="button-exit"
          >
            <Home className="w-5 h-5 md:w-4 md:h-4 mr-2 md:mr-1" />
            Home
          </Button>
          
          <div className="flex items-center gap-4 md:gap-2">
            {gameMode === "timed" && !showFeedback && (
              <div className={`flex items-center gap-2 md:gap-1 ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                <Clock className="w-6 h-6 md:w-4 md:h-4" />
                <span className="text-xl md:text-sm font-bold" data-testid="text-timer">{timeLeft}s</span>
              </div>
            )}
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
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2" data-testid="text-instruction">
                  Solve the Crossword Puzzle
                </h2>
                <p className="text-gray-600">Click the play icon at the start of each word to hear the word</p>
              </div>

              <div className="overflow-x-auto px-4 md:flex md:justify-center">
                {/* Crossword Grid - Scrollable horizontally if too wide */}
                <div className="inline-block min-w-fit" style={{ display: 'grid', gridTemplateColumns: `repeat(${crosswordGrid.cols}, 2.5rem)`, gap: '2px' }}>
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
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full h-full text-center text-xl font-bold border-0 p-0 uppercase focus-visible:ring-1 focus-visible:ring-primary ${isMistake ? 'text-white bg-red-600' : 'bg-transparent'}`}
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
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleShowMistakes}
                  data-testid="button-show-mistakes"
                >
                  Show Mistakes
                </Button>
                <Button
                  size="lg"
                  onClick={handleCrosswordSubmit}
                  data-testid="button-submit-crossword"
                >
                  Check Puzzle
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
                    Word {currentWordIndex + 1} of {words.length}
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
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800" data-testid="text-instruction">
                      {gameMode === "quiz" ? "Spell the word" : gameMode === "scramble" ? "Unscramble the letters" : gameMode === "mistake" ? "Find the misspelled word" : "Listen and spell the word"}
                    </h2>
                    
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
                    {gameMode === "mistake" && mistakeChoices.length === 4 ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mistakeChoices.map((word, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant="outline"
                              size="lg"
                              className="h-16 md:h-20 text-xl md:text-2xl font-bold border-2"
                              onClick={() => handleMistakeChoice(index)}
                              data-testid={`button-choice-${index}`}
                            >
                              {word.toUpperCase()}
                            </Button>
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
                                      {letter}
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
                                onTouchStart={(e) => handleTouchStart(e, letter, index)}
                                onTouchEnd={handleTouchEnd}
                                className="rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg flex items-center justify-center cursor-move hover-elevate active-elevate-2 touch-none"
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
                                  {letter}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-center text-sm text-gray-600">
                          Drag the yellow tiles to the blank spaces above
                        </div>
                      </div>
                    ) : (
                      <div ref={inputContainerRef}>
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
                                  autoComplete="off"
                                  autoFocus
                                  data-testid="input-spelling"
                                />
                                <div 
                                  className={`h-16 md:h-20 rounded-2xl border-2 border-input bg-background flex items-center justify-center ${hintSize.gapClass} px-4 cursor-text pointer-events-none`}
                                >
                                  {Array.from({ length: Math.max(currentWord.word.length, userInput.length) }).map((_, index) => (
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
                                      <div className="h-0.5 bg-gray-400" style={{ width: hintSize.minWidth }}></div>
                                    </div>
                                  ))}
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
                                autoComplete="off"
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
                          {gameMode === "quiz" ? "Submit" : "Check"}
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
                            {currentWord?.word}
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
                                {userInput}
                              </div>
                              <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                              <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-spelling">
                                {currentWord?.word}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                              <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-spelling">
                                {currentWord?.word}
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
                      {currentWordIndex < words.length - 1 ? 'Next Word' : 'See Results'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
      </main>

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
            {draggedLetterElement}
          </span>
        </div>
      )}
    </div>
  );
}
