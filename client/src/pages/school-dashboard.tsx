import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Home, School, Plus, Loader2, UserPlus, Trash2, CheckCircle, GraduationCap, Users, CreditCard, Receipt } from "lucide-react";
import { UserHeader } from "@/components/user-header";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const teacherSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

const studentSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(4, "Password must be at least 4 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastInitial: z.string().min(1, "Last initial is required").max(1, "Enter one letter only").regex(/^[a-zA-Z]$/, "Must be a single letter"),
});

type TeacherFormData = z.infer<typeof teacherSchema>;
type StudentFormData = z.infer<typeof studentSchema>;

interface SchoolMember {
  id: number;
  userId: number;
  role: string;
  status: string;
  user: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    stars: number;
  };
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

export default function SchoolDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);

  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  const teacherForm = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { username: "", password: "", firstName: "", lastName: "", email: "" },
  });

  const studentForm = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { username: "", password: "", firstName: "", lastInitial: "" },
  });

  const { data: schoolData, isLoading } = useQuery<SchoolData>({
    queryKey: ["/api/school/account"],
    refetchOnMount: "always",
  });

  const isAdmin = schoolData?.isAdmin ?? false;

  const { data: paymentsData } = useQuery<{ payments: SchoolPaymentRecord[] }>({
    queryKey: ["/api/school/payments"],
    enabled: isAdmin,
    refetchOnMount: "always",
  });

  const payments = paymentsData?.payments ?? [];

  const addTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
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
    mutationFn: async (data: StudentFormData) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative">
      <div
        className="fixed inset-0 landscape:hidden portrait:block"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
        }}
      ></div>
      <div
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${themeAssets.backgroundLandscape})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
        }}
      ></div>
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50"></div>

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        <header className="flex items-center justify-between mb-4">
          <Button
            variant="default"
            onClick={() => setLocation("/")}
            className="bg-white/90 dark:bg-black/70 text-foreground hover:bg-white dark:hover:bg-black/80 shadow-lg"
            data-testid="button-home"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <UserHeader />
        </header>

        <div className="text-center mb-6">
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-dashboard-title">
            School Dashboard
          </h1>
          {schoolData && (
            <p className={`mt-1 text-lg ${textClasses.subtitle}`}>
              {schoolData.school.schoolName}
            </p>
          )}
        </div>

        {schoolData && (
          <Card className="mb-2">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <School className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-semibold">{schoolData.school.schoolName}</p>
                    <p className="text-sm text-muted-foreground">
                      Admin: {user?.firstName} {user?.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{teachers.length}</p>
                    <p className="text-xs text-muted-foreground">Teachers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <Badge
                    variant={isVerified ? "default" : "secondary"}
                    className={isVerified ? "bg-green-500 hover:bg-green-500" : ""}
                    data-testid="badge-verification-status"
                  >
                    {isVerified ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Verified</>
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
          <Card className="border-amber-400/50">
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
              <GraduationCap className="w-4 h-4 mr-2" />
              Teachers ({teachers.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="flex-1" data-testid="tab-students">
              <Users className="w-4 h-4 mr-2" />
              Students ({students.length})
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="billing" className="flex-1" data-testid="tab-billing">
                <CreditCard className="w-4 h-4 mr-2" />
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
                  <Button
                    size="sm"
                    onClick={() => setAddTeacherOpen(true)}
                    data-testid="button-add-teacher"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Teacher
                  </Button>
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
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-remove-teacher-${member.id}`}
                              >
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
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                  <Button
                    size="sm"
                    onClick={() => setAddStudentOpen(true)}
                    data-testid="button-add-student"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
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
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-sm">
                              {member.user.firstName} {member.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-1">
                            <p className="text-xs font-medium">{member.user.stars} stars</p>
                          </div>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-remove-student-${member.id}`}
                                >
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
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </Tabs>

        <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground" data-testid="section-legal-footer">
          <span className="font-medium">Legal Documents:</span>
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
            data-testid="link-legal-terms"
          >
            Terms of Service
          </a>
          <a
            href="/legal/school-terms-addendum"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
            data-testid="link-legal-school-terms-addendum"
          >
            School Terms Addendum
          </a>
          <a
            href="/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
            data-testid="link-legal-privacy-policy"
          >
            Privacy Policy
          </a>
        </div>
      </div>

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
                <FormField
                  control={teacherForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane" {...field} data-testid="input-teacher-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teacherForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} data-testid="input-teacher-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={teacherForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="teacher@school.edu" {...field} data-testid="input-teacher-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={teacherForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="teacher_jane" {...field} data-testid="input-teacher-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={teacherForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="At least 6 characters" {...field} data-testid="input-teacher-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <FormField
                  control={studentForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex" {...field} data-testid="input-student-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="lastInitial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Initial</FormLabel>
                      <FormControl>
                        <Input placeholder="S" maxLength={1} {...field} data-testid="input-student-last-initial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={studentForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="alex_smith" {...field} data-testid="input-student-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={studentForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="At least 4 characters" {...field} data-testid="input-student-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
    </div>
  );
}
