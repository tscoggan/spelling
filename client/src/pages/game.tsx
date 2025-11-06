import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, Home, ArrowRight, CheckCircle2, XCircle, Sparkles, Flame } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Word, GameState, DifficultyLevel } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function Game() {
  const [, params] = useRoute("/game/:difficulty");
  const [, setLocation] = useLocation();
  const difficulty = params?.difficulty as DifficultyLevel;
  
  const [userInput, setUserInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: [`/api/words/${difficulty}`],
  });

  const currentWord = words?.[currentWordIndex];

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (currentWord && !showFeedback) {
      speakWord(currentWord.word);
    }
  }, [currentWord, showFeedback]);

  useEffect(() => {
    if (inputRef.current && !showFeedback) {
      inputRef.current.focus();
    }
  }, [currentWordIndex, showFeedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    const correct = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30;
      setScore(score + points + (streak * 5));
      setCorrectCount(correctCount + 1);
      setStreak(streak + 1);
    } else {
      setStreak(0);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-2xl font-semibold text-foreground">Loading words...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (gameComplete) {
    const accuracy = words ? Math.round((correctCount / words.length) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-12 max-w-2xl space-y-8 text-center">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Sparkles className="w-24 h-24 text-primary mx-auto mb-4" />
              <h1 className="text-5xl font-bold text-foreground mb-4" data-testid="text-game-complete">
                Amazing Work!
              </h1>
            </motion.div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6 bg-primary/10 border-primary/20">
                <div className="text-5xl font-bold text-primary" data-testid="text-final-score">
                  {score}
                </div>
                <div className="text-xl text-muted-foreground mt-2">Points</div>
              </Card>
              <Card className="p-6 bg-accent/10 border-accent/20">
                <div className="text-5xl font-bold text-accent" data-testid="text-accuracy">
                  {accuracy}%
                </div>
                <div className="text-xl text-muted-foreground mt-2">Accuracy</div>
              </Card>
            </div>

            <div className="space-y-3 text-lg">
              <p className="text-muted-foreground">
                You spelled <span className="font-bold text-foreground" data-testid="text-correct-count">{correctCount}</span> out of{" "}
                <span className="font-bold text-foreground">{words?.length}</span> words correctly!
              </p>
              {streak > 2 && (
                <p className="text-secondary font-semibold flex items-center justify-center gap-2">
                  Best streak: {streak} words in a row! <Flame className="w-6 h-6" />
                </p>
              )}
            </div>

            <div className="flex gap-4 flex-col sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 text-xl h-14"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                <Home className="w-6 h-6 mr-2" />
                Home
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1 text-xl h-14"
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-12 text-center space-y-6">
          <p className="text-2xl text-foreground">No words available for this difficulty.</p>
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 md:p-6 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/")}
            data-testid="button-exit"
          >
            <Home className="w-5 h-5 mr-2" />
            Exit
          </Button>
          
          <div className="flex items-center gap-6">
            {streak > 0 && (
              <div className="flex items-center gap-2 text-secondary">
                <Flame className="w-7 h-7" />
                <span className="text-2xl font-bold" data-testid="text-streak">{streak}</span>
              </div>
            )}
            <div className="text-center">
              <div className="text-3xl font-bold text-primary" data-testid="text-current-score">
                {score}
              </div>
              <div className="text-sm text-muted-foreground">Points</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span className="text-muted-foreground" data-testid="text-word-progress">
                Word {currentWordIndex + 1} of {words.length}
              </span>
              <span className="text-foreground capitalize" data-testid="text-difficulty">
                {difficulty} Mode
              </span>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-game" />
          </div>

          <AnimatePresence mode="wait">
            {!showFeedback ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-8 md:p-12 space-y-8">
                  <div className="text-center space-y-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-instruction">
                      Listen and spell the word
                    </h2>
                    
                    <Button
                      size="lg"
                      variant="default"
                      className="w-24 h-24 rounded-full hover-elevate active-elevate-2"
                      onClick={() => currentWord && speakWord(currentWord.word)}
                      data-testid="button-play-audio"
                    >
                      <Volume2 className="w-12 h-12" />
                    </Button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      className="text-center text-3xl md:text-4xl h-20 rounded-2xl"
                      placeholder="Type your answer..."
                      autoComplete="off"
                      data-testid="input-spelling"
                    />
                    
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="flex-1 text-xl h-14"
                        onClick={() => currentWord && speakWord(currentWord.word)}
                        data-testid="button-repeat"
                      >
                        <Volume2 className="w-6 h-6 mr-2" />
                        Repeat
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1 text-xl h-14"
                        disabled={!userInput.trim()}
                        data-testid="button-submit"
                      >
                        Check Answer
                        <ArrowRight className="w-6 h-6 ml-2" />
                      </Button>
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
                <Card className={`p-8 md:p-12 space-y-8 ${isCorrect ? 'bg-accent/10 border-accent' : 'bg-destructive/10 border-destructive'}`}>
                  <div className="text-center space-y-6">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-24 h-24 text-accent mx-auto" />
                        <h2 className="text-4xl md:text-5xl font-bold text-accent" data-testid="text-correct">
                          Correct! 🎉
                        </h2>
                        <div className="text-5xl font-bold text-foreground" data-testid="text-correct-word">
                          {currentWord?.word}
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-24 h-24 text-destructive mx-auto" />
                        <h2 className="text-4xl md:text-5xl font-bold text-destructive" data-testid="text-incorrect">
                          Not quite!
                        </h2>
                        <div className="space-y-3">
                          <p className="text-2xl text-muted-foreground">You wrote:</p>
                          <div className="text-4xl font-semibold text-foreground line-through" data-testid="text-user-answer">
                            {userInput}
                          </div>
                          <p className="text-2xl text-muted-foreground">Correct spelling:</p>
                          <div className="text-5xl font-bold text-foreground" data-testid="text-correct-spelling">
                            {currentWord?.word}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-4 flex-col sm:flex-row">
                    {!isCorrect && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1 text-xl h-14"
                        onClick={handleTryAgain}
                        data-testid="button-try-again"
                      >
                        Try Again
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="lg"
                      className="flex-1 text-xl h-14"
                      onClick={handleNext}
                      data-testid="button-next"
                    >
                      {currentWordIndex < words.length - 1 ? 'Next Word' : 'See Results'}
                      <ArrowRight className="w-6 h-6 ml-2" />
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
