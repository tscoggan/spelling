import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Trophy, Lock, Globe, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { UserHeader } from "@/components/user-header";
import { AccuracyCard } from "@/components/accuracy-card";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
import oneStar from "@assets/1 star_1763916010555.png";
import twoStars from "@assets/2 stars_1763915441808.png";
import threeStars from "@assets/3 stars_1763915441807.png";
import missingStar from "@assets/Missing star (grey)_1763916010554.png";

interface CustomWordList {
  id: number;
  name: string;
  words: string[];
  isPublic: boolean;
  gradeLevel?: string;
}

interface Achievement {
  id: number;
  userId: number;
  wordListId: number;
  achievementType: string;
  achievementValue: string;
  completedModes: string[];
}

export default function Achievements() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements/user", user?.id],
    enabled: !!user,
  });

  const { data: customLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
  });

  const { data: publicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  const { data: sharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me"],
  });

  // Combine all lists and filter for unique lists with achievements
  const allLists = [
    ...(customLists || []),
    ...(publicLists || []),
    ...(sharedLists || []),
  ].filter((list, index, self) => 
    index === self.findIndex(l => l.id === list.id)
  );

  // Filter lists that have achievements
  const listsWithAchievements = allLists.filter(list => 
    achievements?.some(a => a.wordListId === list.id && a.achievementType === "Word List Mastery")
  );

  // Helper function to get achievement for a word list
  const getAchievementForList = (wordListId: number) => {
    if (!achievements) return null;
    return achievements.find(
      (a) => a.wordListId === wordListId && a.achievementType === "Word List Mastery"
    );
  };

  // Helper function to get star image based on achievement value
  const getStarImage = (achievementValue: string) => {
    if (achievementValue === "1 Star") return oneStar;
    if (achievementValue === "2 Stars") return twoStars;
    if (achievementValue === "3 Stars") return threeStars;
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed background layers */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Landscape background for desktop/wide screens */}
        <div className="hidden md:block absolute inset-0">
          <img 
            src={rainbowBackgroundLandscape} 
            alt="" 
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        
        {/* Portrait background for mobile */}
        <div className="md:hidden absolute inset-0">
          <img 
            src={rainbowBackgroundPortrait} 
            alt="" 
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        
        {/* Semi-transparent overlay for readability */}
        <div className="absolute inset-0 bg-white/5 dark:bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
            <UserHeader />
          </div>
        </div>
        
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                My Achievements
              </h1>
              <p className="text-lg text-muted-foreground mt-1">Your spelling accomplishments</p>
            </div>

            {/* Word List Mastery Section */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Word List Mastery</h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHelpDialogOpen(true)}
                data-testid="button-help"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>

            {/* Achievements List */}
            {!user ? (
              <Card className="backdrop-blur-sm bg-card/90">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Please log in to view your achievements
                  </p>
                </CardContent>
              </Card>
            ) : listsWithAchievements.length === 0 ? (
              <Card className="backdrop-blur-sm bg-card/90">
                <CardContent className="py-8 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Achievements Yet</h3>
                  <p className="text-muted-foreground">
                    Complete game modes with 100% accuracy to earn stars!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {listsWithAchievements.map((list) => {
                  const achievement = getAchievementForList(list.id);
                  const starImage = achievement ? getStarImage(achievement.achievementValue) : null;
                  
                  return (
                    <Card 
                      key={list.id} 
                      className="backdrop-blur-sm bg-card/90 hover-elevate"
                      data-testid={`achievement-card-${list.id}`}
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <CardTitle className="text-lg" data-testid={`text-list-name-${list.id}`}>
                                {list.name}
                              </CardTitle>
                              {list.gradeLevel && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  Grade {list.gradeLevel}
                                </Badge>
                              )}
                              {list.isPublic ? (
                                <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
                              <span>{list.words.length} words</span>
                              {achievement && achievement.completedModes && achievement.completedModes.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium">Completed:</span>
                                  {achievement.completedModes.map((mode, index) => (
                                    <span key={mode}>
                                      <Badge variant="outline" className="capitalize text-xs">
                                        {mode}
                                      </Badge>
                                      {index < achievement.completedModes.length - 1 && " "}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <AccuracyCard wordListId={list.id} />
                          </div>
                          
                          {starImage && (
                            <div className="flex-shrink-0 flex justify-center items-center min-w-[80px]">
                              <img 
                                src={starImage} 
                                alt={achievement?.achievementValue} 
                                className="h-16 w-auto max-w-[80px] object-contain"
                                data-testid={`stars-${list.id}`}
                              />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>How to Earn Achievement Badges</DialogTitle>
            <DialogDescription>
              Complete game modes with 100% accuracy to earn stars for each word list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Game Modes & Requirements:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">Timed Challenge</Badge>
                  <p className="text-sm text-muted-foreground flex-1">
                    Spell at least 10 words correctly (or all words for lists with fewer than 10) with 100% accuracy within 60 seconds
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">Quiz Mode</Badge>
                  <p className="text-sm text-muted-foreground flex-1">
                    Complete the entire quiz with 100% accuracy (no hints, results shown at the end)
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">Word Scramble</Badge>
                  <p className="text-sm text-muted-foreground flex-1">
                    Unscramble all words correctly by dragging and dropping letters
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">Find the Mistake</Badge>
                  <p className="text-sm text-muted-foreground flex-1">
                    Identify all misspelled words correctly (4 questions per game)
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">Crossword</Badge>
                  <p className="text-sm text-muted-foreground flex-1">
                    Complete the entire audio-based crossword puzzle with 100% accuracy (up to 15 words)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Star Levels:</h3>
              <div className="flex items-center gap-4">
                <img src={oneStar} alt="1 Star" className="h-12 w-auto" />
                <p className="text-sm text-muted-foreground">1 game mode completed with 100% accuracy</p>
              </div>
              <div className="flex items-center gap-4">
                <img src={twoStars} alt="2 Stars" className="h-12 w-auto" />
                <p className="text-sm text-muted-foreground">2 game modes completed with 100% accuracy</p>
              </div>
              <div className="flex items-center gap-4">
                <img src={threeStars} alt="3 Stars" className="h-12 w-auto" />
                <p className="text-sm text-muted-foreground">3 or more game modes completed with 100% accuracy (maximum)</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground italic">
              Note: Practice mode does not award achievement stars as it provides immediate feedback and hints.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
