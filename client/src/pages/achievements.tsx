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
import oneStar from "@assets/1 star_1763913172283.png";
import twoStars from "@assets/2 stars_1763913172281.png";
import threeStars from "@assets/3 stars_1763913172282.png";
import missingStar from "@assets/Missing star (grey)_1763913172283.png";

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
              
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                  My Achievements
                </h1>
                <p className="text-lg text-muted-foreground mt-1">Your spelling accomplishments</p>
              </div>
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
                        <div className="flex items-center justify-between gap-2">
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
                          
                          {starImage && (
                            <div className="flex-shrink-0">
                              <img 
                                src={starImage} 
                                alt={achievement?.achievementValue} 
                                className="w-36 h-36 object-contain"
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
    </div>
  );
}
