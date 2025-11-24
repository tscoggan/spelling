import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Target, Trophy, Flame, TrendingUp, Award, Calendar, Play, Shuffle, AlertCircle, Grid3x3, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { UserHeader } from "@/components/user-header";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DateFilter = "all" | "month" | "week" | "today";

interface UserStats {
  totalWordsAttempted: number;
  accuracy: number | null;
  longestStreak: number;
  currentStreak: number;
  totalGamesPlayed: number;
  favoriteGameMode: string | null;
  averageScore: number;
  mostMisspelledWords: { word: string; mistakes: number }[];
}

export default function Stats() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showGameModeDialog, setShowGameModeDialog] = useState(false);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: [`/api/stats/user/${user?.id}`, dateFilter, userTimezone],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch(`/api/stats/user/${user.id}?dateFilter=${dateFilter}&timezone=${encodeURIComponent(userTimezone)}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user,
    refetchOnMount: true,
  });

  const gameModeNames: { [key: string]: string } = {
    practice: "Practice",
    timed: "Timed Challenge",
    quiz: "Quiz Mode",
    scramble: "Word Scramble",
    mistake: "Find the Mistake",
    crossword: "Crossword Puzzle",
  };

  const dateFilterLabels: { [key in DateFilter]: string } = {
    all: "All Time",
    month: "Last 30 Days",
    week: "Last 7 Days",
    today: "Today",
  };

  const handleGameModeSelect = (gameMode: string) => {
    if (!stats?.mostMisspelledWords || stats.mostMisspelledWords.length === 0) {
      console.warn("No misspelled words available");
      return;
    }
    
    // Create a virtual word list from most misspelled words
    const words = stats.mostMisspelledWords.map(item => item.word).join(',');
    const url = `/game?mode=${gameMode}&virtualWords=${encodeURIComponent(words)}`;
    
    console.log("🎮 Navigating to game with virtual words:", {
      gameMode,
      wordCount: stats.mostMisspelledWords.length,
      words: words,
      url: url
    });
    
    // Close dialog first, then navigate
    setShowGameModeDialog(false);
    setLocation(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed background layers */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="hidden md:block absolute inset-0">
          <img 
            src={rainbowBackgroundLandscape} 
            alt="" 
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        <div className="md:hidden absolute inset-0">
          <img 
            src={rainbowBackgroundPortrait} 
            alt="" 
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        <div className="absolute inset-0 bg-white/5 dark:bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <UserHeader />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                My Stats
              </h1>
              <p className="text-lg text-muted-foreground mt-1">Your spelling journey</p>
            </div>

            {/* Date Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(["all", "month", "week", "today"] as DateFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(filter)}
                  data-testid={`button-filter-${filter}`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateFilterLabels[filter]}
                </Button>
              ))}
            </div>

            {!user ? (
              <Card className="backdrop-blur-sm bg-card/90">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Please log in to view your stats
                  </p>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xl text-muted-foreground">Loading stats...</p>
              </div>
            ) : stats ? (
              <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Total Words Attempted */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-total-words">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Words Attempted
                    </CardTitle>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-total-words">
                      {stats.totalWordsAttempted.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                {/* Accuracy */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-accuracy">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Accuracy
                    </CardTitle>
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-accuracy">
                      {stats.accuracy !== null ? `${stats.accuracy}%` : "N/A"}
                    </div>
                  </CardContent>
                </Card>

                {/* Longest Streak */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-longest-streak">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Longest Streak
                    </CardTitle>
                    <Flame className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-longest-streak">
                      {stats.longestStreak}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      words in a row
                    </p>
                  </CardContent>
                </Card>

                {/* Current Streak */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-current-streak">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Current Streak
                    </CardTitle>
                    <Flame className="w-4 h-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-current-streak">
                      {stats.currentStreak}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      words in a row
                    </p>
                  </CardContent>
                </Card>

                {/* Total Games Played */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-games-played">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Games Played
                    </CardTitle>
                    <Award className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-games-played">
                      {stats.totalGamesPlayed.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                {/* Average Score */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-average-score">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Score
                    </CardTitle>
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-average-score">
                      {stats.averageScore.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                {/* Favorite Game Mode */}
                <Card className="backdrop-blur-sm bg-card/90" data-testid="card-favorite-mode">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Favorite Game Mode
                    </CardTitle>
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold" data-testid="text-favorite-mode">
                      {stats.favoriteGameMode ? gameModeNames[stats.favoriteGameMode] || stats.favoriteGameMode : "N/A"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Most Misspelled Words */}
              {stats.mostMisspelledWords && stats.mostMisspelledWords.length > 0 && (
                <Card className="backdrop-blur-sm bg-card/90 mt-6" data-testid="card-most-misspelled">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-xl font-semibold">
                      Most Misspelled Words
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setShowGameModeDialog(true)}
                      data-testid="button-play-misspelled"
                      title="Practice these words"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.mostMisspelledWords.map(({ word, mistakes }, index) => (
                        <div key={word} className="flex items-center justify-between" data-testid={`misspelled-word-${index}`}>
                          <span className="text-lg font-medium capitalize">{word}</span>
                          <span className="text-sm text-muted-foreground">{mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              </>
            ) : (
              <Card className="backdrop-blur-sm bg-card/90">
                <CardContent className="py-8 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Stats Yet</h3>
                  <p className="text-muted-foreground">
                    Start playing games to see your stats!
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Game Mode Selection Dialog */}
      <Dialog open={showGameModeDialog} onOpenChange={setShowGameModeDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Game Mode</DialogTitle>
            <DialogDescription>
              Select how you want to practice with your most misspelled words
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleGameModeSelect('practice')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameModeSelect('practice');
                }
              }}
              data-testid="button-mode-practice"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">Practice</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Classic spelling game with immediate feedback
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleGameModeSelect('timed')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameModeSelect('timed');
                }
              }}
              data-testid="button-mode-timed"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <CardTitle className="text-lg">Timed Challenge</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Spell as many words correctly in 60 seconds as you can!
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleGameModeSelect('quiz')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameModeSelect('quiz');
                }
              }}
              data-testid="button-mode-quiz"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-purple-600" />
                  <div>
                    <CardTitle className="text-lg">Quiz Mode</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Spell all the words in a list, then see your results
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleGameModeSelect('scramble')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameModeSelect('scramble');
                }
              }}
              data-testid="button-mode-scramble"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shuffle className="w-8 h-8 text-green-600" />
                  <div>
                    <CardTitle className="text-lg">Word Scramble</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Drag and drop letter tiles to unscramble the word
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleGameModeSelect('mistake')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameModeSelect('mistake');
                }
              }}
              data-testid="button-mode-mistake"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <CardTitle className="text-lg">Find the Mistake</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Identify the one misspelled word from four choices
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleGameModeSelect('crossword')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameModeSelect('crossword');
                }
              }}
              data-testid="button-mode-crossword"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Grid3x3 className="w-8 h-8 text-indigo-600" />
                  <div>
                    <CardTitle className="text-lg">Crossword Puzzle</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Solve a crossword using spelling words and their pronunciations
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
