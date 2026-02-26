import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Home, Users, CreditCard, CheckCircle, Loader2, ArrowRight, ArrowLeft, Tag, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface FamilySignupResponse {
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
  family: {
    id: number;
    vpcStatus: string;
  };
  requiresPayment: boolean;
}

export default function FamilySignupPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [familyData, setFamilyData] = useState<FamilySignupResponse | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoValid, setPromoValid] = useState<{ discountPercent: number; code: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const response = await apiRequest("POST", "/api/family/signup", {
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });
      return response.json() as Promise<FamilySignupResponse>;
    },
    onSuccess: (data) => {
      setFamilyData(data);
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

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", {
        type: "family_subscription",
        promoCode: promoValid?.code || undefined,
      });
      return response.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    setPromoError(null);
    setPromoValid(null);
    try {
      const res = await apiRequest("POST", "/api/promo-codes/validate", { code: promoCode.trim() });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || "Invalid code"); return; }
      setPromoValid({ discountPercent: data.discountPercent, code: data.code });
    } catch {
      setPromoError("Could not validate code");
    } finally {
      setPromoValidating(false);
    }
  };

  const onSubmitSignup = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const goToFamilyDashboard = () => {
    setLocation("/family");
  };

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
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-family-signup-title">
            Create Family Account
          </h1>
          <p className={`mt-2 ${textClasses.subtitle}`}>
            Set up your family account with parental consent verification
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
                <Users className="w-4 h-4" />
              ) : s === 2 ? (
                <CreditCard className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {s === 1 ? "Account" : s === 2 ? "Payment" : "Done"}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Parent Account Details</CardTitle>
              <CardDescription>
                Create your parent account. You'll use this to manage your family's child accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitSignup)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" />
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
                          <Input type="email" placeholder="parent@example.com" {...field} data-testid="input-email" />
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
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={signupMutation.isPending}
                    data-testid="button-continue-to-payment"
                  >
                    {signupMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Continue to Payment
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
              <CardTitle>Parental Consent Verification</CardTitle>
              <CardDescription>
                To comply with COPPA, we require a $5/year subscription to verify you are an adult with access to a credit card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p className="text-sm font-medium">Account created for:</p>
                <p className="text-sm text-muted-foreground">
                  {familyData?.user.firstName} {familyData?.user.lastName} ({familyData?.user.email})
                </p>
              </div>

              <div className="rounded-lg border p-5 text-center space-y-3">
                <CreditCard className="w-10 h-10 mx-auto text-primary" />
                <div>
                  <p className="font-semibold text-lg">Annual Subscription: $5/year</p>
                  {promoValid && (
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                      Promo applied: {promoValid.discountPercent}% off → ${(5 * (1 - promoValid.discountPercent / 100)).toFixed(2)}/year
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifies parental consent and unlocks all family features. Renews annually.
                  </p>
                </div>
              </div>

              {/* Promo Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Promo Code <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. AB3D-X7K2"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoValid(null); setPromoError(null); }}
                    className="font-mono uppercase"
                    data-testid="input-promo-code"
                    disabled={!!promoValid}
                  />
                  {promoValid ? (
                    <Button variant="outline" onClick={() => { setPromoValid(null); setPromoCode(""); }} data-testid="button-remove-promo">
                      Remove
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={validatePromo} disabled={!promoCode.trim() || promoValidating} data-testid="button-apply-promo">
                      {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  )}
                </div>
                {promoValid && <p className="text-sm text-green-600 dark:text-green-400">{promoValid.discountPercent}% discount applied!</p>}
                {promoError && <p className="text-sm text-destructive">{promoError}</p>}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  className="flex-1"
                  disabled={checkoutMutation.isPending}
                  data-testid="button-subscribe-stripe"
                >
                  {checkoutMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting...</>
                  ) : (
                    <><ExternalLink className="w-4 h-4 mr-2" /> Subscribe with Stripe</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You'll be taken to Stripe's secure checkout and returned here when done.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Family Account Created!</CardTitle>
              <CardDescription>
                Your parental consent has been verified. You can now create accounts for your children.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">What's next?</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Go to your Family Dashboard</li>
                  <li>Create accounts for each of your children</li>
                  <li>Children can log in with their own usernames and passwords</li>
                  <li>Track their progress and manage their accounts</li>
                </ul>
              </div>
              
              <Button
                onClick={goToFamilyDashboard}
                className="w-full"
                data-testid="button-go-to-dashboard"
              >
                <Users className="w-4 h-4 mr-2" />
                Go to Family Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
