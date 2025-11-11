import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Home, Crown, Award } from "lucide-react";
import type { LeaderboardScore, DifficultyLevel } from "@shared/schema";
import { motion } from "framer-motion";
import { UserHeader } from "@/components/user-header";
import schoolPattern from "@assets/generated_images/Cartoon_school_objects_background_pattern_1ab3a6ac.png";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | "all">("all");

  const { data: topScores, isLoading } = useQuery<LeaderboardScore[]>({
    queryKey: [`/api/leaderboard`, selectedDifficulty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDifficulty !== "all") {
        params.append("difficulty", selectedDifficulty);
      }
      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 3) return <Award className="w-8 h-8 text-amber-700" />;
    return <Trophy className="w-6 h-6 text-gray-400" />;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-300";
    if (rank === 2) return "bg-gray-50 border-gray-300";
    if (rank === 3) return "bg-amber-50 border-amber-300";
    return "bg-white border-gray-200";
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative" style={{ backgroundColor: 'hsl(var(--page-leaderboard-bg))' }}>
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url(${schoolPattern})`,
          backgroundSize: '240px 240px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }}
      ></div>
      <div className="max-w-6xl mx-auto relative z-10">
        <UserHeader />
        
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Trophy className="w-12 h-12 text-purple-600" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 font-crayon">
                Leaderboard
              </h1>
              <p className="text-lg text-gray-600 mt-1">Top 10 Champions</p>
            </div>
          </motion.div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/")}
            data-testid="button-home"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>
        </div>

        <Card className="p-6 md:p-8">
          <Tabs value={selectedDifficulty} onValueChange={(v) => setSelectedDifficulty(v as DifficultyLevel | "all")}>
            <TabsList className="grid grid-cols-4 mb-8 w-full md:w-auto">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="easy" data-testid="tab-easy">Easy</TabsTrigger>
              <TabsTrigger value="medium" data-testid="tab-medium">Medium</TabsTrigger>
              <TabsTrigger value="hard" data-testid="tab-hard">Hard</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedDifficulty} className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xl text-gray-600">Loading scores...</p>
                </div>
              ) : topScores && topScores.length > 0 ? (
                <div className="space-y-3">
                  {topScores.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={`p-4 md:p-6 ${getRankColor(index + 1)}`}
                        data-testid={`card-score-${index}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-16 text-center">
                            {getRankIcon(index + 1)}
                            <div className="text-sm font-semibold text-gray-700 mt-1">
                              #{index + 1}
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-3">
                              {(entry as any).selectedAvatar && (
                                <div className="text-3xl">{(entry as any).selectedAvatar}</div>
                              )}
                              <div>
                                <div className="text-sm text-gray-600">Player</div>
                                <div className="text-lg font-bold text-gray-800" data-testid={`text-player-${index}`}>
                                  {(entry as any).username || "Anonymous"}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">Score</div>
                              <div className="text-2xl font-bold text-purple-600" data-testid={`text-score-${index}`}>
                                {entry.score}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">Accuracy</div>
                              <div className="text-xl font-semibold text-green-600" data-testid={`text-accuracy-${index}`}>
                                {entry.accuracy}%
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">Mode</div>
                              <div className="text-base font-medium text-gray-700 capitalize" data-testid={`text-mode-${index}`}>
                                {entry.difficulty} - {entry.gameMode}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-600">No scores yet</p>
                  <p className="text-gray-500 mt-2">Be the first to make the leaderboard!</p>
                  <Button
                    size="lg"
                    className="mt-6"
                    onClick={() => setLocation("/")}
                    data-testid="button-start-playing"
                  >
                    Start Playing
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
