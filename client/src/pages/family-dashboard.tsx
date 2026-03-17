import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Home, Users, Plus, Loader2, UserPlus, Pencil, Trash2, CheckCircle, XCircle, Star, Gamepad2, Calendar, CreditCard } from "lucide-react";
import { UserHeader } from "@/components/user-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const noPersonalInfoUsername = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50)
  .refine((val) => !/@/.test(val), { message: "Username must not look like an email address" })
  .refine((val) => !/\d{7,}/.test(val), { message: "Username must not contain a phone number or long number sequence" })
  .refine((val) => !/^[a-z]+ [a-z]+$/i.test(val), { message: "Username must not be a full name" });

const childSchema = z.object({
  username: noPersonalInfoUsername,
  password: z.string().min(4, "Password must be at least 4 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
});

type ChildFormData = z.infer<typeof childSchema>;

type DateFilter = "all" | "month" | "week" | "today";

interface FamilyMember {
  id: number;
  userId: number;
  role: string;
  status: string;
  user: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    stars: number;
    accountType: string;
    gamesPlayed: number;
    lastActive: string | null;
    starsEarned: number;
    accuracy: number;
  };
}

interface FamilyData {
  family: {
    id: number;
    primaryParentUserId: number;
    vpcStatus: string;
    createdAt: string;
  };
  members: FamilyMember[];
  isParent: boolean;
}

const dateFilterLabels: { [key in DateFilter]: string } = {
  all: "All Time",
  month: "Last 30 Days",
  week: "Last 7 Days",
  today: "Today",
};

export default function FamilyDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<FamilyMember | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  
  const form = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const { data: familyData, isLoading, error } = useQuery<FamilyData>({
    queryKey: ["/api/family", dateFilter],
    queryFn: async () => {
      const response = await fetch(`/api/family?dateFilter=${dateFilter}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch family data");
      }
      return response.json();
    },
  });

  const createChildMutation = useMutation({
    mutationFn: async (data: ChildFormData) => {
      const response = await apiRequest("POST", "/api/family/children", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Child account created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setIsAddChildOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create child account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ childId, data }: { childId: number; data: Partial<ChildFormData> }) => {
      const response = await apiRequest("PATCH", `/api/family/children/${childId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Child account updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setEditingChild(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update child account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeChildMutation = useMutation({
    mutationFn: async (childId: number) => {
      const response = await apiRequest("DELETE", `/api/family/children/${childId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Child account deleted", description: "The account and all associated data have been permanently removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete child account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [subscribePlanType, setSubscribePlanType] = useState<"monthly" | "yearly">("yearly");

  const startSubscriptionMutation = useMutation({
    mutationFn: async (priceInterval: "monthly" | "yearly") => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", {
        type: "family_subscription",
        priceInterval,
      });
      return response.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitChild = (data: ChildFormData) => {
    createChildMutation.mutate(data);
  };

  const children = familyData?.members.filter(m => m.role === "child") || [];
  const parents = familyData?.members.filter(m => m.role === "parent") || [];
  
  const handleOpenAddChild = (open: boolean) => {
    if (open) {
      form.reset({
        username: "",
        password: "",
        firstName: "",
      });
    }
    setIsAddChildOpen(open);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !familyData) {
    return (
      <div className="min-h-screen p-4 relative">
        <div className="max-w-lg mx-auto mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Not a Family Member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You are not currently part of a family account. Would you like to create one?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-home">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Button onClick={() => setLocation("/family/signup")} data-testid="button-create-family">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Family Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative">
      <div 
        className="fixed inset-0 landscape:hidden portrait:block"
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

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
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
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-family-dashboard-title">
            Family Dashboard
          </h1>
          <p className={`mt-2 ${textClasses.subtitle}`}>
            Manage your family's accounts and track progress
          </p>
        </div>

        {familyData.isParent && familyData.family.vpcStatus !== "verified" && (
          <Card className="border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CreditCard className="w-5 h-5" />
                Complete Your Subscription
              </CardTitle>
              <CardDescription>
                Your family account is not yet active. Choose a plan below to unlock all features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={subscribePlanType === "monthly" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSubscribePlanType("monthly")}
                  data-testid="button-dashboard-plan-monthly"
                >
                  $1.99 / month
                </Button>
                <Button
                  variant={subscribePlanType === "yearly" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSubscribePlanType("yearly")}
                  data-testid="button-dashboard-plan-yearly"
                >
                  $19.99 / year
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={() => startSubscriptionMutation.mutate(subscribePlanType)}
                disabled={startSubscriptionMutation.isPending}
                data-testid="button-dashboard-subscribe"
              >
                {startSubscriptionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Subscribe via Stripe
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You'll be taken to Stripe's secure checkout page.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Family Status
                </CardTitle>
                <CardDescription>Your family account information</CardDescription>
              </div>
              <Badge variant={familyData.family.vpcStatus === "verified" ? "default" : "secondary"}>
                {familyData.family.vpcStatus === "verified" ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </>
                ) : (
                  "Pending Verification"
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Parent(s)</p>
                <p className="font-medium">
                  {parents.map(p => p.user.firstName || p.user.username).join(", ")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Children</p>
                <p className="font-medium">{children.length} account(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Children's Accounts</CardTitle>
                <CardDescription>Manage accounts for your children</CardDescription>
              </div>
              {familyData.isParent && familyData.family.vpcStatus === "verified" && (
                <Dialog open={isAddChildOpen} onOpenChange={handleOpenAddChild}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-child">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Child
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Child Account</DialogTitle>
                      <DialogDescription>
                        Create a new account for your child. They'll use these credentials to log in.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitChild)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Emma" {...field} data-testid="input-child-first-name" />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">For privacy, please avoid entering your child's full legal name.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="emma_speller" {...field} data-testid="input-child-username" />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Choose a fun nickname. Do not use your child's real name, email address, or phone number.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <PasswordInput placeholder="At least 4 characters" {...field} data-testid="input-child-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="rounded-md bg-muted/60 border p-3 text-xs text-muted-foreground leading-relaxed">
                          By creating a child profile, you consent to the collection and use of your child's information (first name, grade level, username, and spelling activity data) as described in our{" "}
                          <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors" data-testid="link-add-child-privacy-policy">
                            Privacy Policy
                          </a>
                          . We do not show ads or sell personal data.
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createChildMutation.isPending} data-testid="button-create-child">
                            {createChildMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Create Account
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No children's accounts yet</p>
                {familyData.family.vpcStatus !== "verified" && (
                  <p className="text-sm mt-2">Complete payment verification to add children</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end mb-4 gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <SelectTrigger className="w-40" data-testid="select-date-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(dateFilterLabels) as DateFilter[]).map((key) => (
                        <SelectItem key={key} value={key} data-testid={`select-date-${key}`}>
                          {dateFilterLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Stars Earned</TableHead>
                    <TableHead className="text-right">Games Played</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                    <TableHead>Last Active</TableHead>
                    {familyData.isParent && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => (
                    <TableRow key={child.id} data-testid={`row-child-${child.userId}`}>
                      <TableCell>
                        {child.user.firstName || "-"}
                      </TableCell>
                      <TableCell className="font-medium">{child.user.username}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {child.user.starsEarned}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                          {child.user.gamesPlayed}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {child.user.accuracy}%
                      </TableCell>
                      <TableCell>
                        {child.user.lastActive
                          ? new Date(child.user.lastActive).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      {familyData.isParent && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingChild(child)}
                              data-testid={`button-edit-child-${child.userId}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-remove-child-${child.userId}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Child Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {child.user.username}'s account and all their game progress, scores, and data. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeChildMutation.mutate(child.userId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingChild} onOpenChange={(open) => !open && setEditingChild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Child Account</DialogTitle>
            <DialogDescription>
              Update {editingChild?.user.username}'s account details
            </DialogDescription>
          </DialogHeader>
          {editingChild && (
            <EditChildForm
              child={editingChild}
              onSubmit={(data) => updateChildMutation.mutate({ childId: editingChild.userId, data })}
              isPending={updateChildMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditChildForm({
  child,
  onSubmit,
  isPending,
}: {
  child: FamilyMember;
  onSubmit: (data: Partial<ChildFormData>) => void;
  isPending: boolean;
}) {
  const editSchema = z.object({
    firstName: z.string().max(100).optional(),
    password: z.string().min(4).optional().or(z.literal("")),
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: child.user.firstName || "",
      password: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof editSchema>) => {
    const updates: Partial<ChildFormData> = {};
    if (data.firstName) updates.firstName = data.firstName;
    if (data.password) updates.password = data.password;
    onSubmit(updates);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-edit-first-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password (leave blank to keep current)</FormLabel>
              <FormControl>
                <PasswordInput placeholder="New password" {...field} data-testid="input-edit-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-save-child">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
