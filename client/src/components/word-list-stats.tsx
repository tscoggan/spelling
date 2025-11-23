import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface WordListStatsData {
  totalAccuracy: number | null;
  lastGameAccuracy: number | null;
}

interface WordListStatsProps {
  wordListId: number;
  layout?: "inline" | "stacked";
}

export function WordListStats({ wordListId, layout = "stacked" }: WordListStatsProps) {
  const { user } = useAuth();
  
  const { data: stats } = useQuery<WordListStatsData>({
    queryKey: ["/api/word-lists", wordListId, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/word-lists/${wordListId}/stats`);
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

  if (layout === "inline") {
    return (
      <>
        {stats.totalAccuracy !== null && (
          <>
            <span>•</span>
            <span data-testid={`text-total-accuracy-${wordListId}`}>
              Total: {stats.totalAccuracy}%
            </span>
          </>
        )}
        {stats.lastGameAccuracy !== null && (
          <>
            <span>•</span>
            <span data-testid={`text-last-accuracy-${wordListId}`}>
              Last: {stats.lastGameAccuracy}%
            </span>
          </>
        )}
      </>
    );
  }

  return (
    <div className="space-y-0.5">
      {stats.totalAccuracy !== null && (
        <div data-testid={`text-total-accuracy-${wordListId}`}>
          Total: {stats.totalAccuracy}%
        </div>
      )}
      {stats.lastGameAccuracy !== null && (
        <div data-testid={`text-last-accuracy-${wordListId}`}>
          Last: {stats.lastGameAccuracy}%
        </div>
      )}
    </div>
  );
}
