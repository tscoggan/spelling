import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, List, ChevronRight, Shuffle, AlertCircle, Grid3x3, Users, BarChart3, LayoutDashboard, Swords, Search, Eye, Loader2 } from "lucide-react";
import type { GameMode, HeadToHeadChallenge } from "@shared/schema";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { UserHeader } from "@/components/user-header";
import { AccuracyCard } from "@/components/accuracy-card";
import { useTheme } from "@/hooks/use-theme";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import titleBanner from "@assets/image_1763494070680.png";
import oneStar from "@assets/1 star_1763916010555.png";
import missingStar from "@assets/Missing star (grey)_1763916010554.png";
import wordListsButton from "@assets/Word Lists button_1764442517980.png";
import userGroupsButton from "@assets/User Groups button 2_1764445093609.png";
import myStatsButton from "@assets/My Stats button 2_1764445093611.png";
import achievementsButton from "@assets/Achievements button 3_1764446032415.png";
import starShopButton from "@assets/Star Shops button 2_1764445093610.png";
import h2hChallengeResultsButton from "@assets/H2H_Challenge_Results_button_1764699075884.png";

function TeacherHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, currentTheme } = useTheme();
  
  const needsWhiteText = currentTheme === "space" || currentTheme === "skiing" || currentTheme === "basketball" || currentTheme === "robot";

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto relative z-10 space-y-6"
      >
        <UserHeader />

        <div className="text-center mb-8">
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
          <p className={`text-lg md:text-xl font-semibold ${needsWhiteText ? 'text-white' : 'text-foreground'}`}>
            Welcome, {user?.firstName || user?.username}{user?.lastName ? ` ${user.lastName}` : ''}!
          </p>
        </div>

        <Card className="p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-6 text-center">Teacher Navigation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 text-lg"
              onClick={() => setLocation("/user-groups")}
              data-testid="button-teacher-groups"
            >
              <Users className="w-10 h-10 text-blue-600" />
              <span className="font-semibold">User Groups</span>
              <span className="text-sm text-muted-foreground font-normal">Manage your student groups</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 text-lg"
              onClick={() => setLocation("/word-lists")}
              data-testid="button-teacher-wordlists"
            >
              <BookOpen className="w-10 h-10 text-green-600" />
              <span className="font-semibold">Word Lists</span>
              <span className="text-sm text-muted-foreground font-normal">Create and manage word lists</span>
            </Button>

            <Button
              variant="default"
              className="h-auto py-6 flex flex-col items-center gap-3 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              onClick={() => setLocation("/teacher-dashboard")}
              data-testid="button-teacher-dashboard"
            >
              <LayoutDashboard className="w-10 h-10" />
              <span className="font-semibold">Teacher Dashboard</span>
              <span className="text-sm font-normal opacity-90">View student performance</span>
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-bold">Quick Overview</h2>
          </div>
          <p className="text-muted-foreground">
            Access your Teacher Dashboard to view detailed performance metrics for your students. 
            Create word lists and share them with your groups to track student progress.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}

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
  const { themeAssets, currentTheme } = useTheme();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [wordListDialogOpen, setWordListDialogOpen] = useState(false);
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [hideMastered, setHideMastered] = useState<boolean>(false);
  const [quizWordCount, setQuizWordCount] = useState<"10" | "all">("all");
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const iOSKeyboardInput = useIOSKeyboardTrigger();
  const { toast } = useToast();
  
  // Head to Head Challenge state
  const [h2hDialogOpen, setH2hDialogOpen] = useState(false);
  const [h2hSelectedWordList, setH2hSelectedWordList] = useState<number | null>(null);
  const [h2hOpponentSearch, setH2hOpponentSearch] = useState("");
  const [h2hSelectedOpponent, setH2hSelectedOpponent] = useState<any>(null);

  // Show Teacher Home for teachers
  if (user?.role === "teacher") {
    return <TeacherHome />;
  }

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

  // Head to Head Challenge queries
  const { data: searchResults, isLoading: isSearchingUsers } = useQuery<any[]>({
    queryKey: ["/api/users/search", h2hOpponentSearch],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(h2hOpponentSearch)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: h2hOpponentSearch.length >= 2,
  });

  const { data: pendingChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/pending"],
    enabled: h2hDialogOpen,
  });

  const { data: completedChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/completed"],
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: { opponentId: number; wordListId: number }) => {
      const response = await apiRequest("POST", "/api/challenges", data);
      return response.json();
    },
    onSuccess: (challenge: any) => {
      toast({
        title: "Challenge sent!",
        description: "Your opponent will be notified. You can now play your round!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setH2hDialogOpen(false);
      // Navigate to game with challenge mode - include challengeId so results can be submitted
      if (h2hSelectedWordList && challenge?.id) {
        setLocation(`/game?listId=${h2hSelectedWordList}&mode=headtohead&isInitiator=true&challengeId=${challenge.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
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
    if (!mode) return false;
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
      id: "practice" as GameMode,
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
          <p className={`text-lg md:text-xl font-semibold ${currentTheme === 'space' ? 'text-white' : 'text-foreground'}`}>
            Master your spelling skills with fun, interactive challenges!
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-4 mb-8">
          <button
            onClick={() => setLocation("/stats")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-view-stats"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-purple-400 flex items-center justify-center p-2">
              <img 
                src={myStatsButton} 
                alt="My Stats" 
                className="h-full w-full object-contain"
              />
            </div>
          </button>
          <button
            onClick={() => setLocation("/user-groups")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-user-groups"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-blue-400 flex items-center justify-center p-2">
              <img 
                src={userGroupsButton} 
                alt="User Groups" 
                className="h-[95%] w-[95%] object-contain"
              />
            </div>
          </button>
          <button
            onClick={() => setLocation("/word-lists")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            data-testid="button-word-lists"
          >
            <img 
              src={wordListsButton} 
              alt="Word Lists" 
              className="h-24 md:h-28 w-auto"
            />
          </button>
          <button
            onClick={() => setLocation("/achievements")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-view-achievements"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-yellow-400 flex items-center justify-center p-2">
              <img 
                src={achievementsButton} 
                alt="Achievements" 
                className="h-full w-full object-contain"
              />
            </div>
          </button>
          <button
            onClick={() => setLocation("/star-shop")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-star-shop"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-orange-400 flex items-center justify-center p-2">
              <img 
                src={starShopButton} 
                alt="Star Shop" 
                className="h-full w-full object-contain"
              />
            </div>
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <h2 className={`text-2xl md:text-3xl font-bold text-center ${currentTheme === 'space' ? 'text-white' : 'text-foreground'}`}>
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

        {/* Head to Head Challenge Card */}
        <div className="mt-8">
          <div className="flex justify-center mb-6">
            <h2 className={`text-2xl md:text-3xl font-bold text-center ${currentTheme === 'space' ? 'text-white' : 'text-foreground'}`}>
              Challenge a Friend
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {/* Head to Head Challenge Button */}
              <Card
                className="hover:scale-105 transition-transform cursor-pointer shadow-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full sm:w-auto"
                onClick={() => {
                  setH2hSelectedWordList(null);
                  setH2hSelectedOpponent(null);
                  setH2hOpponentSearch("");
                  setH2hDialogOpen(true);
                }}
                role="button"
                tabIndex={0}
                data-testid="card-mode-headtohead"
              >
                <CardHeader className="space-y-2 p-4">
                  <div className="flex items-center gap-3">
                    <Swords className="w-10 h-10 text-orange-600" />
                    <div>
                      <CardTitle className="text-xl text-gray-800">
                        <span className="block">Head to Head</span>
                        <span className="block">Challenge</span>
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        Challenge a friend to a timed spelling duel!
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* H2H Challenge Results Button */}
              <div
                className="hover:scale-105 transition-transform cursor-pointer bg-white rounded-lg border border-gray-300 dark:border-gray-600 shadow-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => setLocation("/head-to-head")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLocation("/head-to-head");
                  }
                }}
                data-testid="button-h2h-challenge-results"
              >
                <img 
                  src={h2hChallengeResultsButton} 
                  alt="H2H Challenge Results" 
                  className="w-28 h-auto"
                />
              </div>
            </motion.div>
          </div>
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
                    <div className="font-semibold text-sm truncate mb-0.5" data-testid={`text-list-name-${list.id}`}>
                      {list.name}
                    </div>
                    {list.gradeLevel && (
                      <div className="text-xs text-muted-foreground leading-tight" data-testid={`text-grade-${list.id}`}>
                        Grade {list.gradeLevel}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground leading-tight">
                      {list.words.length} words
                    </div>
                  </div>
                  
                  <AccuracyCard wordListId={list.id} gameMode={selectedMode || undefined} />
                  
                  {selectedMode && (
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

      {/* Head to Head Challenge Setup Dialog */}
      <Dialog open={h2hDialogOpen} onOpenChange={setH2hDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Swords className="w-6 h-6 text-orange-600" />
              Head to Head Challenge
            </DialogTitle>
            <DialogDescription>
              Challenge a friend to a spelling duel! Select a word list and opponent to begin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4 flex-1 overflow-y-auto">
            {/* Scoring Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Scoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>+10 points for each correct word</li>
                <li>-5 points for each incorrect word</li>
                <li>-1 point for every second of time taken</li>
                <li className="font-medium text-foreground pt-2">Winner earns 1 star!</li>
              </ul>
            </div>

            {/* Step 1: Select Word List */}
            <div className="space-y-3">
              <label className="text-sm font-medium">1. Select Word List</label>
              <Select 
                value={h2hSelectedWordList?.toString() || ""} 
                onValueChange={(val) => setH2hSelectedWordList(parseInt(val))}
              >
                <SelectTrigger data-testid="select-h2h-wordlist">
                  <SelectValue placeholder="Choose a word list..." />
                </SelectTrigger>
                <SelectContent>
                  {allLists.map((list) => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      {list.name} ({list.words.length} words)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Search for Opponent */}
            <div className="space-y-3">
              <label className="text-sm font-medium">2. Search for Opponent</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={h2hOpponentSearch}
                  onChange={(e) => {
                    setH2hOpponentSearch(e.target.value);
                    setH2hSelectedOpponent(null);
                  }}
                  className="pl-10"
                  data-testid="input-h2h-opponent-search"
                />
              </div>

              {/* Search Results */}
              {h2hOpponentSearch.length >= 2 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {isSearchingUsers ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="divide-y">
                      {searchResults
                        .filter((u: any) => u.id !== user?.id)
                        .map((result: any) => (
                          <button
                            key={result.id}
                            onClick={() => setH2hSelectedOpponent(result)}
                            className={`w-full p-3 text-left hover-elevate flex items-center justify-between ${
                              h2hSelectedOpponent?.id === result.id ? 'bg-primary/10' : ''
                            }`}
                            data-testid={`button-select-opponent-${result.id}`}
                          >
                            <div>
                              <div className="font-medium">{result.username}</div>
                              {(result.firstName || result.lastName) && (
                                <div className="text-sm text-muted-foreground">
                                  {result.firstName} {result.lastName}
                                </div>
                              )}
                            </div>
                            {h2hSelectedOpponent?.id === result.id && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No users found matching "{h2hOpponentSearch}"
                    </div>
                  )}
                </div>
              )}

              {/* Selected Opponent Display */}
              {h2hSelectedOpponent && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Challenging:</div>
                      <div className="font-semibold">{h2hSelectedOpponent.username}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setH2hSelectedOpponent(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Start Challenge Button */}
          <div className="pt-4 border-t">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
              disabled={!h2hSelectedWordList || !h2hSelectedOpponent || createChallengeMutation.isPending}
              onClick={() => {
                if (h2hSelectedWordList && h2hSelectedOpponent) {
                  createChallengeMutation.mutate({
                    opponentId: h2hSelectedOpponent.id,
                    wordListId: h2hSelectedWordList,
                  });
                }
              }}
              data-testid="button-start-challenge"
            >
              {createChallengeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Challenge...
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 mr-2" />
                  Start Challenge
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
