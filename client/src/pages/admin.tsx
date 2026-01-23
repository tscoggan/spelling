import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { Upload, Search, Users, FileText, ArrowUpDown, Loader2, Check, X, AlertCircle, Ban, Copy, BookX, Home, UserX, Trash2, Shield, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { UserHeader } from "@/components/user-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Word } from "@shared/schema";

type DateRange = 'today' | 'week' | 'month' | 'all';
type SortField = 'username' | 'gamesPlayed';
type SortDirection = 'asc' | 'desc';

interface UsageMetric {
  userId: number | null;
  username: string;
  gamesPlayed: number;
}

interface BulkUploadResult {
  totalProcessed: number;
  newWordsAdded: number;
  overwritten: number;
  duplicates: number;
  invalidWords: number;
  inappropriateWords: number;
  skippedWords: number;
  details?: {
    valid: string[];
    duplicates: string[];
    inappropriate: string[];
    invalid: string[];
    skipped: string[];
    overwritten: string[];
  };
}

interface AdminUser {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  accountType: string;
  stars: number;
  createdAt: string;
  gamesPlayed: number;
  lastActive: string | null;
  familyId: number | null;
  familyRole: string | null;
}

interface UserGroup {
  type: 'family' | 'school' | 'individual';
  id: number | null;
  parentUser: AdminUser | null;
  members: AdminUser[];
}

export default function AdminPage() {
  const { toast } = useToast();
  
  const [uploadedWords, setUploadedWords] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortField, setSortField] = useState<SortField>('gamesPlayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [editForm, setEditForm] = useState({
    definition: "",
    sentenceExample: "",
    wordOrigin: "",
    partOfSpeech: "",
  });
  
  const [expandedFamilies, setExpandedFamilies] = useState<Set<number>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
  });

  const { data: usageMetrics = [], isLoading: isLoadingMetrics } = useQuery<UsageMetric[]>({
    queryKey: ['/api/admin/usage', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/usage?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch usage metrics');
      return response.json();
    },
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery<Word[]>({
    queryKey: ['/api/admin/words/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const response = await fetch(`/api/admin/words/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!response.ok) throw new Error('Failed to search words');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const updateWordMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Word> }) => {
      const response = await apiRequest('PATCH', `/api/admin/words/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Word updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/words/search'] });
      setSelectedWord(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update word", description: error.message, variant: "destructive" });
    },
  });

  const { data: adminUsers = [], isLoading: isLoadingUsers } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, deleteFamily }: { userId: number; deleteFamily?: boolean }) => {
      const url = deleteFamily 
        ? `/api/admin/users/${userId}?deleteFamily=true` 
        : `/api/admin/users/${userId}`;
      const response = await apiRequest('DELETE', url);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Deleted", description: data.message || "User and all associated data have been removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; firstName?: string; lastName?: string; email?: string }) => {
      const response = await apiRequest('POST', '/api/admin/create-admin', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admin');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Admin Created", description: `Admin account "${data.user.username}" created successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setCreateAdminOpen(false);
      setNewAdminForm({ username: "", password: "", firstName: "", lastName: "", email: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create admin", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateAdmin = () => {
    if (!newAdminForm.username || !newAdminForm.password) {
      toast({ title: "Required fields", description: "Username and password are required", variant: "destructive" });
      return;
    }
    if (newAdminForm.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    createAdminMutation.mutate({
      username: newAdminForm.username,
      password: newAdminForm.password,
      firstName: newAdminForm.firstName || undefined,
      lastName: newAdminForm.lastName || undefined,
      email: newAdminForm.email || undefined,
    });
  };

  const toggleFamilyExpansion = useCallback((familyId: number) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(familyId)) {
        next.delete(familyId);
      } else {
        next.add(familyId);
      }
      return next;
    });
  }, []);

  const groupedUsers = useMemo(() => {
    const groups: UserGroup[] = [];
    const familyGroups = new Map<number, { parent: AdminUser | null; children: AdminUser[] }>();
    const individualUsers: AdminUser[] = [];

    for (const user of adminUsers) {
      if (user.familyId !== null) {
        if (!familyGroups.has(user.familyId)) {
          familyGroups.set(user.familyId, { parent: null, children: [] });
        }
        const group = familyGroups.get(user.familyId)!;
        if (user.familyRole === 'parent') {
          group.parent = user;
        } else {
          group.children.push(user);
        }
      } else if (user.accountType === 'school') {
        groups.push({
          type: 'school',
          id: user.id,
          parentUser: user,
          members: [],
        });
      } else {
        individualUsers.push(user);
      }
    }

    Array.from(familyGroups.entries()).forEach(([familyId, familyData]) => {
      groups.push({
        type: 'family',
        id: familyId,
        parentUser: familyData.parent,
        members: familyData.children,
      });
    });

    for (const user of individualUsers) {
      groups.push({
        type: 'individual',
        id: null,
        parentUser: user,
        members: [],
      });
    }

    groups.sort((a, b) => {
      const aUser = a.parentUser;
      const bUser = b.parentUser;
      if (!aUser && !bUser) return 0;
      if (!aUser) return 1;
      if (!bUser) return -1;
      return new Date(bUser.createdAt).getTime() - new Date(aUser.createdAt).getTime();
    });

    return groups;
  }, [adminUsers]);

  const filteredGroupedUsers = useMemo(() => {
    if (!userSearchQuery.trim()) {
      return groupedUsers;
    }

    const query = userSearchQuery.toLowerCase().trim();
    const userMatchesQuery = (user: AdminUser): boolean => {
      const idMatch = user.id.toString() === query;
      const usernameMatch = user.username.toLowerCase().includes(query);
      const firstNameMatch = user.firstName?.toLowerCase().includes(query) || false;
      const lastNameMatch = user.lastName?.toLowerCase().includes(query) || false;
      const fullNameMatch = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(query);
      return idMatch || usernameMatch || firstNameMatch || lastNameMatch || fullNameMatch;
    };

    return groupedUsers.filter((group) => {
      if (group.parentUser && userMatchesQuery(group.parentUser)) {
        return true;
      }
      if (group.members.some(member => userMatchesQuery(member))) {
        return true;
      }
      return false;
    });
  }, [groupedUsers, userSearchQuery]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.csv')) {
      toast({ title: "Invalid file type", description: "Please upload a .txt or .csv file", variant: "destructive" });
      return;
    }

    try {
      const text = await file.text();
      let words: string[];

      if (fileName.endsWith('.csv')) {
        words = text.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0);
      } else {
        words = text.split(/[\s,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
      }

      if (words.length > 2000) {
        toast({ 
          title: "Too many words", 
          description: `File contains ${words.length} words. Maximum is 2000.`,
          variant: "destructive" 
        });
        return;
      }

      setUploadedWords(words);
      setUploadResult(null);
      toast({ title: "File loaded", description: `${words.length} words ready to upload` });
    } catch {
      toast({ title: "Failed to read file", variant: "destructive" });
    }

    event.target.value = '';
  }, [toast]);

  const handleBulkUpload = async () => {
    if (uploadedWords.length === 0) return;

    setIsUploading(true);
    try {
      const response = await apiRequest('POST', '/api/admin/words/bulk', { 
        words: uploadedWords,
        overwrite: overwriteExisting 
      });
      const result = await response.json();
      setUploadResult(result);
      const overwriteText = result.overwritten > 0 ? `, ${result.overwritten} overwritten` : '';
      toast({ 
        title: "Upload complete", 
        description: `Added ${result.newWordsAdded} new words${overwriteText}` 
      });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const sortedMetrics = [...usageMetrics].sort((a, b) => {
    const aVal = sortField === 'username' ? a.username.toLowerCase() : a.gamesPlayed;
    const bVal = sortField === 'username' ? b.username.toLowerCase() : b.gamesPlayed;
    
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  const handleSelectWord = (word: Word) => {
    setSelectedWord(word);
    setEditForm({
      definition: word.definition || "",
      sentenceExample: word.sentenceExample || "",
      wordOrigin: word.wordOrigin || "",
      partOfSpeech: word.partOfSpeech || "",
    });
  };

  const handleUpdateWord = () => {
    if (!selectedWord) return;
    updateWordMutation.mutate({
      id: selectedWord.id,
      updates: {
        definition: editForm.definition || null,
        sentenceExample: editForm.sentenceExample || null,
        wordOrigin: editForm.wordOrigin || null,
        partOfSpeech: editForm.partOfSpeech || null,
      },
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalIgnored = uploadResult 
    ? uploadResult.duplicates + uploadResult.invalidWords + uploadResult.inappropriateWords + uploadResult.skippedWords
    : 0;

  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
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

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <UserHeader />
        <header className="flex items-center justify-start mb-4">
          <Button
            variant="default"
            onClick={() => setLocation("/")}
            className="bg-white/90 dark:bg-black/70 text-foreground hover:bg-white dark:hover:bg-black/80 shadow-lg"
            data-testid="button-home"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </header>

        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-admin-title">Admin Dashboard</h1>
          <p className={`mt-2 ${textClasses.subtitle}`}>Manage words, view usage metrics, and edit content</p>
        </div>

        <Tabs defaultValue="word-loader" className="w-full">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-admin">
            <TabsTrigger value="word-loader" data-testid="tab-word-loader">
              <Upload className="w-4 h-4 mr-2" />
              Word Loader
            </TabsTrigger>
            <TabsTrigger value="usage-metrics" data-testid="tab-usage-metrics">
              <Users className="w-4 h-4 mr-2" />
              Usage Metrics
            </TabsTrigger>
            <TabsTrigger value="word-editor" data-testid="tab-word-editor">
              <FileText className="w-4 h-4 mr-2" />
              Word Editor
            </TabsTrigger>
            <TabsTrigger value="user-management" data-testid="tab-user-management">
              <Shield className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="word-loader">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Word Loader</CardTitle>
                <CardDescription>
                  Upload a TXT or CSV file with up to 2000 words. Words will be validated via Merriam-Webster dictionaries and added to the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="word-file" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate">
                      <Upload className="w-4 h-4" />
                      Choose File
                    </div>
                  </Label>
                  <Input
                    id="word-file"
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-word-file"
                  />
                  {uploadedWords.length > 0 && (
                    <Badge variant="secondary" data-testid="badge-word-count">
                      {uploadedWords.length} words loaded
                    </Badge>
                  )}
                </div>

                {uploadedWords.length > 0 && (
                  <div className="space-y-4">
                    <div className="max-h-32 overflow-y-auto p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Preview: {uploadedWords.slice(0, 50).join(", ")}
                        {uploadedWords.length > 50 && ` ... and ${uploadedWords.length - 50} more`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="overwrite-existing"
                        checked={overwriteExisting}
                        onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                        data-testid="checkbox-overwrite-existing"
                      />
                      <Label htmlFor="overwrite-existing" className="text-sm cursor-pointer">
                        Overwrite existing words (re-fetch definitions for duplicates)
                      </Label>
                    </div>
                    
                    <Button 
                      onClick={handleBulkUpload} 
                      disabled={isUploading}
                      data-testid="button-upload-words"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload to Database
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {uploadResult && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Upload Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-100 dark:bg-green-900 rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="font-medium text-green-700 dark:text-green-300">Loaded</span>
                          </div>
                          <p className="text-3xl font-bold text-green-700 dark:text-green-300">{uploadResult.newWordsAdded}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {uploadResult.overwritten > 0 
                              ? `${uploadResult.overwritten} overwritten, ${uploadResult.newWordsAdded - uploadResult.overwritten} new`
                              : 'new words added'}
                          </p>
                        </div>
                        <div className="p-4 bg-muted rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">Ignored</span>
                          </div>
                          <p className="text-3xl font-bold">{totalIgnored}</p>
                          <p className="text-sm text-muted-foreground">words not added</p>
                        </div>
                      </div>

                      {totalIgnored > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                          <h4 className="font-medium text-sm text-muted-foreground">Ignored Breakdown:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                              <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{uploadResult.duplicates}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Duplicates</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950 rounded-md">
                              <BookX className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              <div>
                                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{uploadResult.invalidWords}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">Not Valid</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-md">
                              <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <div>
                                <p className="text-lg font-bold text-red-700 dark:text-red-300">{uploadResult.inappropriateWords}</p>
                                <p className="text-xs text-red-600 dark:text-red-400">Inappropriate</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded-md">
                              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              <div>
                                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{uploadResult.skippedWords}</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">API Errors</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {uploadResult.details && (
                        <div className="space-y-2 pt-4 border-t">
                          {uploadResult.details.valid && uploadResult.details.valid.length > 0 && (
                            <details className="text-sm" open>
                              <summary className="cursor-pointer text-green-600 dark:text-green-400 hover:underline font-medium">
                                View {uploadResult.details.valid.length} added word(s)
                              </summary>
                              <p className="mt-1 p-2 bg-green-50 dark:bg-green-950 rounded text-green-700 dark:text-green-300">
                                {uploadResult.details.valid.join(", ")}
                              </p>
                            </details>
                          )}
                          {uploadResult.details.duplicates.length > 0 && (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                                View {uploadResult.details.duplicates.length} duplicate(s)
                              </summary>
                              <p className="mt-1 p-2 bg-blue-50 dark:bg-blue-950 rounded text-blue-700 dark:text-blue-300">
                                {uploadResult.details.duplicates.join(", ")}
                              </p>
                            </details>
                          )}
                          {uploadResult.details.invalid.length > 0 && (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-orange-600 dark:text-orange-400 hover:underline">
                                View {uploadResult.details.invalid.length} invalid word(s)
                              </summary>
                              <p className="mt-1 p-2 bg-orange-50 dark:bg-orange-950 rounded text-orange-700 dark:text-orange-300">
                                {uploadResult.details.invalid.join(", ")}
                              </p>
                            </details>
                          )}
                          {uploadResult.details.inappropriate.length > 0 && (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-red-600 dark:text-red-400 hover:underline">
                                View {uploadResult.details.inappropriate.length} inappropriate word(s)
                              </summary>
                              <p className="mt-1 p-2 bg-red-50 dark:bg-red-950 rounded text-red-700 dark:text-red-300">
                                {uploadResult.details.inappropriate.join(", ")}
                              </p>
                            </details>
                          )}
                          {uploadResult.details.skipped.length > 0 && (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-yellow-600 dark:text-yellow-400 hover:underline">
                                View {uploadResult.details.skipped.length} skipped word(s)
                              </summary>
                              <p className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-yellow-700 dark:text-yellow-300">
                                {uploadResult.details.skipped.join(", ")}
                              </p>
                            </details>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage-metrics">
            <Card>
              <CardHeader>
                <CardTitle>App Usage Metrics</CardTitle>
                <CardDescription>
                  View games played by user within a date range
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Date Range:</Label>
                  <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                    <SelectTrigger className="w-40" data-testid="select-date-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="month">Past Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoadingMetrics ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : usageMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No usage data found for this date range</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => toggleSort('username')}
                        >
                          <div className="flex items-center gap-2">
                            Username
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted text-right"
                          onClick={() => toggleSort('gamesPlayed')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Games Played
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMetrics.map((metric, index) => (
                        <TableRow key={metric.userId ?? `guest-${index}`} data-testid={`row-user-${index}`}>
                          <TableCell>
                            {metric.userId === null ? (
                              <Badge variant="outline">guest</Badge>
                            ) : (
                              metric.username
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{metric.gamesPlayed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="word-editor">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Words</CardTitle>
                  <CardDescription>
                    Find a word to edit its metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-word-search"
                    />
                  </div>

                  {isSearching && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="max-h-80 overflow-y-auto space-y-1">
                      {searchResults.map((word) => (
                        <div
                          key={word.id}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedWord?.id === word.id 
                              ? 'bg-primary/10 border border-primary' 
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                          onClick={() => handleSelectWord(word)}
                          data-testid={`word-result-${word.id}`}
                        >
                          <p className="font-medium">{word.word}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {word.definition || "No definition"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No words found matching "{searchQuery}"
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedWord ? `Edit: ${selectedWord.word}` : 'Edit Word'}
                  </CardTitle>
                  <CardDescription>
                    {selectedWord ? 'Modify the word metadata below' : 'Select a word to edit'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedWord ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="edit-definition">Definition</Label>
                        <Textarea
                          id="edit-definition"
                          value={editForm.definition}
                          onChange={(e) => setEditForm({ ...editForm, definition: e.target.value })}
                          rows={3}
                          data-testid="input-edit-definition"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-example">Example Sentence</Label>
                        <Textarea
                          id="edit-example"
                          value={editForm.sentenceExample}
                          onChange={(e) => setEditForm({ ...editForm, sentenceExample: e.target.value })}
                          rows={2}
                          data-testid="input-edit-example"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-origin">Word Origin</Label>
                        <Textarea
                          id="edit-origin"
                          value={editForm.wordOrigin}
                          onChange={(e) => setEditForm({ ...editForm, wordOrigin: e.target.value })}
                          rows={2}
                          data-testid="input-edit-origin"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-pos">Part of Speech</Label>
                        <Input
                          id="edit-pos"
                          value={editForm.partOfSpeech}
                          onChange={(e) => setEditForm({ ...editForm, partOfSpeech: e.target.value })}
                          data-testid="input-edit-pos"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={handleUpdateWord}
                          disabled={updateWordMutation.isPending}
                          data-testid="button-save-word"
                        >
                          {updateWordMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedWord(null)}
                          data-testid="button-cancel-edit"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a word from the search results to edit its metadata</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="user-management">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    User Management
                  </CardTitle>
                  <Button 
                    onClick={() => setCreateAdminOpen(true)}
                    data-testid="button-create-admin"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Admin
                  </Button>
                </div>
                <CardDescription>
                  View all registered users, their activity metrics, and manage accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : adminUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No registered users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or user ID..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="pl-9"
                          data-testid="input-user-search"
                        />
                      </div>
                      {userSearchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUserSearchQuery("")}
                          data-testid="button-clear-user-search"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {userSearchQuery && filteredGroupedUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No users found matching "{userSearchQuery}"</p>
                      </div>
                    ) : (
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Account Type</TableHead>
                          <TableHead className="text-right">Stars</TableHead>
                          <TableHead className="text-right">Games Played</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGroupedUsers.map((group) => {
                          const isExpanded = group.id !== null && expandedFamilies.has(group.id);
                          const hasMembers = group.members.length > 0;
                          const renderUserRow = (user: AdminUser, isChild = false) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`} className={isChild ? "bg-muted/30" : ""}>
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-1">
                                  {isChild && <span className="pl-4">↳</span>}
                                  {user.id}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>
                                {user.firstName || user.lastName 
                                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                  : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {user.email || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : user.role === 'teacher' ? 'secondary' : user.role === 'parent' ? 'default' : 'outline'}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {user.accountType.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{user.stars}</TableCell>
                              <TableCell className="text-right">{user.gamesPlayed}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs">
                                {user.lastActive 
                                  ? new Date(user.lastActive).toLocaleDateString()
                                  : <span className="text-muted-foreground">Never</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      disabled={user.role === 'admin'}
                                      data-testid={`button-delete-user-${user.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the user "{user.username}" and ALL associated data including:
                                        <ul className="list-disc ml-6 mt-2 space-y-1">
                                          <li>Game sessions and scores</li>
                                          <li>Achievements and streaks</li>
                                          <li>Word lists and groups they own</li>
                                          <li>Group memberships</li>
                                          <li>Star shop purchases</li>
                                        </ul>
                                        <p className="mt-3 font-medium text-destructive">This action cannot be undone.</p>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <div className="flex flex-wrap gap-2">
                                        {group.type === 'family' && (group.members.length > 0 || group.parentUser) && (
                                          <AlertDialogAction
                                            onClick={() => deleteUserMutation.mutate({ userId: user.id, deleteFamily: true })}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            data-testid={`button-delete-family-${user.id}`}
                                          >
                                            {deleteUserMutation.isPending ? (
                                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                              <Users className="w-4 h-4 mr-2" />
                                            )}
                                            Delete Entire Family
                                          </AlertDialogAction>
                                        )}
                                        <AlertDialogAction
                                          onClick={() => deleteUserMutation.mutate({ userId: user.id })}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          data-testid={`button-confirm-delete-user-${user.id}`}
                                        >
                                          {deleteUserMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4 mr-2" />
                                          )}
                                          {group.type === 'family' ? 'Delete Only This User' : 'Delete User'}
                                        </AlertDialogAction>
                                      </div>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          );

                          return (
                            <>
                              {group.parentUser && (
                                <TableRow 
                                  key={`parent-${group.parentUser.id}`} 
                                  data-testid={`row-user-${group.parentUser.id}`}
                                  className={hasMembers ? "cursor-pointer hover-elevate" : ""}
                                  onClick={hasMembers && group.id !== null ? () => toggleFamilyExpansion(group.id!) : undefined}
                                >
                                  <TableCell className="font-mono text-xs">
                                    <div className="flex items-center gap-1">
                                      {hasMembers && (
                                        isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                      )}
                                      {group.parentUser.id}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {group.parentUser.username}
                                      {group.type === 'family' && (
                                        <Badge variant="secondary" className="text-xs">Family ({group.members.length + 1})</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {group.parentUser.firstName || group.parentUser.lastName 
                                      ? `${group.parentUser.firstName || ''} ${group.parentUser.lastName || ''}`.trim()
                                      : <span className="text-muted-foreground">-</span>}
                                  </TableCell>
                                  <TableCell>
                                    {group.parentUser.email || <span className="text-muted-foreground">-</span>}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={group.parentUser.role === 'admin' ? 'default' : group.parentUser.role === 'teacher' ? 'secondary' : group.parentUser.role === 'parent' ? 'default' : 'outline'}>
                                      {group.parentUser.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                      {group.parentUser.accountType.replace(/_/g, ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{group.parentUser.stars}</TableCell>
                                  <TableCell className="text-right">{group.parentUser.gamesPlayed}</TableCell>
                                  <TableCell className="text-xs">
                                    {new Date(group.parentUser.createdAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {group.parentUser.lastActive 
                                      ? new Date(group.parentUser.lastActive).toLocaleDateString()
                                      : <span className="text-muted-foreground">Never</span>}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          disabled={group.parentUser.role === 'admin'}
                                          data-testid={`button-delete-user-${group.parentUser.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete the user "{group.parentUser.username}" and ALL associated data including:
                                            <ul className="list-disc ml-6 mt-2 space-y-1">
                                              <li>Game sessions and scores</li>
                                              <li>Achievements and streaks</li>
                                              <li>Word lists and groups they own</li>
                                              <li>Group memberships</li>
                                              <li>Star shop purchases</li>
                                            </ul>
                                            <p className="mt-3 font-medium text-destructive">This action cannot be undone.</p>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <div className="flex flex-wrap gap-2">
                                            {group.type === 'family' && group.members.length > 0 && (
                                              <AlertDialogAction
                                                onClick={() => deleteUserMutation.mutate({ userId: group.parentUser!.id, deleteFamily: true })}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                data-testid={`button-delete-family-${group.parentUser.id}`}
                                              >
                                                {deleteUserMutation.isPending ? (
                                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                  <Users className="w-4 h-4 mr-2" />
                                                )}
                                                Delete Entire Family ({group.members.length + 1})
                                              </AlertDialogAction>
                                            )}
                                            <AlertDialogAction
                                              onClick={() => deleteUserMutation.mutate({ userId: group.parentUser!.id })}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              data-testid={`button-confirm-delete-user-${group.parentUser.id}`}
                                            >
                                              {deleteUserMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                              ) : (
                                                <Trash2 className="w-4 h-4 mr-2" />
                                              )}
                                              {group.type === 'family' && group.members.length > 0 ? 'Delete Only This User' : 'Delete User'}
                                            </AlertDialogAction>
                                          </div>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              )}
                              {isExpanded && group.members.map((member) => renderUserRow(member, true))}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {userSearchQuery 
                        ? `Showing ${filteredGroupedUsers.length} group(s) matching "${userSearchQuery}" (${filteredGroupedUsers.reduce((sum, g) => sum + 1 + g.members.length, 0)} users)`
                        : `Total users: ${adminUsers.length}`}
                    </div>
                    </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Create Admin Account
            </DialogTitle>
            <DialogDescription>
              Create a new administrator account with full access to the admin dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username *</Label>
              <Input
                id="admin-username"
                placeholder="Enter username"
                value={newAdminForm.username}
                onChange={(e) => setNewAdminForm(prev => ({ ...prev, username: e.target.value }))}
                data-testid="input-admin-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password *</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="At least 6 characters"
                value={newAdminForm.password}
                onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                data-testid="input-admin-password"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-firstname">First Name</Label>
                <Input
                  id="admin-firstname"
                  placeholder="First name"
                  value={newAdminForm.firstName}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, firstName: e.target.value }))}
                  data-testid="input-admin-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-lastname">Last Name</Label>
                <Input
                  id="admin-lastname"
                  placeholder="Last name"
                  value={newAdminForm.lastName}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, lastName: e.target.value }))}
                  data-testid="input-admin-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={newAdminForm.email}
                onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-admin-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateAdminOpen(false)}
              data-testid="button-cancel-create-admin"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAdmin}
              disabled={createAdminMutation.isPending}
              data-testid="button-submit-create-admin"
            >
              {createAdminMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
