import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target } from "lucide-react";
import type { DifficultyLevel, GameMode } from "@shared/schema";
import { useState } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);

  const startGame = (mode: GameMode) => {
    if (!selectedDifficulty) return;
    setLocation(`/game?difficulty=${selectedDifficulty}&mode=${mode}`);
  };

  const difficulties = [
    {
      id: "easy" as DifficultyLevel,
      name: "Easy Mode",
      description: "Perfect for beginners! Simple words to build confidence.",
      icon: Sparkles,
      color: "text-green-600",
    },
    {
      id: "medium" as DifficultyLevel,
      name: "Medium Mode",
      description: "Ready for a challenge? Test your growing vocabulary!",
      icon: BookOpen,
      color: "text-yellow-600",
    },
    {
      id: "hard" as DifficultyLevel,
      name: "Hard Mode",
      description: "For spelling champions! Tackle the toughest words.",
      icon: Trophy,
      color: "text-purple-600",
    },
  ];

  const gameModes = [
    {
      id: "standard" as GameMode,
      name: "Standard",
      description: "Classic spelling practice with immediate feedback",
      icon: Target,
      color: "text-blue-600",
    },
    {
      id: "practice" as GameMode,
      name: "Practice",
      description: "No pressure! Skip words and take your time",
      icon: BookOpen,
      color: "text-green-600",
    },
    {
      id: "timed" as GameMode,
      name: "Timed Challenge",
      description: "60 seconds per word! Beat the clock!",
      icon: Clock,
      color: "text-orange-600",
    },
    {
      id: "quiz" as GameMode,
      name: "Quiz Mode",
      description: "Answer all 10 words, then see your results",
      icon: Trophy,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-8 md:mb-12">
          <motion.h1
            className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            Spelling Champions
          </motion.h1>
          <p className="text-lg md:text-xl text-gray-700">
            Master your spelling skills with fun, interactive challenges!
          </p>
        </div>

        {!selectedDifficulty ? (
          <>
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
              Choose Your Difficulty
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {difficulties.map((difficulty, index) => {
                const Icon = difficulty.icon;
                return (
                  <motion.div
                    key={difficulty.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className="hover-elevate active-elevate-2 cursor-pointer h-full"
                      onClick={() => setSelectedDifficulty(difficulty.id)}
                      data-testid={`card-difficulty-${difficulty.id}`}
                    >
                      <CardHeader className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-8 h-8 ${difficulty.color}`} />
                          <CardTitle className="text-2xl">{difficulty.name}</CardTitle>
                        </div>
                        <CardDescription className="text-base">
                          {difficulty.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="lg"
                          className="w-full text-lg"
                          data-testid={`button-select-${difficulty.id}`}
                        >
                          Select {difficulty.name}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <Button
                variant="outline"
                onClick={() => setSelectedDifficulty(null)}
                data-testid="button-back"
              >
                ← Back to Difficulty
              </Button>
              <h2 className="text-2xl md:text-3xl font-bold mt-4 mb-2 text-gray-800">
                Choose Your Game Mode
              </h2>
              <p className="text-gray-600">
                Selected: <span className="font-bold capitalize">{selectedDifficulty}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {gameModes.map((mode, index) => {
                const Icon = mode.icon;
                return (
                  <motion.div
                    key={mode.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className="hover-elevate active-elevate-2 cursor-pointer h-full"
                      onClick={() => startGame(mode.id)}
                      data-testid={`card-mode-${mode.id}`}
                    >
                      <CardHeader className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-8 h-8 ${mode.color}`} />
                          <CardTitle className="text-2xl">{mode.name}</CardTitle>
                        </div>
                        <CardDescription className="text-base">
                          {mode.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="lg"
                          className="w-full text-lg"
                          data-testid={`button-start-${mode.id}`}
                        >
                          Start {mode.name}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
