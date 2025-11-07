import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, LogOut, List, ChevronRight, Lock, Globe } from "lucide-react";
import type { DifficultyLevel, GameMode } from "@shared/schema";
import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import titleBanner from "@assets/generated_images/Hand-drawn_crayon_Spelling_Champions_text_fc50a8a9.png";
import schoolPattern from "@assets/generated_images/Cartoon_school_objects_background_pattern_1ab3a6ac.png";

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
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("all");
  const [quizWordCount, setQuizWordCount] = useState<"10" | "all">("10");

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
    setFilterDifficulty("all");
    setFilterGradeLevel("all");
    setQuizWordCount("10");
    setWordListDialogOpen(true);
  };

  const startGameWithCustomList = (list: CustomWordList) => {
    if (!selectedMode) return;
    setWordListDialogOpen(false);
    const quizParam = selectedMode === "quiz" ? `&quizCount=${quizWordCount}` : "";
    setLocation(`/game?listId=${list.id}&difficulty=${list.difficulty}&mode=${selectedMode}${quizParam}`);
  };

  const allLists = useMemo(() => {
    const myLists = (customLists || []).map(list => ({ ...list, isMine: true }));
    const pubLists = (publicLists || []).map(list => ({ ...list, isMine: false }));
    const combined = [...myLists, ...pubLists];
    
    // Remove duplicates (user's own public lists)
    const uniqueLists = combined.filter((list, index, self) => 
      index === self.findIndex(l => l.id === list.id)
    );
    
    // Apply filters
    let filtered = uniqueLists;
    if (filterDifficulty !== "all") {
      filtered = filtered.filter(list => list.difficulty === filterDifficulty);
    }
    if (filterGradeLevel !== "all") {
      filtered = filtered.filter(list => list.gradeLevel === filterGradeLevel);
    }
    
    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [customLists, publicLists, filterDifficulty, filterGradeLevel]);

  const availableGradeLevels = useMemo(() => {
    const myLists = customLists || [];
    const pubLists = publicLists || [];
    const combined = [...myLists, ...pubLists];
    const grades = new Set(combined.map(list => list.gradeLevel).filter(Boolean));
    return Array.from(grades).sort((a, b) => {
      const numA = parseInt(a || "0");
      const numB = parseInt(b || "0");
      return numA - numB;
    });
  }, [customLists, publicLists]);

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
      description: "Spell all the words in a list, then see your results",
      icon: Trophy,
      color: "text-purple-600",
    },
  ];

  return (
    <div 
      className="min-h-screen p-4 md:p-8 relative"
      style={{
        backgroundColor: 'hsl(var(--page-home-bg))',
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto relative z-10"
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
          <motion.div
            className="mb-4 flex justify-center overflow-hidden"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src={titleBanner} 
              alt="Spelling Champions" 
              className="w-full max-w-2xl h-auto scale-125"
              style={{ margin: '-5% 0' }}
              data-testid="img-title-banner"
            />
          </motion.div>
          <p className="text-lg md:text-xl text-gray-700">
            Master your spelling skills with fun, interactive challenges!
          </p>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800 font-crayon">
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Choose Your Word List</DialogTitle>
            <DialogDescription>
              Select a word list to start playing
            </DialogDescription>
          </DialogHeader>

          {selectedMode === "quiz" && (
            <div className="mb-4 p-3 bg-purple-50 rounded-md border border-purple-200">
              <label className="text-sm font-medium mb-2 block">Quiz Length</label>
              <div className="flex gap-3">
                <Button
                  variant={quizWordCount === "10" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuizWordCount("10")}
                  data-testid="button-quiz-10"
                  className="flex-1"
                >
                  10 Words
                </Button>
                <Button
                  variant={quizWordCount === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuizWordCount("all")}
                  data-testid="button-quiz-all"
                  className="flex-1"
                >
                  All Words
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
              <Select 
                value={filterDifficulty} 
                onValueChange={setFilterDifficulty}
              >
                <SelectTrigger data-testid="filter-difficulty">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Grade Level</label>
              <Select 
                value={filterGradeLevel} 
                onValueChange={setFilterGradeLevel}
              >
                <SelectTrigger data-testid="filter-grade">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {availableGradeLevels.map((grade) => (
                    <SelectItem key={grade} value={grade || ""}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {allLists.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filterDifficulty !== "all" || filterGradeLevel !== "all" 
                  ? "No word lists match your filters" 
                  : "No word lists available"}
              </div>
            ) : (
              allLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center gap-3 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => startGameWithCustomList(list)}
                  data-testid={`card-word-list-${list.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base truncate" data-testid={`text-list-name-${list.id}`}>
                      {list.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {list.words.length} words
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {list.gradeLevel && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-grade-${list.id}`}>
                        Grade {list.gradeLevel}
                      </Badge>
                    )}
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        list.difficulty === "easy" ? "bg-green-100 text-green-800" :
                        list.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}
                      data-testid={`badge-difficulty-${list.id}`}
                    >
                      {list.difficulty.charAt(0).toUpperCase() + list.difficulty.slice(1)}
                    </Badge>
                    {list.isPublic ? (
                      <Globe className="w-4 h-4 text-blue-600" data-testid={`icon-public-${list.id}`} />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" data-testid={`icon-private-${list.id}`} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
