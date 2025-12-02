import { useState, useRef } from "react";
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
  Star,
  Home,
  Printer,
  List,
  User
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
  starsEarned: number;
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

interface StudentWithWordLists {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  wordLists: {
    id: number;
    name: string;
    wordCount: number;
    totalGames: number;
    correctWords: number;
    totalWords: number;
    averageAccuracy: number;
    starsEarned: number;
  }[];
}

type GroupBy = "wordList" | "student";

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, currentTheme } = useTheme();
  const [groupBy, setGroupBy] = useState<GroupBy>("wordList");
  const printRef = useRef<HTMLDivElement>(null);

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

  const getStudentsGroupedData = (): StudentWithWordLists[] => {
    if (!dashboardData?.wordLists) return [];
    
    const studentMap = new Map<number, StudentWithWordLists>();
    
    dashboardData.wordLists.forEach((wordList) => {
      wordList.students.forEach((student) => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            username: student.username,
            firstName: student.firstName,
            lastName: student.lastName,
            wordLists: [],
          });
        }
        
        studentMap.get(student.id)!.wordLists.push({
          id: wordList.id,
          name: wordList.name,
          wordCount: wordList.wordCount,
          totalGames: student.totalGames,
          correctWords: student.correctWords,
          totalWords: student.totalWords,
          averageAccuracy: student.averageAccuracy,
          starsEarned: student.starsEarned,
        });
      });
    });
    
    return Array.from(studentMap.values()).sort((a, b) => 
      a.username.localeCompare(b.username)
    );
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #333; }
        h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .text-center { text-align: center; }
        .accuracy-high { color: #16a34a; font-weight: bold; }
        .accuracy-medium { color: #ca8a04; font-weight: bold; }
        .accuracy-low { color: #dc2626; font-weight: bold; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .no-data { color: #666; font-style: italic; padding: 20px; text-align: center; }
        @media print {
          .section { page-break-inside: avoid; }
        }
      </style>
    `;

    let content = `
      <h1>Teacher Dashboard - Student Performance Report</h1>
      <p class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      <p class="subtitle">Grouped by: ${groupBy === "wordList" ? "Word List" : "Student"}</p>
    `;

    if (groupBy === "wordList") {
      if (dashboardData?.wordLists && dashboardData.wordLists.length > 0) {
        dashboardData.wordLists.forEach((wordList) => {
          content += `
            <div class="section">
              <h2>${wordList.name}</h2>
              <p class="subtitle">${wordList.wordCount} words</p>
          `;
          
          if (wordList.students.length > 0) {
            content += `
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th class="text-center">Games</th>
                    <th class="text-center">Words Correct</th>
                    <th class="text-center">Accuracy</th>
                    <th class="text-center">Stars Earned</th>
                  </tr>
                </thead>
                <tbody>
            `;
            
            wordList.students.forEach((student) => {
              const accuracyClass = student.averageAccuracy >= 80 ? 'accuracy-high' : 
                                   student.averageAccuracy >= 60 ? 'accuracy-medium' : 'accuracy-low';
              const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
              content += `
                <tr>
                  <td>${student.username}${fullName ? ` (${fullName})` : ''}</td>
                  <td class="text-center">${student.totalGames}</td>
                  <td class="text-center">${student.correctWords} / ${student.totalWords}</td>
                  <td class="text-center ${accuracyClass}">${student.averageAccuracy}%</td>
                  <td class="text-center">${student.starsEarned}</td>
                </tr>
              `;
            });
            
            content += `</tbody></table>`;
          } else {
            content += `<p class="no-data">No student activity for this word list yet.</p>`;
          }
          
          content += `</div>`;
        });
      } else {
        content += `<p class="no-data">No word lists created yet.</p>`;
      }
    } else {
      const studentsData = getStudentsGroupedData();
      if (studentsData.length > 0) {
        studentsData.forEach((student) => {
          const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
          content += `
            <div class="section">
              <h2>${student.username}${fullName ? ` (${fullName})` : ''}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Word List</th>
                    <th class="text-center">Games</th>
                    <th class="text-center">Words Correct</th>
                    <th class="text-center">Accuracy</th>
                    <th class="text-center">Stars Earned</th>
                  </tr>
                </thead>
                <tbody>
          `;
          
          student.wordLists.forEach((wl) => {
            const accuracyClass = wl.averageAccuracy >= 80 ? 'accuracy-high' : 
                                 wl.averageAccuracy >= 60 ? 'accuracy-medium' : 'accuracy-low';
            content += `
              <tr>
                <td>${wl.name} (${wl.wordCount} words)</td>
                <td class="text-center">${wl.totalGames}</td>
                <td class="text-center">${wl.correctWords} / ${wl.totalWords}</td>
                <td class="text-center ${accuracyClass}">${wl.averageAccuracy}%</td>
                <td class="text-center">${wl.starsEarned}</td>
              </tr>
            `;
          });
          
          content += `</tbody></table></div>`;
        });
      } else {
        content += `<p class="no-data">No student activity recorded yet.</p>`;
      }
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Teacher Dashboard Report</title>
          ${styles}
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

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

  const studentsGroupedData = getStudentsGroupedData();

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

        <Card className="p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm" ref={printRef}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Student Performance
            </h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={groupBy === "wordList" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setGroupBy("wordList")}
                  className="gap-1"
                  data-testid="toggle-group-by-wordlist"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">By Word List</span>
                </Button>
                <Button
                  variant={groupBy === "student" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setGroupBy("student")}
                  className="gap-1"
                  data-testid="toggle-group-by-student"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">By Student</span>
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1"
                data-testid="button-print"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : groupBy === "wordList" ? (
            dashboardData?.wordLists && dashboardData.wordLists.length > 0 ? (
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
                              <th className="text-center py-2 px-3">Stars Earned</th>
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
                                    {student.starsEarned}
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
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
            )
          ) : (
            studentsGroupedData.length > 0 ? (
              <div className="space-y-6">
                {studentsGroupedData.map((student) => (
                  <Card key={student.id} className="p-4 border-2" data-testid={`student-stats-${student.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {student.username}
                        </h3>
                        {(student.firstName || student.lastName) && (
                          <p className="text-sm text-gray-500">
                            {[student.firstName, student.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Word List</th>
                            <th className="text-center py-2 px-3">Games</th>
                            <th className="text-center py-2 px-3">Words Correct</th>
                            <th className="text-center py-2 px-3">Accuracy</th>
                            <th className="text-center py-2 px-3">Stars Earned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.wordLists.map((wl) => (
                            <tr key={wl.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`wordlist-row-${wl.id}`}>
                              <td className="py-2 px-3">
                                <div className="font-medium">{wl.name}</div>
                                <div className="text-xs text-gray-500">{wl.wordCount} words</div>
                              </td>
                              <td className="text-center py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Target className="w-4 h-4 text-blue-500" />
                                  {wl.totalGames}
                                </div>
                              </td>
                              <td className="text-center py-2 px-3">
                                {wl.correctWords} / {wl.totalWords}
                              </td>
                              <td className="text-center py-2 px-3">
                                <span className={`font-semibold ${
                                  wl.averageAccuracy >= 80 ? 'text-green-600' :
                                  wl.averageAccuracy >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {wl.averageAccuracy}%
                                </span>
                              </td>
                              <td className="text-center py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  {wl.starsEarned}
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No student activity recorded yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Once students in your groups start playing with your word lists, their progress will appear here.
                </p>
              </div>
            )
          )}
        </Card>

      </motion.div>
    </div>
  );
}
