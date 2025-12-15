import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, List, ChevronRight, Shuffle, AlertCircle, Grid3x3, Users, BarChart3, LayoutDashboard, Swords, Search, Eye, Loader2, Lock } from "lucide-react";
import type { GameMode, HeadToHeadChallenge } from "@shared/schema";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGuestSession } from "@/hooks/use-guest-session";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserHeader } from "@/components/user-header";
import { AccuracyCard } from "@/components/accuracy-card";
import { FeatureComparisonDialog } from "@/components/feature-comparison-dialog";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import titleBanner from "@assets/Spelling_Playground_title_1764882992138.png";
import oneStar from "@assets/1 star_1763916010555.png";
import missingStar from "@assets/Missing star (grey)_1763916010554.png";
import wordListsButton from "@assets/Word Lists button_1764442517980.png";
import userGroupsButton from "@assets/User Groups button 2_1764445093609.png";
import myStatsButton from "@assets/My Stats button 2_1764445093611.png";
import achievementsButton from "@assets/Achievements_button_4_1764949081693.png";
import starShopButton from "@assets/Star_Shop_button_3_1764949081694.png";
import h2hChallengeResultsButton from "@assets/H2H_Challenge_Results_button_1764699075884.png";
import adminDashboardButton from "@assets/Admin_Dashboard_button_1765395988735.png";

const useRefreshNotifications = (userId: number | undefined) => {
  const refresh = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos", userId] });
    }
  }, [userId]);
  
  return refresh;
};

function TeacherHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, currentTheme, hasDarkBackground } = useTheme();
  
  const textClasses = getThemedTextClasses(hasDarkBackground);

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
              alt="Spelling Playground" 
              className="w-full max-w-sm md:max-w-xl h-auto rounded-md"
              data-testid="img-title-banner"
            />
          </motion.div>
          <p className={`text-lg md:text-xl font-semibold ${textClasses.subtitle}`}>
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

// Helper function to format player name with privacy (first name + last initial only)
function formatPlayerNamePrivate(firstName?: string | null, lastName?: string | null): string {
  if (firstName && lastName) {
    const lastInitial = lastName.charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }
  if (firstName) {
    return firstName;
  }
  return '';
}

// Helper component to render avatar - handles both emoji and object storage paths
function AvatarDisplay({ avatar, size = "md", className = "" }: { avatar?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-sm",
    md: "w-8 h-8 text-lg",
    lg: "w-10 h-10 text-xl"
  };
  
  const baseClasses = `rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ${sizeClasses[size]} ${className}`;
  
  if (!avatar) {
    return (
      <div className={baseClasses}>
        <span role="img" aria-label="default avatar">🙂</span>
      </div>
    );
  }
  
  // Check if avatar is an object storage path (image file)
  if (avatar.startsWith('/objects/')) {
    return (
      <img 
        src={avatar} 
        alt="User avatar" 
        className={`rounded-full object-cover flex-shrink-0 ${sizeClasses[size].split(' ').slice(0, 2).join(' ')} ${className}`}
      />
    );
  }
  
  // Otherwise render as emoji
  return (
    <div className={baseClasses}>
      {avatar}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isGuestMode } = useAuth();
  const { state: guestState, guestGetWordListMastery } = useGuestSession();
  const { themeAssets, currentTheme, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [wordListDialogOpen, setWordListDialogOpen] = useState(false);
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [hideMastered, setHideMastered] = useState<boolean>(false);
  const [gameWordCount, setGameWordCount] = useState<"10" | "all">("all");
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const iOSKeyboardInput = useIOSKeyboardTrigger();
  const { toast } = useToast();
  
  // Feature comparison dialog state (for locked features)
  const [featureComparisonOpen, setFeatureComparisonOpen] = useState(false);
  
  // Generate Word List dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateGradeLevel, setGenerateGradeLevel] = useState<string>("");
  const [generateWordCountInput, setGenerateWordCountInput] = useState<string>("10");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Head to Head Challenge state
  const [h2hDialogOpen, setH2hDialogOpen] = useState(false);
  const [h2hSelectedWordList, setH2hSelectedWordList] = useState<number | null>(null);
  const [h2hOpponentSearch, setH2hOpponentSearch] = useState("");
  const [h2hSelectedOpponent, setH2hSelectedOpponent] = useState<any>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Refresh notifications when home page loads (only for authenticated users)
  const refreshNotifications = useRefreshNotifications(user?.id);
  useEffect(() => {
    if (!isGuestMode) {
      refreshNotifications();
    }
  }, [refreshNotifications, isGuestMode]);

  // Show Teacher Home for teachers
  if (user?.role === "teacher") {
    return <TeacherHome />;
  }

  // For guests, use in-memory word lists; for authenticated users, fetch from API
  const { data: apiCustomLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
    enabled: !isGuestMode,
  });
  
  // Guest users get their word lists from in-memory state
  const customLists = isGuestMode ? (guestState.wordLists as any[]) : apiCustomLists;

  const { data: publicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  // Shared lists only work for authenticated users
  const { data: sharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me"],
    enabled: !isGuestMode,
  });

  // Hidden word lists - only for paid accounts
  const { data: hiddenWordLists } = useQuery<{ wordListId: number }[]>({
    queryKey: ["/api/word-lists/hidden"],
    enabled: !isGuestMode && user?.accountType !== 'free',
  });

  // Grade levels for Generate Word List feature
  const { data: gradeLevels } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/generated-word-lists/grades"],
    enabled: generateDialogOpen,
  });
  
  const hiddenWordListIds = useMemo(() => {
    return new Set((hiddenWordLists || []).map(h => h.wordListId));
  }, [hiddenWordLists]);

  // Achievements - guests use in-memory state
  const { data: apiAchievements } = useQuery<any[]>({
    queryKey: ["/api/achievements/user", user?.id],
    enabled: !!user && !isGuestMode,
  });
  
  const achievements = isGuestMode ? guestState.achievements : apiAchievements;

  // Head to Head Challenge queries - disabled for guests
  const { data: searchResults, isLoading: isSearchingUsers } = useQuery<any[]>({
    queryKey: ["/api/users/search", h2hOpponentSearch],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(h2hOpponentSearch)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: !isGuestMode && h2hOpponentSearch.length >= 2,
  });

  // Auto-scroll to search results when they appear
  useEffect(() => {
    if (searchResults && searchResults.length > 0 && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [searchResults]);

  const { data: pendingChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/pending"],
    enabled: !isGuestMode,
  });

  // Filter to get pending invitations for the current user (as opponent)
  const pendingInvitations = pendingChallenges?.filter((c: any) => c.opponentId === user?.id) || [];
  
  // Active challenges where it's the current user's turn to play
  const { data: activeChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/active"],
    enabled: !isGuestMode,
  });
  
  const myTurnChallenges = activeChallenges?.filter((c: any) => 
    (c.initiatorId === user?.id && !c.initiatorCompletedAt) ||
    (c.opponentId === user?.id && !c.opponentCompletedAt)
  ) || [];
  
  // Total pending actions (invitations + my turn games)
  const totalPendingH2H = pendingInvitations.length + myTurnChallenges.length;

  const { data: completedChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/completed"],
    enabled: !isGuestMode,
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
      refreshNotifications();
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

  const acceptChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, wordListId }: { challengeId: number; wordListId: number }) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/accept`);
      return { data: await response.json(), wordListId, challengeId };
    },
    onSuccess: ({ wordListId, challengeId }) => {
      toast({
        title: "Challenge accepted!",
        description: "Let's play!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      refreshNotifications();
      setH2hDialogOpen(false);
      setLocation(`/game?listId=${wordListId}&mode=headtohead&challengeId=${challengeId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/decline`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge declined",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      refreshNotifications();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper to format player name
  const formatPlayerName = (firstName?: string | null, lastName?: string | null, username?: string) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName} (${username || 'Unknown'})`;
    }
    return username || 'Unknown';
  };

  // Helper function to get achievement for a word list
  const getAchievementForList = (wordListId: number) => {
    // For guest mode, use in-memory word list mastery data
    if (isGuestMode) {
      const mastery = guestGetWordListMastery(wordListId);
      if (!mastery) return null;
      return {
        wordListId,
        achievementType: "Word List Mastery",
        achievementValue: `${mastery.totalStars} ${mastery.totalStars === 1 ? "Star" : "Stars"}`,
        completedModes: mastery.completedModes,
      };
    }
    // For authenticated users, use API achievements
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
    setGameWordCount("all");
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
    // Pass game word count for modes that support it (practice, quiz, scramble, mistake)
    const supportsGameLength = ["practice", "quiz", "scramble", "mistake"].includes(selectedMode);
    const gameCountParam = supportsGameLength ? `&gameCount=${gameWordCount}` : "";
    setLocation(`/game?listId=${list.id}&mode=${selectedMode}${gameCountParam}`);
  };

  const handleGenerateWordList = async () => {
    if (!generateGradeLevel || !selectedMode) return;
    
    // Validate and clamp word count on submit
    const parsedCount = parseInt(generateWordCountInput, 10);
    const wordCount = isNaN(parsedCount) ? 10 : Math.max(5, Math.min(100, parsedCount));
    
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/generated-word-lists/${generateGradeLevel}?count=${wordCount}`);
      if (!response.ok) throw new Error("Failed to generate word list");
      
      const data = await response.json();
      const words = data.words as string[];
      
      // For iOS keyboard
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      if (isIOS && iOSKeyboardInput?.current) {
        iOSKeyboardInput.current.focus();
      }
      
      // Close dialogs and navigate using virtualWords parameter
      setGenerateDialogOpen(false);
      setWordListDialogOpen(false);
      
      const virtualWordsParam = encodeURIComponent(words.join(','));
      const supportsGameLength = ["practice", "quiz", "scramble", "mistake"].includes(selectedMode);
      const gameCountParam = supportsGameLength ? `&gameCount=all` : "";
      setLocation(`/game?virtualWords=${virtualWordsParam}&mode=${selectedMode}${gameCountParam}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate word list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if user is a free account
  const isFreeAccount = user?.accountType === 'free';

  const allLists = useMemo(() => {
    const myLists = (customLists || []).map(list => ({ ...list, isMine: true }));
    
    // Free accounts only see their own lists - no public or shared lists
    if (isFreeAccount) {
      let filtered = myLists;
      
      if (filterGradeLevel !== "all") {
        filtered = filtered.filter(list => list.gradeLevel === filterGradeLevel);
      }
      if (hideMastered && achievements) {
        filtered = filtered.filter(list => {
          const achievement = getAchievementForList(list.id);
          return !achievement || achievement.achievementValue !== "3 Stars";
        });
      }
      
      return filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    }
    
    const pubLists = (publicLists || []).map(list => ({ ...list, isMine: false }));
    const shared = (sharedLists || []).map(list => ({ ...list, isMine: false, isShared: true }));
    const combined = [...myLists, ...pubLists, ...shared];
    
    // Remove duplicates (user's own public lists)
    const uniqueLists = combined.filter((list, index, self) => 
      index === self.findIndex(l => l.id === list.id)
    );
    
    // Apply filters
    let filtered = uniqueLists;
    
    // Filter out hidden lists for paid accounts (always applied in game mode selection)
    filtered = filtered.filter(list => !hiddenWordListIds.has(list.id));
    
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
  }, [customLists, publicLists, sharedLists, filterGradeLevel, filterCreatedBy, hideMastered, achievements, isFreeAccount, hiddenWordListIds]);

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
              alt="Spelling Playground" 
              className="w-full max-w-sm md:max-w-xl h-auto rounded-md"
              data-testid="img-title-banner"
            />
          </motion.div>
          <p className={`text-lg md:text-xl font-semibold ${textClasses.subtitle}`}>
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
          {user?.accountType === 'free' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFeatureComparisonOpen(true)}
                  className="cursor-pointer rounded-full relative hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  data-testid="button-user-groups-locked"
                >
                  <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-gray-300 flex items-center justify-center p-2 opacity-50">
                    <img 
                      src={userGroupsButton} 
                      alt="User Groups" 
                      className="h-[95%] w-[95%] object-contain -mt-1 grayscale"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-gray-800/80 rounded-full p-2">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to see available features</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setLocation("/user-groups")}
              className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              data-testid="button-user-groups"
            >
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-blue-400 flex items-center justify-center p-2">
                <img 
                  src={userGroupsButton} 
                  alt="User Groups" 
                  className="h-[95%] w-[95%] object-contain -mt-1"
                />
              </div>
            </button>
          )}
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
                className="h-full w-full object-contain -mt-1"
              />
            </div>
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => setLocation("/admin")}
              className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              data-testid="button-admin-dashboard"
            >
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-orange-400 flex items-center justify-center p-2">
                <img 
                  src={adminDashboardButton} 
                  alt="Admin Dashboard" 
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <h2 className={`text-2xl md:text-3xl font-bold text-center ${textClasses.sectionTitle}`}>
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
            <h2 className={`text-2xl md:text-3xl font-bold text-center ${textClasses.sectionTitle}`}>
              Challenge a Friend
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            {user?.accountType === 'free' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card
                      className="shadow-lg border border-gray-300 bg-gray-100 w-full sm:w-auto relative cursor-pointer opacity-60 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={() => setFeatureComparisonOpen(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFeatureComparisonOpen(true);
                        }
                      }}
                      data-testid="card-mode-headtohead-locked"
                    >
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-gray-800/80 rounded-full p-3">
                          <Lock className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <CardHeader className="space-y-1 flex-1 flex flex-col justify-center p-4">
                        <div className="flex items-center gap-3">
                          <Swords className="w-8 h-8 text-gray-400" />
                          <CardTitle className="text-2xl text-gray-500">Head to Head Challenge</CardTitle>
                        </div>
                        <CardDescription className="text-base text-gray-400">
                          Challenge a friend to a timed spelling duel.<br />The winner gets a star!
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see available features</p>
                  </TooltipContent>
                </Tooltip>

                {/* Locked H2H Challenge Results Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setFeatureComparisonOpen(true)}
                      className="bg-gray-100 rounded-lg border border-gray-300 shadow-lg p-2 cursor-pointer opacity-60 relative hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      data-testid="button-h2h-challenge-results-locked"
                    >
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-gray-800/80 rounded-full p-2">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <img 
                        src={h2hChallengeResultsButton} 
                        alt="H2H Challenge Results" 
                        className="w-28 h-auto grayscale"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see available features</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                {/* Head to Head Challenge Button */}
                <Card
                  className="hover:scale-105 transition-transform cursor-pointer shadow-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full sm:w-auto relative"
                  onClick={() => {
                    setH2hSelectedWordList(null);
                    setH2hSelectedOpponent(null);
                    setH2hOpponentSearch("");
                    queryClient.invalidateQueries({ queryKey: ["/api/challenges/pending"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/challenges/active"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/challenges/completed"] });
                    setH2hDialogOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid="card-mode-headtohead"
                >
                  {/* Notification dot for pending challenges */}
                  {totalPendingH2H > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 z-10" data-testid="badge-pending-h2h">
                      {totalPendingH2H}
                    </span>
                  )}
                  <CardHeader className="space-y-1 flex-1 flex flex-col justify-center p-4">
                    <div className="flex items-center gap-3">
                      <Swords className="w-8 h-8 text-orange-600" />
                      <CardTitle className="text-2xl text-gray-800">Head to Head Challenge</CardTitle>
                    </div>
                    <CardDescription className="text-base text-gray-600">
                      Challenge a friend to a timed spelling duel.<br />The winner gets a star!
                    </CardDescription>
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
            )}
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

          <div className={`mb-4 grid grid-cols-1 gap-4 ${
            // Free accounts: 1 col for Grade only, 2 cols if Game Length shown
            // Paid accounts: 2 cols for Grade+Author, 3 cols if Game Length shown
            isFreeAccount 
              ? (selectedMode && ["practice", "quiz", "scramble", "mistake"].includes(selectedMode) ? "md:grid-cols-2" : "md:grid-cols-1")
              : (selectedMode && ["practice", "quiz", "scramble", "mistake"].includes(selectedMode) ? "md:grid-cols-3" : "md:grid-cols-2")
          }`}>
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
            {/* Hide Author filter for free accounts - they only see their own lists */}
            {!isFreeAccount && (
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
            )}
            {selectedMode && ["practice", "quiz", "scramble", "mistake"].includes(selectedMode) && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Game Length</label>
                <div className="flex gap-2">
                  <Button
                    variant={gameWordCount === "10" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGameWordCount("10")}
                    data-testid="button-game-length-10"
                    className="flex-1"
                  >
                    10 Words
                  </Button>
                  <Button
                    variant={gameWordCount === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGameWordCount("all")}
                    data-testid="button-game-length-all"
                    className="flex-1"
                  >
                    All Words
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGenerateGradeLevel("");
                setGenerateWordCountInput("10");
                setGenerateDialogOpen(true);
              }}
              data-testid="button-generate-word-list"
              className="flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Generate Word List
            </Button>
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

      {/* Generate Word List Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Word List
            </DialogTitle>
            <DialogDescription>
              Create a random word list from grade-level vocabulary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Practice Mode</p>
              <p className="text-xs opacity-80">Generated word lists track your stats, but stars and achievements are not earned.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Grade Level</label>
              <Select value={generateGradeLevel} onValueChange={setGenerateGradeLevel}>
                <SelectTrigger data-testid="select-grade-level">
                  <SelectValue placeholder="Select a grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels?.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Number of Words</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={generateWordCountInput}
                onChange={(e) => setGenerateWordCountInput(e.target.value.replace(/[^0-9]/g, ''))}
                data-testid="input-word-count"
              />
              <p className="text-xs text-muted-foreground mt-1">Between 5 and 100 words</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleGenerateWordList}
                disabled={!generateGradeLevel || isGenerating}
                className="flex-1"
                data-testid="button-start-generated"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Start"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(false)}
                data-testid="button-cancel-generate"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Dialog for First-Time Users */}
      <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome to Spelling Playground!</DialogTitle>
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
            {/* Pending Invitations - shown if there are any */}
            {(pendingInvitations.length > 0 || myTurnChallenges.length > 0) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Pending Challenges
                </h4>
                
                {/* Incoming invitations */}
                {pendingInvitations.map((challenge: any) => (
                  <Card key={challenge.id} className="border-orange-300 dark:border-orange-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {formatPlayerName(challenge.initiatorFirstName, challenge.initiatorLastName, challenge.initiatorUsername)} challenged you!
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            Word List: {challenge.wordListName || 'Unknown'}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => acceptChallengeMutation.mutate({ challengeId: challenge.id, wordListId: challenge.wordListId })}
                            disabled={acceptChallengeMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`button-accept-challenge-${challenge.id}`}
                          >
                            {acceptChallengeMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Accept"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineChallengeMutation.mutate(challenge.id)}
                            disabled={declineChallengeMutation.isPending}
                            data-testid={`button-decline-challenge-${challenge.id}`}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Active games - my turn to play */}
                {myTurnChallenges.map((challenge: any) => (
                  <Card key={challenge.id} className="border-blue-300 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            vs {challenge.initiatorId === user?.id 
                              ? formatPlayerName(challenge.opponentFirstName, challenge.opponentLastName, challenge.opponentUsername)
                              : formatPlayerName(challenge.initiatorFirstName, challenge.initiatorLastName, challenge.initiatorUsername)}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            Word List: {challenge.wordListName || 'Unknown'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setH2hDialogOpen(false);
                            setLocation(`/game?listId=${challenge.wordListId}&mode=headtohead&challengeId=${challenge.id}`);
                          }}
                          data-testid={`button-play-challenge-${challenge.id}`}
                        >
                          Play Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Create a New Challenge Section */}
            <h4 className="font-semibold text-orange-600 flex items-center gap-2" data-testid="text-create-challenge-heading">
              <Swords className="w-4 h-4" />
              Create a New Challenge
            </h4>

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
                <div ref={searchResultsRef} className="border rounded-lg max-h-48 overflow-y-auto">
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
                            className={`w-full p-3 text-left hover-elevate flex items-center gap-3 ${
                              h2hSelectedOpponent?.id === result.id ? 'bg-primary/10' : ''
                            }`}
                            data-testid={`button-select-opponent-${result.id}`}
                          >
                            <AvatarDisplay avatar={result.selectedAvatar} size="md" />
                            <div className="flex-1">
                              <div className="font-medium">{result.username}</div>
                              {(result.firstName || result.lastName) && (
                                <div className="text-sm text-muted-foreground">
                                  {formatPlayerNamePrivate(result.firstName, result.lastName)}
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
                    <div className="flex items-center gap-3">
                      <AvatarDisplay avatar={h2hSelectedOpponent.selectedAvatar} size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground">Challenging:</div>
                        <div className="font-semibold">{h2hSelectedOpponent.username}</div>
                      </div>
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

      {/* Feature Comparison Dialog */}
      <FeatureComparisonDialog 
        open={featureComparisonOpen} 
        onOpenChange={setFeatureComparisonOpen} 
      />
    </div>
  );
}
