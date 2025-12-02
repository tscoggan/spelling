import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Trophy, Clock, CheckCircle, XCircle, ArrowLeft, Play, Loader2, X, Award } from "lucide-react";

// Import star image for earned stars display
import oneStar from "@assets/1 star_1763916010555.png";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Challenge {
  id: number;
  initiatorId: number;
  opponentId: number;
  wordListId: number;
  status: string;
  initiatorScore?: number;
  initiatorTime?: number;
  initiatorCorrect?: number;
  initiatorIncorrect?: number;
  opponentScore?: number;
  opponentTime?: number;
  opponentCorrect?: number;
  opponentIncorrect?: number;
  winnerUserId?: number;
  starAwarded: boolean;
  createdAt: string;
  initiatorCompletedAt?: string;
  opponentCompletedAt?: string;
  completedAt?: string;
  initiatorUsername?: string;
  initiatorFirstName?: string | null;
  initiatorLastName?: string | null;
  opponentUsername?: string;
  opponentFirstName?: string | null;
  opponentLastName?: string | null;
  wordListName?: string;
}

function formatPlayerName(firstName?: string | null, lastName?: string | null, username?: string): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName} (${username || 'Unknown'})`;
  }
  return username || 'Unknown';
}

interface ChallengeRecord {
  wins: number;
  losses: number;
  ties: number;
  totalStarsEarned: number;
}

export default function HeadToHead() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { currentTheme, themeAssets } = useTheme();
  const { toast } = useToast();

  const { data: pendingChallenges, isLoading: loadingPending } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges/pending"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: activeChallenges, isLoading: loadingActive } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges/active"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: completedChallenges, isLoading: loadingCompleted } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges/completed"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: record } = useQuery<ChallengeRecord>({
    queryKey: ["/api/challenges/record"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const acceptMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/accept`);
      return response.json();
    },
    onSuccess: (data, challengeId) => {
      toast({
        title: "Challenge accepted!",
        description: "Let's play!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      const challenge = pendingChallenges?.find(c => c.id === challengeId);
      if (challenge) {
        setLocation(`/game?listId=${challenge.wordListId}&mode=headtohead&challengeId=${challengeId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/decline`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge declined",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const getResultBadge = (challenge: Challenge) => {
    if (!challenge.completedAt || !challenge.winnerUserId) {
      if (challenge.initiatorScore !== null && challenge.opponentScore !== null && 
          challenge.initiatorScore === challenge.opponentScore) {
        return <Badge variant="secondary">Tie</Badge>;
      }
      return null;
    }
    if (challenge.winnerUserId === user?.id) {
      return <Badge className="bg-green-600">Won</Badge>;
    } else {
      return <Badge variant="destructive">Lost</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLoading = loadingPending || loadingActive || loadingCompleted;

  const challengesToRespond = pendingChallenges?.filter(c => c.opponentId === user?.id) || [];
  const challengesSent = pendingChallenges?.filter(c => c.initiatorId === user?.id) || [];
  const myActiveGames = activeChallenges?.filter(c => 
    (c.initiatorId === user?.id && !c.initiatorCompletedAt) ||
    (c.opponentId === user?.id && !c.opponentCompletedAt)
  ) || [];
  
  // In Progress: Games where current user has completed but opponent hasn't
  const inProgressGames = activeChallenges?.filter(c => 
    (c.initiatorId === user?.id && c.initiatorCompletedAt && !c.opponentCompletedAt) ||
    (c.opponentId === user?.id && c.opponentCompletedAt && !c.initiatorCompletedAt)
  ) || [];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Portrait background */}
      <div 
        className="fixed inset-0 portrait:block landscape:hidden pointer-events-none"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      {/* Landscape background */}
      <div 
        className="fixed inset-0 portrait:hidden landscape:block pointer-events-none"
        style={{
          backgroundImage: `url(${themeAssets.backgroundLandscape})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50 pointer-events-none"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8 max-w-4xl relative z-10"
      >
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Swords className="w-10 h-10 text-orange-600" />
            <h1 className={`text-4xl font-bold ${currentTheme === 'space' ? 'text-white' : 'text-foreground'}`}>
              Head to Head Challenge Results
            </h1>
          </div>
        </div>

        {record && (
          <Card className="mb-8 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-950 dark:to-yellow-950 border-orange-300 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-600" />
                Your Record
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{record.wins}</div>
                  <div className="text-sm text-muted-foreground">Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{record.losses}</div>
                  <div className="text-sm text-muted-foreground">Losses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{record.ties}</div>
                  <div className="text-sm text-muted-foreground">Ties</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                    {record.wins + record.losses > 0 
                      ? Math.round((record.wins / (record.wins + record.losses)) * 100) 
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Win %</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pending" className="relative" data-testid="tab-pending">
                Pending
                {challengesSent.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {challengesSent.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="relative" data-testid="tab-in-progress">
                In Progress
                {inProgressGames.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {inProgressGames.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
              <TabsTrigger value="create" data-testid="tab-create">New Challenge</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {challengesSent.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Challenges Sent</h3>
                  {challengesSent.map((challenge) => (
                    <Card key={challenge.id} className="opacity-75">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            You challenged {formatPlayerName(challenge.opponentFirstName, challenge.opponentLastName, challenge.opponentUsername)}
                          </CardTitle>
                          <Badge variant="outline">Waiting...</Badge>
                        </div>
                        <CardDescription>
                          Word List: {challenge.wordListName || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {challengesSent.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Swords className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No challenges waiting</p>
                  <p className="text-sm">Challenges you send will appear here until your opponent responds</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-4">
              {inProgressGames.length > 0 ? (
                inProgressGames.map((challenge) => {
                  const isInitiator = challenge.initiatorId === user?.id;
                  const myScore = isInitiator ? challenge.initiatorScore : challenge.opponentScore;
                  const myTime = isInitiator ? challenge.initiatorTime : challenge.opponentTime;
                  const myCorrect = isInitiator ? challenge.initiatorCorrect : challenge.opponentCorrect;
                  const myIncorrect = isInitiator ? challenge.initiatorIncorrect : challenge.opponentIncorrect;
                  const opponentDisplayName = isInitiator 
                    ? formatPlayerName(challenge.opponentFirstName, challenge.opponentLastName, challenge.opponentUsername)
                    : formatPlayerName(challenge.initiatorFirstName, challenge.initiatorLastName, challenge.initiatorUsername);

                  return (
                    <Card key={challenge.id} className="border-blue-300 dark:border-blue-800">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            vs {opponentDisplayName}
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Waiting for opponent
                            </Badge>
                          </CardTitle>
                          <Badge variant="outline">
                            {formatDistanceToNow(new Date(challenge.createdAt), { addSuffix: true })}
                          </Badge>
                        </div>
                        <CardDescription>
                          Word List: {challenge.wordListName || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Your Score</div>
                          <div className="text-2xl font-bold">{myScore ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            {myCorrect ?? 0} correct, {myIncorrect ?? 0} incorrect
                          </div>
                          {myTime !== undefined && myTime !== null && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(myTime)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No games in progress</p>
                  <p className="text-sm">When you complete a challenge, it will appear here until your opponent finishes</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedChallenges && completedChallenges.length > 0 ? (
                completedChallenges.map((challenge) => {
                  const isInitiator = challenge.initiatorId === user?.id;
                  const myScore = isInitiator ? challenge.initiatorScore : challenge.opponentScore;
                  const myTime = isInitiator ? challenge.initiatorTime : challenge.opponentTime;
                  const myCorrect = isInitiator ? challenge.initiatorCorrect : challenge.opponentCorrect;
                  const myIncorrect = isInitiator ? challenge.initiatorIncorrect : challenge.opponentIncorrect;
                  const opponentScore = isInitiator ? challenge.opponentScore : challenge.initiatorScore;
                  const opponentTime = isInitiator ? challenge.opponentTime : challenge.initiatorTime;
                  const opponentDisplayName = isInitiator 
                    ? formatPlayerName(challenge.opponentFirstName, challenge.opponentLastName, challenge.opponentUsername)
                    : formatPlayerName(challenge.initiatorFirstName, challenge.initiatorLastName, challenge.initiatorUsername);

                  return (
                    <Card key={challenge.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            vs {opponentDisplayName}
                            {getResultBadge(challenge)}
                          </CardTitle>
                          <Badge variant="outline">
                            {formatDistanceToNow(new Date(challenge.completedAt || challenge.createdAt), { addSuffix: true })}
                          </Badge>
                        </div>
                        <CardDescription>
                          Word List: {challenge.wordListName || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">You</div>
                            <div className="text-2xl font-bold">{myScore ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {myCorrect ?? 0} correct, {myIncorrect ?? 0} incorrect
                            </div>
                            {myTime !== undefined && myTime !== null && (
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(myTime)}
                              </div>
                            )}
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">{opponentDisplayName}</div>
                            <div className="text-2xl font-bold">{opponentScore ?? '-'}</div>
                            {opponentTime !== undefined && opponentTime !== null && (
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(opponentTime)}
                              </div>
                            )}
                          </div>
                        </div>
                        {challenge.winnerUserId === user?.id && challenge.starAwarded && (
                          <div className="mt-3 text-center text-sm text-yellow-600 flex items-center justify-center gap-1">
                            <img src={oneStar} alt="Star" className="w-6 h-6 object-contain" />
                            +1 Star earned!
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No completed challenges yet</p>
                  <p className="text-sm">Your challenge history will appear here</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Start a New Challenge</CardTitle>
                  <CardDescription>
                    Go back to the home screen to create a new challenge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setLocation("/")}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                    data-testid="button-create-challenge"
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Create New Challenge
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </div>
  );
}
