import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { 
  Users, 
  BookOpen, 
  LayoutDashboard, 
  ChevronRight,
  BarChart3,
  Target,
  Trophy,
  Home
} from "lucide-react";
import { motion } from "framer-motion";
import { UserHeader } from "@/components/user-header";

interface StudentStats {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  totalGames: number;
  correctWords: number;
  totalWords: number;
  averageAccuracy: number;
  bestStreak: number;
}

interface WordListWithStats {
  id: number;
  name: string;
  wordCount: number;
  students: StudentStats[];
}

interface TeacherGroup {
  id: number;
  name: string;
  memberCount: number;
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, currentTheme } = useTheme();

  const { data: dashboardData, isLoading, refetch } = useQuery<{
    wordLists: WordListWithStats[];
    groups: TeacherGroup[];
  }>({
    queryKey: ["/api/teacher/dashboard"],
    enabled: !!user && user.role === "teacher",
    refetchOnMount: "always",
    staleTime: 0,
  });

  const needsWhiteText = currentTheme === "space" || currentTheme === "skiing" || currentTheme === "basketball";

  if (!user || user.role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center">
          <p className="text-xl mb-4">Access Denied</p>
          <p className="text-gray-600 mb-4">This page is only available to teachers.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-go-home">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

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
        className="relative z-10 max-w-6xl mx-auto space-y-6"
      >
        <div className="flex items-center justify-between">
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

        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <LayoutDashboard className="w-8 h-8" />
            Teacher Dashboard
          </h1>
        </div>

        <Card className="p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Student Performance by Word List
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : dashboardData?.wordLists && dashboardData.wordLists.length > 0 ? (
            <div className="space-y-6">
              {dashboardData.wordLists.map((wordList) => (
                <Card key={wordList.id} className="p-4 border-2" data-testid={`wordlist-stats-${wordList.id}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{wordList.name}</h3>
                      <p className="text-sm text-gray-500">{wordList.wordCount} words</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/word-lists`)}
                      data-testid={`button-view-list-${wordList.id}`}
                    >
                      View List <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  {wordList.students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Student</th>
                            <th className="text-center py-2 px-3">Games</th>
                            <th className="text-center py-2 px-3">Words Correct</th>
                            <th className="text-center py-2 px-3">Accuracy</th>
                            <th className="text-center py-2 px-3">Best Streak</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wordList.students.map((student) => (
                            <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`student-row-${student.id}`}>
                              <td className="py-2 px-3">
                                <div className="font-medium">{student.username}</div>
                                {(student.firstName || student.lastName) && (
                                  <div className="text-xs text-gray-500">
                                    {[student.firstName, student.lastName].filter(Boolean).join(' ')}
                                  </div>
                                )}
                              </td>
                              <td className="text-center py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Target className="w-4 h-4 text-blue-500" />
                                  {student.totalGames}
                                </div>
                              </td>
                              <td className="text-center py-2 px-3">
                                {student.correctWords} / {student.totalWords}
                              </td>
                              <td className="text-center py-2 px-3">
                                <span className={`font-semibold ${
                                  student.averageAccuracy >= 80 ? 'text-green-600' :
                                  student.averageAccuracy >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {student.averageAccuracy}%
                                </span>
                              </td>
                              <td className="text-center py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Trophy className="w-4 h-4 text-orange-500" />
                                  {student.bestStreak}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No student activity for this word list yet.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No word lists created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Create word lists and share them with your groups to see student statistics here.
              </p>
              <Button onClick={() => setLocation("/word-lists")} data-testid="button-create-list">
                Create Word List
              </Button>
            </div>
          )}
        </Card>

      </motion.div>
    </div>
  );
}
