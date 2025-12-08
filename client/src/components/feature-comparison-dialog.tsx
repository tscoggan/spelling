import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Users, Crown } from "lucide-react";

interface FeatureComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Feature {
  name: string;
  description: string;
  freePlay: boolean | "session";
  family: boolean;
  school: boolean;
}

const features: Feature[] = [
  {
    name: "Create Custom Word Lists",
    description: "Build your own spelling word lists with words you want to practice. Import words from text files, CSV, or PDF documents.",
    freePlay: "session",
    family: true,
    school: true,
  },
  {
    name: "6 Game Modes",
    description: "Practice spelling with Practice Mode, Timed Challenge, Quiz Mode, Word Scramble, Find the Mistake, and Crossword Puzzle.",
    freePlay: true,
    family: true,
    school: true,
  },
  {
    name: "Share Word Lists with Friends",
    description: "Create groups and share your word lists with friends, family, or classmates. Perfect for study groups and collaborative learning.",
    freePlay: false,
    family: true,
    school: true,
  },
  {
    name: "My Stats",
    description: "Track your spelling progress over time. See your accuracy, best streaks, favorite game modes, and most misspelled words.",
    freePlay: "session",
    family: true,
    school: true,
  },
  {
    name: "Achievements",
    description: "Earn stars by completing game modes with 100% accuracy. Unlock achievements as you master different word lists.",
    freePlay: "session",
    family: true,
    school: true,
  },
  {
    name: "Star Shop",
    description: "Spend your earned stars on power-ups like 'Do Over' and '2nd Chance', plus unlock colorful background themes.",
    freePlay: "session",
    family: true,
    school: true,
  },
  {
    name: "Head to Head Challenges",
    description: "Challenge friends to spelling duels! Compete on the same word list and see who spells best. Winners earn bonus stars.",
    freePlay: false,
    family: true,
    school: true,
  },
  {
    name: "Teacher Dashboard",
    description: "Teachers can create student groups, share word lists with classes, and monitor student progress and performance.",
    freePlay: false,
    family: false,
    school: true,
  },
];

export function FeatureComparisonDialog({ open, onOpenChange }: FeatureComparisonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-yellow-500" />
            Account Types & Features
          </DialogTitle>
          <DialogDescription>
            Compare features available across different account types
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-feature-comparison">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-3 px-2 font-semibold w-[40%]">Feature</th>
                    <th className="text-center py-3 px-2 font-semibold w-[20%]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-gray-600">Play for Free</span>
                        <span className="text-xs text-muted-foreground font-normal">(Guest)</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold w-[20%]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-blue-600">Family Account</span>
                        <span className="text-xs text-muted-foreground font-normal">Coming Soon</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold w-[20%]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-purple-600">School Account</span>
                        <span className="text-xs text-muted-foreground font-normal">Full Access</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr 
                      key={feature.name} 
                      className={`border-b ${index % 2 === 0 ? 'bg-muted/30' : ''}`}
                      data-testid={`row-feature-${index}`}
                    >
                      <td className="py-4 px-2">
                        <div className="font-medium">{feature.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{feature.description}</div>
                      </td>
                      <td className="text-center py-4 px-2">
                        {feature.freePlay === "session" ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400" data-testid={`session-free-${index}`}>
                            Current session only<br />(not saved)
                          </span>
                        ) : feature.freePlay ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" data-testid={`check-free-${index}`} />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" data-testid={`x-free-${index}`} />
                        )}
                      </td>
                      <td className="text-center py-4 px-2">
                        {feature.family ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" data-testid={`check-family-${index}`} />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" data-testid={`x-family-${index}`} />
                        )}
                      </td>
                      <td className="text-center py-4 px-2">
                        {feature.school ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" data-testid={`check-school-${index}`} />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" data-testid={`x-school-${index}`} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Want to unlock all features?</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Create a School account to access all features including User Groups, Head to Head Challenges, 
                    and the Teacher Dashboard. Family accounts are coming soon!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
