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
  const [loadingDictionary, setLoadingDictionary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentWordRef = useRef<string | null>(null);

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
    
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${fetchWord}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if we're still on the same word before updating state (using ref to avoid closure issue)
        if (currentWordRef.current?.toLowerCase() !== fetchWord) {
          return; // Word changed, discard this response
        }
        
        if (data && data.length > 0) {
          const entry = data[0];
          
          // Get first definition
          const firstMeaning = entry.meanings?.[0];
          const firstDefinition = firstMeaning?.definitions?.[0];
          if (firstDefinition?.definition) {
            setWordDefinition(firstDefinition.definition);
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
              // Generate a simple example sentence as fallback
              const fallbackExample = generateFallbackExample(fetchWord);
              setWordExample(fallbackExample);
              console.log(`✨ Generated fallback example: "${fallbackExample}"`);
            }
          }
        }
      } else {
        // API returned non-OK response (e.g., 404 word not found)
        console.log(`⚠️ Dictionary API returned ${response.status} for "${fetchWord}" - generating fallback`);
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
      // Only clear loading if we're still on the same word (using ref)
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
    if (currentWord && !showFeedback && gameMode !== "quiz") {
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

  useEffect(() => {
    if (gameComplete && !scoreSaved && sessionId && user) {
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

  // Validate difficulty AFTER all hooks
  if ((!difficulty && !listId) || (difficulty && !["easy", "medium", "hard", "custom"].includes(difficulty))) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
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
              <Sparkles className="w-20 h-20 md:w-24 md:h-24 text-purple-600 mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2" data-testid="text-game-complete">
                {gameMode === "quiz" ? "Quiz Complete!" : "Amazing Work!"}
              </h1>
              <p className="text-lg text-gray-600 capitalize">
                {difficulty} Mode - {gameMode === "standard" ? "Standard" : gameMode === "timed" ? "Timed Challenge" : "Quiz Mode"}
              </p>
            </motion.div>

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

            <div className="space-y-3 text-center">
              <p className="text-lg text-gray-700">
                {gameMode === "timed" ? (
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col">
      <header className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
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

      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-3xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-base md:text-lg font-semibold">
              <span className="text-gray-600" data-testid="text-word-progress">
                Word {currentWordIndex + 1} of {words.length}
              </span>
              <span className="text-gray-800 capitalize" data-testid="text-difficulty">
                {difficulty} - {gameMode === "standard" ? "Standard" : gameMode === "timed" ? "Timed" : "Quiz"}
              </span>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-game" />
          </div>

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
                      {gameMode === "quiz" ? "Spell the word" : "Listen and spell the word"}
                    </h2>
                    
                    <Button
                      size="lg"
                      variant="default"
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full p-0"
                      onClick={(e) => {
                        if (currentWord) {
                          speakWithRefocus(currentWord.word, e.currentTarget);
                        }
                      }}
                      data-testid="button-play-audio"
                    >
                      <Volume2 className="w-14 h-14 md:w-16 md:h-16" />
                    </Button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {showWordHints && currentWord ? (
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          className="text-transparent caret-transparent absolute inset-0 text-center text-2xl md:text-4xl h-16 md:h-20 rounded-2xl bg-transparent border-transparent pointer-events-auto"
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
                              <div className="text-2xl md:text-4xl font-semibold text-gray-800 h-8 md:h-10 flex items-center justify-center min-w-[1.5rem] md:min-w-[2rem]">
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
                        className="text-center text-2xl md:text-4xl h-16 md:h-20 rounded-2xl"
                        placeholder="Type your answer..."
                        autoComplete="off"
                        autoFocus
                        data-testid="input-spelling"
                      />
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="flex-1 text-lg h-12 md:h-14"
                          onClick={(e) => {
                            if (currentWord) {
                              speakWithRefocus(currentWord.word, e.currentTarget);
                            }
                          }}
                          data-testid="button-repeat"
                        >
                          <Volume2 className="w-5 h-5 mr-2" />
                          Repeat
                        </Button>
                        <Button
                          type="submit"
                          size="lg"
                          className="flex-1 text-lg h-12 md:h-14"
                          disabled={!userInput.trim()}
                          data-testid="button-submit"
                        >
                          {gameMode === "quiz" ? "Submit" : "Check"}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                      
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
                          {currentWord?.word}
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
      </main>
    </div>
  );
}
