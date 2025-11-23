import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";

interface WordListStatsData {
  totalAccuracy: number | null;
  lastGameAccuracy: number | null;
}

interface AccuracyCardProps {
  wordListId: number;
  gameMode?: string;
}

export function AccuracyCard({ wordListId, gameMode }: AccuracyCardProps) {
  const { user } = useAuth();
  
  const { data: stats } = useQuery<WordListStatsData>({
    queryKey: ["/api/word-lists", wordListId, "stats", gameMode],
    queryFn: async () => {
      const url = gameMode 
        ? `/api/word-lists/${wordListId}/stats?gameMode=${gameMode}`
        : `/api/word-lists/${wordListId}/stats`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          return { totalAccuracy: null, lastGameAccuracy: null };
        }
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
    enabled: !!user,
  });

  if (!user || !stats || (stats.totalAccuracy === null && stats.lastGameAccuracy === null)) {
    return null;
  }

  return (
    <Card className="p-3 min-w-[120px] backdrop-blur-sm bg-card/90">
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Accuracy
        </div>
        <div className="space-y-1 text-sm">
          {stats.totalAccuracy !== null && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold" data-testid={`text-total-accuracy-${wordListId}`}>
                {stats.totalAccuracy}%
              </span>
            </div>
          )}
          {stats.lastGameAccuracy !== null && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Last:</span>
              <span className="font-semibold" data-testid={`text-last-accuracy-${wordListId}`}>
                {stats.lastGameAccuracy}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
