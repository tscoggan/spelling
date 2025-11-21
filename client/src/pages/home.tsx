import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, List, ChevronRight, Lock, Globe, Shuffle, AlertCircle, Grid3x3, Users } from "lucide-react";
import type { GameMode } from "@shared/schema";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import { UserHeader } from "@/components/user-header";
import titleBanner from "@assets/image_1763494070680.png";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";

interface CustomWordList {
  id: number;
  name: string;
  words: string[];
  isPublic: boolean;
  gradeLevel?: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [wordListDialogOpen, setWordListDialogOpen] = useState(false);
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("all");
  const [quizWordCount, setQuizWordCount] = useState<"10" | "all">("all");
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);

  const { data: customLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
  });

  const { data: publicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  const { data: sharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me"],
  });

  const handleModeClick = (mode: GameMode) => {
    setSelectedMode(mode);
    setFilterGradeLevel("all");
    setQuizWordCount("all");
    setWordListDialogOpen(true);
  };

  const startGameWithCustomList = (list: CustomWordList) => {
    if (!selectedMode) return;
    setWordListDialogOpen(false);
    const quizParam = selectedMode === "quiz" ? `&quizCount=${quizWordCount}` : "";
    setLocation(`/game?listId=${list.id}&mode=${selectedMode}${quizParam}`);
  };

  const allLists = useMemo(() => {
    const myLists = (customLists || []).map(list => ({ ...list, isMine: true }));
    const pubLists = (publicLists || []).map(list => ({ ...list, isMine: false }));
    const shared = (sharedLists || []).map(list => ({ ...list, isMine: false, isShared: true }));
    const combined = [...myLists, ...pubLists, ...shared];
    
    // Remove duplicates (user's own public lists)
    const uniqueLists = combined.filter((list, index, self) => 
      index === self.findIndex(l => l.id === list.id)
    );
    
    // Apply filters
    let filtered = uniqueLists;
    if (filterGradeLevel !== "all") {
      filtered = filtered.filter(list => list.gradeLevel === filterGradeLevel);
    }
    
    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [customLists, publicLists, sharedLists, filterGradeLevel]);

  const availableGradeLevels = useMemo(() => {
    const myLists = customLists || [];
    const pubLists = publicLists || [];
    const shared = sharedLists || [];
    const combined = [...myLists, ...pubLists, ...shared];
    const grades = new Set(combined.map(list => list.gradeLevel).filter(Boolean));
    return Array.from(grades).sort((a, b) => {
      const numA = parseInt(a || "0");
      const numB = parseInt(b || "0");
      return numA - numB;
    });
  }, [customLists, publicLists, sharedLists]);

  // Show welcome dialog for first-time users
  useEffect(() => {
    if (!user) return;
    
    // Check if welcome has been shown for this user
    const welcomeShownKey = `welcomeShown_${user.id}`;
    const hasSeenWelcome = localStorage.getItem(welcomeShownKey);
    
    // Show welcome if:
    // 1. User hasn't seen it before (localStorage check)
    // 2. User has no custom word lists (first-time indicator)
    if (!hasSeenWelcome && customLists !== undefined && customLists.length === 0) {
      setWelcomeDialogOpen(true);
      // Mark as shown
      localStorage.setItem(welcomeShownKey, 'true');
    }
  }, [user, customLists]);

  const gameModes = [
    {
      id: "standard" as GameMode,
      name: "Practice",
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
    {
      id: "scramble" as GameMode,
      name: "Word Scramble",
      description: "Drag and drop letter tiles to unscramble the word",
      icon: Shuffle,
      color: "text-green-600",
    },
    {
      id: "mistake" as GameMode,
      name: "Find the Mistake",
      description: "Identify the one misspelled word from four choices",
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      id: "crossword" as GameMode,
      name: "Crossword Puzzle",
      description: "Solve a crossword using spelling words and their pronunciations",
      icon: Grid3x3,
      color: "text-indigo-600",
    },
  ];

  return (
    <div 
      className="min-h-screen p-4 md:p-8 relative overflow-hidden"
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto relative z-10"
      >
        <UserHeader />

        <div className="text-center mb-8 md:mb-12">
          <motion.div
            className="mb-2 flex justify-center overflow-hidden"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src={titleBanner} 
              alt="Spelling Champions" 
              className="w-full max-w-sm md:max-w-xl h-auto rounded-md"
              data-testid="img-title-banner"
            />
          </motion.div>
          <p className="text-lg md:text-xl text-foreground font-semibold bg-white/60 dark:bg-gray-900/70 backdrop-blur-sm px-6 py-3 rounded-full inline-block shadow-md">
            Master your spelling skills with fun, interactive challenges!
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-4 mb-8">
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
            onClick={() => setLocation("/user-groups")}
            data-testid="button-user-groups"
          >
            <Users className="w-4 h-4 mr-2" />
            User Groups
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

        <div className="flex justify-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground bg-white/60 dark:bg-gray-900/70 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-md">
            Choose Your Game Mode
          </h2>
        </div>
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
                  className="hover-elevate active-elevate-2 cursor-pointer h-full shadow-lg border-2"
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

          <div className="mb-4">
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

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {allLists.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filterGradeLevel !== "all" 
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

      {/* Welcome Dialog for First-Time Users */}
      <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome to Spelling Champions!</DialogTitle>
            <DialogDescription className="text-base pt-4">
              We're excited to have you here! Get started by creating your first Custom Word List.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Custom Word Lists let you practice spelling with words that matter to you. Add your own words, 
              and we'll help you learn them through fun games and challenges!
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setWelcomeDialogOpen(false);
                  setLocation("/word-lists");
                }}
                className="flex-1"
                data-testid="button-create-word-list"
              >
                <List className="w-4 h-4 mr-2" />
                Create Word List
              </Button>
              <Button
                variant="outline"
                onClick={() => setWelcomeDialogOpen(false)}
                data-testid="button-close-welcome"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
