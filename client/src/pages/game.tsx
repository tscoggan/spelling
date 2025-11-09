import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, Home, ArrowRight, CheckCircle2, XCircle, Sparkles, Flame, Clock, SkipForward, Trophy, Settings, BookOpen, MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Word, DifficultyLevel, GameMode } from "@shared/schema";
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
import schoolPattern from "@assets/generated_images/Cartoon_school_objects_background_pattern_1ab3a6ac.png";

interface QuizAnswer {
  word: Word;
  userAnswer: string;
  isCorrect: boolean;
}

export default function Game() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const difficulty = params.get("difficulty") as DifficultyLevel;
  const gameMode = (params.get("mode") || "standard") as GameMode;
  const listId = params.get("listId");
  const quizCount = params.get("quizCount") || "10";
  
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
  const [loadingDictionary, setLoadingDictionary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentWordRef = useRef<string | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  
  // Scramble mode states
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedLetters, setPlacedLetters] = useState<(string | null)[]>([]);
  const [draggedLetter, setDraggedLetter] = useState<{letter: string; sourceIndex: number} | null>(null);
  
  // Touch event states for mobile
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState<{x: number; y: number} | null>(null);
  const [draggedLetterElement, setDraggedLetterElement] = useState<string | null>(null);
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Mistake mode states
  const [mistakeChoices, setMistakeChoices] = useState<string[]>([]);
  const [misspelledIndex, setMisspelledIndex] = useState<number>(-1);
  const [correctSpelling, setCorrectSpelling] = useState<string>("");
  
  // Crossword mode states
  const [crosswordGrid, setCrosswordGrid] = useState<CrosswordGrid | null>(null);
  const [crosswordInputs, setCrosswordInputs] = useState<{[key: string]: string}>({});
  const [activeEntry, setActiveEntry] = useState<number | null>(null);
  const [crosswordClues, setCrosswordClues] = useState<{word: string; clue: string}[]>([]);
  const [highlightedMistakes, setHighlightedMistakes] = useState<Set<string>>(new Set());
  const [completedGrid, setCompletedGrid] = useState<{inputs: {[key: string]: string}, grid: CrosswordGrid} | null>(null);

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { difficulty: string; gameMode: string; userId: number | null; customListId?: number }) => {
      const response = await apiRequest("POST", "/api/sessions", sessionData);
      return await response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: { score: number; accuracy: number; difficulty: DifficultyLevel; gameMode: GameMode; userId: number | null; sessionId: number }) => {
      const response = await apiRequest("POST", "/api/leaderboard", scoreData);
      return await response.json();
    },
  });

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: listId ? ['/api/word-lists', listId, { quizCount }] : ['/api/words', difficulty, { limit: 10 }],
    queryFn: async () => {
      if (listId) {
        const response = await fetch(`/api/word-lists/${listId}`);
        if (!response.ok) throw new Error('Failed to fetch custom word list');
        const listData = await response.json();
        let wordsArray = listData.words.map((word: string, index: number) => ({
          id: index + 1,
          word,
          difficulty: 'custom' as DifficultyLevel,
        }));
        
        // For quiz mode, limit to 10 words if quizCount is "10"
        if (gameMode === "quiz" && quizCount === "10") {
          wordsArray = wordsArray.slice(0, 10);
        }
        
        return wordsArray;
      } else {
        const response = await fetch(`/api/words/${difficulty}?limit=10`);
        if (!response.ok) throw new Error('Failed to fetch words');
        return response.json();
      }
    },
    enabled: !!difficulty || !!listId,
  });

  const { data: wordIllustrations } = useQuery<WordIllustration[]>({
    queryKey: ['/api/word-illustrations'],
    queryFn: async () => {
      const response = await fetch('/api/word-illustrations');
      if (!response.ok) throw new Error('Failed to fetch word illustrations');
      return response.json();
    },
  });

  useEffect(() => {
    if ((difficulty || listId) && gameMode && !sessionId && user) {
      const sessionDifficulty = listId ? 'custom' : difficulty;
      createSessionMutation.mutate({ difficulty: sessionDifficulty, gameMode, userId: user.id });
    }
  }, [difficulty, gameMode, sessionId, user, listId]);

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
        
        // Load saved preference or use first available
        const savedVoice = localStorage.getItem('preferredVoice');
        if (savedVoice && englishVoices.find(v => v.name === savedVoice)) {
          setSelectedVoice(savedVoice);
        } else if (englishVoices.length > 0) {
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
  }, []);

  // Save voice preference
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('preferredVoice', voiceName);
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
    
    try {
      // First, try Simple English Wiktionary using MediaWiki API
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
          
          // Get first definition
          const firstMeaning = entry.meanings?.[0];
          const firstDefinition = firstMeaning?.definitions?.[0];
          if (firstDefinition?.definition) {
            setWordDefinition(firstDefinition.definition);
            console.log(`✅ Found definition in standard dictionary for "${fetchWord}"`);
          }
          
          // Get first example sentence
          if (firstDefinition?.example) {
            setWordExample(firstDefinition.example);
            console.log(`✅ Found example in first definition for "${fetchWord}":`, firstDefinition.example);
          } else {
            // Try to find an example in any definition
            let foundExample = false;
            for (const meaning of entry.meanings || []) {
              if (foundExample) break;
              for (const def of meaning.definitions || []) {
                if (def.example) {
                  setWordExample(def.example);
                  foundExample = true;
                  console.log(`✅ Found example in other definition for "${fetchWord}":`, def.example);
                  break;
                }
              }
            }
            if (!foundExample) {
              console.log(`❌ No example found for "${fetchWord}" (checked ${entry.meanings?.length || 0} meanings) - generating fallback`);
              const fallbackExample = generateFallbackExample(fetchWord);
              setWordExample(fallbackExample);
              console.log(`✨ Generated fallback example: "${fallbackExample}"`);
            }
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

  const speakWithRefocus = (text: string, buttonElement?: HTMLElement) => {
    if (!text) return;
    
    // Blur the button immediately to allow focus elsewhere
    if (buttonElement) {
      buttonElement.blur();
    }
    
    speakWord(text, () => {
      // Focus after TTS completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    });
    
    // Also focus immediately as backup (in case TTS callback fails)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);
  };

  const speakDefinition = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordDefinition && currentWord) {
      speakWithRefocus(wordDefinition, e?.currentTarget);
    }
  };

  const speakExample = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordExample && currentWord) {
      speakWithRefocus(wordExample, e?.currentTarget);
    }
  };

  const speakPartsOfSpeech = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (wordPartsOfSpeech && currentWord) {
      speakWithRefocus(wordPartsOfSpeech, e?.currentTarget);
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
      // Multiple focus attempts to ensure it works
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      };
      
      // Try immediately
      focusInput();
      
      // Try after short delay (for initial render)
      setTimeout(focusInput, 100);
      
      // Try after longer delay (for slower systems)
      setTimeout(focusInput, 300);
    }
  }, [currentWordIndex, showFeedback]);

  useEffect(() => {
    if (currentWord && !showFeedback && gameMode !== "quiz" && gameMode !== "mistake") {
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
      const totalWords = words?.length || 10;
      const accuracy = Math.round((correctCount / totalWords) * 100);
      
      console.log("Saving score to leaderboard:", { score, accuracy, difficulty, gameMode, sessionId });
      
      saveScoreMutation.mutate({
        score,
        accuracy,
        difficulty,
        gameMode,
        userId: user.id,
        sessionId,
      });
      setScoreSaved(true);
    }
  }, [gameComplete, scoreSaved, score, gameMode, correctCount, words, difficulty, sessionId, user]);

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

  // Helper function to misspell a word using common spelling mistakes
  const misspellWord = (word: string): string => {
    const wordLower = word.toLowerCase();
    const letters = wordLower.split('');
    
    // Common spelling mistake strategies
    const strategies = [
      // Strategy 1: Reverse "ie" to "ei" or "ei" to "ie" (very common mistake)
      () => {
        const ieIndex = wordLower.indexOf('ie');
        const eiIndex = wordLower.indexOf('ei');
        
        if (ieIndex !== -1) {
          // Replace "ie" with "ei"
          letters[ieIndex] = 'e';
          letters[ieIndex + 1] = 'i';
          return true;
        } else if (eiIndex !== -1) {
          // Replace "ei" with "ie"
          letters[eiIndex] = 'i';
          letters[eiIndex + 1] = 'e';
          return true;
        }
        return false;
      },
      
      // Strategy 2: Drop silent 'e' at the end or add it where it shouldn't be
      () => {
        if (letters.length > 2 && letters[letters.length - 1] === 'e') {
          // Remove silent 'e' (e.g., "make" → "mak")
          letters.pop();
          return true;
        } else if (letters.length > 2 && letters[letters.length - 1] !== 'e') {
          // Add unnecessary 'e' (e.g., "cat" → "cate")
          letters.push('e');
          return true;
        }
        return false;
      },
      
      // Strategy 3: Double or un-double consonants (very common)
      () => {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        for (let i = 0; i < letters.length - 1; i++) {
          if (letters[i] === letters[i + 1] && consonants.includes(letters[i])) {
            // Remove doubled consonant (e.g., "rabbit" → "rabit")
            letters.splice(i, 1);
            return true;
          }
        }
        // Or double a single consonant (e.g., "began" → "beggan")
        const consonantIndices = letters.map((l, i) => 
          consonants.includes(l) && (i === letters.length - 1 || letters[i] !== letters[i + 1]) ? i : -1
        ).filter(i => i !== -1 && i > 0 && i < letters.length - 1);
        
        if (consonantIndices.length > 0) {
          const idx = consonantIndices[Math.floor(Math.random() * consonantIndices.length)];
          letters.splice(idx, 0, letters[idx]);
          return true;
        }
        return false;
      },
      
      // Strategy 4: Common phonetic errors (c/k, s/c, f/ph, etc.)
      () => {
        const phonetic: { pattern: string, replacement: string }[] = [
          { pattern: 'c', replacement: 'k' },  // cat → kat
          { pattern: 'k', replacement: 'c' },  // kite → cite
          { pattern: 'ph', replacement: 'f' }, // phone → fone
          { pattern: 'f', replacement: 'ph' }, // feel → pheel
          { pattern: 'tion', replacement: 'shun' }, // station → stashun
          { pattern: 'ght', replacement: 't' },     // light → lit
        ];
        
        for (const { pattern, replacement } of phonetic) {
          const index = wordLower.indexOf(pattern);
          if (index !== -1) {
            const before = letters.slice(0, index);
            const after = letters.slice(index + pattern.length);
            return (before.concat(replacement.split(''), after)).length !== letters.length 
              ? (letters.splice(0, letters.length, ...before, ...replacement.split(''), ...after), true)
              : false;
          }
        }
        return false;
      },
      
      // Strategy 5: Swap adjacent letters (common typo)
      () => {
        if (letters.length > 2) {
          const idx = Math.floor(Math.random() * (letters.length - 1));
          [letters[idx], letters[idx + 1]] = [letters[idx + 1], letters[idx]];
          return true;
        }
        return false;
      },
      
      // Strategy 6: Confuse similar vowel sounds (a/e, i/e, o/u)
      () => {
        const vowelConfusions: { [key: string]: string } = {
          'a': 'e', 'e': 'a', 'i': 'e', 'o': 'u', 'u': 'o'
        };
        const vowelIndices = letters.map((l, i) => vowelConfusions[l] ? i : -1).filter(i => i !== -1);
        if (vowelIndices.length > 0) {
          const idx = vowelIndices[Math.floor(Math.random() * vowelIndices.length)];
          letters[idx] = vowelConfusions[letters[idx]];
          return true;
        }
        return false;
      }
    ];
    
    // Try strategies in random order until one succeeds
    const shuffledStrategies = [...strategies].sort(() => Math.random() - 0.5);
    for (const strategy of shuffledStrategies) {
      if (strategy()) break;
    }
    
    const misspelled = letters.join('');
    // Preserve original capitalization
    // Check if the entire word is uppercase
    if (word === word.toUpperCase()) {
      return misspelled.toUpperCase();
    }
    // Otherwise, just capitalize first letter if original was capitalized
    return word[0] === word[0].toUpperCase() 
      ? misspelled.charAt(0).toUpperCase() + misspelled.slice(1)
      : misspelled;
  };

  // Mistake mode: Initialize 4 word choices when word changes
  useEffect(() => {
    if (gameMode === "mistake" && words && words.length >= 4) {
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
      const choices = selectedWords.map((word, idx) => 
        idx === misspellIdx ? misspellWord(word) : word
      );
      
      console.log(`🎯 Mistake mode: Selected words:`, selectedWords);
      console.log(`❌ Misspelled word at index ${misspellIdx}:`, choices[misspellIdx], `(correct: ${correctWord})`);
      
      setMistakeChoices(choices);
      setMisspelledIndex(misspellIdx);
      setCorrectSpelling(correctWord);
    }
  }, [gameMode, currentWordIndex, words]);

  // Crossword mode: Initialize grid and fetch clues
  useEffect(() => {
    if (gameMode === "crossword" && words && words.length >= 5) {
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
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
      } else {
        setStreak(0);
      }
      
      setUserInput("");
      
      if (currentWordIndex < (words?.length || 10) - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        const allAnswers = [...quizAnswers, { word: currentWord, userAnswer: userInput.trim(), isCorrect: correct }];
        const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
        const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : difficulty === "custom" ? 20 : 30;
        setScore(totalCorrect * points);
        setGameComplete(true);
      }
    } else if (gameMode === "timed") {
      // Timed mode: No feedback, immediate next word
      if (correct) {
        const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : difficulty === "custom" ? 20 : 30;
        setScore(score + points + (streak * 5));
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
      } else {
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
        const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : difficulty === "custom" ? 20 : 30;
        setScore(score + points + (streak * 5));
        setCorrectCount(correctCount + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
      } else {
        setStreak(0);
      }
    }
  };

  const handleNext = () => {
    setUserInput("");
    setShowFeedback(false);
    
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
      const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : difficulty === "custom" ? 20 : 30;
      setScore(score + points + (streak * 5));
      setCorrectCount(correctCount + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }
    } else {
      setStreak(0);
    }
  };

  const handleMistakeChoice = (choiceIndex: number) => {
    const correct = choiceIndex === misspelledIndex;
    
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : difficulty === "custom" ? 20 : 30;
      setScore(score + points + (streak * 5));
      setCorrectCount(correctCount + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }
    } else {
      setStreak(0);
    }
  };

  // Crossword mode handlers
  const focusFirstCellOfEntry = (entryNumber: number) => {
    if (!crosswordGrid) return;
    
    const entry = crosswordGrid.entries.find(e => e.number === entryNumber);
    if (entry) {
      setActiveEntry(entryNumber);
      
      // Focus first cell
      setTimeout(() => {
        const firstInput = document.querySelector(`input[data-row="${entry.row}"][data-col="${entry.col}"]`) as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }, 10);
    }
  };

  const handleCrosswordCellInput = (row: number, col: number, value: string) => {
    if (!crosswordGrid) return;
    
    // Clear mistake highlights on any input
    if (highlightedMistakes.size > 0) {
      setHighlightedMistakes(new Set());
    }
    
    const key = `${row}-${col}`;
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
        
        // Only highlight if user typed something AND it's wrong
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
    const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : difficulty === "custom" ? 20 : 30;
    
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
    
    // Add completion bonus if all words correct
    if (correctWords === totalWords) {
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

  // Validate difficulty AFTER all hooks
  if ((!difficulty && !listId) || (difficulty && !["easy", "medium", "hard", "custom"].includes(difficulty))) {
    setLocation("/");
    return null;
  }

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
    const accuracy = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'hsl(var(--page-game-bg))' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <Card className="p-8 md:p-12 space-y-8">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center"
            >
              {gameMode === "crossword" ? (
                <h1 className="text-3xl font-bold text-gray-800 mb-2 font-crayon" data-testid="text-game-complete">
                  Amazing Work!
                </h1>
              ) : (
                <>
                  <Sparkles className="w-20 h-20 md:w-24 md:h-24 text-purple-600 mx-auto mb-4" />
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 font-crayon" data-testid="text-game-complete">
                    {gameMode === "quiz" ? "Quiz Complete!" : "Amazing Work!"}
                  </h1>
                  <p className="text-lg text-gray-600 capitalize">
                    {difficulty} Mode - {gameMode === "standard" ? "Practice" : gameMode === "timed" ? "Timed Challenge" : gameMode === "quiz" ? "Quiz Mode" : "Word Scramble"}
                  </p>
                </>
              )}
            </motion.div>

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
                <div className="flex justify-center">
                  <div className="inline-block" style={{ display: 'grid', gridTemplateColumns: `repeat(${completedGrid.grid.cols}, 2.5rem)`, gap: '2px' }}>
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
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ top: '-2px', left: '-2px' }}>
                                      <line x1="0" y1="100%" x2="100%" y2="0" stroke="red" strokeWidth="2" />
                                    </svg>
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
                  Incorrect letters are crossed out in red with the correct letter shown
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
          <p className="text-2xl">No words available for this difficulty.</p>
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
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundColor: 'hsl(var(--page-game-bg))',
      }}
    >
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url(${schoolPattern})`,
          backgroundSize: '240px 240px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }}
      ></div>
      <header className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/")}
            data-testid="button-exit"
          >
            <Home className="w-5 h-5 mr-2" />
            Exit
          </Button>
          
          <div className="flex items-center gap-4 md:gap-6">
            {gameMode === "timed" && !showFeedback && (
              <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                <Clock className="w-6 h-6" />
                <span className="text-xl md:text-2xl font-bold" data-testid="text-timer">{timeLeft}s</span>
              </div>
            )}
            {streak > 0 && gameMode !== "quiz" && (
              <div className="flex items-center gap-2 text-orange-600">
                <Flame className="w-6 h-6 md:w-7 md:h-7" />
                <span className="text-xl md:text-2xl font-bold" data-testid="text-streak">{streak}</span>
              </div>
            )}
            {gameMode !== "quiz" && (
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-purple-600" data-testid="text-current-score">
                  {score}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Points</div>
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

      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
        {gameMode === "crossword" && crosswordGrid ? (
          <div className="w-full max-w-6xl">
            <Card className="p-6 md:p-8 space-y-6 bg-white">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2" data-testid="text-instruction">
                  Solve the Crossword Puzzle
                </h2>
                <p className="text-gray-600">Click the play icon at the start of each word to hear the word</p>
              </div>

              <div className="flex justify-center">
                {/* Crossword Grid */}
                <div>
                  <div className="inline-block" style={{ display: 'grid', gridTemplateColumns: `repeat(${crosswordGrid.cols}, 2.5rem)`, gap: '2px' }}>
                    {crosswordGrid.cells.map((row, rowIndex) => 
                      row.map((cell, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const isMistake = highlightedMistakes.has(cellKey);
                        
                        return (
                          <div key={cellKey} className="relative">
                            {cell.isBlank ? (
                              <div className="w-10 h-10 bg-gray-900"></div>
                            ) : (
                              <div className={`w-10 h-10 border-2 ${isMistake ? 'border-red-500 bg-red-50' : 'border-gray-400 bg-white'} relative`}>
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
                                      className="absolute top-0 left-0 w-4 h-4 flex items-center justify-center hover:bg-gray-100 rounded-sm z-10"
                                      data-testid={`button-cell-play-${cell.number}`}
                                    >
                                      <Volume2 className="w-3 h-3 text-gray-600" />
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
                                  className={`w-full h-full text-center text-xl font-bold border-0 p-0 uppercase focus-visible:ring-1 focus-visible:ring-primary ${isMistake ? 'text-red-700' : ''}`}
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
          <div className="w-full max-w-3xl space-y-6">
            {gameMode !== "crossword" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-base md:text-lg font-semibold">
                  <span className="text-gray-600" data-testid="text-word-progress">
                    Word {currentWordIndex + 1} of {words.length}
                  </span>
                  <span className="text-gray-800 capitalize" data-testid="text-difficulty">
                    {difficulty} - {gameMode === "standard" ? "Practice" : gameMode === "timed" ? "Timed" : gameMode === "quiz" ? "Quiz" : "Word Scramble"}
                  </span>
                </div>
                <Progress value={progress} className="h-3" data-testid="progress-game" />
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
                <Card className="p-6 md:p-12 space-y-8 bg-white">
                  <div className="text-center space-y-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800" data-testid="text-instruction">
                      {gameMode === "quiz" ? "Spell the word" : gameMode === "scramble" ? "Unscramble the letters" : gameMode === "mistake" ? "Find the misspelled word" : "Listen and spell the word"}
                    </h2>
                    
                    {gameMode !== "mistake" && currentWord && wordIllustrations && (() => {
                      const illustration = wordIllustrations.find(
                        (ill) => ill.word === currentWord.word.toLowerCase()
                      );
                      return illustration && illustration.imagePath ? (
                        <motion.div
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
                    
                    {gameMode !== "mistake" && (
                      <Button
                        size="lg"
                        variant="default"
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full"
                        onClick={(e) => {
                          if (currentWord) {
                            speakWithRefocus(currentWord.word, e.currentTarget);
                          }
                        }}
                        data-testid="button-play-audio"
                      >
                        <Volume2 className="w-12 h-12 md:w-14 md:h-14" />
                      </Button>
                    )}
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
                        <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
                          {placedLetters.map((letter, index) => (
                            <div
                              key={`target-${index}`}
                              className="relative"
                              ref={(el) => (dropZoneRefs.current[index] = el)}
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(index)}
                            >
                              <div
                                className="w-12 h-16 md:w-16 md:h-20 rounded-xl border-2 border-dashed border-primary bg-purple-50 flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 touch-none"
                                data-testid={`drop-zone-${index}`}
                                onClick={() => handleRemoveLetter(index)}
                              >
                                {letter ? (
                                  <span className="text-2xl md:text-4xl font-bold text-gray-800">
                                    {letter}
                                  </span>
                                ) : (
                                  <div className="w-6 md:w-8 h-0.5 bg-gray-400"></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Draggable letter tiles */}
                        <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap" onTouchMove={handleTouchMove}>
                          {scrambledLetters.map((letter, index) => (
                            letter && (
                              <div
                                key={`source-${index}`}
                                draggable
                                onDragStart={() => handleDragStart(letter, index)}
                                onTouchStart={(e) => handleTouchStart(e, letter, index)}
                                onTouchEnd={handleTouchEnd}
                                className="w-12 h-16 md:w-16 md:h-20 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg flex items-center justify-center cursor-move hover-elevate active-elevate-2 touch-none"
                                data-testid={`letter-tile-${index}`}
                              >
                                <span className="text-2xl md:text-4xl font-bold text-gray-800 select-none">
                                  {letter}
                                </span>
                              </div>
                            )
                          ))}
                        </div>

                        <div className="text-center text-sm text-gray-600">
                          Drag the yellow tiles to the blank spaces above
                        </div>
                      </div>
                    ) : showWordHints && currentWord && gameMode !== "quiz" ? (
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          className="text-transparent caret-transparent absolute inset-0 text-center text-2xl md:text-4xl h-16 md:h-20 rounded-2xl bg-transparent border-transparent pointer-events-auto uppercase"
                          autoComplete="off"
                          autoFocus
                          data-testid="input-spelling"
                          style={{ caretColor: 'transparent' }}
                        />
                        <div 
                          className="h-16 md:h-20 rounded-2xl border-2 border-input bg-background flex items-center justify-center gap-2 md:gap-3 px-4 cursor-text pointer-events-none"
                        >
                          {Array.from({ length: currentWord.word.length }).map((_, index) => (
                            <div key={index} className="flex flex-col items-center gap-1">
                              <div className="text-2xl md:text-4xl font-semibold text-gray-800 h-8 md:h-10 flex items-center justify-center min-w-[1.5rem] md:min-w-[2rem] uppercase">
                                {userInput[index] || ""}
                              </div>
                              <div className="w-6 md:w-8 h-0.5 bg-gray-400"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Input
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="text-center text-2xl md:text-4xl h-16 md:h-20 rounded-2xl uppercase"
                        placeholder="Type your answer..."
                        autoComplete="off"
                        autoFocus
                        data-testid="input-spelling"
                      />
                    )}
                    
                    <div className="space-y-3">
                      {gameMode !== "mistake" && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          {gameMode !== "scramble" && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              className="flex-1 text-lg h-12 md:h-14"
                              onClick={speakPartsOfSpeech}
                              disabled={!wordPartsOfSpeech || loadingDictionary}
                              data-testid="button-parts-of-speech"
                            >
                              <Sparkles className="w-5 h-5 mr-2" />
                              {loadingDictionary ? "Loading..." : "Part of Speech"}
                            </Button>
                          )}
                          <Button
                            type="submit"
                            size="lg"
                            className={`${gameMode === "scramble" ? "w-full" : "flex-1"} text-lg h-12 md:h-14`}
                            disabled={gameMode === "scramble" ? placedLetters.some(l => l === null) : !userInput.trim()}
                            data-testid="button-submit"
                          >
                            {gameMode === "quiz" ? "Submit" : "Check"}
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      )}

                      
                      {gameMode !== "mistake" && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="flex-1 text-base h-12"
                            onClick={speakDefinition}
                            disabled={!wordDefinition || loadingDictionary}
                            data-testid="button-definition"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            {loadingDictionary ? "Loading..." : "Definition"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="flex-1 text-base h-12"
                            onClick={speakExample}
                            disabled={!wordExample || loadingDictionary}
                            data-testid="button-example"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {loadingDictionary ? "Loading..." : "Use in Sentence"}
                          </Button>
                        </div>
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
                        <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-word">
                          {gameMode === "mistake" ? correctSpelling : currentWord?.word}
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-20 h-20 md:w-24 md:h-24 text-red-600 mx-auto" />
                        <h2 className="text-3xl md:text-5xl font-bold text-red-600" data-testid="text-incorrect">
                          {gameMode === "timed" && timeLeft === 0 ? "Time's Up!" : "Not quite!"}
                        </h2>
                        <div className="space-y-3">
                          {userInput && (
                            <>
                              <p className="text-xl md:text-2xl text-gray-600">You wrote:</p>
                              <div className="text-3xl md:text-4xl font-semibold text-gray-700 line-through" data-testid="text-user-answer">
                                {userInput}
                              </div>
                            </>
                          )}
                          <p className="text-xl md:text-2xl text-gray-600">Correct spelling:</p>
                          <div className="text-4xl md:text-5xl font-bold text-gray-800" data-testid="text-correct-spelling">
                            {currentWord?.word}
                          </div>
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
