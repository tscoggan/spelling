import { useState, useCallback } from "react";
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
import { Upload, Search, Users, FileText, ArrowUpDown, Loader2, Check, X, AlertCircle, Ban, Copy, BookX, Home } from "lucide-react";
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
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-admin">
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
        </Tabs>
      </div>
    </div>
  );
}
