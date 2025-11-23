import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Lock, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { UserHeader } from "@/components/user-header";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
import oneStar from "@assets/1 star_1763905327457.png";
import twoStars from "@assets/2 stars_1763905327457.png";
import threeStars from "@assets/3 stars_1763905327456.png";

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
        <UserHeader />
        
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="backdrop-blur-sm bg-card/90"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              
              <h1 className="text-4xl font-bold text-primary flex items-center gap-3 bg-white/90 dark:bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Trophy className="w-8 h-8" />
                My Achievements
              </h1>
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
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2" data-testid={`text-list-name-${list.id}`}>
                              {list.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{list.words.length} words</span>
                              {list.gradeLevel && (
                                <Badge variant="secondary" className="text-xs">
                                  Grade {list.gradeLevel}
                                </Badge>
                              )}
                              {list.isPublic ? (
                                <Globe className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          {starImage && (
                            <div className="flex flex-col items-center gap-2">
                              <img 
                                src={starImage} 
                                alt={achievement?.achievementValue} 
                                className="w-16 h-16 object-contain"
                                data-testid={`stars-${list.id}`}
                              />
                              <span className="text-xs font-semibold text-primary">
                                {achievement?.achievementValue}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      
                      {achievement && achievement.completedModes && achievement.completedModes.length > 0 && (
                        <CardContent>
                          <div className="text-sm">
                            <p className="font-semibold mb-2 text-muted-foreground">Completed Modes:</p>
                            <div className="flex flex-wrap gap-2">
                              {achievement.completedModes.map((mode) => (
                                <Badge key={mode} variant="outline" className="capitalize">
                                  {mode}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
