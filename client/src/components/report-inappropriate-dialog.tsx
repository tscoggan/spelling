import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

type ReportableGameMode = "practice" | "timed" | "quiz" | "scramble";

interface ReportInappropriateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordId: number;
  wordText: string;
  gameMode: ReportableGameMode;
}

type ContentType = "definition" | "sentence" | "origin";

export function ReportInappropriateDialog({
  open,
  onOpenChange,
  wordId,
  wordText,
  gameMode,
}: ReportInappropriateDialogProps) {
  const { toast } = useToast();
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([]);
  const [comments, setComments] = useState("");

  const reportMutation = useMutation({
    mutationFn: async (data: { wordId: number; gameMode: string; flaggedContentTypes: ContentType[]; comments?: string }) => {
      const response = await apiRequest("POST", "/api/flagged-words", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for helping us improve. We'll review your report.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedTypes([]);
    setComments("");
    onOpenChange(false);
  };

  const handleTypeToggle = (type: ContentType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = () => {
    if (selectedTypes.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one type of content to report.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate({
      wordId,
      gameMode,
      flaggedContentTypes: selectedTypes,
      comments: comments.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Report Inappropriate Content
          </DialogTitle>
          <DialogDescription>
            Help us keep the content appropriate for all ages. Select what content you'd like to report for the word "{wordText}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">What would you like to report?</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-definition"
                  checked={selectedTypes.includes("definition")}
                  onCheckedChange={() => handleTypeToggle("definition")}
                  data-testid="checkbox-report-definition"
                />
                <Label htmlFor="report-definition" className="text-sm font-normal cursor-pointer">
                  Definition
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-sentence"
                  checked={selectedTypes.includes("sentence")}
                  onCheckedChange={() => handleTypeToggle("sentence")}
                  data-testid="checkbox-report-sentence"
                />
                <Label htmlFor="report-sentence" className="text-sm font-normal cursor-pointer">
                  Example Sentence
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-origin"
                  checked={selectedTypes.includes("origin")}
                  onCheckedChange={() => handleTypeToggle("origin")}
                  data-testid="checkbox-report-origin"
                />
                <Label htmlFor="report-origin" className="text-sm font-normal cursor-pointer">
                  Word Origin
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-comments" className="text-sm font-medium">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="report-comments"
              placeholder="Please explain why you find this content inappropriate..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={3}
              data-testid="textarea-report-comments"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comments.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={reportMutation.isPending}
            data-testid="button-cancel-report"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reportMutation.isPending || selectedTypes.length === 0}
            data-testid="button-submit-report"
          >
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
