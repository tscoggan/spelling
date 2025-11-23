import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, List, ChevronRight, Lock, Globe, Shuffle, AlertCircle, Grid3x3, Users } from "lucide-react";
import type { GameMode } from "@shared/schema";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIOSKeyboardTrigger } from "@/App";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserHeader } from "@/components/user-header";
import { AccuracyCard } from "@/components/accuracy-card";
import titleBanner from "@assets/image_1763494070680.png";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
import oneStar from "@assets/1 star_1763916010555.png";
import missingStar from "@assets/Missing star (grey)_1763916010554.png";

interface CustomWordList {
  id: number;
  name: string;
  words: string[];
  isPublic: boolean;
  gradeLevel?: string;
  authorUsername?: string;
  createdAt?: string | Date;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [wordListDialogOpen, setWordListDialogOpen] = useState(false);
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [hideMastered, setHideMastered] = useState<boolean>(false);
  const [quizWordCount, setQuizWordCount] = useState<"10" | "all">("all");
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const iOSKeyboardInput = useIOSKeyboardTrigger();

  const { data: customLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
  });

  const { data: publicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  const { data: sharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me"],
  });

  const { data: achievements } = useQuery<any[]>({
    queryKey: ["/api/achievements/user", user?.id],
    enabled: !!user,
  });

  // Helper function to get achievement for a word list
  const getAchievementForList = (wordListId: number) => {
    if (!achievements) return null;
    return achievements.find(
      (a) => a.wordListId === wordListId && a.achievementType === "Word List Mastery"
    );
  };

  // Helper function to check if current mode has been completed
  const hasModeAchievement = (wordListId: number, mode: GameMode | null) => {
    if (!mode || mode === "standard") return false; // Practice mode doesn't award achievements
    const achievement = getAchievementForList(wordListId);
    if (!achievement) return false;
    return achievement.completedModes?.includes(mode) || false;
  };

  const handleModeClick = (mode: GameMode) => {
    setSelectedMode(mode);
    setFilterGradeLevel("all");
    setFilterCreatedBy("all");
    setHideMastered(false);
    setQuizWordCount("all");
    setWordListDialogOpen(true);
  };

  const startGameWithCustomList = (list: CustomWordList) => {
    if (!selectedMode) return;
    
    // For iOS: Focus hidden input BEFORE navigation to maintain gesture context
    // This allows the keyboard to open automatically when the game page loads
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                  (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (isIOS && iOSKeyboardInput?.current) {
      iOSKeyboardInput.current.focus();
    }
    
    // Close dialog and navigate
    // Note: Dialog's onCloseAutoFocus prevents focus restoration, keeping focus on hidden input
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
    if (filterCreatedBy !== "all") {
      filtered = filtered.filter(list => list.authorUsername === filterCreatedBy);
    }
    if (hideMastered && achievements) {
      // Filter out word lists where user has earned 3 stars
      filtered = filtered.filter(list => {
        const achievement = getAchievementForList(list.id);
        return !achievement || achievement.achievementValue !== "3 Stars";
      });
    }
    
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [customLists, publicLists, sharedLists, filterGradeLevel, filterCreatedBy, hideMastered, achievements]);

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

  const availableAuthors = useMemo(() => {
    const myLists = customLists || [];
    const pubLists = publicLists || [];
    const shared = sharedLists || [];
    const combined = [...myLists, ...pubLists, ...shared];
    const authors = new Set(combined.map(list => list.authorUsername).filter(Boolean));
    return Array.from(authors).sort((a, b) => a!.localeCompare(b!));
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
      description: "Practice spelling words with immediate feedback",
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
          <p className="text-lg md:text-xl text-foreground font-semibold">
            Master your spelling skills with fun, interactive challenges!
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-4 mb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/word-lists")}
            className="hover:scale-110 transition-transform"
            data-testid="button-word-lists"
          >
            <List className="w-4 h-4 mr-2" />
            Word Lists
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/user-groups")}
            className="hover:scale-110 transition-transform"
            data-testid="button-user-groups"
          >
            <Users className="w-4 h-4 mr-2" />
            User Groups
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/leaderboard")}
            className="hover:scale-110 transition-transform"
            data-testid="button-view-leaderboard"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/achievements")}
            className="hover:scale-110 transition-transform"
            data-testid="button-view-achievements"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </Button>
        </div>

        <div className="flex justify-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground">
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
                className="h-full"
              >
                <Card
                  className="hover:scale-110 transition-transform cursor-pointer h-full shadow-lg border-2 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => handleModeClick(mode.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleModeClick(mode.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid={`card-mode-${mode.id}`}
                >
                  <CardHeader className="space-y-1 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-8 h-8 ${mode.color}`} />
                      <CardTitle className="text-2xl">{mode.name}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {mode.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <Dialog open={wordListDialogOpen} onOpenChange={setWordListDialogOpen}>
        <DialogContent 
          className="max-w-3xl max-h-[85vh] flex flex-col"
          onCloseAutoFocus={(e) => {
            // Prevent dialog from restoring focus when closing
            // This keeps focus on the hidden iOS keyboard trigger input
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">Choose Your Word List</DialogTitle>
            <DialogDescription>
              Select a word list to start playing
            </DialogDescription>
          </DialogHeader>

          <div className={`mb-4 grid grid-cols-1 gap-4 ${selectedMode === "quiz" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div>
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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Created By</label>
              <Select 
                value={filterCreatedBy} 
                onValueChange={setFilterCreatedBy}
              >
                <SelectTrigger data-testid="filter-author">
                  <SelectValue placeholder="All Authors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {availableAuthors.map((author) => (
                    <SelectItem key={author} value={author || ""}>
                      {author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMode === "quiz" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Quiz Length</label>
                <div className="flex gap-2">
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
          </div>

          <div className="mb-4 flex items-center space-x-2">
            <Checkbox 
              id="hide-mastered" 
              checked={hideMastered}
              onCheckedChange={(checked) => setHideMastered(checked === true)}
              data-testid="checkbox-hide-mastered"
            />
            <label 
              htmlFor="hide-mastered" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Hide Word Lists I've Mastered
            </label>
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
                  className="flex items-center gap-2 p-2 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => startGameWithCustomList(list)}
                  data-testid={`card-word-list-${list.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="font-semibold text-sm truncate" data-testid={`text-list-name-${list.id}`}>
                        {list.name}
                      </div>
                      {list.gradeLevel && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0" data-testid={`badge-grade-${list.id}`}>
                          Grade {list.gradeLevel}
                        </Badge>
                      )}
                      {list.isPublic ? (
                        <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" data-testid={`icon-public-${list.id}`} />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" data-testid={`icon-private-${list.id}`} />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {list.words.length} words
                    </div>
                  </div>
                  
                  <AccuracyCard wordListId={list.id} gameMode={selectedMode || undefined} />
                  
                  {selectedMode && selectedMode !== "standard" && (
                    <div className="flex-shrink-0 flex justify-center items-center min-w-[80px]">
                      <img 
                        src={hasModeAchievement(list.id, selectedMode) ? oneStar : missingStar}
                        alt={hasModeAchievement(list.id, selectedMode) ? "Achievement earned" : "No achievement"} 
                        className="h-16 w-auto max-w-[80px] object-contain"
                        data-testid={`achievement-${list.id}`}
                      />
                    </div>
                  )}
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
