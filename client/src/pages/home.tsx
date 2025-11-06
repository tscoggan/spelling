import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, LogOut, List, ChevronRight } from "lucide-react";
import type { DifficultyLevel, GameMode } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CustomWordList {
  id: number;
  name: string;
  difficulty: string;
  words: string[];
  isPublic: boolean;
  gradeLevel?: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [wordListDialogOpen, setWordListDialogOpen] = useState(false);

  const { data: customLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
    enabled: wordListDialogOpen,
  });

  const { data: publicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
    enabled: wordListDialogOpen,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleModeClick = (mode: GameMode) => {
    setSelectedMode(mode);
    setWordListDialogOpen(true);
  };

  const startGameWithCustomList = (list: CustomWordList) => {
    if (!selectedMode) return;
    setWordListDialogOpen(false);
    setLocation(`/game?listId=${list.id}&difficulty=${list.difficulty}&mode=${selectedMode}`);
  };

  const gameModes = [
    {
      id: "standard" as GameMode,
      name: "Standard",
      description: "Classic spelling game with immediate feedback",
      icon: Target,
      color: "text-blue-600",
    },
    {
      id: "timed" as GameMode,
      name: "Timed Challenge",
      description: "Spell as many words correctly in 60 seconds as you can!",
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
        <div className="flex justify-end mb-6">
          <Card className="px-6 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user?.selectedAvatar && (
                  <div className="text-3xl" data-testid="text-user-avatar">{user.selectedAvatar}</div>
                )}
                <div>
                  <div className="text-sm text-gray-600">Logged in as</div>
                  <div className="text-lg font-bold text-gray-800" data-testid="text-username">
                    {user?.username}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/word-lists")}
            data-testid="button-word-lists"
          >
            <List className="w-4 h-4 mr-2" />
            Custom Word Lists
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/leaderboard")}
            data-testid="button-view-leaderboard"
          >
            <Trophy className="w-4 h-4 mr-2" />
            View Leaderboard
          </Button>
        </div>

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

        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
          Choose Your Game Mode
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
                  onClick={() => handleModeClick(mode.id)}
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
                      data-testid={`button-select-${mode.id}`}
                    >
                      Select {mode.name}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <Dialog open={wordListDialogOpen} onOpenChange={setWordListDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Choose Your Word List</DialogTitle>
            <DialogDescription>
              Select one of your custom word lists to start playing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {customLists && customLists.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">My Custom Lists</h3>
                <div className="grid grid-cols-1 gap-3">
                  {customLists.map((list) => (
                    <Card
                      key={list.id}
                      className="hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => startGameWithCustomList(list)}
                      data-testid={`card-custom-list-${list.id}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{list.name}</CardTitle>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  list.difficulty === "easy" ? "bg-green-100 text-green-800" :
                                  list.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}
                              >
                                {list.difficulty.charAt(0).toUpperCase() + list.difficulty.slice(1)}
                              </Badge>
                              {list.gradeLevel && (
                                <Badge variant="secondary" className="text-xs">
                                  Grade {list.gradeLevel}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-sm">
                              {list.words.length} words
                            </CardDescription>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {publicLists && publicLists.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Public Lists</h3>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {publicLists.map((list) => (
                    <Card
                      key={list.id}
                      className="hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => startGameWithCustomList(list)}
                      data-testid={`card-public-list-${list.id}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{list.name}</CardTitle>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  list.difficulty === "easy" ? "bg-green-100 text-green-800" :
                                  list.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}
                              >
                                {list.difficulty.charAt(0).toUpperCase() + list.difficulty.slice(1)}
                              </Badge>
                              {list.gradeLevel && (
                                <Badge variant="secondary" className="text-xs">
                                  Grade {list.gradeLevel}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-sm">
                              {list.words.length} words
                            </CardDescription>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
