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
import { Home, School, CreditCard, CheckCircle, Loader2, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
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

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address").refine(
    isSchoolEmail,
    "Please use your school-issued email address (not Gmail, Yahoo, Hotmail, etc.)"
  ),
  schoolName: z.string().min(1, "School name is required").max(200),
  certifiedCoppa: z.boolean().refine((val) => val === true, {
    message: "You must certify that you are authorized to create accounts on behalf of your school",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

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

export default function SchoolSignupPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [schoolData, setSchoolData] = useState<SchoolSignupResponse | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      schoolName: "",
      certifiedCoppa: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const response = await apiRequest("POST", "/api/school/signup", {
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        schoolName: data.schoolName,
        certifiedCoppa: data.certifiedCoppa,
      });
      return response.json() as Promise<SchoolSignupResponse>;
    },
    onSuccess: (data) => {
      setSchoolData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep(2);
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
      setStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitSignup = (data: SignupFormData) => {
    signupMutation.mutate(data);
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

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? (
                <CheckCircle className="w-4 h-4" />
              ) : s === 1 ? (
                <School className="w-4 h-4" />
              ) : s === 2 ? (
                <CreditCard className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {s === 1 ? "Details" : s === 2 ? "Verify" : "Done"}
            </div>
          ))}
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitSignup)} className="space-y-4">
                  <FormField
                    control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@school.edu" {...field} data-testid="input-email" />
                        </FormControl>
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
                          <Input placeholder="Choose a username" {...field} data-testid="input-username" />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="At least 6 characters" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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

                  <FormField
                    control={form.control}
                    name="certifiedCoppa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3 mt-2">
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
                            I certify that I am an authorized representative of this school and am legally permitted to create student accounts on behalf of the school under COPPA and applicable law. The school assumes responsibility for obtaining any required parental consents. The School represents and warrants that it has obtained all necessary parental consents under COPPA and applicable law.
                          </p>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={signupMutation.isPending}
                    data-testid="button-continue-to-verify"
                  >
                    {signupMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Continue to Verification
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Adult Verification</CardTitle>
              <CardDescription>
                A nominal fee is charged to verify that you are an adult responsible for creating accounts for minors, in compliance with children's privacy laws.
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

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handlePayment}
                  className="flex-1"
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
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
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
