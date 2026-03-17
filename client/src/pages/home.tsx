import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles, Trophy, Clock, Target, List, ChevronRight, Shuffle, AlertCircle, Grid3x3, Users, BarChart3, LayoutDashboard, Swords, Search, Eye, Loader2, Lock, School, GraduationCap, UserPlus, Plus, Trash2, CheckCircle, CreditCard, Receipt, FileUp, TrendingUp, BookOpenCheck, CalendarDays, X } from "lucide-react";
import type { GameMode, HeadToHeadChallenge } from "@shared/schema";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGuestSession } from "@/hooks/use-guest-session";
import { useIOSKeyboardTrigger } from "@/App";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserHeader } from "@/components/user-header";
import { AccuracyCard } from "@/components/accuracy-card";
import { FeatureComparisonDialog } from "@/components/feature-comparison-dialog";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import titleBanner from "@assets/Spelling_Playground_title_1764882992138.png";
import oneStar from "@assets/1 star_1763916010555.png";
import missingStar from "@assets/Missing star (grey)_1763916010554.png";
import wordListsButton from "@assets/Word Lists button_1764442517980.png";
import userGroupsButton from "@assets/User Groups button 2_1764445093609.png";
import myStatsButton from "@assets/My Stats button 2_1764445093611.png";
import achievementsButton from "@assets/Achievements_button_4_1764949081693.png";
import starShopButton from "@assets/Star_Shop_button_3_1764949081694.png";
import h2hChallengeResultsButton from "@assets/H2H_Challenge_Results_button_1764699075884.png";
import adminDashboardButton from "@assets/Admin_Dashboard_button_1765395988735.png";
import myFamilyButton from "@assets/My_Family_button_1768927283926.png";

const schoolTeacherSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

const schoolStudentSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(4, "Password must be at least 4 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastInitial: z.string().min(1, "Last initial is required").max(1, "Enter one letter only").regex(/^[a-zA-Z]$/, "Must be a single letter"),
});

type SchoolTeacherFormData = z.infer<typeof schoolTeacherSchema>;
type SchoolStudentFormData = z.infer<typeof schoolStudentSchema>;

interface SchoolMemberUser {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  stars: number;
}

interface SchoolMember {
  id: number;
  userId: number;
  role: string;
  status: string;
  user: SchoolMemberUser;
}

interface SchoolData {
  school: {
    id: number;
    schoolAdminUserId: number;
    schoolName: string;
    verificationStatus: string;
    createdAt: string;
    subscriptionExpiresAt: string | null;
  };
  members: SchoolMember[];
  isAdmin: boolean;
}

interface SchoolPaymentRecord {
  id: number;
  schoolId: number;
  userId: number;
  amount: number;
  description: string | null;
  paymentMethod: string;
  status: string;
  paymentDate: string;
}

const useRefreshNotifications = (userId: number | undefined) => {
  const refresh = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos", userId] });
    }
  }, [userId]);
  
  return refresh;
};

function TeacherHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, currentTheme, hasDarkBackground } = useTheme();
  
  const textClasses = getThemedTextClasses(hasDarkBackground);

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto relative z-10 space-y-6"
      >
        <UserHeader />

        <div className="text-center mb-8">
          <motion.div
            className="mb-2 flex justify-center overflow-hidden"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src={titleBanner} 
              alt="Spelling Playground" 
              className="w-full max-w-sm md:max-w-xl h-auto rounded-md"
              data-testid="img-title-banner"
            />
          </motion.div>
          <p className={`text-lg md:text-xl font-semibold ${textClasses.subtitle}`}>
            Welcome, {user?.firstName || user?.username}{user?.lastName ? ` ${user.lastName}` : ''}!
          </p>
        </div>

        <Card className="p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-6 text-center">Teacher Navigation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 text-lg"
              onClick={() => setLocation("/user-groups")}
              data-testid="button-teacher-groups"
            >
              <Users className="w-10 h-10 text-blue-600" />
              <span className="font-semibold">User Groups</span>
              <span className="text-sm text-muted-foreground font-normal">Manage your student groups</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 text-lg"
              onClick={() => setLocation("/word-lists")}
              data-testid="button-teacher-wordlists"
            >
              <BookOpen className="w-10 h-10 text-green-600" />
              <span className="font-semibold">Word Lists</span>
              <span className="text-sm text-muted-foreground font-normal">Create and manage word lists</span>
            </Button>

            <Button
              variant="default"
              className="h-auto py-6 flex flex-col items-center gap-3 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              onClick={() => setLocation("/teacher-dashboard")}
              data-testid="button-teacher-dashboard"
            >
              <LayoutDashboard className="w-10 h-10" />
              <span className="font-semibold">Teacher Dashboard</span>
              <span className="text-sm font-normal opacity-90">View student performance</span>
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-bold">Quick Overview</h2>
          </div>
          <p className="text-muted-foreground">
            Access your Teacher Dashboard to view detailed performance metrics for your students. 
            Create word lists and share them with your groups to track student progress.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}

function SchoolAdminHome() {
  const { user } = useAuth();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const { toast } = useToast();

  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [bulkTeacherOpen, setBulkTeacherOpen] = useState(false);
  const [bulkStudentOpen, setBulkStudentOpen] = useState(false);
  const [bulkTeacherText, setBulkTeacherText] = useState("");
  const [bulkStudentText, setBulkStudentText] = useState("");
  const [bulkTeacherResults, setBulkTeacherResults] = useState<null | { created: number; failed: number; results: any[] }>(null);
  const [bulkStudentResults, setBulkStudentResults] = useState<null | { created: number; failed: number; results: any[] }>(null);
  const [metricsStartDate, setMetricsStartDate] = useState("");
  const [metricsEndDate, setMetricsEndDate] = useState("");

  const teacherForm = useForm<SchoolTeacherFormData>({
    resolver: zodResolver(schoolTeacherSchema),
    defaultValues: { username: "", password: "", firstName: "", lastName: "", email: "" },
  });

  const studentForm = useForm<SchoolStudentFormData>({
    resolver: zodResolver(schoolStudentSchema),
    defaultValues: { username: "", password: "", firstName: "", lastInitial: "" },
  });

  const { data: schoolData, isLoading } = useQuery<SchoolData>({
    queryKey: ["/api/school/account"],
    refetchOnMount: "always",
  });

  const { data: paymentsData } = useQuery<{ payments: SchoolPaymentRecord[] }>({
    queryKey: ["/api/school/payments"],
    enabled: schoolData?.isAdmin ?? false,
    refetchOnMount: "always",
  });

  const payments = paymentsData?.payments ?? [];

  const metricsQueryParams = new URLSearchParams();
  if (metricsStartDate) metricsQueryParams.set("startDate", metricsStartDate);
  if (metricsEndDate) metricsQueryParams.set("endDate", metricsEndDate);
  const metricsQS = metricsQueryParams.toString();

  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<{
    byStudent: any[];
    byGrade: any[];
    summary: { totalStudents: number; totalTeachers: number; totalSessions: number; totalWords: number; totalCorrect: number; overallAccuracy: number | null };
  }>({
    queryKey: ["/api/school/metrics", metricsQS],
    queryFn: async () => {
      const url = `/api/school/metrics${metricsQS ? `?${metricsQS}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load metrics");
      return res.json();
    },
    refetchOnMount: "always",
  });

  function parseCsvToObjects(text: string, fieldNames: string[]): Record<string, string>[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    if (lines.length === 0) return [];
    const firstLine = lines[0].split(/[,\t]/).map(c => c.trim().toLowerCase().replace(/[^a-z]/g, ""));
    const hasHeader = firstLine.every(f => fieldNames.some(n => n.toLowerCase().startsWith(f) || f.startsWith(n.toLowerCase())));
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const cols = line.split(/[,\t]/).map(c => c.trim());
      if (hasHeader) {
        const obj: Record<string, string> = {};
        firstLine.forEach((h, i) => { const match = fieldNames.find(n => n.toLowerCase().startsWith(h) || h.startsWith(n.toLowerCase())); if (match) obj[match] = cols[i] ?? ""; });
        return obj;
      } else {
        const obj: Record<string, string> = {};
        fieldNames.forEach((n, i) => { obj[n] = cols[i] ?? ""; });
        return obj;
      }
    }).filter(o => Object.values(o).some(v => v));
  }

  const bulkTeacherMutation = useMutation({
    mutationFn: async (teachers: any[]) => {
      const response = await apiRequest("POST", "/api/school/teachers/bulk", { teachers });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/account"] });
      setBulkTeacherResults(data);
      toast({ title: `Imported ${data.created} teacher${data.created !== 1 ? "s" : ""}${data.failed > 0 ? `, ${data.failed} failed` : ""}` });
    },
    onError: (error: Error) => {
      toast({ title: "Bulk import failed", description: error.message, variant: "destructive" });
    },
  });

  const bulkStudentMutation = useMutation({
    mutationFn: async (students: any[]) => {
      const response = await apiRequest("POST", "/api/school/students/bulk", { students });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/account"] });
      setBulkStudentResults(data);
      toast({ title: `Imported ${data.created} student${data.created !== 1 ? "s" : ""}${data.failed > 0 ? `, ${data.failed} failed` : ""}` });
    },
    onError: (error: Error) => {
      toast({ title: "Bulk import failed", description: error.message, variant: "destructive" });
    },
  });

  const addTeacherMutation = useMutation({
    mutationFn: async (data: SchoolTeacherFormData) => {
      const response = await apiRequest("POST", "/api/school/teachers", {
        ...data,
        email: data.email || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/account"] });
      setAddTeacherOpen(false);
      teacherForm.reset();
      toast({ title: "Teacher added!", description: "The teacher account has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add teacher", description: error.message, variant: "destructive" });
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: async (data: SchoolStudentFormData) => {
      const response = await apiRequest("POST", "/api/school/students", {
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastInitial: data.lastInitial,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/account"] });
      setAddStudentOpen(false);
      studentForm.reset();
      toast({ title: "Student added!", description: "The student account has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add student", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await apiRequest("DELETE", `/api/school/members/${memberId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/account"] });
      toast({ title: "Member removed", description: "The account has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const teachers = schoolData?.members.filter(m => m.role === "teacher") ?? [];
  const students = schoolData?.members.filter(m => m.role === "student") ?? [];
  const isVerified = schoolData?.school.verificationStatus === "verified";
  const isAdmin = schoolData?.isAdmin ?? false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
        }}
      />
      <div
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${themeAssets.backgroundLandscape})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
        }}
      />
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto relative z-10 space-y-6"
      >
        <UserHeader />

        <div className="text-center">
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-admin-home-title">
            School Administration
          </h1>
          {schoolData && (
            <p className={`mt-1 text-lg ${textClasses.subtitle}`}>
              {schoolData.school.schoolName}
            </p>
          )}
        </div>

        {schoolData && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <School className="w-8 h-8 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{schoolData.school.schoolName}</p>
                    <p className="text-sm text-muted-foreground">
                      Admin: {user?.firstName} {user?.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold" data-testid="text-teacher-count">{teachers.length}</p>
                    <p className="text-xs text-muted-foreground">Teachers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold" data-testid="text-student-count">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <Badge
                    variant={isVerified ? "default" : "secondary"}
                    className={isVerified ? "bg-green-500 hover:bg-green-500" : ""}
                    data-testid="badge-account-status"
                  >
                    {isVerified ? (
                      <><CheckCircle className="w-3 h-3 mr-1" />Verified</>
                    ) : (
                      "Pending Verification"
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isVerified && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground text-center">
                Your school account is pending verification. Complete payment verification to add teachers and students.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="teachers" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="teachers" className="flex-1" data-testid="tab-teachers">
              <GraduationCap className="w-4 h-4 mr-2 hidden sm:inline" />
              Teachers ({teachers.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="flex-1" data-testid="tab-students">
              <Users className="w-4 h-4 mr-2 hidden sm:inline" />
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex-1" data-testid="tab-metrics">
              <TrendingUp className="w-4 h-4 mr-2 hidden sm:inline" />
              Metrics
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="billing" className="flex-1" data-testid="tab-billing">
                <CreditCard className="w-4 h-4 mr-2 hidden sm:inline" />
                Billing
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="teachers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
                <div>
                  <CardTitle className="text-lg">Teachers</CardTitle>
                  <CardDescription>Manage teacher accounts for your school</CardDescription>
                </div>
                {isAdmin && isVerified && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setBulkTeacherText(""); setBulkTeacherResults(null); setBulkTeacherOpen(true); }} data-testid="button-bulk-import-teachers">
                      <FileUp className="w-4 h-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button size="sm" onClick={() => setAddTeacherOpen(true)} data-testid="button-add-teacher">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Teacher
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {teachers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No teachers yet. Add your first teacher above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teachers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                        data-testid={`row-teacher-${member.id}`}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                          {member.user.email && (
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          )}
                        </div>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-remove-teacher-${member.id}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Teacher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the account for{" "}
                                  {member.user.firstName} {member.user.lastName}. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMemberMutation.mutate(member.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
                <div>
                  <CardTitle className="text-lg">Students</CardTitle>
                  <CardDescription>Manage student accounts for your school</CardDescription>
                </div>
                {isVerified && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setBulkStudentText(""); setBulkStudentResults(null); setBulkStudentOpen(true); }} data-testid="button-bulk-import-students">
                      <FileUp className="w-4 h-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button size="sm" onClick={() => setAddStudentOpen(true)} data-testid="button-add-student">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Student
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No students yet. Add your first student above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                        data-testid={`row-student-${member.id}`}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {member.user.firstName} {member.user.lastName}.
                          </p>
                          <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-muted-foreground mr-1">
                            {member.user.stars} stars
                          </p>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-remove-student-${member.id}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Student?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the account for{" "}
                                    {member.user.firstName} {member.user.lastName}. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeMemberMutation.mutate(member.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="billing">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Payment History
                  </CardTitle>
                  <CardDescription>A record of all payments made for this school account</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No payment records found.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                          data-testid={`row-payment-${payment.id}`}
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {payment.description ?? payment.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.paymentDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">${(payment.amount / 100).toFixed(2)}</p>
                            <span className={`text-xs font-medium ${payment.status === "completed" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="metrics">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Usage Metrics
                      </CardTitle>
                      <CardDescription>Activity across your school by student and grade level</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={metricsStartDate}
                          onChange={e => setMetricsStartDate(e.target.value)}
                          className="h-8 w-36 text-sm"
                          data-testid="input-metrics-start-date"
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                          type="date"
                          value={metricsEndDate}
                          onChange={e => setMetricsEndDate(e.target.value)}
                          className="h-8 w-36 text-sm"
                          data-testid="input-metrics-end-date"
                        />
                      </div>
                      {(metricsStartDate || metricsEndDate) && (
                        <Button size="sm" variant="ghost" onClick={() => { setMetricsStartDate(""); setMetricsEndDate(""); }} data-testid="button-clear-metrics-filter">
                          <X className="w-3.5 h-3.5 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : metricsData ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <p className="text-2xl font-bold" data-testid="metric-total-sessions">{metricsData.summary.totalSessions}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Total Sessions</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <p className="text-2xl font-bold">{metricsData.summary.totalWords.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Words Practiced</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <p className="text-2xl font-bold">
                          {metricsData.summary.overallAccuracy !== null ? `${metricsData.summary.overallAccuracy}%` : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Overall Accuracy</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <p className="text-2xl font-bold">{metricsData.summary.totalStudents}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Students</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    By Student
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !metricsData || metricsData.byStudent.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <BookOpenCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No activity recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Sessions</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Words</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricsData.byStudent.map((row: any) => (
                            <tr key={row.userId} className="border-b last:border-0" data-testid={`row-metric-student-${row.userId}`}>
                              <td className="py-2 pr-4">
                                <p className="font-medium">{row.firstName} {row.lastName}{row.role === "student" ? "." : ""}</p>
                                <p className="text-xs text-muted-foreground">@{row.username}</p>
                              </td>
                              <td className="py-2 pr-4 hidden sm:table-cell">
                                <Badge variant="secondary" className="text-xs capitalize">{row.role}</Badge>
                              </td>
                              <td className="py-2 pr-4 text-right tabular-nums">{row.sessionsCount}</td>
                              <td className="py-2 pr-4 text-right tabular-nums hidden sm:table-cell">{row.totalWords.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums">
                                {row.accuracy !== null ? (
                                  <span className={row.accuracy >= 80 ? "text-green-600 dark:text-green-400 font-medium" : row.accuracy >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                                    {row.accuracy}%
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    By Grade Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !metricsData || metricsData.byGrade.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No grade-level data available yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Grade Level</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Students</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Sessions</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Words</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricsData.byGrade.map((row: any) => (
                            <tr key={row.gradeLevel} className="border-b last:border-0" data-testid={`row-metric-grade-${row.gradeLevel.replace(/\s+/g, "-").toLowerCase()}`}>
                              <td className="py-2 pr-4 font-medium">{row.gradeLevel}</td>
                              <td className="py-2 pr-4 text-right tabular-nums">{row.studentsCount}</td>
                              <td className="py-2 pr-4 text-right tabular-nums">{row.sessionsCount}</td>
                              <td className="py-2 pr-4 text-right tabular-nums hidden sm:table-cell">{row.totalWords.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums">
                                {row.accuracy !== null ? (
                                  <span className={row.accuracy >= 80 ? "text-green-600 dark:text-green-400 font-medium" : row.accuracy >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                                    {row.accuracy}%
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground" data-testid="section-legal-footer">
          <span className="font-medium">Legal:</span>
          <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground" data-testid="link-legal-privacy-policy">
            Privacy Policy
          </a>
          <a href="/legal/family-tos" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground" data-testid="link-legal-family-tos">
            Family Terms of Service
          </a>
          <a href="/legal/school-tos" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground" data-testid="link-legal-school-tos">
            School Terms of Service
          </a>
          <a href="/legal/student-dpa" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground" data-testid="link-legal-student-dpa">
            Student Data Privacy Addendum
          </a>
        </div>
      </motion.div>

      {/* Add Teacher Dialog */}
      <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Teacher</DialogTitle>
            <DialogDescription>
              Create a teacher account. Share the username and password with the teacher.
            </DialogDescription>
          </DialogHeader>
          <Form {...teacherForm}>
            <form onSubmit={teacherForm.handleSubmit((d) => addTeacherMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={teacherForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} data-testid="input-teacher-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={teacherForm.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-teacher-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={teacherForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="teacher@school.edu" {...field} data-testid="input-teacher-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={teacherForm.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="teacher_jane" {...field} data-testid="input-teacher-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={teacherForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="At least 6 characters" {...field} data-testid="input-teacher-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAddTeacherOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={addTeacherMutation.isPending} data-testid="button-confirm-add-teacher">
                  {addTeacherMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Teacher"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Create a student account. Share the username and password with the student or their parent.
            </DialogDescription>
          </DialogHeader>
          <Form {...studentForm}>
            <form onSubmit={studentForm.handleSubmit((d) => addStudentMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={studentForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex" {...field} data-testid="input-student-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={studentForm.control} name="lastInitial" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Initial</FormLabel>
                    <FormControl>
                      <Input placeholder="S" maxLength={1} {...field} data-testid="input-student-last-initial" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={studentForm.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="alex_smith" {...field} data-testid="input-student-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={studentForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="At least 4 characters" {...field} data-testid="input-student-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAddStudentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={addStudentMutation.isPending} data-testid="button-confirm-add-student">
                  {addStudentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Student"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Teachers Dialog */}
      <Dialog open={bulkTeacherOpen} onOpenChange={(open) => { setBulkTeacherOpen(open); if (!open) { setBulkTeacherText(""); setBulkTeacherResults(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Teachers</DialogTitle>
            <DialogDescription>
              Paste CSV or tab-separated data. One teacher per line. Columns: <strong>firstName, lastName, username, password, email</strong> (email optional). A header row is auto-detected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!bulkTeacherResults ? (
              <>
                <textarea
                  className="w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={"firstName,lastName,username,password,email\nJane,Doe,teacher_jane,secret123,jane@school.edu\nJohn,Smith,teacher_john,secret456,"}
                  value={bulkTeacherText}
                  onChange={e => setBulkTeacherText(e.target.value)}
                  data-testid="textarea-bulk-teachers"
                />
                <p className="text-xs text-muted-foreground">
                  {parseCsvToObjects(bulkTeacherText, ["firstName","lastName","username","password","email"]).length} rows parsed
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setBulkTeacherOpen(false)}>Cancel</Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={bulkTeacherMutation.isPending || parseCsvToObjects(bulkTeacherText, ["firstName","lastName","username","password","email"]).length === 0}
                    onClick={() => bulkTeacherMutation.mutate(parseCsvToObjects(bulkTeacherText, ["firstName","lastName","username","password","email"]))}
                    data-testid="button-confirm-bulk-teachers"
                  >
                    {bulkTeacherMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${parseCsvToObjects(bulkTeacherText, ["firstName","lastName","username","password","email"]).length} Teacher${parseCsvToObjects(bulkTeacherText, ["firstName","lastName","username","password","email"]).length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{bulkTeacherResults.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-destructive">{bulkTeacherResults.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                {bulkTeacherResults.failed > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {bulkTeacherResults.results.filter((r: any) => r.status === "error").map((r: any) => (
                      <div key={r.row} className="text-xs p-2 rounded bg-destructive/10 text-destructive">
                        Row {r.row} ({r.username}): {r.error}
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" className="w-full" onClick={() => { setBulkTeacherText(""); setBulkTeacherResults(null); setBulkTeacherOpen(false); }}>Done</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Students Dialog */}
      <Dialog open={bulkStudentOpen} onOpenChange={(open) => { setBulkStudentOpen(open); if (!open) { setBulkStudentText(""); setBulkStudentResults(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
            <DialogDescription>
              Paste CSV or tab-separated data. One student per line. Columns: <strong>firstName, lastInitial, username, password</strong>. A header row is auto-detected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!bulkStudentResults ? (
              <>
                <textarea
                  className="w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={"firstName,lastInitial,username,password\nAlex,S,alex_s,pass1234\nJordan,M,jordan_m,pass5678"}
                  value={bulkStudentText}
                  onChange={e => setBulkStudentText(e.target.value)}
                  data-testid="textarea-bulk-students"
                />
                <p className="text-xs text-muted-foreground">
                  {parseCsvToObjects(bulkStudentText, ["firstName","lastInitial","username","password"]).length} rows parsed
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setBulkStudentOpen(false)}>Cancel</Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={bulkStudentMutation.isPending || parseCsvToObjects(bulkStudentText, ["firstName","lastInitial","username","password"]).length === 0}
                    onClick={() => bulkStudentMutation.mutate(parseCsvToObjects(bulkStudentText, ["firstName","lastInitial","username","password"]))}
                    data-testid="button-confirm-bulk-students"
                  >
                    {bulkStudentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${parseCsvToObjects(bulkStudentText, ["firstName","lastInitial","username","password"]).length} Student${parseCsvToObjects(bulkStudentText, ["firstName","lastInitial","username","password"]).length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{bulkStudentResults.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-destructive">{bulkStudentResults.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                {bulkStudentResults.failed > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {bulkStudentResults.results.filter((r: any) => r.status === "error").map((r: any) => (
                      <div key={r.row} className="text-xs p-2 rounded bg-destructive/10 text-destructive">
                        Row {r.row} ({r.username}): {r.error}
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" className="w-full" onClick={() => { setBulkStudentText(""); setBulkStudentResults(null); setBulkStudentOpen(false); }}>Done</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CustomWordList {
  id: number;
  name: string;
  words: string[];
  isPublic: boolean;
  gradeLevel?: string;
  authorUsername?: string;
  createdAt?: string | Date;
}

// Helper function to format player name with privacy (first name + last initial only)
function formatPlayerNamePrivate(firstName?: string | null, lastName?: string | null): string {
  if (firstName && lastName) {
    const lastInitial = lastName.charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }
  if (firstName) {
    return firstName;
  }
  return '';
}

// Helper component to render avatar - handles both emoji and object storage paths
function AvatarDisplay({ avatar, size = "md", className = "" }: { avatar?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-sm",
    md: "w-8 h-8 text-lg",
    lg: "w-10 h-10 text-xl"
  };
  
  const baseClasses = `rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ${sizeClasses[size]} ${className}`;
  
  if (!avatar) {
    return (
      <div className={baseClasses}>
        <span role="img" aria-label="default avatar">🙂</span>
      </div>
    );
  }
  
  // Check if avatar is an object storage path (image file)
  if (avatar.startsWith('/objects/')) {
    return (
      <img 
        src={avatar} 
        alt="User avatar" 
        className={`rounded-full object-cover flex-shrink-0 ${sizeClasses[size].split(' ').slice(0, 2).join(' ')} ${className}`}
      />
    );
  }
  
  // Otherwise render as emoji
  return (
    <div className={baseClasses}>
      {avatar}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isGuestMode } = useAuth();
  const { state: guestState, guestGetWordListMastery } = useGuestSession();
  const { themeAssets, currentTheme, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [wordListDialogOpen, setWordListDialogOpen] = useState(false);
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [hideMastered, setHideMastered] = useState<boolean>(false);
  const [gameWordCount, setGameWordCount] = useState<"10" | "all">("all");
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const iOSKeyboardInput = useIOSKeyboardTrigger();
  const { toast } = useToast();
  
  // Feature comparison dialog state (for locked features)
  const [featureComparisonOpen, setFeatureComparisonOpen] = useState(false);
  
  // Generate Word List dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateGradeLevel, setGenerateGradeLevel] = useState<string>("");
  const [generateWordCountInput, setGenerateWordCountInput] = useState<string>("10");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Head to Head Challenge state
  const [h2hDialogOpen, setH2hDialogOpen] = useState(false);
  const [h2hSelectedWordList, setH2hSelectedWordList] = useState<number | null>(null);
  const [h2hOpponentSearch, setH2hOpponentSearch] = useState("");
  const [h2hSelectedOpponent, setH2hSelectedOpponent] = useState<any>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Refresh notifications when home page loads (only for authenticated users)
  const refreshNotifications = useRefreshNotifications(user?.id);
  useEffect(() => {
    if (!isGuestMode) {
      refreshNotifications();
    }
  }, [refreshNotifications, isGuestMode]);

  // Show School Admin Home for school admins
  if (user?.role === "school_admin") {
    return <SchoolAdminHome />;
  }

  // Show Teacher Home for teachers
  if (user?.role === "teacher") {
    return <TeacherHome />;
  }

  // For guests, use in-memory word lists; for authenticated users, fetch from API
  const { data: apiCustomLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists"],
    enabled: !isGuestMode,
  });
  
  // Guest users get their word lists from in-memory state
  const customLists = isGuestMode ? (guestState.wordLists as any[]) : apiCustomLists;

  const { data: publicLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/public"],
  });

  // Shared lists only work for authenticated users
  const { data: sharedLists } = useQuery<CustomWordList[]>({
    queryKey: ["/api/word-lists/shared-with-me"],
    enabled: !isGuestMode,
  });

  // Hidden word lists - only for paid accounts
  const { data: hiddenWordLists } = useQuery<{ wordListId: number }[]>({
    queryKey: ["/api/word-lists/hidden"],
    enabled: !isGuestMode && user?.accountType !== 'free',
  });

  // Grade levels for Generate Word List feature
  const { data: gradeLevels } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/generated-word-lists/grades"],
    enabled: generateDialogOpen,
  });
  
  const hiddenWordListIds = useMemo(() => {
    return new Set((hiddenWordLists || []).map(h => h.wordListId));
  }, [hiddenWordLists]);

  // Achievements - guests use in-memory state
  const { data: apiAchievements } = useQuery<any[]>({
    queryKey: ["/api/achievements/user", user?.id],
    enabled: !!user && !isGuestMode,
  });
  
  const achievements = isGuestMode ? guestState.achievements : apiAchievements;

  // Head to Head Challenge queries - disabled for guests
  const { data: searchResults, isLoading: isSearchingUsers } = useQuery<any[]>({
    queryKey: ["/api/users/search", h2hOpponentSearch],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(h2hOpponentSearch)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: !isGuestMode && h2hOpponentSearch.length >= 2,
  });

  // Auto-scroll to search results when they appear
  useEffect(() => {
    if (searchResults && searchResults.length > 0 && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [searchResults]);

  const { data: pendingChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/pending"],
    enabled: !isGuestMode,
  });

  // Filter to get pending invitations for the current user (as opponent)
  const pendingInvitations = pendingChallenges?.filter((c: any) => c.opponentId === user?.id) || [];
  
  // Active challenges where it's the current user's turn to play
  const { data: activeChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/active"],
    enabled: !isGuestMode,
  });
  
  const myTurnChallenges = activeChallenges?.filter((c: any) => 
    (c.initiatorId === user?.id && !c.initiatorCompletedAt) ||
    (c.opponentId === user?.id && !c.opponentCompletedAt)
  ) || [];
  
  // Total pending actions (invitations + my turn games)
  const totalPendingH2H = pendingInvitations.length + myTurnChallenges.length;

  const { data: completedChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/completed"],
    enabled: !isGuestMode,
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: { opponentId: number; wordListId: number }) => {
      const response = await apiRequest("POST", "/api/challenges", data);
      return response.json();
    },
    onSuccess: (challenge: any) => {
      toast({
        title: "Challenge sent!",
        description: "Your opponent will be notified. You can now play your round!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      refreshNotifications();
      setH2hDialogOpen(false);
      // Navigate to game with challenge mode - include challengeId so results can be submitted
      if (h2hSelectedWordList && challenge?.id) {
        setLocation(`/game?listId=${h2hSelectedWordList}&mode=headtohead&isInitiator=true&challengeId=${challenge.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const acceptChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, wordListId }: { challengeId: number; wordListId: number }) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/accept`);
      return { data: await response.json(), wordListId, challengeId };
    },
    onSuccess: ({ wordListId, challengeId }) => {
      toast({
        title: "Challenge accepted!",
        description: "Let's play!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      refreshNotifications();
      setH2hDialogOpen(false);
      setLocation(`/game?listId=${wordListId}&mode=headtohead&challengeId=${challengeId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/decline`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge declined",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      refreshNotifications();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper to format player name
  const formatPlayerName = (firstName?: string | null, lastName?: string | null, username?: string) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName} (${username || 'Unknown'})`;
    }
    return username || 'Unknown';
  };

  // Helper function to get achievement for a word list
  const getAchievementForList = (wordListId: number) => {
    // For guest mode, use in-memory word list mastery data
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

  // Helper function to check if current mode has been completed
  const hasModeAchievement = (wordListId: number, mode: GameMode | null) => {
    if (!mode) return false;
    const achievement = getAchievementForList(wordListId);
    if (!achievement) return false;
    return achievement.completedModes?.includes(mode) || false;
  };

  const handleModeClick = (mode: GameMode) => {
    setSelectedMode(mode);
    setFilterGradeLevel("all");
    setFilterCreatedBy("all");
    setHideMastered(false);
    setGameWordCount("all");
    setWordListDialogOpen(true);
  };

  const startGameWithCustomList = (list: CustomWordList) => {
    if (!selectedMode) return;
    
    // For iOS: Focus hidden input BEFORE navigation to maintain gesture context
    // This allows the keyboard to open automatically when the game page loads
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                  (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (isIOS && iOSKeyboardInput?.current) {
      iOSKeyboardInput.current.focus();
    }
    
    // Close dialog and navigate
    // Note: Dialog's onCloseAutoFocus prevents focus restoration, keeping focus on hidden input
    setWordListDialogOpen(false);
    // Pass game word count for modes that support it (practice, quiz, scramble, mistake)
    const supportsGameLength = ["practice", "quiz", "scramble", "mistake"].includes(selectedMode);
    const gameCountParam = supportsGameLength ? `&gameCount=${gameWordCount}` : "";
    setLocation(`/game?listId=${list.id}&mode=${selectedMode}${gameCountParam}`);
  };

  const handleGenerateWordList = async () => {
    if (!generateGradeLevel || !selectedMode) return;
    
    // Validate and clamp word count on submit
    const parsedCount = parseInt(generateWordCountInput, 10);
    const wordCount = isNaN(parsedCount) ? 10 : Math.max(5, Math.min(100, parsedCount));
    
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/generated-word-lists/${generateGradeLevel}?count=${wordCount}`);
      if (!response.ok) throw new Error("Failed to generate word list");
      
      const data = await response.json();
      const words = data.words as string[];
      
      // For iOS keyboard
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      if (isIOS && iOSKeyboardInput?.current) {
        iOSKeyboardInput.current.focus();
      }
      
      // Close dialogs and navigate using virtualWords parameter
      setGenerateDialogOpen(false);
      setWordListDialogOpen(false);
      
      const virtualWordsParam = encodeURIComponent(words.join(','));
      const supportsGameLength = ["practice", "quiz", "scramble", "mistake"].includes(selectedMode);
      const gameCountParam = supportsGameLength ? `&gameCount=all` : "";
      setLocation(`/game?virtualWords=${virtualWordsParam}&mode=${selectedMode}${gameCountParam}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate word list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if user is a free account
  const isFreeAccount = user?.accountType === 'free';

  const allLists = useMemo(() => {
    const myLists = (customLists || []).map(list => ({ ...list, isMine: true }));
    
    // Free accounts only see their own lists - no public or shared lists
    if (isFreeAccount) {
      let filtered = myLists;
      
      if (filterGradeLevel !== "all") {
        filtered = filtered.filter(list => list.gradeLevel === filterGradeLevel);
      }
      if (hideMastered && achievements) {
        filtered = filtered.filter(list => {
          const achievement = getAchievementForList(list.id);
          return !achievement || achievement.achievementValue !== "3 Stars";
        });
      }
      
      return filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    }
    
    const pubLists = (publicLists || []).map(list => ({ ...list, isMine: false }));
    const shared = (sharedLists || []).map(list => ({ ...list, isMine: false, isShared: true }));
    const combined = [...myLists, ...pubLists, ...shared];
    
    // Remove duplicates (user's own public lists)
    const uniqueLists = combined.filter((list, index, self) => 
      index === self.findIndex(l => l.id === list.id)
    );
    
    // Apply filters
    let filtered = uniqueLists;
    
    // Filter out hidden lists for paid accounts (always applied in game mode selection)
    filtered = filtered.filter(list => !hiddenWordListIds.has(list.id));
    
    if (filterGradeLevel !== "all") {
      filtered = filtered.filter(list => list.gradeLevel === filterGradeLevel);
    }
    if (filterCreatedBy !== "all") {
      filtered = filtered.filter(list => list.authorUsername === filterCreatedBy);
    }
    if (hideMastered && achievements) {
      // Filter out word lists where user has earned 3 stars
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
  }, [customLists, publicLists, sharedLists, filterGradeLevel, filterCreatedBy, hideMastered, achievements, isFreeAccount, hiddenWordListIds]);

  const availableGradeLevels = useMemo(() => {
    const myLists = customLists || [];
    const pubLists = publicLists || [];
    const shared = sharedLists || [];
    const combined = [...myLists, ...pubLists, ...shared];
    const grades = new Set(combined.map(list => list.gradeLevel).filter(Boolean));
    return Array.from(grades).sort((a, b) => {
      const numA = parseInt(a || "0");
      const numB = parseInt(b || "0");
      return numA - numB;
    });
  }, [customLists, publicLists, sharedLists]);

  const availableAuthors = useMemo(() => {
    const myLists = customLists || [];
    const pubLists = publicLists || [];
    const shared = sharedLists || [];
    const combined = [...myLists, ...pubLists, ...shared];
    const authors = new Set(combined.map(list => list.authorUsername).filter(Boolean));
    return Array.from(authors).sort((a, b) => a!.localeCompare(b!));
  }, [customLists, publicLists, sharedLists]);

  // Show welcome dialog for first-time users
  useEffect(() => {
    if (!user) return;
    
    // Check if welcome has been shown for this user
    const welcomeShownKey = `welcomeShown_${user.id}`;
    const hasSeenWelcome = localStorage.getItem(welcomeShownKey);
    
    // Show welcome if:
    // 1. User hasn't seen it before (localStorage check)
    // 2. User has no custom word lists (first-time indicator)
    if (!hasSeenWelcome && customLists !== undefined && customLists.length === 0) {
      setWelcomeDialogOpen(true);
      // Mark as shown
      localStorage.setItem(welcomeShownKey, 'true');
    }
  }, [user, customLists]);

  const gameModes = [
    {
      id: "practice" as GameMode,
      name: "Practice",
      description: "Practice spelling words with immediate feedback",
      icon: Target,
      color: "text-blue-600",
    },
    {
      id: "timed" as GameMode,
      name: "Timed Challenge",
      description: "Spell as many words correctly in 60 seconds as you can!",
      icon: Clock,
      color: "text-orange-600",
    },
    {
      id: "quiz" as GameMode,
      name: "Quiz Mode",
      description: "Spell all the words in a list, then see your results",
      icon: Trophy,
      color: "text-purple-600",
    },
    {
      id: "scramble" as GameMode,
      name: "Word Scramble",
      description: "Drag and drop letter tiles to unscramble the word",
      icon: Shuffle,
      color: "text-green-600",
    },
    {
      id: "mistake" as GameMode,
      name: "Find the Mistake",
      description: "Identify the one misspelled word from four choices",
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      id: "crossword" as GameMode,
      name: "Crossword Puzzle",
      description: "Solve a crossword using spelling words and their pronunciations",
      icon: Grid3x3,
      color: "text-indigo-600",
    },
  ];

  return (
    <div 
      className="min-h-screen p-4 md:p-8 relative overflow-hidden"
    >
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
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto relative z-10"
      >
        <UserHeader />

        <div className="text-center mb-8 md:mb-12">
          <motion.div
            className="mb-2 flex justify-center overflow-hidden"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src={titleBanner} 
              alt="Spelling Playground" 
              className="w-full max-w-sm md:max-w-xl h-auto rounded-md"
              data-testid="img-title-banner"
            />
          </motion.div>
          <p className={`text-lg md:text-xl font-semibold ${textClasses.subtitle}`}>
            Master your spelling skills with fun, interactive challenges!
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-4 mb-8">
          <button
            onClick={() => setLocation("/stats")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-view-stats"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-purple-400 flex items-center justify-center p-2">
              <img 
                src={myStatsButton} 
                alt="My Stats" 
                className="h-full w-full object-contain"
              />
            </div>
          </button>
          {user?.accountType === 'free' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFeatureComparisonOpen(true)}
                  className="cursor-pointer rounded-full relative hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  data-testid="button-user-groups-locked"
                >
                  <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-gray-300 flex items-center justify-center p-2 opacity-50">
                    <img 
                      src={userGroupsButton} 
                      alt="User Groups" 
                      className="h-[95%] w-[95%] object-contain -mt-1 grayscale"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-gray-800/80 rounded-full p-2">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to see available features</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setLocation("/user-groups")}
              className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              data-testid="button-user-groups"
            >
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-blue-400 flex items-center justify-center p-2">
                <img 
                  src={userGroupsButton} 
                  alt="User Groups" 
                  className="h-[95%] w-[95%] object-contain -mt-1"
                />
              </div>
            </button>
          )}
          <button
            onClick={() => setLocation("/word-lists")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            data-testid="button-word-lists"
          >
            <img 
              src={wordListsButton} 
              alt="Word Lists" 
              className="h-24 md:h-28 w-auto"
            />
          </button>
          <button
            onClick={() => setLocation("/achievements")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-view-achievements"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-yellow-400 flex items-center justify-center p-2">
              <img 
                src={achievementsButton} 
                alt="Achievements" 
                className="h-full w-full object-contain"
              />
            </div>
          </button>
          <button
            onClick={() => setLocation("/star-shop")}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            data-testid="button-star-shop"
          >
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-orange-400 flex items-center justify-center p-2">
              <img 
                src={starShopButton} 
                alt="Star Shop" 
                className="h-full w-full object-contain -mt-1"
              />
            </div>
          </button>
          {user?.accountType === "family_parent" && (
            <button
              onClick={() => setLocation("/family")}
              className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              data-testid="button-my-family"
            >
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-purple-400 flex items-center justify-center p-2">
                <img 
                  src={myFamilyButton} 
                  alt="My Family" 
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          )}
          {user?.role === "admin" && (
            <button
              onClick={() => setLocation("/admin")}
              className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              data-testid="button-admin-dashboard"
            >
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 border-2 border-orange-400 flex items-center justify-center p-2">
                <img 
                  src={adminDashboardButton} 
                  alt="Admin Dashboard" 
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <h2 className={`text-2xl md:text-3xl font-bold text-center ${textClasses.sectionTitle}`}>
            Choose Your Game Mode
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {gameModes.map((mode, index) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <Card
                  className="hover:scale-110 transition-transform cursor-pointer h-full shadow-lg border-2 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => handleModeClick(mode.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleModeClick(mode.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid={`card-mode-${mode.id}`}
                >
                  <CardHeader className="space-y-1 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-8 h-8 ${mode.color}`} />
                      <CardTitle className="text-2xl">{mode.name}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {mode.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Head to Head Challenge Card */}
        <div className="mt-8">
          <div className="flex justify-center mb-6">
            <h2 className={`text-2xl md:text-3xl font-bold text-center ${textClasses.sectionTitle}`}>
              Challenge a Friend
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            {user?.accountType === 'free' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card
                      className="shadow-lg border border-gray-300 bg-gray-100 w-full sm:w-auto relative cursor-pointer opacity-60 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={() => setFeatureComparisonOpen(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFeatureComparisonOpen(true);
                        }
                      }}
                      data-testid="card-mode-headtohead-locked"
                    >
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-gray-800/80 rounded-full p-3">
                          <Lock className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <CardHeader className="space-y-1 flex-1 flex flex-col justify-center p-4">
                        <div className="flex items-center gap-3">
                          <Swords className="w-8 h-8 text-gray-400" />
                          <CardTitle className="text-2xl text-gray-500">Head to Head Challenge</CardTitle>
                        </div>
                        <CardDescription className="text-base text-gray-400">
                          Challenge a friend to a timed spelling duel.<br />The winner gets a star!
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see available features</p>
                  </TooltipContent>
                </Tooltip>

                {/* Locked H2H Challenge Results Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setFeatureComparisonOpen(true)}
                      className="bg-gray-100 rounded-lg border border-gray-300 shadow-lg p-2 cursor-pointer opacity-60 relative hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      data-testid="button-h2h-challenge-results-locked"
                    >
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-gray-800/80 rounded-full p-2">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <img 
                        src={h2hChallengeResultsButton} 
                        alt="H2H Challenge Results" 
                        className="w-28 h-auto grayscale"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see available features</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                {/* Head to Head Challenge Button */}
                <Card
                  className="hover:scale-105 transition-transform cursor-pointer shadow-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full sm:w-auto relative"
                  onClick={() => {
                    setH2hSelectedWordList(null);
                    setH2hSelectedOpponent(null);
                    setH2hOpponentSearch("");
                    queryClient.invalidateQueries({ queryKey: ["/api/challenges/pending"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/challenges/active"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/challenges/completed"] });
                    setH2hDialogOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid="card-mode-headtohead"
                >
                  {/* Notification dot for pending challenges */}
                  {totalPendingH2H > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 z-10" data-testid="badge-pending-h2h">
                      {totalPendingH2H}
                    </span>
                  )}
                  <CardHeader className="space-y-1 flex-1 flex flex-col justify-center p-4">
                    <div className="flex items-center gap-3">
                      <Swords className="w-8 h-8 text-orange-600" />
                      <CardTitle className="text-2xl text-gray-800">Head to Head Challenge</CardTitle>
                    </div>
                    <CardDescription className="text-base text-gray-600">
                      Challenge a friend to a timed spelling duel.<br />The winner gets a star!
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* H2H Challenge Results Button */}
                <div
                  className="hover:scale-105 transition-transform cursor-pointer bg-white rounded-lg border border-gray-300 dark:border-gray-600 shadow-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => setLocation("/head-to-head")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLocation("/head-to-head");
                    }
                  }}
                  data-testid="button-h2h-challenge-results"
                >
                  <img 
                    src={h2hChallengeResultsButton} 
                    alt="H2H Challenge Results" 
                    className="w-28 h-auto"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      <Dialog open={wordListDialogOpen} onOpenChange={setWordListDialogOpen}>
        <DialogContent 
          className="max-w-3xl max-h-[85vh] flex flex-col"
          onCloseAutoFocus={(e) => {
            // Prevent dialog from restoring focus when closing
            // This keeps focus on the hidden iOS keyboard trigger input
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">Choose Your Word List</DialogTitle>
            <DialogDescription>
              Select a word list to start playing
            </DialogDescription>
          </DialogHeader>

          <div className={`mb-4 grid grid-cols-1 gap-4 ${
            // Free accounts: 1 col for Grade only, 2 cols if Game Length shown
            // Paid accounts: 2 cols for Grade+Author, 3 cols if Game Length shown
            isFreeAccount 
              ? (selectedMode && ["practice", "quiz", "scramble", "mistake"].includes(selectedMode) ? "md:grid-cols-2" : "md:grid-cols-1")
              : (selectedMode && ["practice", "quiz", "scramble", "mistake"].includes(selectedMode) ? "md:grid-cols-3" : "md:grid-cols-2")
          }`}>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Grade Level</label>
              <Select 
                value={filterGradeLevel} 
                onValueChange={setFilterGradeLevel}
              >
                <SelectTrigger data-testid="filter-grade">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {availableGradeLevels.map((grade) => (
                    <SelectItem key={grade} value={grade || ""}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Hide Author filter for free accounts - they only see their own lists */}
            {!isFreeAccount && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Created By</label>
                <Select 
                  value={filterCreatedBy} 
                  onValueChange={setFilterCreatedBy}
                >
                  <SelectTrigger data-testid="filter-author">
                    <SelectValue placeholder="All Authors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Authors</SelectItem>
                    {availableAuthors.map((author) => (
                      <SelectItem key={author} value={author || ""}>
                        {author}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedMode && ["practice", "quiz", "scramble", "mistake"].includes(selectedMode) && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Game Length</label>
                <div className="flex gap-2">
                  <Button
                    variant={gameWordCount === "10" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGameWordCount("10")}
                    data-testid="button-game-length-10"
                    className="flex-1"
                  >
                    10 Words
                  </Button>
                  <Button
                    variant={gameWordCount === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGameWordCount("all")}
                    data-testid="button-game-length-all"
                    className="flex-1"
                  >
                    All Words
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hide-mastered" 
                checked={hideMastered}
                onCheckedChange={(checked) => setHideMastered(checked === true)}
                data-testid="checkbox-hide-mastered"
              />
              <label 
                htmlFor="hide-mastered" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Hide Word Lists I've Mastered
              </label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGenerateGradeLevel("");
                setGenerateWordCountInput("10");
                setGenerateDialogOpen(true);
              }}
              data-testid="button-generate-word-list"
              className="flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Generate Word List
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {allLists.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filterGradeLevel !== "all" 
                  ? "No word lists match your filters" 
                  : "No word lists available"}
              </div>
            ) : (
              allLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center gap-2 p-2 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => startGameWithCustomList(list)}
                  data-testid={`card-word-list-${list.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate mb-0.5" data-testid={`text-list-name-${list.id}`}>
                      {list.name}
                    </div>
                    {list.gradeLevel && (
                      <div className="text-xs text-muted-foreground leading-tight" data-testid={`text-grade-${list.id}`}>
                        Grade {list.gradeLevel}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground leading-tight">
                      {list.words.length} words
                    </div>
                  </div>
                  
                  <AccuracyCard wordListId={list.id} gameMode={selectedMode || undefined} />
                  
                  {selectedMode && (
                    <div className="flex-shrink-0 flex justify-center items-center min-w-[80px]">
                      <img 
                        src={hasModeAchievement(list.id, selectedMode) ? oneStar : missingStar}
                        alt={hasModeAchievement(list.id, selectedMode) ? "Achievement earned" : "No achievement"} 
                        className="h-16 w-auto max-w-[80px] object-contain"
                        data-testid={`achievement-${list.id}`}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Word List Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Word List
            </DialogTitle>
            <DialogDescription>
              Create a random word list from grade-level vocabulary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Practice Mode</p>
              <p className="text-xs opacity-80">Generated word lists track your stats, but stars and achievements are not earned.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Grade Level</label>
              <Select value={generateGradeLevel} onValueChange={setGenerateGradeLevel}>
                <SelectTrigger data-testid="select-grade-level">
                  <SelectValue placeholder="Select a grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels?.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Number of Words</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={generateWordCountInput}
                onChange={(e) => setGenerateWordCountInput(e.target.value.replace(/[^0-9]/g, ''))}
                data-testid="input-word-count"
              />
              <p className="text-xs text-muted-foreground mt-1">Between 5 and 100 words</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleGenerateWordList}
                disabled={!generateGradeLevel || isGenerating}
                className="flex-1"
                data-testid="button-start-generated"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Start"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(false)}
                data-testid="button-cancel-generate"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Dialog for First-Time Users */}
      <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome to Spelling Playground!</DialogTitle>
            <DialogDescription className="text-base pt-4">
              We're excited to have you here! Get started by creating your first Custom Word List.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Custom Word Lists let you practice spelling with words that matter to you. Add your own words, 
              and we'll help you learn them through fun games and challenges!
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setWelcomeDialogOpen(false);
                  setLocation("/word-lists");
                }}
                className="flex-1"
                data-testid="button-create-word-list"
              >
                <List className="w-4 h-4 mr-2" />
                Create Word List
              </Button>
              <Button
                variant="outline"
                onClick={() => setWelcomeDialogOpen(false)}
                data-testid="button-close-welcome"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Head to Head Challenge Setup Dialog */}
      <Dialog open={h2hDialogOpen} onOpenChange={setH2hDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Swords className="w-6 h-6 text-orange-600" />
              Head to Head Challenge
            </DialogTitle>
            <DialogDescription>
              Challenge a friend to a spelling duel! Select a word list and opponent to begin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4 flex-1 overflow-y-auto">
            {/* Pending Invitations - shown if there are any */}
            {(pendingInvitations.length > 0 || myTurnChallenges.length > 0) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Pending Challenges
                </h4>
                
                {/* Incoming invitations */}
                {pendingInvitations.map((challenge: any) => (
                  <Card key={challenge.id} className="border-orange-300 dark:border-orange-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {formatPlayerName(challenge.initiatorFirstName, challenge.initiatorLastName, challenge.initiatorUsername)} challenged you!
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            Word List: {challenge.wordListName || 'Unknown'}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => acceptChallengeMutation.mutate({ challengeId: challenge.id, wordListId: challenge.wordListId })}
                            disabled={acceptChallengeMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`button-accept-challenge-${challenge.id}`}
                          >
                            {acceptChallengeMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Accept"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineChallengeMutation.mutate(challenge.id)}
                            disabled={declineChallengeMutation.isPending}
                            data-testid={`button-decline-challenge-${challenge.id}`}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Active games - my turn to play */}
                {myTurnChallenges.map((challenge: any) => (
                  <Card key={challenge.id} className="border-blue-300 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            vs {challenge.initiatorId === user?.id 
                              ? formatPlayerName(challenge.opponentFirstName, challenge.opponentLastName, challenge.opponentUsername)
                              : formatPlayerName(challenge.initiatorFirstName, challenge.initiatorLastName, challenge.initiatorUsername)}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            Word List: {challenge.wordListName || 'Unknown'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setH2hDialogOpen(false);
                            setLocation(`/game?listId=${challenge.wordListId}&mode=headtohead&challengeId=${challenge.id}`);
                          }}
                          data-testid={`button-play-challenge-${challenge.id}`}
                        >
                          Play Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Create a New Challenge Section */}
            <h4 className="font-semibold text-orange-600 flex items-center gap-2" data-testid="text-create-challenge-heading">
              <Swords className="w-4 h-4" />
              Create a New Challenge
            </h4>

            {/* Scoring Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Scoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>+10 points for each correct word</li>
                <li>-5 points for each incorrect word</li>
                <li>-1 point for every second of time taken</li>
                <li className="font-medium text-foreground pt-2">Winner earns 1 star!</li>
              </ul>
            </div>

            {/* Step 1: Select Word List */}
            <div className="space-y-3">
              <label className="text-sm font-medium">1. Select Word List</label>
              <Select 
                value={h2hSelectedWordList?.toString() || ""} 
                onValueChange={(val) => setH2hSelectedWordList(parseInt(val))}
              >
                <SelectTrigger data-testid="select-h2h-wordlist">
                  <SelectValue placeholder="Choose a word list..." />
                </SelectTrigger>
                <SelectContent>
                  {allLists.map((list) => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      {list.name} ({list.words.length} words)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Search for Opponent */}
            <div className="space-y-3">
              <label className="text-sm font-medium">2. Search for Opponent</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={h2hOpponentSearch}
                  onChange={(e) => {
                    setH2hOpponentSearch(e.target.value);
                    setH2hSelectedOpponent(null);
                  }}
                  className="pl-10"
                  data-testid="input-h2h-opponent-search"
                />
              </div>

              {/* Search Results */}
              {h2hOpponentSearch.length >= 2 && (
                <div ref={searchResultsRef} className="border rounded-lg max-h-48 overflow-y-auto">
                  {isSearchingUsers ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="divide-y">
                      {searchResults
                        .filter((u: any) => u.id !== user?.id)
                        .map((result: any) => (
                          <button
                            key={result.id}
                            onClick={() => setH2hSelectedOpponent(result)}
                            className={`w-full p-3 text-left hover-elevate flex items-center gap-3 ${
                              h2hSelectedOpponent?.id === result.id ? 'bg-primary/10' : ''
                            }`}
                            data-testid={`button-select-opponent-${result.id}`}
                          >
                            <AvatarDisplay avatar={result.selectedAvatar} size="md" />
                            <div className="flex-1">
                              <div className="font-medium">{result.username}</div>
                              {(result.firstName || result.lastName) && (
                                <div className="text-sm text-muted-foreground">
                                  {formatPlayerNamePrivate(result.firstName, result.lastName)}
                                </div>
                              )}
                            </div>
                            {h2hSelectedOpponent?.id === result.id && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No users found matching "{h2hOpponentSearch}"
                    </div>
                  )}
                </div>
              )}

              {/* Selected Opponent Display */}
              {h2hSelectedOpponent && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AvatarDisplay avatar={h2hSelectedOpponent.selectedAvatar} size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground">Challenging:</div>
                        <div className="font-semibold">{h2hSelectedOpponent.username}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setH2hSelectedOpponent(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Start Challenge Button */}
          <div className="pt-4 border-t">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
              disabled={!h2hSelectedWordList || !h2hSelectedOpponent || createChallengeMutation.isPending}
              onClick={() => {
                if (h2hSelectedWordList && h2hSelectedOpponent) {
                  createChallengeMutation.mutate({
                    opponentId: h2hSelectedOpponent.id,
                    wordListId: h2hSelectedWordList,
                  });
                }
              }}
              data-testid="button-start-challenge"
            >
              {createChallengeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Challenge...
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 mr-2" />
                  Start Challenge
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature Comparison Dialog */}
      <FeatureComparisonDialog 
        open={featureComparisonOpen} 
        onOpenChange={setFeatureComparisonOpen} 
      />
    </div>
  );
}
