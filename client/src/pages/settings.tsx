import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Home, Settings as SettingsIcon, Palette, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { UserHeader } from "@/components/user-header";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, currentTheme, setTheme, unlockedThemes, allThemes, isLoading } = useTheme();
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
  }, []);

  const backgroundImage = isLandscape ? themeAssets.backgroundLandscape : themeAssets.backgroundPortrait;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0">
        <img 
          src={backgroundImage} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between p-2 relative z-20">
          <Button
            variant="default"
            onClick={() => setLocation("/")}
            className="bg-white/90 dark:bg-black/70 text-foreground hover:bg-white dark:hover:bg-black/80 shadow-lg"
            data-testid="button-home"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          
          <UserHeader />
        </header>

        <main className="flex-1 flex flex-col items-center pt-4 px-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <SettingsIcon className="h-8 w-8 text-white drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Settings</h1>
          </motion.div>

          <div className="w-full max-w-md space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/90 dark:bg-black/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Visual Theme
                  </CardTitle>
                  <CardDescription>
                    Choose the look and feel of your app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme-select">Current Theme</Label>
                    <Select 
                      value={currentTheme} 
                      onValueChange={(value) => setTheme(value as typeof currentTheme)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="theme-select" data-testid="select-theme">
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(allThemes).map(([themeId, themeInfo]) => {
                          const isUnlocked = unlockedThemes.includes(themeId as typeof currentTheme);
                          return (
                            <SelectItem 
                              key={themeId} 
                              value={themeId} 
                              disabled={!isUnlocked}
                              data-testid={`theme-option-${themeId}`}
                            >
                              <span className="flex items-center gap-2">
                                {themeInfo.name}
                                {!isUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {unlockedThemes.length === 1 
                        ? "Purchase more themes in the Star Shop!" 
                        : `You have ${unlockedThemes.length} themes unlocked`}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/star-shop")}
                      className="w-full"
                      data-testid="button-go-to-shop"
                    >
                      Visit Star Shop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/90 dark:bg-black/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Theme Preview</CardTitle>
                  <CardDescription>
                    See what your current theme looks like
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">Trophy Mascot</p>
                      <div className="flex justify-center">
                        <img 
                          src={themeAssets.mascotTrophy} 
                          alt="Trophy mascot" 
                          className="w-20 h-20 object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">Good Try Mascot</p>
                      <div className="flex justify-center">
                        <img 
                          src={themeAssets.mascotGoodTry} 
                          alt="Good try mascot" 
                          className="w-20 h-20 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
