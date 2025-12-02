import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeId, ThemeAssets, AVAILABLE_THEMES, ShopItemId } from "@shared/schema";

import defaultBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import defaultBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
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

import basketballBackgroundLandscape from "@assets/Basketball background - landscape_1764626634576.png";
import basketballBackgroundPortrait from "@assets/Basketball background - portrait_1764625337443.png";
import basketballMascotTrophy from "@assets/Basketball player with trophy_1764625337441.png";
import basketballMascotGoodTry from "@assets/Backetball player with good try_1764625337440.png";

import robotBackgroundLandscape from "@assets/Robot_background_-_landscape_1764681809727.png";
import robotBackgroundPortrait from "@assets/Robot_background_-_portrait_1764681809727.png";
import robotMascotTrophy from "@assets/Robot_with_trophy_1764681809726.png";
import robotMascotGoodTry from "@assets/Robot_with_good_try_1764681809726.png";

import unicornBackgroundLandscape from "@assets/Unicorn_background_-_landscape_1764681809728.png";
import unicornBackgroundPortrait from "@assets/Unicorn_background_-_portrait_1764681809729.png";
import unicornMascotTrophy from "@assets/Unicorn_with_trophy_1764681809727.png";
import unicornMascotGoodTry from "@assets/Unicorn_with_good_try_1764681809728.png";

const THEME_ASSETS: Record<ThemeId, ThemeAssets> = {
  default: {
    backgroundLandscape: defaultBackgroundLandscape,
    backgroundPortrait: defaultBackgroundPortrait,
    mascotTrophy: defaultMascotTrophy,
    mascotGoodTry: defaultMascotGoodTry,
    name: "Outdoor Theme",
  },
  pirate: {
    backgroundLandscape: pirateBackgroundLandscape,
    backgroundPortrait: pirateBackgroundPortrait,
    mascotTrophy: pirateMascotTrophy,
    mascotGoodTry: pirateMascotGoodTry,
    name: "Pirate Theme",
  },
  space: {
    backgroundLandscape: spaceBackgroundLandscape,
    backgroundPortrait: spaceBackgroundPortrait,
    mascotTrophy: spaceMascotTrophy,
    mascotGoodTry: spaceMascotGoodTry,
    name: "Space Theme",
  },
  soccer: {
    backgroundLandscape: soccerBackgroundLandscape,
    backgroundPortrait: soccerBackgroundPortrait,
    mascotTrophy: soccerMascotTrophy,
    mascotGoodTry: soccerMascotGoodTry,
    name: "Soccer Theme",
  },
  skiing: {
    backgroundLandscape: skiingBackgroundLandscape,
    backgroundPortrait: skiingBackgroundPortrait,
    mascotTrophy: skiingMascotTrophy,
    mascotGoodTry: skiingMascotGoodTry,
    name: "Skiing Theme",
  },
  basketball: {
    backgroundLandscape: basketballBackgroundLandscape,
    backgroundPortrait: basketballBackgroundPortrait,
    mascotTrophy: basketballMascotTrophy,
    mascotGoodTry: basketballMascotGoodTry,
    name: "Basketball Theme",
  },
  robot: {
    backgroundLandscape: robotBackgroundLandscape,
    backgroundPortrait: robotBackgroundPortrait,
    mascotTrophy: robotMascotTrophy,
    mascotGoodTry: robotMascotGoodTry,
    name: "Robot Theme",
  },
  unicorn: {
    backgroundLandscape: unicornBackgroundLandscape,
    backgroundPortrait: unicornBackgroundPortrait,
    mascotTrophy: unicornMascotTrophy,
    mascotGoodTry: unicornMascotGoodTry,
    name: "Unicorn Theme",
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
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("default");

  const { data: userItems, isLoading: isLoadingItems } = useQuery<UserItem[]>({
    queryKey: ["/api/user-items/list"],
    enabled: !!user,
  });

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

  const value: ThemeContextValue = {
    currentTheme,
    themeAssets,
    setTheme,
    forceSetTheme,
    isThemeUnlocked,
    unlockedThemes,
    isLoading: isLoadingItems,
    allThemes: AVAILABLE_THEMES,
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
