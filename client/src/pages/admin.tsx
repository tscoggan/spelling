import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface JobStatus {
  id: number;
  wordListId: number;
  status: string;
  totalWords: number;
  processedWords: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  completedAt: string | null;
}

export default function AdminPage() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  const { data: jobStatus, refetch } = useQuery<JobStatus>({
    queryKey: ['/api/illustration-jobs', jobId],
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      return jobId && data?.status === 'processing' ? 2000 : false;
    },
  });

  const startBackfill = async () => {
    try {
      setIsStarting(true);
      const response = await apiRequest('POST', '/api/backfill-illustrations');
      const data = await response.json() as { jobId: number; message: string };
      
      setJobId(data.jobId);
      toast({
        title: "Backfill Started",
        description: `Job ${data.jobId} is now running. This will search for images for all existing words.`,
      });
      
      setTimeout(() => refetch(), 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start backfill job",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const progress = jobStatus?.totalWords 
    ? Math.round((jobStatus.processedWords / jobStatus.totalWords) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold font-crayon text-primary">Admin Tools</h1>
          <p className="text-muted-foreground">One-time maintenance operations</p>
        </div>

        <Card data-testid="card-backfill">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Backfill Word Illustrations
            </CardTitle>
            <CardDescription>
              Search for and download cartoon images for all existing words in the database.
              This will skip words that already have illustrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!jobId ? (
              <Button 
                onClick={startBackfill}
                disabled={isStarting}
                size="lg"
                className="w-full"
                data-testid="button-start-backfill"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isStarting ? "Starting..." : "Start Backfill"}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Job #{jobId}</span>
                  <span className="text-sm text-muted-foreground">
                    {jobStatus?.processedWords || 0} / {jobStatus?.totalWords || 0} words
                  </span>
                </div>

                <div className="space-y-2">
                  <Progress value={progress} className="h-3" data-testid="progress-backfill" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {jobStatus?.status === 'processing' && (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-primary" />
                        <span>Processing...</span>
                      </>
                    )}
                    {jobStatus?.status === 'completed' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Complete!</span>
                      </>
                    )}
                  </div>
                </div>

                {jobStatus && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{jobStatus.successCount}</div>
                      <div className="text-xs text-muted-foreground">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{jobStatus.failureCount}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {jobStatus.totalWords - jobStatus.processedWords}
                      </div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                  </div>
                )}

                {jobStatus?.status === 'completed' && (
                  <Button 
                    onClick={() => setJobId(null)}
                    variant="outline"
                    className="w-full"
                    data-testid="button-reset"
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
