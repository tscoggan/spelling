import { createContext, ReactNode, useContext, useState, useCallback } from "react";
import type { CustomWordList, GameSession, UserItem, Achievement } from "@shared/schema";

type GuestWordList = Omit<CustomWordList, 'id' | 'userId' | 'createdAt' | 'gradeLevel' | 'isPublic' | 'groupId' | 'hasImage' | 'enrichmentStatus' | 'enrichmentJobId' | 'coOwnerIds'> & {
  id: number;
  createdAt: Date;
};

type GuestGameSession = {
  id: number;
  wordListId: number | null;
  gameMode: string;
  score: number;
  totalWords: number;
  correctWords: number;
  isComplete: boolean;
  createdAt: Date;
};

type GuestAchievement = {
  id: number;
  name: string;
  description: string;
  unlockedAt: Date;
};

type GuestSessionState = {
  wordLists: GuestWordList[];
  gameSessions: GuestGameSession[];
  achievements: GuestAchievement[];
  stars: number;
  items: Map<string, number>;
};

type GuestSessionContextType = {
  state: GuestSessionState;
  addWordList: (wordList: Omit<GuestWordList, 'id' | 'createdAt'>) => GuestWordList;
  updateWordList: (id: number, updates: Partial<GuestWordList>) => void;
  deleteWordList: (id: number) => void;
  getWordList: (id: number) => GuestWordList | undefined;
  addGameSession: (session: Omit<GuestGameSession, 'id' | 'createdAt'>) => GuestGameSession;
  updateGameSession: (id: number, updates: Partial<GuestGameSession>) => void;
  addAchievement: (achievement: Omit<GuestAchievement, 'id' | 'unlockedAt'>) => void;
  addStars: (amount: number) => void;
  spendStars: (amount: number) => boolean;
  addItem: (itemId: string, quantity?: number) => void;
  useItem: (itemId: string) => boolean;
  getItemQuantity: (itemId: string) => number;
  resetSession: () => void;
};

const initialState: GuestSessionState = {
  wordLists: [],
  gameSessions: [],
  achievements: [],
  stars: 0,
  items: new Map(),
};

let nextWordListId = 1;
let nextGameSessionId = 1;
let nextAchievementId = 1;

export const GuestSessionContext = createContext<GuestSessionContextType | null>(null);

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuestSessionState>(initialState);

  const addWordList = useCallback((wordList: Omit<GuestWordList, 'id' | 'createdAt'>): GuestWordList => {
    const newList: GuestWordList = {
      ...wordList,
      id: nextWordListId++,
      createdAt: new Date(),
    };
    setState(prev => ({
      ...prev,
      wordLists: [...prev.wordLists, newList],
    }));
    return newList;
  }, []);

  const updateWordList = useCallback((id: number, updates: Partial<GuestWordList>) => {
    setState(prev => ({
      ...prev,
      wordLists: prev.wordLists.map(list => 
        list.id === id ? { ...list, ...updates } : list
      ),
    }));
  }, []);

  const deleteWordList = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      wordLists: prev.wordLists.filter(list => list.id !== id),
    }));
  }, []);

  const getWordList = useCallback((id: number): GuestWordList | undefined => {
    return state.wordLists.find(list => list.id === id);
  }, [state.wordLists]);

  const addGameSession = useCallback((session: Omit<GuestGameSession, 'id' | 'createdAt'>): GuestGameSession => {
    const newSession: GuestGameSession = {
      ...session,
      id: nextGameSessionId++,
      createdAt: new Date(),
    };
    setState(prev => ({
      ...prev,
      gameSessions: [...prev.gameSessions, newSession],
    }));
    return newSession;
  }, []);

  const updateGameSession = useCallback((id: number, updates: Partial<GuestGameSession>) => {
    setState(prev => ({
      ...prev,
      gameSessions: prev.gameSessions.map(session => 
        session.id === id ? { ...session, ...updates } : session
      ),
    }));
  }, []);

  const addAchievement = useCallback((achievement: Omit<GuestAchievement, 'id' | 'unlockedAt'>) => {
    setState(prev => {
      if (prev.achievements.some(a => a.name === achievement.name)) {
        return prev;
      }
      return {
        ...prev,
        achievements: [...prev.achievements, {
          ...achievement,
          id: nextAchievementId++,
          unlockedAt: new Date(),
        }],
      };
    });
  }, []);

  const addStars = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      stars: prev.stars + amount,
    }));
  }, []);

  const spendStars = useCallback((amount: number): boolean => {
    if (state.stars < amount) return false;
    setState(prev => ({
      ...prev,
      stars: prev.stars - amount,
    }));
    return true;
  }, [state.stars]);

  const addItem = useCallback((itemId: string, quantity: number = 1) => {
    setState(prev => {
      const newItems = new Map(prev.items);
      newItems.set(itemId, (newItems.get(itemId) || 0) + quantity);
      return { ...prev, items: newItems };
    });
  }, []);

  const useItem = useCallback((itemId: string): boolean => {
    const currentQty = state.items.get(itemId) || 0;
    if (currentQty <= 0) return false;
    setState(prev => {
      const newItems = new Map(prev.items);
      const qty = newItems.get(itemId) || 0;
      if (qty > 1) {
        newItems.set(itemId, qty - 1);
      } else {
        newItems.delete(itemId);
      }
      return { ...prev, items: newItems };
    });
    return true;
  }, [state.items]);

  const getItemQuantity = useCallback((itemId: string): number => {
    return state.items.get(itemId) || 0;
  }, [state.items]);

  const resetSession = useCallback(() => {
    nextWordListId = 1;
    nextGameSessionId = 1;
    nextAchievementId = 1;
    setState(initialState);
  }, []);

  return (
    <GuestSessionContext.Provider
      value={{
        state,
        addWordList,
        updateWordList,
        deleteWordList,
        getWordList,
        addGameSession,
        updateGameSession,
        addAchievement,
        addStars,
        spendStars,
        addItem,
        useItem,
        getItemQuantity,
        resetSession,
      }}
    >
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useGuestSession() {
  const context = useContext(GuestSessionContext);
  if (!context) {
    throw new Error("useGuestSession must be used within a GuestSessionProvider");
  }
  
  return {
    ...context,
    guestWordLists: context.state.wordLists,
    guestGameSessions: context.state.gameSessions,
    guestAchievements: context.state.achievements,
    guestStars: context.state.stars,
    guestAddWordList: context.addWordList,
    guestUpdateWordList: context.updateWordList,
    guestDeleteWordList: context.deleteWordList,
    guestGetWordList: context.getWordList,
    guestAddGameSession: context.addGameSession,
    guestUpdateGameSession: context.updateGameSession,
    guestAddAchievement: context.addAchievement,
    guestAddStars: context.addStars,
    guestSpendStars: context.spendStars,
    guestAddItem: context.addItem,
    guestUseItem: context.useItem,
    guestGetItemQuantity: context.getItemQuantity,
    guestResetSession: context.resetSession,
  };
}
