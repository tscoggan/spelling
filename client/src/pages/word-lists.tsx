import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useGuestSession, GuestImageAssignment } from "@/hooks/use-guest-session";
import { Plus, Trash2, Edit, Globe, Lock, Play, Home, Upload, Filter, Camera, X, Users, Target, Clock, Trophy, Shuffle, AlertCircle, Grid3x3, UserPlus, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { CustomWordList as BaseCustomWordList, WordIllustration } from "@shared/schema";

// Extend the base type to include fields added by the backend
type CustomWordList = BaseCustomWordList & {
  authorUsername?: string;
};
import { useToast } from "@/hooks/use-toast";
import { UserHeader } from "@/components/user-header";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import * as pdfjsLib from "pdfjs-dist";

const GRADE_LEVELS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9-12"];

function getVisibility(list: any): "public" | "private" | "groups" {
  if (list.visibility) return list.visibility;
  return list.isPublic ? "public" : "private";
}

export default function WordListsPage() {
  const { user, isGuestMode } = useAuth();
  const { guestWordLists, guestAddWordList, guestUpdateWordList, guestDeleteWordList, guestGetWordList, guestAddWordImageAssignment, guestGetWordListMastery } = useGuestSession();
  const isFreeAccount = user?.accountType === 'free';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomWordList | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [hideMastered, setHideMastered] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [editImagesDialogOpen, setEditImagesDialogOpen] = useState(false);
  const [editingImagesList, setEditingImagesList] = useState<CustomWordList | null>(null);
  const [validationFeedbackOpen, setValidationFeedbackOpen] = useState(false);
  const [validationFeedback, setValidationFeedback] = useState<{
    removedWords: string[];
    skippedWords: string[];
  }>({ removedWords: [], skippedWords: [] });
  const [gameModeDialogOpen, setGameModeDialogOpen] = useState(false);
  const [selectedListForPlay, setSelectedListForPlay] = useState<CustomWordList | null>(null);
  const [coOwnersDialogOpen, setCoOwnersDialogOpen] = useState(false);
  const [selectedListForCoOwners, setSelectedListForCoOwners] = useState<CustomWordList | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    words: "",
    visibility: "private" as "public" | "private" | "groups",
    assignImages: true,
    gradeLevel: "",
    selectedGroupIds: [] as number[],
  });
  // Track newly created list ID for dialog button disabling during image assignment
  const [processingNewListId, setProcessingNewListId] = useState<number | null>(null);
  // Get the context-level processing lock for guest image assignments
  const { guestSetWordListImageAssignments, guestIsListProcessing, guestSetListProcessing } = useGuestSession();
  
  // Helper to check if the current dialog should be locked (for edit or new list)
  const isDialogProcessing = editingList 
    ? guestIsListProcessing(editingList.id) 
    : (processingNewListId !== null && guestIsListProcessing(processingNewListId));
  
  // Helper function to automatically assign images to guest word lists
  const autoAssignGuestImages = async (listId: number, words: string[], existingAssignments: GuestImageAssignment[] = []) => {
    // Prevent re-entry using context-level lock (shared across all components/tabs)
    if (guestIsListProcessing(listId)) {
      console.warn("Image assignment already in progress for this list, skipping");
      return;
    }
    
    guestSetListProcessing(listId, true);
    
    // Build a set of words that already have assignments (using a copy to avoid mutation)
    const wordsWithImages = new Set(existingAssignments.map(a => a.word.toLowerCase()));
    
    // Deduplicate words in the input and filter out those with existing assignments
    const seenWords = new Set<string>();
    const wordsToFetch: string[] = [];
    for (const w of words) {
      const lowerWord = w.toLowerCase();
      if (!wordsWithImages.has(lowerWord) && !seenWords.has(lowerWord)) {
        wordsToFetch.push(w);
        seenWords.add(lowerWord);
      }
    }
    
    // Create a fresh copy of existing assignments
    const newAssignments: GuestImageAssignment[] = existingAssignments.map(a => ({ ...a }));
    let successCount = 0;
    let failCount = 0;
    
    // If no new words to fetch, still refresh state with a fresh array to ensure re-render
    if (wordsToFetch.length === 0) {
      guestSetWordListImageAssignments(listId, [...newAssignments]);
      guestSetListProcessing(listId, false);
      return;
    }
    
    // Track words already processed within this run to avoid duplicate fetches
    const processedWords = new Set<string>();
    
    try {
      for (const word of wordsToFetch) {
        // Skip if already processed in this run
        const lowerWord = word.toLowerCase();
        if (processedWords.has(lowerWord)) {
          continue;
        }
        processedWords.add(lowerWord);
        
        try {
          const response = await fetch(`/api/guest/pixabay-search?word=${encodeURIComponent(word)}`);
          if (response.ok) {
            const data = await response.json();
            // API returns array directly, not wrapped in {previews: [...]}
            const previews = Array.isArray(data) ? data : (data.previews || []);
            if (previews.length > 0) {
              const firstResult = previews[0];
              newAssignments.push({
                word,
                imageUrl: firstResult.largeImageURL || firstResult.webformatURL,
                previewUrl: firstResult.previewURL,
              });
              successCount++;
            } else {
              // No images found for this word (not a failure, just no results)
            }
          } else {
            failCount++;
          }
        } catch (err) {
          console.warn(`Failed to fetch image for word "${word}":`, err);
          failCount++;
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Always update state with a fresh array to trigger React re-render
      guestSetWordListImageAssignments(listId, [...newAssignments]);
      
      if (successCount > 0) {
        toast({
          title: "Images Assigned!",
          description: `Found images for ${successCount} of ${wordsToFetch.length} words`,
        });
      } else if (failCount === wordsToFetch.length) {
        toast({
          title: "Image Assignment Failed",
          description: "Could not fetch images. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "No Images Found",
          description: "No matching images were found for your words",
        });
      }
    } catch (err) {
      console.error("Error auto-assigning images:", err);
      toast({
        title: "Error",
        description: "Failed to assign images. Please try again.",
        variant: "destructive",
      });
    } finally {
      guestSetListProcessing(listId, false);
    }
  };

  // Update form defaults when user role becomes available
  // Free accounts always get "private" visibility
  useEffect(() => {
    if (user && !editingList) {
      const isTeacher = user.role === "teacher";
      const isFree = user.accountType === 'free';
      setFormData(prev => ({
        ...prev,
        visibility: isFree ? "private" : (isTeacher ? "groups" : prev.visibility),
        assignImages: isTeacher ? false : prev.assignImages,
      }));
    }
  }, [user?.role, user?.accountType]);

  const { data: apiUserLists = [], isLoading: loadingUserLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/word-lists", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch word lists");
      return await response.json();
    },
    enabled: !!user && !isGuestMode,
    refetchOnMount: "always",
    staleTime: 0,
  });
  
  // For guests, use in-memory word lists; for authenticated users, use API lists
  const userLists: CustomWordList[] = isGuestMode 
    ? guestWordLists.map(list => ({
        ...list,
        userId: 0,
        isPublic: false,
        gradeLevel: null,
        createdAt: list.createdAt,
      } as CustomWordList))
    : apiUserLists;

  // Free accounts cannot see public or shared lists
  const { data: publicLists = [], isLoading: loadingPublicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
    enabled: !isFreeAccount,
  });

  const { data: sharedLists = [], isLoading: loadingSharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/word-lists/shared-with-me", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch shared word lists");
      return await response.json();
    },
    enabled: !!user && !isFreeAccount,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Hidden word lists (paid accounts only)
  const { data: hiddenWordLists = [] } = useQuery<{ userId: number; wordListId: number }[]>({
    queryKey: ["/api/word-lists/hidden"],
    queryFn: async () => {
      const response = await fetch("/api/word-lists/hidden", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch hidden word lists");
      return await response.json();
    },
    enabled: !!user && !isFreeAccount,
  });

  const hiddenWordListIds = useMemo(() => {
    return new Set(hiddenWordLists.map(h => h.wordListId));
  }, [hiddenWordLists]);

  const hideWordListMutation = useMutation({
    mutationFn: async (wordListId: number) => {
      const response = await apiRequest("POST", `/api/word-lists/${wordListId}/hide`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/hidden"] });
      toast({ title: "Word list hidden", description: "This list is now hidden from your view" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to hide word list", variant: "destructive" });
    },
  });

  const unhideWordListMutation = useMutation({
    mutationFn: async (wordListId: number) => {
      const response = await apiRequest("DELETE", `/api/word-lists/${wordListId}/hide`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/hidden"] });
      toast({ title: "Word list visible", description: "This list is now visible again" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to unhide word list", variant: "destructive" });
    },
  });

  const toggleHideWordList = (wordListId: number) => {
    if (hiddenWordListIds.has(wordListId)) {
      unhideWordListMutation.mutate(wordListId);
    } else {
      hideWordListMutation.mutate(wordListId);
    }
  };

  const { data: achievements } = useQuery<any[]>({
    queryKey: ["/api/achievements/user", user?.id],
    enabled: !!user,
  });

  // Helper function to get achievement for a word list
  const getAchievementForList = (wordListId: number) => {
    // For guest mode, use in-memory mastery data
    if (isGuestMode) {
      const mastery = guestGetWordListMastery(wordListId);
      if (!mastery) return null;
      return {
        wordListId,
        achievementType: "Word List Mastery",
        achievementValue: `${mastery.totalStars} ${mastery.totalStars === 1 ? "Star" : "Stars"}`,
        completedModes: mastery.completedModes,
      };
    }
    // For authenticated users, use API achievements
    if (!achievements) return null;
    return achievements.find(
      (a) => a.wordListId === wordListId && a.achievementType === "Word List Mastery"
    );
  };

  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/user-groups", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/user-groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch groups");
      return await response.json();
    },
    enabled: !!user && dialogOpen,
  });

  const { data: jobStatus } = useQuery({
    queryKey: ["/api/illustration-jobs", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await fetch(`/api/illustration-jobs/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch job status");
      return await response.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.status || data.status === 'completed') return false;
      return 2000;
    },
  });

  // Co-owner management queries and mutations
  const { data: teacherSearchResults = [], isLoading: isSearchingTeachers } = useQuery<any[]>({
    queryKey: ["/api/teachers/search", teacherSearchQuery],
    queryFn: async () => {
      if (teacherSearchQuery.length < 2) return [];
      const response = await fetch(`/api/teachers/search?q=${encodeURIComponent(teacherSearchQuery)}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to search teachers");
      return await response.json();
    },
    enabled: !!user && user.role === "teacher" && coOwnersDialogOpen && teacherSearchQuery.length >= 2,
  });

  const { data: coOwners = [], refetch: refetchCoOwners } = useQuery<any[]>({
    queryKey: ["/api/word-lists", selectedListForCoOwners?.id, "co-owners"],
    queryFn: async () => {
      if (!selectedListForCoOwners) return [];
      const response = await fetch(`/api/word-lists/${selectedListForCoOwners.id}/co-owners`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch co-owners");
      return await response.json();
    },
    enabled: !!selectedListForCoOwners && coOwnersDialogOpen,
  });

  const addCoOwnerMutation = useMutation({
    mutationFn: async (coOwnerUserId: number) => {
      if (!selectedListForCoOwners) throw new Error("No list selected");
      const response = await apiRequest("POST", `/api/word-lists/${selectedListForCoOwners.id}/co-owners`, { coOwnerUserId });
      return await response.json();
    },
    onSuccess: () => {
      refetchCoOwners();
      setTeacherSearchQuery("");
      toast({ title: "Success", description: "Co-owner added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add co-owner", variant: "destructive" });
    },
  });

  const removeCoOwnerMutation = useMutation({
    mutationFn: async (coOwnerUserId: number) => {
      if (!selectedListForCoOwners) throw new Error("No list selected");
      const response = await apiRequest("DELETE", `/api/word-lists/${selectedListForCoOwners.id}/co-owners/${coOwnerUserId}`);
      return await response.json();
    },
    onSuccess: () => {
      refetchCoOwners();
      toast({ title: "Success", description: "Co-owner removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove co-owner", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const words = data.words.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      const payload: any = {
        name: data.name,
        words,
        visibility: data.visibility,
        assignImages: data.assignImages,
        gradeLevel: data.gradeLevel || undefined,
      };
      if (data.visibility === "groups") {
        payload.groupIds = data.selectedGroupIds;
      }
      const response = await apiRequest("POST", "/api/word-lists", payload);
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate all word list queries (prefix match includes illustrations subqueries)
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      setDialogOpen(false);
      resetForm();
      
      // Show validation feedback dialog if any words were removed or skipped
      if ((data.removedWords && data.removedWords.length > 0) || (data.skippedWords && data.skippedWords.length > 0)) {
        setValidationFeedback({
          removedWords: data.removedWords || [],
          skippedWords: data.skippedWords || [],
        });
        setValidationFeedbackOpen(true);
      }
      
      // Show success message
      if (data.illustrationJobId) {
        setJobId(data.illustrationJobId);
        toast({
          title: "Success!",
          description: "Word list created! Searching for cartoon images...",
        });
      } else {
        toast({
          title: "Success!",
          description: "Word list created successfully",
        });
      }
    },
    onError: (error: any) => {
      const description = error.details || error.message || "Failed to create word list";
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const updates: any = {
        name: data.name,
        visibility: data.visibility,
        assignImages: data.assignImages,
        gradeLevel: data.gradeLevel || undefined,
      };
      if (data.visibility === "groups" && data.selectedGroupIds !== undefined) {
        updates.groupIds = data.selectedGroupIds;
      }
      if (data.words) {
        updates.words = data.words.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      }
      const response = await apiRequest("PUT", `/api/word-lists/${id}`, updates);
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate all word list queries (prefix match includes illustrations subqueries)
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      setDialogOpen(false);
      setEditingList(null);
      resetForm();
      
      // Show validation feedback dialog if any words were removed or skipped
      if ((data.removedWords && data.removedWords.length > 0) || (data.skippedWords && data.skippedWords.length > 0)) {
        setValidationFeedback({
          removedWords: data.removedWords || [],
          skippedWords: data.skippedWords || [],
        });
        setValidationFeedbackOpen(true);
      }
      
      // Show success message
      if (data.illustrationJobId) {
        setJobId(data.illustrationJobId);
        toast({
          title: "Success!",
          description: "Word list updated! Searching for cartoon images...",
        });
      } else {
        toast({
          title: "Success!",
          description: "Word list updated successfully",
        });
      }
    },
    onError: (error: any) => {
      const description = error.details || error.message || "Failed to update word list";
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/word-lists/${id}`);
    },
    onSuccess: () => {
      // Invalidate all word list queries (prefix match includes illustrations subqueries)
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      toast({
        title: "Success!",
        description: "Word list deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete word list",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobId) {
      // Invalidate all word lists to refresh thumbnails after illustration job completes
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-illustrations"] });
      toast({
        title: "Image Search Complete!",
        description: `Found ${jobStatus.successCount} cartoon images for your words`,
      });
      setJobId(null);
    }
  }, [jobStatus?.status, jobId, toast]);

  const resetForm = () => {
    const isTeacher = user?.role === "teacher";
    const isFree = user?.accountType === 'free';
    setFormData({
      name: "",
      words: "",
      visibility: isFree ? "private" : (isTeacher ? "groups" : "private"),
      assignImages: isTeacher ? false : true,
      gradeLevel: "",
      selectedGroupIds: [],
    });
  };

  const handleEdit = (list: CustomWordList) => {
    setEditingList(list);
    const visibility = getVisibility(list);
    const sharedGroups = (list as any).sharedGroups || [];
    const isFree = user?.accountType === 'free';
    setFormData({
      name: list.name,
      words: list.words.join('\n'),
      visibility: isFree ? "private" : visibility,
      assignImages: (list as any).assignImages !== false,
      gradeLevel: list.gradeLevel || "",
      selectedGroupIds: isFree ? [] : sharedGroups.map((g: any) => g.id),
    });
    setDialogOpen(true);
  };
  
  const handleDelete = (listId: number) => {
    if (isGuestMode) {
      guestDeleteWordList(listId);
      toast({
        title: "Success!",
        description: "Word list deleted successfully",
      });
    } else {
      deleteMutation.mutate(listId);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.txt', '.csv', '.pdf'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a .txt, .csv, or .pdf file",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    try {
      let text: string;
      
      if (fileExtension === '.pdf') {
        toast({
          title: "Processing PDF",
          description: "Extracting text from PDF...",
        });
        text = await extractTextFromPDF(file);
        
        if (!text.trim()) {
          toast({
            title: "Cannot extract text",
            description: "This PDF may be scanned, encrypted, or contain no text. Please use a text-based PDF or try a different file format.",
            variant: "destructive",
          });
          e.target.value = '';
          return;
        }
      } else {
        text = await file.text();
      }
      
      let words: string[];

      if (fileExtension === '.csv') {
        words = text.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0);
      } else {
        words = text.split(/[\s,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
      }

      if (words.length < 5) {
        toast({
          title: "Too few words",
          description: `File contains ${words.length} words. Minimum is 5.`,
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }

      if (words.length > 100) {
        toast({
          title: "Too many words",
          description: `File contains ${words.length} words. Using first 100.`,
        });
        words = words.slice(0, 100);
      }

      setFormData({ ...formData, words: words.join('\n') });
      toast({
        title: "Success!",
        description: `Imported ${words.length} words from file`,
      });
      e.target.value = '';
    } catch (error) {
      const errorMessage = fileExtension === '.pdf' 
        ? "Failed to process PDF. The file may be corrupted or unsupported."
        : "Failed to read file";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Defensively ensure free accounts always submit with private visibility
    const submissionData = isFreeAccount 
      ? { ...formData, visibility: "private" as const, selectedGroupIds: [] }
      : formData;
    
    // For guest mode, use in-memory storage instead of API
    if (isGuestMode) {
      const words = submissionData.words.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
      
      // Validate minimum word count
      if (words.length < 5) {
        toast({
          title: "Error",
          description: "Please add at least 5 words to your list",
          variant: "destructive",
        });
        return;
      }
      
      if (words.length > 500) {
        toast({
          title: "Error",
          description: "Word lists cannot exceed 500 words",
          variant: "destructive",
        });
        return;
      }
      
      // Validate words against dictionary (same as authenticated users)
      try {
        const validationResponse = await fetch("/api/validate-words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words }),
        });
        
        if (!validationResponse.ok) {
          const errorData = await validationResponse.json();
          
          // Handle inappropriate content
          if (errorData.inappropriateWords) {
            toast({
              title: "Inappropriate Content",
              description: errorData.details,
              variant: "destructive",
            });
            return;
          }
          
          // Handle service unavailable
          if (validationResponse.status === 503) {
            toast({
              title: "Validation Unavailable",
              description: "Dictionary validation is temporarily unavailable. Please try again in a moment.",
              variant: "destructive",
            });
            return;
          }
          
          throw new Error(errorData.error || "Validation failed");
        }
        
        const validationResult = await validationResponse.json();
        const validWords = validationResult.valid as string[];
        const invalidWords = validationResult.invalid as string[];
        const skippedWords = validationResult.skipped as string[];
        
        // If no valid words remain, reject
        if (validWords.length === 0) {
          toast({
            title: "No Valid Words",
            description: "All words were either invalid or not found in the dictionary. Please check your spelling.",
            variant: "destructive",
          });
          return;
        }
        
        // Check if we still have at least 5 valid words
        if (validWords.length < 5) {
          toast({
            title: "Not Enough Valid Words",
            description: `Only ${validWords.length} word(s) were valid. Please add at least 5 valid words.`,
            variant: "destructive",
          });
          return;
        }
        
        // Use only valid words
        const finalWords = validWords;
        
        if (editingList) {
          // Get existing assignments before updating
          const existingList = guestGetWordList(editingList.id);
          const existingAssignments = existingList?.imageAssignments || [];
          
          guestUpdateWordList(editingList.id, {
            name: submissionData.name,
            words: finalWords,
            visibility: "private",
            assignImages: submissionData.assignImages,
          });
          
          // Show validation feedback if any words were removed or skipped
          if (invalidWords.length > 0 || skippedWords.length > 0) {
            setValidationFeedback({
              removedWords: invalidWords,
              skippedWords: skippedWords,
            });
            setValidationFeedbackOpen(true);
          }
          
          toast({
            title: "Success!",
            description: submissionData.assignImages 
              ? "Word list updated! Checking for new images..." 
              : "Word list updated successfully",
          });
          
          // Auto-assign images for new words if enabled
          if (submissionData.assignImages) {
            await autoAssignGuestImages(editingList.id, finalWords, existingAssignments);
          }
        } else {
          const newList = guestAddWordList({
            name: submissionData.name,
            words: finalWords,
            visibility: "private",
            assignImages: submissionData.assignImages,
          });
          
          // Show validation feedback if any words were removed or skipped
          if (invalidWords.length > 0 || skippedWords.length > 0) {
            setValidationFeedback({
              removedWords: invalidWords,
              skippedWords: skippedWords,
            });
            setValidationFeedbackOpen(true);
          }
          
          toast({
            title: "Success!",
            description: submissionData.assignImages 
              ? "Word list created! Assigning images..." 
              : "Word list created successfully (stored in memory for this session)",
          });
          
          // Auto-assign images if enabled
          if (submissionData.assignImages && newList) {
            setProcessingNewListId(newList.id);
            try {
              await autoAssignGuestImages(newList.id, finalWords, []);
            } finally {
              setProcessingNewListId(null);
            }
          }
        }
        
        setDialogOpen(false);
        setEditingList(null);
        resetForm();
        return;
        
      } catch (error) {
        console.error("Word validation error:", error);
        toast({
          title: "Validation Error",
          description: "Failed to validate words. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (editingList) {
      updateMutation.mutate({ id: editingList.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const playWithList = (list: CustomWordList) => {
    setSelectedListForPlay(list);
    setGameModeDialogOpen(true);
  };

  const startGameWithMode = (mode: string) => {
    if (!selectedListForPlay) return;
    
    // For modes that support game length (practice, quiz, scramble, mistake), default to "all" words
    const supportsGameLength = ["practice", "quiz", "scramble", "mistake"].includes(mode);
    if (supportsGameLength) {
      setLocation(`/game?listId=${selectedListForPlay.id}&mode=${mode}&gameCount=all`);
    } else {
      setLocation(`/game?listId=${selectedListForPlay.id}&mode=${mode}`);
    }
    setGameModeDialogOpen(false);
  };

  const filteredUserLists = useMemo(() => {
    let filtered = userLists;
    
    // Apply hidden filter (for paid accounts only)
    if (!isFreeAccount && !showHidden) {
      filtered = filtered.filter(list => !hiddenWordListIds.has(list.id));
    }
    
    // Apply grade filter
    if (gradeFilter !== "all") {
      if (gradeFilter === "none") {
        filtered = filtered.filter(list => !list.gradeLevel);
      } else {
        filtered = filtered.filter(list => list.gradeLevel === gradeFilter);
      }
    }
    
    // Apply created by filter
    if (createdByFilter !== "all") {
      filtered = filtered.filter(list => list.authorUsername === createdByFilter);
    }
    
    // Apply hide mastered filter
    if (hideMastered && achievements) {
      filtered = filtered.filter(list => {
        const achievement = getAchievementForList(list.id);
        return !achievement || achievement.achievementValue !== "3 Stars";
      });
    }
    
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [userLists, gradeFilter, createdByFilter, hideMastered, achievements, showHidden, hiddenWordListIds, isFreeAccount]);

  const filteredSharedLists = useMemo(() => {
    let filtered = sharedLists;
    
    // Apply hidden filter (for paid accounts only)
    if (!showHidden) {
      filtered = filtered.filter(list => !hiddenWordListIds.has(list.id));
    }
    
    // Apply grade filter
    if (gradeFilter !== "all") {
      if (gradeFilter === "none") {
        filtered = filtered.filter(list => !list.gradeLevel);
      } else {
        filtered = filtered.filter(list => list.gradeLevel === gradeFilter);
      }
    }
    
    // Apply created by filter
    if (createdByFilter !== "all") {
      filtered = filtered.filter(list => list.authorUsername === createdByFilter);
    }
    
    // Apply hide mastered filter
    if (hideMastered && achievements) {
      filtered = filtered.filter(list => {
        const achievement = getAchievementForList(list.id);
        return !achievement || achievement.achievementValue !== "3 Stars";
      });
    }
    
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [sharedLists, gradeFilter, createdByFilter, hideMastered, achievements, showHidden, hiddenWordListIds]);

  const filteredPublicLists = useMemo(() => {
    let filtered = publicLists;
    
    // Apply hidden filter
    if (!showHidden) {
      filtered = filtered.filter(list => !hiddenWordListIds.has(list.id));
    }
    
    // Apply grade filter
    if (gradeFilter !== "all") {
      if (gradeFilter === "none") {
        filtered = filtered.filter(list => !list.gradeLevel);
      } else {
        filtered = filtered.filter(list => list.gradeLevel === gradeFilter);
      }
    }
    
    // Apply created by filter
    if (createdByFilter !== "all") {
      filtered = filtered.filter(list => list.authorUsername === createdByFilter);
    }
    
    // Apply hide mastered filter
    if (hideMastered && achievements) {
      filtered = filtered.filter(list => {
        const achievement = getAchievementForList(list.id);
        return !achievement || achievement.achievementValue !== "3 Stars";
      });
    }
    
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [publicLists, gradeFilter, createdByFilter, hideMastered, achievements, showHidden, hiddenWordListIds]);

  // Combined "All" lists - merge all accessible lists, removing duplicates
  const filteredAllLists = useMemo(() => {
    // Combine all lists with source markers
    const myLists = userLists.map(list => ({ ...list, source: 'mine' as const }));
    const shared = sharedLists.map(list => ({ ...list, source: 'shared' as const }));
    const pub = publicLists.map(list => ({ ...list, source: 'public' as const }));
    
    // Combine and remove duplicates (prefer user's own lists, then shared, then public)
    const combined = [...myLists, ...shared, ...pub];
    const uniqueLists = combined.filter((list, index, self) => 
      index === self.findIndex(l => l.id === list.id)
    );
    
    let filtered = uniqueLists;
    
    // Apply hidden filter (for paid accounts only)
    if (!isFreeAccount && !showHidden) {
      filtered = filtered.filter(list => !hiddenWordListIds.has(list.id));
    }
    
    // Apply grade filter
    if (gradeFilter !== "all") {
      if (gradeFilter === "none") {
        filtered = filtered.filter(list => !list.gradeLevel);
      } else {
        filtered = filtered.filter(list => list.gradeLevel === gradeFilter);
      }
    }
    
    // Apply created by filter
    if (createdByFilter !== "all") {
      filtered = filtered.filter(list => list.authorUsername === createdByFilter);
    }
    
    // Apply hide mastered filter
    if (hideMastered && achievements) {
      filtered = filtered.filter(list => {
        const achievement = getAchievementForList(list.id);
        return !achievement || achievement.achievementValue !== "3 Stars";
      });
    }
    
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [userLists, sharedLists, publicLists, gradeFilter, createdByFilter, hideMastered, achievements, showHidden, hiddenWordListIds, isFreeAccount]);

  const availableGradeLevels = useMemo(() => {
    const grades = new Set<string>();
    [...userLists, ...sharedLists, ...publicLists].forEach(list => {
      if (list.gradeLevel) grades.add(list.gradeLevel);
    });
    return Array.from(grades).sort((a, b) => {
      if (a === "K") return -1;
      if (b === "K") return 1;
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [userLists, sharedLists, publicLists]);

  const availableAuthors = useMemo(() => {
    const authors = new Set<string>();
    [...userLists, ...sharedLists, ...publicLists].forEach(list => {
      if (list.authorUsername) authors.add(list.authorUsername);
    });
    return Array.from(authors).sort((a, b) => a.localeCompare(b));
  }, [userLists, sharedLists, publicLists]);

  const renderWordList = (list: any, canEdit: boolean) => {
    // For guest mode, get the image assignments from the guest list
    const guestListData = isGuestMode ? guestGetWordList(list.id) : null;
    const guestImageAssignments = guestListData?.imageAssignments || [];
    
    return (
    <Card key={list.id} className="hover-elevate" data-testid={`card-word-list-${list.id}`}>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {list.name}
                {getVisibility(list) === 'public' ? (
                  <Globe className="w-4 h-4 text-green-600" data-testid="icon-public" />
                ) : getVisibility(list) === 'groups' ? (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded" data-testid="badge-groups">
                    Groups{list.sharedGroups && list.sharedGroups.length > 0 ? ` - ${list.sharedGroups.filter((g: any) => g.name).map((g: any) => g.name).join(', ')}` : ''}
                  </span>
                ) : (
                  <Lock className="w-4 h-4 text-gray-600" data-testid="icon-private" />
                )}
              </CardTitle>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                {/* Hide author for free accounts - they only see their own lists */}
                {!isFreeAccount && (
                  <span data-testid={`author-${list.id}`}>
                    by <span className="font-semibold">{list.authorUsername || 'Unknown'}</span>
                  </span>
                )}
                <span>{list.words.length} words</span>
                {list.gradeLevel && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-medium" data-testid={`grade-${list.id}`}>
                    Grade {list.gradeLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => playWithList(list)}
              data-testid={`button-play-${list.id}`}
            >
              <Play className="w-4 h-4 mr-2" />
              Play
            </Button>
            {canEdit && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(list)}
                      data-testid={`button-edit-${list.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit List</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingImagesList(list);
                        setEditImagesDialogOpen(true);
                      }}
                      data-testid={`button-edit-images-${list.id}`}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Images</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(list.id)}
                      disabled={!isGuestMode && deleteMutation.isPending}
                      data-testid={`button-delete-${list.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete List</TooltipContent>
                </Tooltip>
                {user?.role === "teacher" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedListForCoOwners(list);
                          setCoOwnersDialogOpen(true);
                        }}
                        data-testid={`button-co-owners-${list.id}`}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Manage Co-owners</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
            {!isFreeAccount && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleHideWordList(list.id)}
                    disabled={hideWordListMutation.isPending || unhideWordListMutation.isPending}
                    data-testid={`button-hide-${list.id}`}
                  >
                    {hiddenWordListIds.has(list.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hiddenWordListIds.has(list.id) ? "Unhide List" : "Hide List"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <WordListPreview 
          words={list.words.slice(0, 10)} 
          listId={list.id}
          guestImageAssignments={guestImageAssignments}
          isGuestMode={isGuestMode}
        />
        {list.words.length > 10 && (
          <span className="px-2 py-1 text-gray-600 text-sm block mt-2">
            +{list.words.length - 10} more words
          </span>
        )}
        {guestIsListProcessing(list.id) && (
          <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Assigning images...</span>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Portrait background */}
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      {/* Landscape background */}
      <div 
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${themeAssets.backgroundLandscape})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto relative z-10"
      >
        <div className="flex items-start justify-between mb-6">
          <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-home">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <UserHeader />
        </div>
        
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className={`text-4xl md:text-5xl font-bold ${textClasses.headline}`}>
              Word Lists
            </h1>
            <p className={`text-lg mt-1 ${textClasses.subtitle}`}>
              Create your own spelling word lists and share them with others
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-600" />
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-grade-filter">
                <SelectValue placeholder="Filter by grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-all">All Grades</SelectItem>
                <SelectItem value="none" data-testid="filter-none">No Grade</SelectItem>
                {availableGradeLevels.map((grade) => (
                  <SelectItem key={grade} value={grade} data-testid={`filter-${grade}`}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-author-filter">
                <SelectValue placeholder="Filter by author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-all-authors">All Authors</SelectItem>
                {availableAuthors.map((author) => (
                  <SelectItem key={author} value={author} data-testid={`filter-author-${author}`}>
                    {author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {user?.role !== "teacher" && (
              <div className="flex items-center space-x-2 bg-white/30 dark:bg-black/30 px-3 py-2 rounded-md backdrop-blur-sm">
                <Checkbox 
                  id="hide-mastered-lists" 
                  checked={hideMastered}
                  onCheckedChange={(checked) => setHideMastered(checked === true)}
                  data-testid="checkbox-hide-mastered-lists"
                />
                <label 
                  htmlFor="hide-mastered-lists" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer whitespace-nowrap"
                >
                  Hide Word Lists I've Mastered
                </label>
              </div>
            )}
            {!isFreeAccount && (
              <div className="flex items-center space-x-2 bg-white/30 dark:bg-black/30 px-3 py-2 rounded-md backdrop-blur-sm">
                <Checkbox 
                  id="show-hidden-lists" 
                  checked={showHidden}
                  onCheckedChange={(checked) => setShowHidden(checked === true)}
                  data-testid="checkbox-show-hidden-lists"
                />
                <label 
                  htmlFor="show-hidden-lists" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer whitespace-nowrap"
                >
                  Show Hidden Lists
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingList(null); }} data-testid="button-create-list">
                  <Plus className="w-4 h-4 mr-2" />
                  Create List
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {editingList ? "Edit Word List" : "Create New Word List"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingList
                      ? "Update your word list details"
                      : "Create a custom list of spelling words (minimum 5 words, maximum 500)"}
                  </DialogDescription>
                  <p className="text-sm text-amber-600 mt-2">
                    Tip: For the best learning experience, keep word lists to about 25 words or less.
                  </p>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div>
                    <Label htmlFor="name">List Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Science Vocabulary Week 1"
                      required
                      data-testid="input-list-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gradeLevel">Grade Level (optional)</Label>
                    <Select
                      value={formData.gradeLevel}
                      onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                    >
                      <SelectTrigger id="gradeLevel" data-testid="select-grade-level">
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((grade) => (
                          <SelectItem key={grade} value={grade} data-testid={`grade-option-${grade}`}>
                            {grade === "K" ? "Kindergarten" : `Grade ${grade}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    {/* Show locked display for free accounts or when user data not yet loaded */}
                    {(isFreeAccount || !user) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50 text-muted-foreground cursor-not-allowed" data-testid="select-visibility-locked">
                            <Lock className="w-4 h-4" />
                            <span>Private - Only you can use this list</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isFreeAccount ? "Upgrade to a Family or School account to share word lists" : "Loading..."}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Select
                        value={formData.visibility}
                        onValueChange={(value: "public" | "private" | "groups") => setFormData({ ...formData, visibility: value })}
                      >
                        <SelectTrigger id="visibility" data-testid="select-visibility">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public" data-testid="visibility-public">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              <span>Public - Anyone can use this list</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="private" data-testid="visibility-private">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4" />
                              <span>Private - Only you can use this list</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="groups" data-testid="visibility-groups">
                            <div className="flex items-center gap-2">
                              <span>Groups - Share with specific groups</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {formData.visibility === "groups" && !isFreeAccount && (
                    <div>
                      <Label>Share with Groups</Label>
                      <div className="border rounded-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
                        {(() => {
                          // Filter groups to only show ones where user can share:
                          // 1. User owns the group
                          // 2. User is a co-owner
                          // 3. User is a member AND membersCanShareWordLists is true
                          // Also include groups that are already selected (to preserve existing selections)
                          const filteredGroups = userGroups.filter((g: any) => 
                            g.isOwner || 
                            g.isCoOwner || 
                            g.membersCanShareWordLists !== false ||
                            formData.selectedGroupIds.includes(g.id)
                          );
                          
                          if (filteredGroups.length === 0) {
                            return (
                              <p className="text-sm text-gray-500 text-center py-4">
                                No groups available. Create a group first!
                              </p>
                            );
                          }
                          
                          return filteredGroups.map((group: any) => {
                            const isOwned = group.ownerUserId === user?.id;
                            return (
                              <div key={group.id} className="flex items-start gap-3" data-testid={`group-checkbox-${group.id}`}>
                                <Checkbox
                                  id={`group-${group.id}`}
                                  checked={formData.selectedGroupIds.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData({
                                        ...formData,
                                        selectedGroupIds: [...formData.selectedGroupIds, group.id],
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        selectedGroupIds: formData.selectedGroupIds.filter(id => id !== group.id),
                                      });
                                    }
                                  }}
                                  data-testid={`checkbox-group-${group.id}`}
                                />
                                <div className="flex-1">
                                  <label htmlFor={`group-${group.id}`} className="text-sm font-medium cursor-pointer">
                                    {group.name} ({group.memberCount || 0} {(group.memberCount || 0) === 1 ? 'member' : 'members'})
                                  </label>
                                  {group.description && (
                                    <div className="mt-1">
                                      <span className="text-xs text-gray-500">
                                        {group.description}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {formData.selectedGroupIds.length > 0 && (
                        <p className="text-sm text-gray-600 mt-2" data-testid="text-selected-groups-count">
                          {formData.selectedGroupIds.length} group{formData.selectedGroupIds.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="assignImages"
                      checked={formData.assignImages}
                      onCheckedChange={(checked) => setFormData({ ...formData, assignImages: checked })}
                      data-testid="switch-assign-images"
                    />
                    <Label htmlFor="assignImages" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <span>Automatically find cartoon images for words</span>
                      </div>
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="file-import">
                      Import from File (optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="file-import"
                        type="file"
                        accept=".txt,.csv,.pdf"
                        onChange={handleFileImport}
                        className="cursor-pointer"
                        data-testid="input-file-import"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => document.getElementById('file-import')?.click()}
                        data-testid="button-file-import"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Upload a .txt (one word per line), .csv (comma-separated), or .pdf file
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="words">
                      Words (one per line, min 5, max 500)
                    </Label>
                    <Textarea
                      id="words"
                      value={formData.words}
                      onChange={(e) => setFormData({ ...formData, words: e.target.value })}
                      placeholder="photosynthesis&#10;mitochondria&#10;chloroplast&#10;ecosystem&#10;biodiversity"
                      className="min-h-[200px] font-mono"
                      required
                      data-testid="textarea-words"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      {formData.words.split('\n').filter(w => w.trim()).length} words entered
                    </p>
                  </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setDialogOpen(false); setEditingList(null); resetForm(); }}
                      disabled={isDialogProcessing}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending || isDialogProcessing}
                      data-testid="button-save-list"
                    >
                      {isDialogProcessing ? "Assigning Images..." : (editingList ? "Update" : "Create") + " List"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {jobStatus && jobStatus.status !== 'completed' && (
          <Card className="mb-6 border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Camera className="w-5 h-5 text-purple-600" />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-purple-900">Searching for Cartoon Images</h3>
                  <p className="text-sm text-purple-700">
                    Finding kid-friendly illustrations for your words...
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-purple-800">
                  <span>Progress: {jobStatus.processedWords} / {jobStatus.totalWords} words</span>
                  <span>{jobStatus.successCount} found</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(jobStatus.processedWords / jobStatus.totalWords) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === "teacher" ? (
          <div className="space-y-4">
            {loadingUserLists ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading your word lists...</div>
              </div>
            ) : userLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 mb-4">
                    You haven't created any word lists yet
                  </p>
                  <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First List
                  </Button>
                </CardContent>
              </Card>
            ) : filteredUserLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No word lists found for the selected grade level</p>
                </CardContent>
              </Card>
            ) : (
              filteredUserLists.map((list) => renderWordList(list, true))
            )}
          </div>
        ) : isFreeAccount ? (
          /* Free accounts only see their own private lists - no tabs needed */
          <div className="space-y-4">
            {loadingUserLists ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading your word lists...</div>
              </div>
            ) : userLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 mb-4">
                    You haven't created any word lists yet
                  </p>
                  <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First List
                  </Button>
                </CardContent>
              </Card>
            ) : filteredUserLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No word lists found for the selected grade level</p>
                </CardContent>
              </Card>
            ) : (
              filteredUserLists.map((list) => renderWordList(list, true))
            )}
          </div>
        ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="my-lists" data-testid="tab-my-lists">My Lists</TabsTrigger>
            <TabsTrigger value="shared" data-testid="tab-shared">Shared With Me</TabsTrigger>
            <TabsTrigger value="public" data-testid="tab-public">Public Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loadingUserLists || loadingSharedLists || loadingPublicLists ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading word lists...</div>
              </div>
            ) : filteredAllLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 mb-4">
                    {userLists.length === 0 && sharedLists.length === 0 && publicLists.length === 0
                      ? "No word lists available yet. Create your first list to get started!"
                      : "No word lists found for the selected filters"}
                  </p>
                  {userLists.length === 0 && (
                    <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-all">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First List
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredAllLists.map((list) => renderWordList(list, user?.id === list.userId))
            )}
          </TabsContent>

          <TabsContent value="my-lists" className="space-y-4">
            {loadingUserLists ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading your word lists...</div>
              </div>
            ) : userLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 mb-4">
                    You haven't created any word lists yet
                  </p>
                  <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First List
                  </Button>
                </CardContent>
              </Card>
            ) : filteredUserLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No word lists found for the selected grade level</p>
                </CardContent>
              </Card>
            ) : (
              filteredUserLists.map((list) => renderWordList(list, true))
            )}
          </TabsContent>

          <TabsContent value="shared" className="space-y-4">
            {loadingSharedLists ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading shared word lists...</div>
              </div>
            ) : sharedLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No word lists have been shared with you yet</p>
                </CardContent>
              </Card>
            ) : filteredSharedLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No word lists found for the selected grade level</p>
                </CardContent>
              </Card>
            ) : (
              filteredSharedLists.map((list) => renderWordList(list, false))
            )}
          </TabsContent>

          <TabsContent value="public" className="space-y-4">
            {loadingPublicLists ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading public word lists...</div>
              </div>
            ) : publicLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No public word lists available yet</p>
                </CardContent>
              </Card>
            ) : filteredPublicLists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No word lists found for the selected grade level</p>
                </CardContent>
              </Card>
            ) : (
              filteredPublicLists.map((list) => renderWordList(list, user?.id === list.userId))
            )}
          </TabsContent>
        </Tabs>
        )}

        {/* Edit Images Dialog */}
        {editingImagesList && (
          <EditImagesDialog
            list={editingImagesList}
            open={editImagesDialogOpen}
            onOpenChange={setEditImagesDialogOpen}
          />
        )}

        {/* Validation Feedback Dialog */}
        <Dialog open={validationFeedbackOpen} onOpenChange={setValidationFeedbackOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Word Validation Results</DialogTitle>
              <DialogDescription>
                Some words could not be added to your list
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {validationFeedback.removedWords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive"></div>
                    <h3 className="font-semibold text-destructive">Invalid Words Removed</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The following words were not found in the dictionary and have been removed:
                  </p>
                  <div className="flex flex-wrap gap-2 p-3 bg-destructive/10 rounded-md">
                    {validationFeedback.removedWords.map((word, index) => (
                      <Badge key={index} variant="destructive" data-testid={`removed-word-${index}`}>
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {validationFeedback.skippedWords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <h3 className="font-semibold text-yellow-700">Validation Incomplete</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Could not validate {validationFeedback.skippedWords.length} word(s) due to dictionary service issues. These words were kept in the list:
                  </p>
                  <div className="flex flex-wrap gap-2 p-3 bg-yellow-50 rounded-md">
                    {validationFeedback.skippedWords.map((word, index) => (
                      <Badge key={index} className="bg-yellow-200 text-yellow-900 hover:bg-yellow-300" data-testid={`skipped-word-${index}`}>
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setValidationFeedbackOpen(false)} data-testid="button-close-validation">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Game Mode Selection Dialog */}
        <Dialog open={gameModeDialogOpen} onOpenChange={setGameModeDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose a Game Mode</DialogTitle>
              <DialogDescription>
                Select how you want to practice with "{selectedListForPlay?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card
                className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => startGameWithMode("practice")}
                data-testid="gamemode-practice"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Target className="w-8 h-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">Practice</CardTitle>
                      <CardDescription className="mt-1">
                        Classic spelling game with immediate feedback
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => startGameWithMode("timed")}
                data-testid="gamemode-timed"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-orange-600" />
                    <div>
                      <CardTitle className="text-lg">Timed Challenge</CardTitle>
                      <CardDescription className="mt-1">
                        Spell as many words correctly in 60 seconds as you can!
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => startGameWithMode("quiz")}
                data-testid="gamemode-quiz"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-purple-600" />
                    <div>
                      <CardTitle className="text-lg">Quiz Mode</CardTitle>
                      <CardDescription className="mt-1">
                        Spell all the words in a list, then see your results
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => startGameWithMode("scramble")}
                data-testid="gamemode-scramble"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shuffle className="w-8 h-8 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">Word Scramble</CardTitle>
                      <CardDescription className="mt-1">
                        Drag and drop letter tiles to unscramble the word
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => startGameWithMode("mistake")}
                data-testid="gamemode-mistake"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <CardTitle className="text-lg">Find the Mistake</CardTitle>
                      <CardDescription className="mt-1">
                        Identify the one misspelled word from four choices
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => startGameWithMode("crossword")}
                data-testid="gamemode-crossword"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Grid3x3 className="w-8 h-8 text-indigo-600" />
                    <div>
                      <CardTitle className="text-lg">Crossword Puzzle</CardTitle>
                      <CardDescription className="mt-1">
                        Solve a crossword using spelling words and their pronunciations
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Co-owners Management Dialog */}
        <Dialog open={coOwnersDialogOpen} onOpenChange={setCoOwnersDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Co-owners</DialogTitle>
              <DialogDescription>
                Add other teachers who can edit "{selectedListForCoOwners?.name}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Current Co-owners */}
              <div>
                <Label className="text-sm font-medium">Current Co-owners</Label>
                {coOwners.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No co-owners yet</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {coOwners.map((co: any) => (
                      <div key={co.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">
                          {co.firstName && co.lastName 
                            ? `${co.firstName} ${co.lastName}` 
                            : co.username}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCoOwnerMutation.mutate(co.coOwnerUserId)}
                          disabled={removeCoOwnerMutation.isPending}
                          data-testid={`button-remove-co-owner-${co.coOwnerUserId}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Co-owner */}
              <div>
                <Label className="text-sm font-medium">Add Co-owner</Label>
                <Input
                  className="mt-2"
                  placeholder="Search by name, email, or username..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  data-testid="input-search-teacher"
                />
                {teacherSearchQuery.length >= 2 && (
                  <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                    {isSearchingTeachers ? (
                      <p className="text-sm text-muted-foreground p-2">Searching...</p>
                    ) : teacherSearchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No teachers found</p>
                    ) : (
                      teacherSearchResults
                        .filter((t: any) => !coOwners.some((co: any) => co.coOwnerUserId === t.id))
                        .map((teacher: any) => (
                          <div
                            key={teacher.id}
                            className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                            onClick={() => addCoOwnerMutation.mutate(teacher.id)}
                            data-testid={`search-result-teacher-${teacher.id}`}
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {teacher.firstName && teacher.lastName 
                                  ? `${teacher.firstName} ${teacher.lastName}` 
                                  : teacher.username}
                              </p>
                              {teacher.email && (
                                <p className="text-xs text-muted-foreground">{teacher.email}</p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" disabled={addCoOwnerMutation.isPending}>
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                    )}
                  </div>
                )}
                {teacherSearchQuery.length > 0 && teacherSearchQuery.length < 2 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setCoOwnersDialogOpen(false)} data-testid="button-close-co-owners">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}

// Component to preview words with their images
function WordListPreview({ words, listId, guestImageAssignments, isGuestMode }: { 
  words: string[]; 
  listId: number;
  guestImageAssignments?: GuestImageAssignment[];
  isGuestMode?: boolean;
}) {
  // Query for word illustrations for this specific word list (authenticated users only)
  const { data: illustrations = [] } = useQuery<WordIllustration[]>({
    queryKey: ["/api/word-lists", listId, "illustrations"],
    queryFn: async () => {
      const response = await fetch(`/api/word-lists/${listId}/illustrations`);
      if (!response.ok) throw new Error("Failed to fetch word illustrations");
      return await response.json();
    },
    enabled: !isGuestMode && listId > 0,
  });

  // Get illustration for a word - check guest assignments first, then server data
  const getIllustration = (word: string) => {
    // For guest mode, check in-memory image assignments first
    if (isGuestMode && guestImageAssignments) {
      const assignment = guestImageAssignments.find(
        (a) => a.word.toLowerCase() === word.toLowerCase()
      );
      if (assignment) {
        return { word: assignment.word, imagePath: assignment.previewUrl || assignment.imageUrl };
      }
    }
    // Fall back to server illustrations for authenticated users
    return illustrations.find((ill) => ill.word.toLowerCase() === word.toLowerCase());
  };

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word, i) => {
        const illustration = getIllustration(word);
        return (
          <div
            key={i}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm"
            data-testid={`word-${listId}-${i}`}
          >
            {illustration && illustration.imagePath && (
              <img
                src={illustration.imagePath}
                alt={word}
                className="w-5 h-5 object-cover rounded"
              />
            )}
            <span>{word}</span>
          </div>
        );
      })}
    </div>
  );
}

// Component to edit images for a word list
function EditImagesDialog({ list, open, onOpenChange }: {
  list: CustomWordList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, isGuestMode } = useAuth();
  const { 
    guestAddWordImageAssignment, 
    guestRemoveWordImageAssignment, 
    guestGetWordList 
  } = useGuestSession();
  const { toast } = useToast();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [pixabayPreviews, setPixabayPreviews] = useState<any[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [customSearchTerm, setCustomSearchTerm] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // For guest mode, get images from guest session state
  const guestList = isGuestMode ? guestGetWordList(list.id) : null;
  const guestImageAssignments = guestList?.imageAssignments || [];

  // Query for word illustrations for this specific word list (authenticated users only)
  const { data: illustrations = [], refetch: refetchIllustrations } = useQuery<WordIllustration[]>({
    queryKey: ["/api/word-lists", list.id, "illustrations"],
    queryFn: async () => {
      const response = await fetch(`/api/word-lists/${list.id}/illustrations`);
      if (!response.ok) throw new Error("Failed to fetch word illustrations");
      return await response.json();
    },
    enabled: open && !isGuestMode,
  });

  // Mutation to select a new image
  const selectImageMutation = useMutation({
    mutationFn: async ({ word, imageUrl }: { word: string; imageUrl: string | null }) => {
      const response = await apiRequest("POST", "/api/word-illustrations/select", {
        word,
        imageUrl,
        wordListId: list.id,
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all word list queries (prefix match includes illustrations subqueries)
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-illustrations"] });
      setSelectedWord(null);
      setPixabayPreviews([]);
      toast({
        title: "Success!",
        description: "Image updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update image",
        variant: "destructive",
      });
    },
  });

  // Handle file selection and upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedWord) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, GIF, or WEBP image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max for server, 2MB for guests)
    const maxSize = isGuestMode ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: isGuestMode 
          ? "Please select an image smaller than 2MB" 
          : "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      if (isGuestMode) {
        // For guests, read file as data URL and store in memory
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl && selectedWord) {
            guestAddWordImageAssignment(list.id, {
              word: selectedWord,
              imageUrl: dataUrl,
              previewUrl: dataUrl,
            });
            setSelectedWord(null);
            setPixabayPreviews([]);
            toast({
              title: "Success!",
              description: "Custom image added successfully",
            });
          }
          setUploadingImage(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        };
        reader.onerror = () => {
          toast({
            title: "Error",
            description: "Failed to read image file",
            variant: "destructive",
          });
          setUploadingImage(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // For authenticated users, upload to server
      const formData = new FormData();
      formData.append('image', file);
      formData.append('word', selectedWord);
      formData.append('wordListId', list.id.toString());

      const response = await fetch('/api/word-illustrations/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      // Invalidate all word list queries (prefix match includes illustrations subqueries)
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-illustrations"] });
      
      // Refetch illustrations for this word list to show the new image
      await refetchIllustrations();
      
      setSelectedWord(null);
      setPixabayPreviews([]);
      
      toast({
        title: "Success!",
        description: "Custom image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fetch Pixabay previews for a word
  const fetchPixabayPreviews = async (word: string) => {
    setLoadingPreviews(true);
    try {
      // Use guest endpoint for guests, authenticated endpoint for logged-in users
      const endpoint = isGuestMode 
        ? `/api/guest/pixabay-search?word=${encodeURIComponent(word)}&limit=10`
        : `/api/pixabay/previews?word=${encodeURIComponent(word)}&limit=16`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch previews");
      const data = await response.json();
      setPixabayPreviews(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load image previews",
        variant: "destructive",
      });
    } finally {
      setLoadingPreviews(false);
    }
  };

  // Get illustration for a word (different sources for guest vs authenticated)
  const getIllustration = (word: string) => {
    if (isGuestMode) {
      // For guests, check in-memory image assignments
      const assignment = guestImageAssignments.find(
        (a) => a.word.toLowerCase() === word.toLowerCase()
      );
      if (assignment) {
        return { word: assignment.word, imagePath: assignment.imageUrl };
      }
      return null;
    }
    return illustrations.find((ill) => ill.word.toLowerCase() === word.toLowerCase());
  };

  // Handle selecting a word to change its image
  const handleSelectWord = (word: string) => {
    setSelectedWord(word);
    fetchPixabayPreviews(word);
  };

  // Handle selecting a new image (or removing it with null)
  const handleSelectImage = (imageUrl: string | null) => {
    if (!selectedWord) return;
    
    if (isGuestMode) {
      // For guests, store image in memory
      if (imageUrl) {
        // Find the preview to get both URLs
        const preview = pixabayPreviews.find(p => 
          (p.largeImageURL === imageUrl || p.webformatURL === imageUrl)
        );
        guestAddWordImageAssignment(list.id, {
          word: selectedWord,
          imageUrl: imageUrl,
          previewUrl: preview?.previewURL || imageUrl,
        });
      } else {
        // Remove image
        guestRemoveWordImageAssignment(list.id, selectedWord);
      }
      setSelectedWord(null);
      setPixabayPreviews([]);
      toast({
        title: "Success!",
        description: "Image updated successfully",
      });
    } else {
      // For authenticated users, use the server mutation
      selectImageMutation.mutate({ word: selectedWord, imageUrl });
    }
  };

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedWord(null);
      setPixabayPreviews([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Images for "{list.name}"</DialogTitle>
          <DialogDescription>
            Click on any word to change its cartoon image
          </DialogDescription>
        </DialogHeader>

        {!selectedWord ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {list.words.map((word, index) => {
              const illustration = getIllustration(word);
              return (
                <Card
                  key={index}
                  className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                  onClick={() => handleSelectWord(word)}
                  data-testid={`word-image-card-${index}`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                      {illustration && illustration.imagePath ? (
                        <img
                          src={illustration.imagePath}
                          alt={word}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{word}</p>
                      <p className="text-sm text-gray-600">
                        {illustration ? "Click to change" : "Click to add image"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedWord(null);
                  setPixabayPreviews([]);
                  setCustomSearchTerm("");
                }}
                data-testid="button-back"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to List
              </Button>
              <p className="text-lg font-semibold">Selecting image for: {selectedWord}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Custom search (e.g., 'cartoon dog')"
                  value={customSearchTerm}
                  onChange={(e) => setCustomSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customSearchTerm.trim()) {
                        fetchPixabayPreviews(customSearchTerm);
                      } else if (selectedWord) {
                        fetchPixabayPreviews(selectedWord);
                      }
                    }
                  }}
                  className="flex-1 text-sm h-9"
                  data-testid="input-custom-search"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (customSearchTerm.trim()) {
                      fetchPixabayPreviews(customSearchTerm);
                    } else if (selectedWord) {
                      fetchPixabayPreviews(selectedWord);
                    }
                  }}
                  disabled={loadingPreviews}
                  data-testid="button-custom-search"
                >
                  Search
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm text-gray-600">
                  Or upload your own custom image
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  data-testid="button-upload-image"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
            </div>

            {loadingPreviews ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading image options...</p>
              </div>
            ) : pixabayPreviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No images found for this word</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* "No Image" option */}
                <Card
                  className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                  onClick={() => handleSelectImage(null)}
                  data-testid="preview-image-no-image"
                >
                  <CardContent className="p-2">
                    <div className="w-full h-32 bg-gray-100 rounded flex flex-col items-center justify-center gap-2">
                      <X className="w-12 h-12 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-600">No Image</p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Pixabay preview images */}
                {pixabayPreviews.map((preview, index) => (
                  <Card
                    key={preview.id}
                    className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                    onClick={() => handleSelectImage(preview.largeImageURL || preview.webformatURL)}
                    data-testid={`preview-image-${index}`}
                  >
                    <CardContent className="p-2">
                      <img
                        src={preview.previewURL}
                        alt={preview.tags}
                        className="w-full h-32 object-cover rounded"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}