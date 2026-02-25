import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Home, School, CreditCard, CheckCircle, Loader2, ArrowRight, ArrowLeft, ShieldCheck, FileText, Lock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "live.com", "msn.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "ymail.com", "googlemail.com",
  "mail.com", "zoho.com", "gmx.com", "tutanota.com", "fastmail.com",
  "yahoo.co.uk", "hotmail.co.uk", "yahoo.ca",
];

function isSchoolEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

const accountSchema = z.object({
  schoolName: z.string().min(1, "School name is required").max(200),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address").refine(
    isSchoolEmail,
    "Please use your school-issued email address (not Gmail, Yahoo, Hotmail, etc.)"
  ),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const legalSchema = z.object({
  agreedToTos: z.boolean().refine((val) => val === true, {
    message: "You must agree to the School Terms of Service to continue",
  }),
  agreedToDpa: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Student Data Privacy Addendum to continue",
  }),
  certifiedCoppa: z.boolean().refine((val) => val === true, {
    message: "You must certify your COPPA authorization to continue",
  }),
});

type AccountFormData = z.infer<typeof accountSchema>;
type LegalFormData = z.infer<typeof legalSchema>;

interface SchoolSignupResponse {
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    accountType: string;
    stars: number;
  };
  school: {
    id: number;
    schoolName: string;
    verificationStatus: string;
  };
  requiresPayment: boolean;
}

const STEPS = [
  { label: "Details", icon: School },
  { label: "Legal", icon: FileText },
  { label: "Verify", icon: CreditCard },
  { label: "Done", icon: CheckCircle },
] as const;

export default function SchoolSignupPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [accountData, setAccountData] = useState<AccountFormData | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolSignupResponse | null>(null);

  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      schoolName: "",
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const legalForm = useForm<LegalFormData>({
    resolver: zodResolver(legalSchema),
    defaultValues: {
      agreedToTos: false,
      agreedToDpa: false,
      certifiedCoppa: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: AccountFormData & LegalFormData) => {
      const response = await apiRequest("POST", "/api/school/signup", {
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        schoolName: data.schoolName,
        agreedToTos: data.agreedToTos,
        agreedToDpa: data.agreedToDpa,
        certifiedCoppa: data.certifiedCoppa,
      });
      return response.json() as Promise<SchoolSignupResponse>;
    },
    onSuccess: (data) => {
      setSchoolData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/school/payment/confirm", {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Verified!", description: "Your school account is now active." });
      setStep(4);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitAccount = (data: AccountFormData) => {
    setAccountData(data);
    setStep(2);
  };

  const onSubmitLegal = (data: LegalFormData) => {
    if (!accountData) return;
    signupMutation.mutate({ ...accountData, ...data });
  };

  const handlePayment = () => {
    paymentMutation.mutate();
  };

  const goToSchoolDashboard = () => {
    setLocation("/school");
  };

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

      <div className="max-w-lg mx-auto space-y-6 relative z-10">
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
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-school-signup-title">
            Create School Account
          </h1>
          <p className={`mt-2 ${textClasses.subtitle}`}>
            Set up your school with teacher and student management
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {STEPS.map((s, idx) => {
            const stepNum = (idx + 1) as 1 | 2 | 3 | 4;
            const isActive = step === stepNum;
            const isComplete = step > stepNum;
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${stepNum}`}
              >
                {isComplete ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                {s.label}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>School Admin Account</CardTitle>
              <CardDescription>
                Create your school administrator account. You will use this to manage teachers and students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...accountForm}>
                <form onSubmit={accountForm.handleSubmit(onSubmitAccount)} className="space-y-4">
                  <FormField
                    control={accountForm.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Maple Elementary School" {...field} data-testid="input-school-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={accountForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith" {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={accountForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@school.edu" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">Must be a school-issued email, not Gmail or Yahoo</p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} data-testid="input-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="At least 6 characters" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Re-enter your password" {...field} data-testid="input-confirm-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="button-continue-to-legal"
                  >
                    Continue to Legal Acceptance
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Legal Acceptance
              </CardTitle>
              <CardDescription>
                By creating a school account you take on legal responsibility for student data
                and COPPA compliance. Please read and agree to each document below before
                proceeding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5 p-3 rounded-md bg-muted text-sm space-y-1">
                <p className="font-medium">Review the documents linked below before checking each box:</p>
                <ul className="space-y-1 mt-2">
                  <li>
                    <a
                      href="/legal/school-tos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:opacity-80"
                      data-testid="link-school-tos"
                    >
                      School Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="/legal/student-dpa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:opacity-80"
                      data-testid="link-student-dpa"
                    >
                      Student Data Privacy Addendum
                    </a>
                  </li>
                  <li>
                    <a
                      href="/legal/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:opacity-80"
                      data-testid="link-privacy-policy"
                    >
                      Privacy Policy
                    </a>
                  </li>
                </ul>
              </div>

              <Form {...legalForm}>
                <form onSubmit={legalForm.handleSubmit(onSubmitLegal)} className="space-y-4">
                  <FormField
                    control={legalForm.control}
                    name="agreedToTos"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-agree-tos"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium leading-tight cursor-pointer">
                            <FileText className="inline w-3.5 h-3.5 mr-1 text-primary" />
                            I have read and agree to the{" "}
                            <a
                              href="/legal/school-tos"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2"
                            >
                              School Terms of Service
                            </a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={legalForm.control}
                    name="agreedToDpa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-agree-dpa"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium leading-tight cursor-pointer">
                            <Lock className="inline w-3.5 h-3.5 mr-1 text-primary" />
                            I agree to the{" "}
                            <a
                              href="/legal/student-dpa"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2"
                            >
                              Student Data Privacy Addendum
                            </a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={legalForm.control}
                    name="certifiedCoppa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-coppa-certification"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium leading-tight cursor-pointer">
                            <ShieldCheck className="inline w-3.5 h-3.5 mr-1 text-primary" />
                            COPPA Authorization
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            I certify that I am an authorized representative of this school and am
                            legally permitted to create student accounts on behalf of the school
                            under COPPA and applicable law. The school assumes responsibility for
                            obtaining any required parental consents. The School represents and
                            warrants that it has obtained all necessary parental consents under
                            COPPA and applicable law.
                          </p>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                      data-testid="button-back-to-details"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={signupMutation.isPending}
                      data-testid="button-create-account"
                    >
                      {signupMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Adult Verification</CardTitle>
              <CardDescription>
                A nominal fee is charged to verify that you are an adult responsible for
                creating accounts for minors, in compliance with children's privacy laws.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p className="text-sm font-medium">Account created for:</p>
                <p className="text-sm text-muted-foreground">
                  {schoolData?.user.firstName} {schoolData?.user.lastName} ({schoolData?.user.email})
                </p>
                <p className="text-sm text-muted-foreground">
                  School: <span className="font-medium text-foreground">{schoolData?.school.schoolName}</span>
                </p>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center space-y-4">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-semibold text-lg">Adult Verification Fee: $0.99</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This one-time nominal charge confirms you are an adult setting up accounts for students
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  (Payment integration coming soon — click below to simulate verification)
                </p>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full"
                disabled={paymentMutation.isPending}
                data-testid="button-verify-payment"
              >
                {paymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Verify Payment (Simulated)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>School Account Ready!</CardTitle>
              <CardDescription>
                Your school account has been verified. You can now add teachers and students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">What's next?</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Go to your School Dashboard</li>
                  <li>Add teacher accounts for your educators</li>
                  <li>Add student accounts for your learners</li>
                  <li>Teachers can create and assign word lists</li>
                  <li>Track student progress across all game modes</li>
                </ul>
              </div>

              <Button
                onClick={goToSchoolDashboard}
                className="w-full"
                data-testid="button-go-to-dashboard"
              >
                <School className="w-4 h-4 mr-2" />
                Go to School Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
