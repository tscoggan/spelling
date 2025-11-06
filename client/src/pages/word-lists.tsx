import { useState, useMemo } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Edit, Globe, Lock, Play, Home, Upload, Filter } from "lucide-react";
import { motion } from "framer-motion";
import type { CustomWordList } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const GRADE_LEVELS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9-12"];

export default function WordListsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomWordList | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    words: "",
    isPublic: false,
    gradeLevel: "",
  });

  const { data: userLists = [], isLoading: loadingUserLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
    enabled: !!user,
  });

  const { data: publicLists = [], isLoading: loadingPublicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const words = data.words.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      const response = await apiRequest("POST", "/api/word-lists", {
        name: data.name,
        difficulty: data.difficulty,
        words,
        isPublic: data.isPublic,
        gradeLevel: data.gradeLevel || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Success!",
        description: "Word list created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create word list",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const updates: any = {
        name: data.name,
        difficulty: data.difficulty,
        isPublic: data.isPublic,
        gradeLevel: data.gradeLevel || undefined,
      };
      if (data.words) {
        updates.words = data.words.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      }
      const response = await apiRequest("PUT", `/api/word-lists/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
      setDialogOpen(false);
      setEditingList(null);
      resetForm();
      toast({
        title: "Success!",
        description: "Word list updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update word list",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/word-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/public"] });
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

  const resetForm = () => {
    setFormData({
      name: "",
      difficulty: "medium",
      words: "",
      isPublic: false,
      gradeLevel: "",
    });
  };

  const handleEdit = (list: CustomWordList) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      difficulty: list.difficulty as "easy" | "medium" | "hard",
      words: list.words.join('\n'),
      isPublic: list.isPublic,
      gradeLevel: list.gradeLevel || "",
    });
    setDialogOpen(true);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.txt', '.csv'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a .txt or .csv file",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      let words: string[];

      if (fileExtension === '.csv') {
        words = text.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0);
      } else {
        words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
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
      toast({
        title: "Error",
        description: "Failed to read file",
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
    setLocation(`/game?listId=${list.id}&difficulty=custom&mode=standard`);
  };

  const filteredUserLists = useMemo(() => {
    if (gradeFilter === "all") return userLists;
    if (gradeFilter === "none") return userLists.filter(list => !list.gradeLevel);
    return userLists.filter(list => list.gradeLevel === gradeFilter);
  }, [userLists, gradeFilter]);

  const filteredPublicLists = useMemo(() => {
    if (gradeFilter === "all") return publicLists;
    if (gradeFilter === "none") return publicLists.filter(list => !list.gradeLevel);
    return publicLists.filter(list => list.gradeLevel === gradeFilter);
  }, [publicLists, gradeFilter]);

  const availableGradeLevels = useMemo(() => {
    const grades = new Set<string>();
    [...userLists, ...publicLists].forEach(list => {
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

  const renderWordList = (list: CustomWordList, canEdit: boolean) => (
    <Card key={list.id} className="hover-elevate" data-testid={`card-word-list-${list.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {list.name}
              {list.isPublic ? (
                <Globe className="w-4 h-4 text-green-600" data-testid="icon-public" />
              ) : (
                <Lock className="w-4 h-4 text-gray-600" data-testid="icon-private" />
              )}
            </CardTitle>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>{list.words.length} words</span>
              <span 
                className={`px-2 py-0.5 rounded-md font-medium ${
                  list.difficulty === "easy" ? "bg-green-100 text-green-800" :
                  list.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}
                data-testid={`difficulty-${list.id}`}
              >
                {list.difficulty.charAt(0).toUpperCase() + list.difficulty.slice(1)}
              </span>
              {list.gradeLevel && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-medium" data-testid={`grade-${list.id}`}>
                  Grade {list.gradeLevel}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(list)}
                  data-testid={`button-edit-${list.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(list.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${list.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {list.words.slice(0, 10).map((word, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm"
              data-testid={`word-${list.id}-${i}`}
            >
              {word}
            </span>
          ))}
          {list.words.length > 10 && (
            <span className="px-2 py-1 text-gray-600 text-sm">
              +{list.words.length - 10} more
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Custom Word Lists
            </h1>
            <p className="text-gray-600 mt-2">
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
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: "easy" | "medium" | "hard") => setFormData({ ...formData, difficulty: value })}
                    >
                      <SelectTrigger id="difficulty" data-testid="select-difficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy" data-testid="difficulty-easy">Easy</SelectItem>
                        <SelectItem value="medium" data-testid="difficulty-medium">Medium</SelectItem>
                        <SelectItem value="hard" data-testid="difficulty-hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
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
                        accept=".txt,.csv"
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
                      Upload a .txt (one word per line) or .csv (comma-separated) file
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
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isPublic"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                      data-testid="switch-public"
                    />
                    <Label htmlFor="isPublic" className="cursor-pointer">
                      Make this list public (others can use it)
                    </Label>
                  </div>
                  <div className="flex gap-2 justify-end">
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
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-home">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>

        <Tabs defaultValue="my-lists" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-lists" data-testid="tab-my-lists">My Lists</TabsTrigger>
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
      </motion.div>
    </div>
  );
}
