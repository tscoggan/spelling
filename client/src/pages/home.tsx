import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Trophy } from "lucide-react";

export default function Home() {
  const modes = [
    {
      id: "easy",
      title: "Easy Mode",
      description: "Perfect for beginners! Simple words to get started",
      icon: Sparkles,
      color: "bg-accent",
      difficulty: "easy",
    },
    {
      id: "medium",
      title: "Medium Mode",
      description: "Ready for a challenge? Try these intermediate words",
      icon: Zap,
      color: "bg-secondary",
      difficulty: "medium",
    },
    {
      id: "hard",
      title: "Hard Mode",
      description: "For spelling champions! The toughest words await",
      icon: Trophy,
      color: "bg-primary",
      difficulty: "hard",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 md:p-8 text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-bold text-foreground" data-testid="text-app-title">
          Spelling Champions
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-app-description">
          Practice your spelling skills with fun games and activities!
        </p>
      </header>

      <main className="flex-1 px-6 md:px-8 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" data-testid="text-select-mode">
              Choose Your Challenge
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground" data-testid="text-mode-description">
              Select a difficulty level to start practicing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {modes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <Link key={mode.id} href={`/game/${mode.difficulty}`}>
                  <Card 
                    className="p-8 space-y-6 hover-elevate active-elevate-2 cursor-pointer transition-transform hover:scale-105"
                    data-testid={`card-mode-${mode.difficulty}`}
                  >
                    <div className={`w-20 h-20 mx-auto rounded-full ${mode.color} flex items-center justify-center`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center space-y-3">
                      <h3 className="text-2xl font-bold text-card-foreground" data-testid={`text-mode-title-${mode.difficulty}`}>
                        {mode.title}
                      </h3>
                      <p className="text-lg text-muted-foreground" data-testid={`text-mode-desc-${mode.difficulty}`}>
                        {mode.description}
                      </p>
                    </div>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="w-full text-xl h-14"
                      data-testid={`button-start-${mode.difficulty}`}
                    >
                      Start Playing
                    </Button>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="text-center pt-8">
            <Card className="p-8 bg-card space-y-4">
              <h3 className="text-2xl font-bold text-card-foreground" data-testid="text-how-to-play">
                How to Play
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <h4 className="text-xl font-semibold text-card-foreground">Listen</h4>
                  <p className="text-lg text-muted-foreground">Click the speaker icon to hear the word</p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <h4 className="text-xl font-semibold text-card-foreground">Spell</h4>
                  <p className="text-lg text-muted-foreground">Type the word in the spelling box</p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <h4 className="text-xl font-semibold text-card-foreground">Score</h4>
                  <p className="text-lg text-muted-foreground">Earn points for every correct answer!</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
