import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import { Upload, Search, Users, FileText, ArrowUpDown, Loader2, Check, X, AlertCircle, Ban, Copy, BookX, BookOpen, Home, UserX, Trash2, Shield, ChevronDown, ChevronRight, Plus, Flag, Eye, Edit, Tag, ToggleLeft, ToggleRight, Calendar, Mail, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
import { useLocation, useSearch } from "wouter";
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
  userStatus: string;
  subscriptionExpiresAt: string | null;
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

interface FlaggedWordReport {
  id: number;
  wordId: number;
  word: string;
  userId: number | null;
  gameMode: string;
  flaggedContentTypes: string[];
  comments: string | null;
  createdAt: string;
  reporterName: string | null;
  reporterEmail: string | null;
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
  
  const searchParams = useSearch();
  const [searchQuery, setSearchQuery] = useState(() => {
    // Initialize search query from URL if present
    const params = new URLSearchParams(searchParams);
    return params.get('search') || "";
  });
  const [activeTab, setActiveTab] = useState(() => {
    // If there's a search query in the URL, go directly to word-editor tab
    const params = new URLSearchParams(searchParams);
    return params.get('search') ? 'word-editor' : 'word-loader';
  });
  // Track if we came from a URL with search param (notification link)
  const [autoSelectWord, setAutoSelectWord] = useState(() => {
    const params = new URLSearchParams(searchParams);
    return params.get('search') || null;
  });
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [editForm, setEditForm] = useState({
    definition: "",
    sentenceExample: "",
    wordOrigin: "",
    partOfSpeech: "",
  });
  
  const [expandedFamilies, setExpandedFamilies] = useState<Set<number>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [hideDeactivated, setHideDeactivated] = useState(true);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);

  // Metadata refresh job state — backed by DB, persists across page nav & server restarts
  interface RefreshJobState {
    status: 'idle' | 'running' | 'completed' | 'failed' | 'interrupted';
    total: number;
    processed: number;
    valid: number;
    invalid: number;
    skipped: number;
    error?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    updatedAt?: string;
  }
  const [refreshJob, setRefreshJob] = useState<RefreshJobState>({
    status: 'idle', total: 0, processed: 0, valid: 0, invalid: 0, skipped: 0,
  });

  // Fetch current job status from DB on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/words/refresh-metadata/status');
        if (res.ok) setRefreshJob(await res.json());
      } catch { /* ignore */ }
    })();
  }, []);

  // Poll every 10 s while a job is running (20 s batches, so 10 s is plenty)
  useEffect(() => {
    if (refreshJob.status !== 'running') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/words/refresh-metadata/status');
        if (res.ok) {
          const data = await res.json();
          setRefreshJob(data);
          if (data.status !== 'running') clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshJob.status]);

  // Estimated time remaining (based on 900 words/hour = 15 words/min)
  const wordsPerMinute = 15;
  const minutesRemaining = refreshJob.status === 'running' && refreshJob.total > 0
    ? Math.ceil((refreshJob.total - refreshJob.processed) / wordsPerMinute)
    : null;
  const etaLabel = minutesRemaining === null ? null
    : minutesRemaining >= 120 ? `~${Math.ceil(minutesRemaining / 60)} hours remaining`
    : minutesRemaining >= 60  ? `~${Math.floor(minutesRemaining / 60)}h ${minutesRemaining % 60}m remaining`
    : `~${minutesRemaining} min remaining`;

  const startMetadataRefresh = async () => {
    try {
      const res = await fetch('/api/admin/words/refresh-metadata', { method: 'POST' });
      if (res.status === 409) {
        toast({ title: "Already running", description: "A metadata refresh is already in progress." });
        return;
      }
      if (!res.ok) throw new Error('Failed to start');
      // Poll immediately to pick up the new job row
      const statusRes = await fetch('/api/admin/words/refresh-metadata/status');
      if (statusRes.ok) setRefreshJob(await statusRes.json());
    } catch {
      toast({ title: "Error", description: "Could not start metadata refresh.", variant: "destructive" });
    }
  };

  const { data: dictionarySourceData } = useQuery<{ source: string }>({
    queryKey: ['/api/admin/dictionary-source'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dictionary-source');
      if (!res.ok) throw new Error('Failed to fetch dictionary source');
      return res.json();
    },
  });
  const dictionarySourceLabel = dictionarySourceData?.source === 'merriam-webster'
    ? 'Merriam-Webster'
    : 'Free Dictionary API';

  const [newAdminForm, setNewAdminForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
  });

  const { data: currentUser } = useQuery<{ id: number; username: string; role: string }>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('Failed to fetch current user');
      return response.json();
    },
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

  const { data: flaggedWords = [], isLoading: isLoadingFlagged } = useQuery<FlaggedWordReport[]>({
    queryKey: ['/api/admin/flagged-words'],
    queryFn: async () => {
      const response = await fetch('/api/admin/flagged-words');
      if (!response.ok) throw new Error('Failed to fetch flagged words');
      return response.json();
    },
  });

  const dismissFlagMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/flagged-words/${id}`);
      if (!response.ok) throw new Error('Failed to dismiss report');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Report dismissed" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/flagged-words'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to dismiss report", description: error.message, variant: "destructive" });
    },
  });

  // Promo codes state
  const defaultPromoForm = { discountPercent: 10, codeType: "one_time", duration: "once", applicablePlans: "both", expiresAt: "" };
  const [promoForm, setPromoForm] = useState(defaultPromoForm);
  const [createPromoOpen, setCreatePromoOpen] = useState(false);
  const [promoUsagesFor, setPromoUsagesFor] = useState<PromoCode | null>(null);

  interface PromoCode { id: number; code: string; discountPercent: number; codeType: string; duration: string; applicablePlans: string; usesCount: number; isActive: boolean; expiresAt: string | null; createdAt: string; }
  interface PromoUsage { id: number; userId: number | null; username: string | null; usedAt: string; }

  const { data: promoCodes = [], isLoading: isLoadingPromos } = useQuery<PromoCode[]>({
    queryKey: ['/api/admin/promo-codes'],
  });

  const { data: promoUsages = [], isLoading: isLoadingUsages } = useQuery<PromoUsage[]>({
    queryKey: ['/api/admin/promo-codes', promoUsagesFor?.id, 'usages'],
    queryFn: async () => {
      if (!promoUsagesFor) return [];
      const res = await fetch(`/api/admin/promo-codes/${promoUsagesFor.id}/usages`);
      return res.json();
    },
    enabled: !!promoUsagesFor,
  });

  const createPromoMutation = useMutation({
    mutationFn: async (data: { discountPercent: number; codeType: string; duration: string; applicablePlans: string; expiresAt?: string }) =>
      (await apiRequest('POST', '/api/admin/promo-codes', data)).json(),
    onSuccess: () => {
      toast({ title: "Promo code created" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      setCreatePromoOpen(false);
      setPromoForm(defaultPromoForm);
    },
    onError: (e: Error) => toast({ title: "Failed to create code", description: e.message, variant: "destructive" }),
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await apiRequest('PATCH', `/api/admin/promo-codes/${id}`, { isActive })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] }),
    onError: (e: Error) => toast({ title: "Failed to update code", description: e.message, variant: "destructive" }),
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest('DELETE', `/api/admin/promo-codes/${id}`)).json(),
    onSuccess: () => {
      toast({ title: "Promo code deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
    },
    onError: (e: Error) => toast({ title: "Failed to delete code", description: e.message, variant: "destructive" }),
  });

  const [sharePromoCode, setSharePromoCode] = useState<PromoCode | null>(null);
  const [shareEmailInput, setShareEmailInput] = useState("");

  const sharePromoMutation = useMutation({
    mutationFn: async ({ id, emails }: { id: number; emails: string[] }) =>
      (await apiRequest('POST', `/api/admin/promo-codes/${id}/share`, { emails })).json(),
    onSuccess: (data) => {
      toast({ title: "Email sent", description: `Promo code sent to ${data.sentTo} recipient${data.sentTo !== 1 ? 's' : ''}.` });
      setSharePromoCode(null);
      setShareEmailInput("");
    },
    onError: (e: Error) => toast({ title: "Failed to send email", description: e.message, variant: "destructive" }),
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
    const isUserDeactivated = (user: AdminUser) => user.userStatus === 'deleted';

    let result = groupedUsers;

    if (hideDeactivated) {
      result = result
        .map((group) => ({
          ...group,
          parentUser: group.parentUser && isUserDeactivated(group.parentUser) ? null : group.parentUser,
          members: group.members.filter((m) => !isUserDeactivated(m)),
        }))
        .filter((group) => group.parentUser !== null || group.members.length > 0) as typeof groupedUsers;
    }

    if (!userSearchQuery.trim()) {
      return result;
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

    return result.filter((group) => {
      if (group.parentUser && userMatchesQuery(group.parentUser)) {
        return true;
      }
      if (group.members.some(member => userMatchesQuery(member))) {
        return true;
      }
      return false;
    });
  }, [groupedUsers, userSearchQuery, hideDeactivated]);

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

  // Auto-select word when coming from a notification link
  useEffect(() => {
    if (autoSelectWord && searchResults.length > 0) {
      // Find exact match first, then partial match
      const exactMatch = searchResults.find(
        (w) => w.word.toLowerCase() === autoSelectWord.toLowerCase()
      );
      const wordToSelect = exactMatch || searchResults[0];
      if (wordToSelect) {
        handleSelectWord(wordToSelect);
        setAutoSelectWord(null); // Only auto-select once
      }
    }
  }, [autoSelectWord, searchResults]);

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

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5" data-testid="tabs-admin">
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
            <TabsTrigger value="promo-codes" data-testid="tab-promo-codes">
              <Tag className="w-4 h-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="user-management" data-testid="tab-user-management">
              <Shield className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="word-loader">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>Bulk Word Loader</CardTitle>
                    <CardDescription>
                      Upload a TXT or CSV file with up to 2000 words. Words will be validated via the dictionary API and added to the database.
                    </CardDescription>
                  </div>
                  {dictionarySourceData && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Source: <span className="font-semibold text-foreground">{dictionarySourceLabel}</span></span>
                    </div>
                  )}
                </div>
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

                {/* Refresh All Word Metadata */}
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <h3 className="font-medium text-sm">Refresh All Word Metadata</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Re-fetches definitions, examples, and parts of speech for every word in the database from the <span className="font-medium text-foreground">{dictionarySourceLabel}</span>. Replaces existing metadata. Runs in the background at ~900 words/hour to stay within the API rate limit — you can navigate away or close this page and the job will continue.
                    </p>
                  </div>

                  {(refreshJob.status === 'idle') && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" data-testid="button-refresh-metadata">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh All Word Metadata
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Refresh all word metadata?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will re-fetch definitions, examples, and parts of speech for every word in the database using the <strong>{dictionarySourceLabel}</strong>. Existing metadata will be overwritten. The job runs in the background and may take several minutes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={startMetadataRefresh}>
                            Start Refresh
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {refreshJob.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          Processing {refreshJob.processed.toLocaleString()} / {refreshJob.total.toLocaleString()} words
                        </div>
                        {etaLabel && (
                          <span className="text-xs text-muted-foreground">{etaLabel}</span>
                        )}
                      </div>
                      <Progress
                        value={refreshJob.total > 0 ? (refreshJob.processed / refreshJob.total) * 100 : 0}
                        className="h-2"
                        data-testid="progress-refresh-metadata"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paced at ~900 words/hour. This job will keep running even if you navigate away or close this page.
                      </p>
                    </div>
                  )}

                  {refreshJob.status === 'completed' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-md text-center">
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{refreshJob.valid}</p>
                          <p className="text-xs text-green-600 dark:text-green-400">Updated</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md text-center">
                          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{refreshJob.invalid}</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">Not Found</p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md text-center">
                          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{refreshJob.skipped}</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">API Errors</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-refresh-metadata-again">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Again
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Refresh all word metadata again?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will re-fetch metadata for every word in the database using the <strong>{dictionarySourceLabel}</strong> and overwrite all existing metadata. The job runs in the background and may take several minutes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={startMetadataRefresh}>
                              Start Refresh
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {refreshJob.status === 'interrupted' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-md space-y-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Job interrupted by server restart</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Progress: {refreshJob.processed.toLocaleString()} of {refreshJob.total.toLocaleString()} words were processed before the server restarted. Start a new refresh to process all words from the beginning.
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-refresh-metadata-restart">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Start New Refresh
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Start a new metadata refresh?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will re-fetch metadata for all words from the beginning using the <strong>{dictionarySourceLabel}</strong>. The job runs in the background at ~900 words/hour and will survive server restarts.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={startMetadataRefresh}>
                              Start Refresh
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {refreshJob.status === 'failed' && (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive">Refresh failed: {refreshJob.error || 'Unknown error'}</p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-refresh-metadata-retry">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Retry metadata refresh?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will re-fetch metadata for every word in the database using the <strong>{dictionarySourceLabel}</strong> and overwrite all existing metadata. The job runs in the background at ~900 words/hour.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={startMetadataRefresh}>
                              Start Refresh
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
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

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Flagged Content Reports
                  {flaggedWords.length > 0 && (
                    <Badge variant="destructive" data-testid="badge-flagged-count">{flaggedWords.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Review words that users have reported as having inappropriate content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFlagged ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : flaggedWords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No flagged content reports</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {flaggedWords.map((flag) => (
                      <div
                        key={flag.id}
                        className="p-4 border rounded-lg space-y-2"
                        data-testid={`flagged-word-${flag.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-lg">{flag.word}</span>
                              {flag.flaggedContentTypes.map((type: string) => (
                                <Badge key={type} variant="secondary">{type}</Badge>
                              ))}
                            </div>
                            {flag.comments && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Comment: {flag.comments}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Reported: {new Date(flag.createdAt).toLocaleDateString()} 
                              {flag.userId ? (
                                <span>
                                  {' by '}
                                  {flag.reporterName ? `${flag.reporterName} ` : ''}
                                  {flag.reporterEmail ? `(${flag.reporterEmail})` : ''}
                                </span>
                              ) : ' by guest'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSearchQuery(flag.word);
                              }}
                              data-testid={`button-edit-flagged-${flag.id}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit Word
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => dismissFlagMutation.mutate(flag.id)}
                              disabled={dismissFlagMutation.isPending}
                              data-testid={`button-mark-fixed-${flag.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Mark as Fixed
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  data-testid={`button-dismiss-flag-${flag.id}`}
                                  title="Dismiss without fixing"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Dismiss Report</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to dismiss this report for "{flag.word}"? This will remove the report but keep the word unchanged.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => dismissFlagMutation.mutate(flag.id)}
                                    data-testid={`button-confirm-dismiss-${flag.id}`}
                                  >
                                    Dismiss
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promo-codes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Promo Codes</CardTitle>
                    <CardDescription className="mt-1">Create and manage discount codes for Family and School account subscriptions.</CardDescription>
                  </div>
                  <Button onClick={() => setCreatePromoOpen(true)} data-testid="button-create-promo">
                    <Plus className="w-4 h-4 mr-2" /> New Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPromos ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : promoCodes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No promo codes yet. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Plans</TableHead>
                          <TableHead>Uses</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promoCodes.map((promo) => {
                          const isExpired = promo.expiresAt ? new Date(promo.expiresAt) < new Date() : false;
                          const isUsedUp = promo.codeType === "one_time" && promo.usesCount >= 1;
                          const effectivelyActive = promo.isActive && !isExpired && !isUsedUp;
                          return (
                            <TableRow key={promo.id} data-testid={`row-promo-${promo.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="font-mono font-bold tracking-widest text-sm">{promo.code}</code>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(promo.code); toast({ title: "Copied to clipboard" }); }} data-testid={`button-copy-promo-${promo.id}`}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell><span className="font-semibold text-green-600 dark:text-green-400">{promo.discountPercent}% off</span></TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {promo.codeType === "one_time" ? "One-time" : "Ongoing"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {promo.duration === "forever" ? "Permanent" : "First period"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm capitalize">
                                {promo.applicablePlans === "both" ? "Monthly + Annual" : promo.applicablePlans}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{promo.usesCount}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {promo.expiresAt ? (
                                  <span className={isExpired ? "text-destructive" : ""}>
                                    {new Date(promo.expiresAt).toLocaleDateString()}
                                    {isExpired && " (expired)"}
                                  </span>
                                ) : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={effectivelyActive ? "default" : "secondary"} className="text-xs">
                                  {effectivelyActive ? "Active" : isExpired ? "Expired" : isUsedUp ? "Used" : "Disabled"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="View usage"
                                    onClick={() => setPromoUsagesFor(promo)}
                                    data-testid={`button-usages-promo-${promo.id}`}
                                  >
                                    <Users className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="Share via email"
                                    onClick={() => { setSharePromoCode(promo); setShareEmailInput(""); }}
                                    data-testid={`button-share-promo-${promo.id}`}
                                  >
                                    <Mail className="w-3 h-3" />
                                  </Button>
                                  {!isExpired && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      title={promo.isActive ? "Disable code" : "Enable code"}
                                      onClick={() => togglePromoMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                                      data-testid={`button-toggle-promo-${promo.id}`}
                                    >
                                      {promo.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                                    </Button>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" data-testid={`button-delete-promo-${promo.id}`}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete <strong>{promo.code}</strong> and all usage records. This cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deletePromoMutation.mutate(promo.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
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
                      <div className="flex items-center gap-2 ml-2">
                        <Checkbox
                          id="hide-deactivated"
                          checked={hideDeactivated}
                          onCheckedChange={(checked) => setHideDeactivated(checked === true)}
                          data-testid="checkbox-hide-deactivated"
                        />
                        <label
                          htmlFor="hide-deactivated"
                          className="text-sm text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                        >
                          Hide deactivated
                        </label>
                      </div>
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
                          <TableHead className="text-right">Games Played</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Paid Through</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGroupedUsers.map((group) => {
                          const isExpanded = group.id !== null && expandedFamilies.has(group.id);
                          const hasMembers = group.members.length > 0;
                          const isParentDeleted = group.parentUser?.userStatus === 'deleted';
                          const renderUserRow = (user: AdminUser, isChild = false) => {
                            const isDeleted = user.userStatus === 'deleted';
                            return (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`} className={`${isChild ? "bg-muted/30" : ""} ${isDeleted ? "opacity-60" : ""}`}>
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-1">
                                  {isChild && <span className="pl-4">↳</span>}
                                  {user.id}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {user.username}
                                  {isDeleted && <Badge variant="destructive" className="text-xs">Deactivated</Badge>}
                                </div>
                              </TableCell>
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
                                  {user.accountType === 'family_parent' ? 'Family' : user.accountType === 'family_child' ? 'Family (child)' : user.accountType.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{user.gamesPlayed}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs">
                                {user.role === 'admin'
                                  ? <span className="text-muted-foreground">N/A</span>
                                  : user.subscriptionExpiresAt
                                    ? new Date(user.subscriptionExpiresAt).toLocaleDateString()
                                    : <span className="inline-flex items-center rounded-md bg-red-600 text-white px-2 py-0.5 text-xs font-medium">Unpaid</span>}
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
                                      disabled={isDeleted || user.username === 'admin' || user.id === currentUser?.id}
                                      data-testid={`button-delete-user-${user.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
                                      <AlertDialogDescription asChild>
                                        <div>
                                          <p>This will deactivate the account for <strong>"{user.username}"</strong>. They will no longer be able to log in.</p>
                                          <p className="mt-2">The following will be <strong>permanently removed</strong>:</p>
                                          <ul className="list-disc ml-6 mt-1 space-y-1">
                                            <li>Game sessions and scores</li>
                                            <li>Achievements and streaks</li>
                                            <li>Word lists and groups they own</li>
                                            <li>Group memberships</li>
                                            <li>Star shop purchases</li>
                                          </ul>
                                          <p className="mt-2">The following will be <strong>retained</strong> for compliance:</p>
                                          <ul className="list-disc ml-6 mt-1 space-y-1">
                                            <li>Payment history</li>
                                            <li>Legal acceptance records</li>
                                          </ul>
                                          <p className="mt-3 font-medium text-destructive">This action cannot be undone.</p>
                                        </div>
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
                                            Deactivate Entire Family
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
                                          {group.type === 'family' ? 'Deactivate Only This User' : 'Deactivate Account'}
                                        </AlertDialogAction>
                                      </div>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          );
                          };

                          return (
                            <>
                              {group.parentUser && (
                                <TableRow 
                                  key={`parent-${group.parentUser.id}`} 
                                  data-testid={`row-user-${group.parentUser.id}`}
                                  className={`${hasMembers ? "cursor-pointer hover-elevate" : ""} ${isParentDeleted ? "opacity-60" : ""}`}
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
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {group.parentUser.username}
                                      {isParentDeleted && <Badge variant="destructive" className="text-xs">Deactivated</Badge>}
                                      {!isParentDeleted && group.type === 'family' && (
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
                                      {group.parentUser.accountType === 'family_parent' ? 'Family' : group.parentUser.accountType === 'family_child' ? 'Family (child)' : group.parentUser.accountType.replace(/_/g, ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{group.parentUser.gamesPlayed}</TableCell>
                                  <TableCell className="text-xs">
                                    {new Date(group.parentUser.createdAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {group.parentUser.role === 'admin'
                                      ? <span className="text-muted-foreground">N/A</span>
                                      : group.parentUser.subscriptionExpiresAt
                                        ? new Date(group.parentUser.subscriptionExpiresAt).toLocaleDateString()
                                        : <span className="inline-flex items-center rounded-md bg-red-600 text-white px-2 py-0.5 text-xs font-medium">Unpaid</span>}
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
                                          disabled={isParentDeleted || group.parentUser.username === 'admin' || group.parentUser.id === currentUser?.id}
                                          data-testid={`button-delete-user-${group.parentUser.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will deactivate "{group.parentUser.username}". The following data will be removed:
                                            <ul className="list-disc ml-6 mt-2 space-y-1">
                                              <li>Game sessions and scores</li>
                                              <li>Achievements and streaks</li>
                                              <li>Word lists and groups they own</li>
                                              <li>Group memberships</li>
                                              <li>Star shop purchases</li>
                                            </ul>
                                            <p className="mt-2">The following will be retained for legal compliance:</p>
                                            <ul className="list-disc ml-6 mt-1 space-y-1 text-muted-foreground">
                                              <li>Payment history</li>
                                              <li>Legal agreement acceptances</li>
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
                                                Deactivate Entire Family ({group.members.length + 1})
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
                                              {group.type === 'family' && group.members.length > 0 ? 'Deactivate Only This User' : 'Deactivate Account'}
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
                        ? `Showing ${filteredGroupedUsers.length} group(s) matching "${userSearchQuery}" (${filteredGroupedUsers.reduce((sum, g) => sum + (g.parentUser ? 1 : 0) + g.members.length, 0)} users)`
                        : hideDeactivated
                          ? `Showing ${filteredGroupedUsers.reduce((sum, g) => sum + (g.parentUser ? 1 : 0) + g.members.length, 0)} active users (${adminUsers.length} total)`
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

      {/* Create Promo Code Dialog */}
      <Dialog open={createPromoOpen} onOpenChange={setCreatePromoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Create Promo Code</DialogTitle>
            <DialogDescription>A unique alphanumeric code will be auto-generated. Share it with users to apply the discount at checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Discount Percentage</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5} max={100} step={5}
                  value={promoForm.discountPercent}
                  onChange={e => setPromoForm(p => ({ ...p, discountPercent: parseInt(e.target.value) }))}
                  className="flex-1"
                  data-testid="input-promo-discount-slider"
                />
                <span className="font-bold text-lg w-16 text-right">{promoForm.discountPercent}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Code Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, codeType: "one_time" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.codeType === "one_time" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-type-one-time"
                >
                  <p className="font-semibold text-sm">One-time</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Expires after a single use</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, codeType: "ongoing" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.codeType === "ongoing" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-type-ongoing"
                >
                  <p className="font-semibold text-sm">Ongoing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Unlimited uses until disabled or expired</p>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Discount Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, duration: "once" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.duration === "once" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-duration-once"
                >
                  <p className="font-semibold text-sm">First period only</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Discount applies to the first billing period</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, duration: "forever" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.duration === "forever" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-duration-forever"
                >
                  <p className="font-semibold text-sm">Permanent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Discount applies to all renewals too</p>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, applicablePlans: "both" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.applicablePlans === "both" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-plans-both"
                >
                  <p className="font-semibold text-sm">Both</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly & annual</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, applicablePlans: "monthly" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.applicablePlans === "monthly" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-plans-monthly"
                >
                  <p className="font-semibold text-sm">Monthly</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Only $1.99/mo plan</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoForm(p => ({ ...p, applicablePlans: "annual" }))}
                  className={`rounded-md border-2 p-3 text-left transition-colors ${promoForm.applicablePlans === "annual" ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid="button-promo-plans-annual"
                >
                  <p className="font-semibold text-sm">Annual</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Only $19.99/yr plan</p>
                </button>
              </div>
            </div>
            {promoForm.codeType === "ongoing" && (
              <div className="space-y-2">
                <Label htmlFor="promo-expires">Expiration Date <span className="text-muted-foreground">(optional)</span></Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="promo-expires"
                    type="date"
                    value={promoForm.expiresAt}
                    onChange={e => setPromoForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="pl-10"
                    data-testid="input-promo-expires"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePromoOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createPromoMutation.mutate({ discountPercent: promoForm.discountPercent, codeType: promoForm.codeType, duration: promoForm.duration, applicablePlans: promoForm.applicablePlans, expiresAt: promoForm.expiresAt || undefined })}
              disabled={createPromoMutation.isPending}
              data-testid="button-confirm-create-promo"
            >
              {createPromoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sharePromoCode} onOpenChange={(open) => { if (!open) { setSharePromoCode(null); setShareEmailInput(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Share Promo Code via Email
            </DialogTitle>
            <DialogDescription>
              Send <strong>{sharePromoCode?.code}</strong> ({sharePromoCode?.discountPercent}% off) to one or more email addresses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="share-emails">Email Addresses</Label>
            <Textarea
              id="share-emails"
              placeholder={"jane@example.com\njohn@school.org\nparent@family.com"}
              value={shareEmailInput}
              onChange={e => setShareEmailInput(e.target.value)}
              rows={4}
              data-testid="input-share-emails"
            />
            <p className="text-xs text-muted-foreground">
              Enter one email address per line, or separate with commas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSharePromoCode(null); setShareEmailInput(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!sharePromoCode) return;
                const raw = shareEmailInput.replace(/,/g, '\n');
                const emails = raw.split('\n').map(e => e.trim()).filter(Boolean);
                sharePromoMutation.mutate({ id: sharePromoCode.id, emails });
              }}
              disabled={sharePromoMutation.isPending || !shareEmailInput.trim()}
              data-testid="button-send-promo-email"
            >
              {sharePromoMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" />Send Email</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <PasswordInput
                id="admin-password"
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

      <Dialog open={!!promoUsagesFor} onOpenChange={(open) => { if (!open) setPromoUsagesFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usage — <code className="font-mono font-bold tracking-widest">{promoUsagesFor?.code}</code>
            </DialogTitle>
            <DialogDescription>
              {promoUsagesFor?.codeType === "one_time" ? "One-time code" : "Ongoing code"} &bull; {promoUsagesFor?.usesCount ?? 0} use{(promoUsagesFor?.usesCount ?? 0) !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {isLoadingUsages ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : promoUsages.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No uses recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Used At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoUsages.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.username ?? <span className="text-muted-foreground italic">Guest</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.usedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
