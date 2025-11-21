import { useState, useMemo, useEffect } from "react";
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
import { Plus, Trash2, Edit, Globe, Lock, Play, Home, Upload, Filter, Camera, X, Users, Target, Clock, Trophy, Shuffle, AlertCircle, Grid3x3 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { CustomWordList, WordIllustration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { UserHeader } from "@/components/user-header";
import rainbowBackgroundLandscape from "@assets/Colorful_background_landscape_1763563266457.png";
import rainbowBackgroundPortrait from "@assets/Colorful_background_portrait_1763563266458.png";
import * as pdfjsLib from "pdfjs-dist";

const GRADE_LEVELS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9-12"];

function getVisibility(list: any): "public" | "private" | "groups" {
  if (list.visibility) return list.visibility;
  return list.isPublic ? "public" : "private";
}

export default function WordListsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomWordList | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
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
  const [formData, setFormData] = useState({
    name: "",
    words: "",
    visibility: "private" as "public" | "private" | "groups",
    assignImages: true,
    gradeLevel: "",
    selectedGroupIds: [] as number[],
  });

  const { data: userLists = [], isLoading: loadingUserLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/word-lists", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch word lists");
      return await response.json();
    },
    enabled: !!user,
  });

  const { data: publicLists = [], isLoading: loadingPublicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  const { data: sharedLists = [], isLoading: loadingSharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/word-lists/shared-with-me", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch shared word lists");
      return await response.json();
    },
    enabled: !!user,
  });

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
    setFormData({
      name: "",
      words: "",
      visibility: "private",
      assignImages: true,
      gradeLevel: "",
      selectedGroupIds: [],
    });
  };

  const handleEdit = (list: CustomWordList) => {
    setEditingList(list);
    const visibility = getVisibility(list);
    const sharedGroups = (list as any).sharedGroups || [];
    setFormData({
      name: list.name,
      words: list.words.join('\n'),
      visibility,
      assignImages: (list as any).assignImages !== false,
      gradeLevel: list.gradeLevel || "",
      selectedGroupIds: sharedGroups.map((g: any) => g.id),
    });
    setDialogOpen(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingList) {
      updateMutation.mutate({ id: editingList.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const playWithList = (list: CustomWordList) => {
    setSelectedListForPlay(list);
    setGameModeDialogOpen(true);
  };

  const startGameWithMode = (mode: string) => {
    if (!selectedListForPlay) return;
    
    // For quiz mode, default to "all" words
    if (mode === "quiz") {
      setLocation(`/game?listId=${selectedListForPlay.id}&mode=${mode}&quizCount=all`);
    } else {
      setLocation(`/game?listId=${selectedListForPlay.id}&mode=${mode}`);
    }
    setGameModeDialogOpen(false);
  };

  const filteredUserLists = useMemo(() => {
    if (gradeFilter === "all") return userLists;
    if (gradeFilter === "none") return userLists.filter(list => !list.gradeLevel);
    return userLists.filter(list => list.gradeLevel === gradeFilter);
  }, [userLists, gradeFilter]);

  const filteredSharedLists = useMemo(() => {
    if (gradeFilter === "all") return sharedLists;
    if (gradeFilter === "none") return sharedLists.filter(list => !list.gradeLevel);
    return sharedLists.filter(list => list.gradeLevel === gradeFilter);
  }, [sharedLists, gradeFilter]);

  const filteredPublicLists = useMemo(() => {
    if (gradeFilter === "all") return publicLists;
    if (gradeFilter === "none") return publicLists.filter(list => !list.gradeLevel);
    return publicLists.filter(list => list.gradeLevel === gradeFilter);
  }, [publicLists, gradeFilter]);

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
  }, [userLists, publicLists]);

  const renderWordList = (list: any, canEdit: boolean) => (
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
                <span data-testid={`author-${list.id}`}>
                  by <span className="font-semibold">{list.authorUsername || 'Unknown'}</span>
                </span>
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
                      onClick={() => deleteMutation.mutate(list.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${list.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete List</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <WordListPreview words={list.words.slice(0, 10)} listId={list.id} />
        {list.words.length > 10 && (
          <span className="px-2 py-1 text-gray-600 text-sm block mt-2">
            +{list.words.length - 10} more words
          </span>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Portrait background */}
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${rainbowBackgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      {/* Landscape background */}
      <div 
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${rainbowBackgroundLandscape})`,
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
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 font-crayon">
              Custom Word Lists
            </h1>
            <p className="text-muted-foreground mt-2">
              Create your own spelling word lists and share them with others
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
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
                  </div>
                  {formData.visibility === "groups" && (
                    <div>
                      <Label>Share with Groups</Label>
                      <div className="border rounded-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
                        {userGroups.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No groups available. Create a group first!
                          </p>
                        ) : (
                          userGroups.map((group: any) => {
                            const isOwned = group.ownerId === user?.id;
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
                          })
                        )}
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
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setDialogOpen(false); setEditingList(null); resetForm(); }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-list"
                    >
                      {editingList ? "Update" : "Create"} List
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

        <Tabs defaultValue="my-lists" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="my-lists" data-testid="tab-my-lists">My Lists</TabsTrigger>
            <TabsTrigger value="shared" data-testid="tab-shared">Shared With Me</TabsTrigger>
            <TabsTrigger value="public" data-testid="tab-public">Public Lists</TabsTrigger>
          </TabsList>

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
                onClick={() => startGameWithMode("standard")}
                data-testid="gamemode-standard"
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
      </motion.div>
    </div>
  );
}

// Component to preview words with their images
function WordListPreview({ words, listId }: { words: string[]; listId: number }) {
  // Query for word illustrations for this specific word list
  const { data: illustrations = [] } = useQuery<WordIllustration[]>({
    queryKey: ["/api/word-lists", listId, "illustrations"],
    queryFn: async () => {
      const response = await fetch(`/api/word-lists/${listId}/illustrations`);
      if (!response.ok) throw new Error("Failed to fetch word illustrations");
      return await response.json();
    },
  });

  // Get illustration for a word
  const getIllustration = (word: string) => {
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [pixabayPreviews, setPixabayPreviews] = useState<any[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [customSearchTerm, setCustomSearchTerm] = useState("");

  // Query for word illustrations for this specific word list
  const { data: illustrations = [], refetch: refetchIllustrations } = useQuery<WordIllustration[]>({
    queryKey: ["/api/word-lists", list.id, "illustrations"],
    queryFn: async () => {
      const response = await fetch(`/api/word-lists/${list.id}/illustrations`);
      if (!response.ok) throw new Error("Failed to fetch word illustrations");
      return await response.json();
    },
    enabled: open,
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

  // Fetch Pixabay previews for a word
  const fetchPixabayPreviews = async (word: string) => {
    setLoadingPreviews(true);
    try {
      const response = await fetch(`/api/pixabay/previews?word=${encodeURIComponent(word)}&limit=16`);
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

  // Get illustration for a word
  const getIllustration = (word: string) => {
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
    selectImageMutation.mutate({ word: selectedWord, imageUrl });
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