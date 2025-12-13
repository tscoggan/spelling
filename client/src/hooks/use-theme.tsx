import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useGuestSession } from "./use-guest-session";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeId, ThemeAssets, AVAILABLE_THEMES, ShopItemId } from "@shared/schema";

import defaultBackgroundLandscape from "@assets/Playground_background_-_landscape_1764862674337.png";
import defaultBackgroundPortrait from "@assets/Playground_background_-_portrait_1764862674336.png";
import defaultMascotTrophy from "@assets/Bee with trophy_1763852047681.png";
import defaultMascotGoodTry from "@assets/Bee with good try_1764525113983.png";

import pirateBackgroundLandscape from "@assets/Pirate background - landscape_1764527590672.png";
import pirateBackgroundPortrait from "@assets/Pirate background - portrait_1764522894408.png";
import pirateMascotTrophy from "@assets/Pirate with trophy_1764527120328.png";
import pirateMascotGoodTry from "@assets/Pirate with good try_1764527120328.png";

import spaceBackgroundLandscape from "@assets/Space background - landscape_1764592131991.png";
import spaceBackgroundPortrait from "@assets/Space background - portrait_1764592131992.png";
import spaceMascotTrophy from "@assets/Astronaut with trophy_1764592131993.png";
import spaceMascotGoodTry from "@assets/Astronaut with good try_1764592131993.png";

import soccerBackgroundLandscape from "@assets/Soccer background - landscape_1764625337443.png";
import soccerBackgroundPortrait from "@assets/Soccer background - portrait_1764625337442.png";
import soccerMascotTrophy from "@assets/Soccer player with trophy_1764625337439.png";
import soccerMascotGoodTry from "@assets/Soccer player with good try_1764625337439.png";

import skiingBackgroundLandscape from "@assets/Ski background - landscape_1764625337442.png";
import skiingBackgroundPortrait from "@assets/Ski background - portrait_1764625337442.png";
import skiingMascotTrophy from "@assets/Skier with trophy_1764625337440.png";
import skiingMascotGoodTry from "@assets/Skier with good try_1764625337440.png";

import basketballBackgroundLandscape from "@assets/Basketball_background_-_landscape_1764710715398.png";
import basketballBackgroundPortrait from "@assets/Basketball_background_-_portrait_1764710715398.png";
import basketballMascotTrophy from "@assets/Backetball_player_with_trophy_1764710715396.png";
import basketballMascotGoodTry from "@assets/Backetball_player_with_good_try_1764710715397.png";

import volleyballBackgroundLandscape from "@assets/Volleyball_background_-_landscape_1764710715400.png";
import volleyballBackgroundPortrait from "@assets/Volleyball_background_-_portrait_1764710715400.png";
import volleyballMascotTrophy from "@assets/Volleyball_player_with_trophy_1764710715399.png";
import volleyballMascotGoodTry from "@assets/Volleyball_player_with_good_try_1764710715399.png";

import robotBackgroundLandscape from "@assets/Robot_background_-_landscape_1764681809727.png";
import robotBackgroundPortrait from "@assets/Robot_background_-_portrait_1764681809727.png";
import robotMascotTrophy from "@assets/Robot_with_trophy_1764681809726.png";
import robotMascotGoodTry from "@assets/Robot_with_good_try_1764681809726.png";

import unicornBackgroundLandscape from "@assets/Unicorn_background_-_landscape_1764681809728.png";
import unicornBackgroundPortrait from "@assets/Unicorn_background_-_portrait_1764681809729.png";
import unicornMascotTrophy from "@assets/Unicorn_with_trophy_1764681809727.png";
import unicornMascotGoodTry from "@assets/Unicorn_with_good_try_1764681809728.png";

import mermaidBackgroundLandscape from "@assets/Mermaid_background_-_landscape_1765637240489.png";
import mermaidBackgroundPortrait from "@assets/Mermaid_background_-_portrait_1765637240488.png";
import mermaidMascotTrophy from "@assets/Mermaid_with_trophy_1765637240486.png";
import mermaidMascotGoodTry from "@assets/Mermaid_with_good_try_1765637240488.png";

import dragonBackgroundLandscape from "@assets/Dragon_background_-_landscape_1765637240490.png";
import dragonBackgroundPortrait from "@assets/Dragon_background_-_portrait_1765637240490.png";
import dragonMascotTrophy from "@assets/Dragon_with_trophy_1765637240489.png";
import dragonMascotGoodTry from "@assets/Dragon_with_good_try_1765637240489.png";

import videogameBackgroundLandscape from "@assets/Video_game_background_-_landscape_1765649906101.png";
import videogameBackgroundPortrait from "@assets/Video_game_background_-_portrait_1765649906101.png";
import videogameMascotTrophy from "@assets/Video_game_trophy_1765649906100.png";
import videogameMascotGoodTry from "@assets/Video_game_good_try_1765649906100.png";

import animeBackgroundLandscape from "@assets/Anime_background_-_landscape_1765649906099.png";
import animeBackgroundPortrait from "@assets/Anime_background_-_portrait_1765649906100.png";
import animeMascotTrophy from "@assets/Anime_trophy_1765649906099.png";
import animeMascotGoodTry from "@assets/Anime_good_try_1765649906098.png";

const THEME_ASSETS: Record<ThemeId, ThemeAssets> = {
  default: {
    backgroundLandscape: defaultBackgroundLandscape,
    backgroundPortrait: defaultBackgroundPortrait,
    mascotTrophy: defaultMascotTrophy,
    mascotGoodTry: defaultMascotGoodTry,
    name: "Playground",
  },
  pirate: {
    backgroundLandscape: pirateBackgroundLandscape,
    backgroundPortrait: pirateBackgroundPortrait,
    mascotTrophy: pirateMascotTrophy,
    mascotGoodTry: pirateMascotGoodTry,
    name: "Pirate",
  },
  space: {
    backgroundLandscape: spaceBackgroundLandscape,
    backgroundPortrait: spaceBackgroundPortrait,
    mascotTrophy: spaceMascotTrophy,
    mascotGoodTry: spaceMascotGoodTry,
    name: "Space",
  },
  soccer: {
    backgroundLandscape: soccerBackgroundLandscape,
    backgroundPortrait: soccerBackgroundPortrait,
    mascotTrophy: soccerMascotTrophy,
    mascotGoodTry: soccerMascotGoodTry,
    name: "Soccer",
  },
  skiing: {
    backgroundLandscape: skiingBackgroundLandscape,
    backgroundPortrait: skiingBackgroundPortrait,
    mascotTrophy: skiingMascotTrophy,
    mascotGoodTry: skiingMascotGoodTry,
    name: "Skiing",
  },
  basketball: {
    backgroundLandscape: basketballBackgroundLandscape,
    backgroundPortrait: basketballBackgroundPortrait,
    mascotTrophy: basketballMascotTrophy,
    mascotGoodTry: basketballMascotGoodTry,
    name: "Basketball",
  },
  robot: {
    backgroundLandscape: robotBackgroundLandscape,
    backgroundPortrait: robotBackgroundPortrait,
    mascotTrophy: robotMascotTrophy,
    mascotGoodTry: robotMascotGoodTry,
    name: "Robot",
  },
  unicorn: {
    backgroundLandscape: unicornBackgroundLandscape,
    backgroundPortrait: unicornBackgroundPortrait,
    mascotTrophy: unicornMascotTrophy,
    mascotGoodTry: unicornMascotGoodTry,
    name: "Unicorn",
  },
  volleyball: {
    backgroundLandscape: volleyballBackgroundLandscape,
    backgroundPortrait: volleyballBackgroundPortrait,
    mascotTrophy: volleyballMascotTrophy,
    mascotGoodTry: volleyballMascotGoodTry,
    name: "Volleyball",
  },
  mermaid: {
    backgroundLandscape: mermaidBackgroundLandscape,
    backgroundPortrait: mermaidBackgroundPortrait,
    mascotTrophy: mermaidMascotTrophy,
    mascotGoodTry: mermaidMascotGoodTry,
    name: "Mermaid",
  },
  dragon: {
    backgroundLandscape: dragonBackgroundLandscape,
    backgroundPortrait: dragonBackgroundPortrait,
    mascotTrophy: dragonMascotTrophy,
    mascotGoodTry: dragonMascotGoodTry,
    name: "Dragon",
  },
  videogame: {
    backgroundLandscape: videogameBackgroundLandscape,
    backgroundPortrait: videogameBackgroundPortrait,
    mascotTrophy: videogameMascotTrophy,
    mascotGoodTry: videogameMascotGoodTry,
    name: "Video Game",
  },
  anime: {
    backgroundLandscape: animeBackgroundLandscape,
    backgroundPortrait: animeBackgroundPortrait,
    mascotTrophy: animeMascotTrophy,
    mascotGoodTry: animeMascotGoodTry,
    name: "Anime",
  },
};

interface UserItem {
  id: number;
  userId: number;
  itemId: string;
  quantity: number;
}

interface ThemeContextValue {
  currentTheme: ThemeId;
  themeAssets: ThemeAssets;
  setTheme: (themeId: ThemeId) => void;
  forceSetTheme: (themeId: ThemeId) => void;
  isThemeUnlocked: (themeId: ThemeId) => boolean;
  unlockedThemes: ThemeId[];
  isLoading: boolean;
  allThemes: typeof AVAILABLE_THEMES;
  hasDarkBackground: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading, isGuestMode } = useAuth();
  const { guestGetItemQuantity } = useGuestSession();
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("default");

  const { data: apiUserItems, isLoading: isLoadingItems } = useQuery<UserItem[]>({
    // Use a tuple key for cache uniqueness but provide custom queryFn to avoid path joining
    queryKey: ["/api/user-items/list", { userId: user?.id }],
    queryFn: async () => {
      const res = await fetch("/api/user-items/list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user items");
      return res.json();
    },
    // Wait for auth to complete before fetching - this ensures guest users have session established
    // Disable for guest mode
    enabled: !isGuestMode && !!user && !isAuthLoading,
    // Retry with delay to handle race conditions with session establishment
    retry: 2,
    retryDelay: 500,
  });
  
  // For guest mode, create a virtual userItems array based on guest session
  const userItems = isGuestMode ? [] : apiUserItems;

  const updateThemeMutation = useMutation({
    mutationFn: async (themeId: ThemeId) => {
      return await apiRequest("PATCH", "/api/user", { selectedTheme: themeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      console.error("Failed to save theme preference:", error);
    }
  });

  useEffect(() => {
    if (user?.selectedTheme) {
      const theme = user.selectedTheme as ThemeId;
      if (THEME_ASSETS[theme]) {
        setCurrentTheme(theme);
      }
    }
  }, [user?.selectedTheme]);

  const unlockedThemes = useMemo(() => {
    const unlocked: ThemeId[] = ["default"];
    
    if (userItems) {
      Object.entries(AVAILABLE_THEMES).forEach(([themeId, themeInfo]) => {
        if (themeInfo.requiresPurchase && themeInfo.shopItemId) {
          const owned = userItems.some(item => item.itemId === themeInfo.shopItemId && item.quantity > 0);
          if (owned) {
            unlocked.push(themeId as ThemeId);
          }
        }
      });
    }
    
    return unlocked;
  }, [userItems]);

  const isThemeUnlocked = (themeId: ThemeId): boolean => {
    return unlockedThemes.includes(themeId);
  };

  const setTheme = (themeId: ThemeId) => {
    if (isThemeUnlocked(themeId) && THEME_ASSETS[themeId]) {
      setCurrentTheme(themeId);
      if (user) {
        updateThemeMutation.mutate(themeId);
      }
    }
  };

  const forceSetTheme = (themeId: ThemeId) => {
    if (THEME_ASSETS[themeId]) {
      setCurrentTheme(themeId);
      if (user) {
        updateThemeMutation.mutate(themeId);
      }
    }
  };

  const themeAssets = THEME_ASSETS[currentTheme] || THEME_ASSETS.default;
  
  // Themes with dark backgrounds that need white text
  const hasDarkBackground = currentTheme === "default" || currentTheme === "space" || currentTheme === "robot" || currentTheme === "skiing" || currentTheme === "basketball" || currentTheme === "volleyball" || currentTheme === "mermaid" || currentTheme === "dragon";

  const value: ThemeContextValue = {
    currentTheme,
    themeAssets,
    setTheme,
    forceSetTheme,
    isThemeUnlocked,
    unlockedThemes,
    isLoading: isLoadingItems,
    allThemes: AVAILABLE_THEMES,
    hasDarkBackground,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
