import { createContext, ReactNode, useContext, useState, useCallback } from "react";
import type { CustomWordList, GameSession, UserItem, Achievement } from "@shared/schema";

export type GuestImageAssignment = {
  word: string;
  imageUrl: string;
  previewUrl: string;
};

type GuestWordList = Omit<CustomWordList, 'id' | 'userId' | 'createdAt' | 'gradeLevel' | 'isPublic' | 'groupId' | 'hasImage' | 'enrichmentStatus' | 'enrichmentJobId' | 'coOwnerIds'> & {
  id: number;
  createdAt: Date;
  imageAssignments?: GuestImageAssignment[];
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
  processingListIds: Set<number>;
};

type GuestSessionContextType = {
  state: GuestSessionState;
  addWordList: (wordList: Omit<GuestWordList, 'id' | 'createdAt'>) => GuestWordList;
  updateWordList: (id: number, updates: Partial<GuestWordList>) => void;
  deleteWordList: (id: number) => void;
  getWordList: (id: number) => GuestWordList | undefined;
  setWordListImageAssignments: (listId: number, assignments: GuestImageAssignment[]) => void;
  addWordImageAssignment: (listId: number, assignment: GuestImageAssignment) => void;
  removeWordImageAssignment: (listId: number, word: string) => void;
  getWordImageAssignment: (listId: number, word: string) => GuestImageAssignment | undefined;
  addGameSession: (session: Omit<GuestGameSession, 'id' | 'createdAt'>) => GuestGameSession;
  updateGameSession: (id: number, updates: Partial<GuestGameSession>) => void;
  addAchievement: (achievement: Omit<GuestAchievement, 'id' | 'unlockedAt'>) => void;
  addStars: (amount: number) => void;
  spendStars: (amount: number) => boolean;
  addItem: (itemId: string, quantity?: number) => void;
  useItem: (itemId: string) => boolean;
  getItemQuantity: (itemId: string) => number;
  resetSession: () => void;
  isListProcessing: (listId: number) => boolean;
  setListProcessing: (listId: number, processing: boolean) => void;
};

const initialState: GuestSessionState = {
  wordLists: [],
  gameSessions: [],
  achievements: [],
  stars: 0,
  items: new Map(),
  processingListIds: new Set(),
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

  const setWordListImageAssignments = useCallback((listId: number, assignments: GuestImageAssignment[]) => {
    setState(prev => ({
      ...prev,
      wordLists: prev.wordLists.map(list =>
        list.id === listId ? { ...list, imageAssignments: assignments } : list
      ),
    }));
  }, []);

  const addWordImageAssignment = useCallback((listId: number, assignment: GuestImageAssignment) => {
    setState(prev => ({
      ...prev,
      wordLists: prev.wordLists.map(list => {
        if (list.id !== listId) return list;
        const existing = list.imageAssignments || [];
        const filtered = existing.filter(a => a.word.toLowerCase() !== assignment.word.toLowerCase());
        return { ...list, imageAssignments: [...filtered, assignment] };
      }),
    }));
  }, []);

  const removeWordImageAssignment = useCallback((listId: number, word: string) => {
    setState(prev => ({
      ...prev,
      wordLists: prev.wordLists.map(list => {
        if (list.id !== listId) return list;
        const existing = list.imageAssignments || [];
        return { ...list, imageAssignments: existing.filter(a => a.word.toLowerCase() !== word.toLowerCase()) };
      }),
    }));
  }, []);

  const getWordImageAssignment = useCallback((listId: number, word: string): GuestImageAssignment | undefined => {
    const list = state.wordLists.find(l => l.id === listId);
    if (!list?.imageAssignments) return undefined;
    return list.imageAssignments.find(a => a.word.toLowerCase() === word.toLowerCase());
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

  const isListProcessing = useCallback((listId: number): boolean => {
    return state.processingListIds.has(listId);
  }, [state.processingListIds]);

  const setListProcessing = useCallback((listId: number, processing: boolean) => {
    setState(prev => {
      const newSet = new Set(prev.processingListIds);
      if (processing) {
        newSet.add(listId);
      } else {
        newSet.delete(listId);
      }
      return { ...prev, processingListIds: newSet };
    });
  }, []);

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
        setWordListImageAssignments,
        addWordImageAssignment,
        removeWordImageAssignment,
        getWordImageAssignment,
        addGameSession,
        updateGameSession,
        addAchievement,
        addStars,
        spendStars,
        addItem,
        useItem,
        getItemQuantity,
        resetSession,
        isListProcessing,
        setListProcessing,
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
    guestSetWordListImageAssignments: context.setWordListImageAssignments,
    guestAddWordImageAssignment: context.addWordImageAssignment,
    guestRemoveWordImageAssignment: context.removeWordImageAssignment,
    guestGetWordImageAssignment: context.getWordImageAssignment,
    guestAddGameSession: context.addGameSession,
    guestUpdateGameSession: context.updateGameSession,
    guestAddAchievement: context.addAchievement,
    guestAddStars: context.addStars,
    guestSpendStars: context.spendStars,
    guestAddItem: context.addItem,
    guestUseItem: context.useItem,
    guestGetItemQuantity: context.getItemQuantity,
    guestResetSession: context.resetSession,
    guestIsListProcessing: context.isListProcessing,
    guestSetListProcessing: context.setListProcessing,
  };
}
