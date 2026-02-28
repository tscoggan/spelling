import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Home, Users, CreditCard, CheckCircle, Loader2, ArrowRight, ArrowLeft, Tag, ExternalLink, RefreshCw, Mail, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  family: { id: number; vpcStatus: string };
  requiresPayment: boolean;
}

const STEPS = [
  { label: "Account", icon: Users },
  { label: "Verify Email", icon: Mail },
  { label: "Consent", icon: Shield },
  { label: "Payment", icon: CreditCard },
  { label: "Done", icon: CheckCircle },
];

export default function FamilySignupPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [familyData, setFamilyData] = useState<FamilySignupResponse | null>(null);
  const [priceInterval, setPriceInterval] = useState<"month" | "year">(() => {
    const params = new URLSearchParams(search);
    return params.get("plan") === "month" ? "month" : "year";
  });
  const [autoRenew, setAutoRenew] = useState(true);
  const [promoCode, setPromoCode] = useState(() => {
    const params = new URLSearchParams(search);
    return params.get("promo") || "";
  });
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoValid, setPromoValid] = useState<{ discountPercent: number; code: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Email verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Legal consent state
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedParentalConsent, setAcceptedParentalConsent] = useState(false);

  const { data: existingAccount } = useQuery({
    queryKey: ["/api/family/account", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/family/account", { credentials: "include" });
      if (!res.ok) return null;
      return await res.json() as {
        vpcStatus: string;
        emailVerifiedAt: string | null;
        legalAcceptedAt: string | null;
      };
    },
    enabled: !!user && user.accountType === "family_parent",
  });

  useEffect(() => {
    if (!existingAccount) return;
    if (existingAccount.vpcStatus === "verified") {
      setLocation("/family");
      return;
    }
    if (existingAccount.vpcStatus === "pending" && step === 1) {
      if (existingAccount.legalAcceptedAt) {
        setStep(4);
        const params = new URLSearchParams(search);
        const urlPromo = params.get("promo");
        if (urlPromo && !promoValid) validatePromo(urlPromo);
      } else if (existingAccount.emailVerifiedAt) {
        setStep(3);
      } else {
        setStep(2);
      }
    }
  }, [existingAccount, step, setLocation]);

  // Auto-validate promo code when reaching step 4
  useEffect(() => {
    if (step === 4 && promoCode && !promoValid && !promoValidating) {
      validatePromo(promoCode);
    }
  }, [step]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const basePrice = priceInterval === "month" ? 1.99 : 19.99;
  const discountedPrice = promoValid
    ? basePrice * (1 - promoValid.discountPercent / 100)
    : basePrice;

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: "", password: "", confirmPassword: "", firstName: "", lastName: "", email: "" },
  });

  const validatePromo = async (codeOverride?: string) => {
    const code = (codeOverride ?? promoCode).trim();
    if (!code) return;
    setPromoValidating(true);
    setPromoError(null);
    setPromoValid(null);
    try {
      const res = await apiRequest("POST", "/api/promo-codes/validate", { code });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || "Invalid code"); return; }
      setPromoValid({ discountPercent: data.discountPercent, code: data.code });
    } catch {
      setPromoError("Could not validate code");
    } finally {
      setPromoValidating(false);
    }
  };

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const response = await apiRequest("POST", "/api/family/signup", {
        username: data.username, password: data.password,
        firstName: data.firstName, lastName: data.lastName, email: data.email,
      });
      return response.json() as Promise<FamilySignupResponse>;
    },
    onSuccess: (data) => {
      setFamilyData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep(2);
      sendVerificationCode();
    },
    onError: (error: Error) => {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    },
  });

  const sendVerificationCode = async () => {
    try {
      await apiRequest("POST", "/api/family/send-email-verification", {});
      setCodeSent(true);
      setResendCooldown(60);
    } catch {
      toast({ title: "Could not send verification email", description: "Please try again.", variant: "destructive" });
    }
  };

  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/family/verify-email", { code: verifyCode.trim() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/account", user?.id] });
      setStep(3);
    },
    onError: (err: Error) => setVerifyError(err.message),
  });

  const acceptLegalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/family/accept-legal", {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record consent");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/account", user?.id] });
      setStep(4);
    },
    onError: (err: Error) => {
      toast({ title: "Could not record consent", description: err.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", {
        type: "family_subscription", priceInterval,
        promoCode: promoValid?.code || undefined, autoRenew,
      });
      return response.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (error: Error) => {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    },
  });

  const displayFirstName = familyData?.user.firstName ?? user?.firstName ?? "";
  const displayLastName = familyData?.user.lastName ?? user?.lastName ?? "";
  const displayEmail = familyData?.user.email ?? (user as any)?.email ?? "";

  const allConsentsChecked = acceptedTos && acceptedPrivacy && acceptedParentalConsent;

  return (
    <div className="min-h-screen p-4 relative">
      <div className="fixed inset-0 landscape:hidden portrait:block" style={{ backgroundImage: `url(${themeAssets.backgroundPortrait})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center top" }} />
      <div className="fixed inset-0 portrait:hidden landscape:block" style={{ backgroundImage: `url(${themeAssets.backgroundLandscape})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center top" }} />
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50" />

      <div className="max-w-lg mx-auto space-y-6 relative z-10">
        <header className="flex items-center justify-start mb-4">
          <Button variant="default" onClick={() => setLocation("/")} className="bg-white/90 dark:bg-black/70 text-foreground hover:bg-white dark:hover:bg-black/80 shadow-lg" data-testid="button-home">
            <Home className="h-4 w-4 mr-2" /> Home
          </Button>
        </header>

        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${textClasses.headline}`} data-testid="text-family-signup-title">Create Family Account</h1>
          <p className={`mt-2 ${textClasses.subtitle}`}>Set up your family account in a few easy steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
          {STEPS.map((s, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4 | 5;
            const Icon = s.icon;
            return (
              <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                step === stepNum ? "bg-primary text-primary-foreground"
                  : step > stepNum ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step > stepNum ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Step 1: Account Creation */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Parent Account Details</CardTitle>
              <CardDescription>Create your parent account to manage your family's spelling practice.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => signupMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input placeholder="John" {...field} data-testid="input-first-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input placeholder="Smith" {...field} data-testid="input-last-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" placeholder="parent@example.com" {...field} data-testid="input-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input placeholder="Choose a username" {...field} data-testid="input-username" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="At least 6 characters" {...field} data-testid="input-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Re-enter your password" {...field} data-testid="input-confirm-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={signupMutation.isPending} data-testid="button-create-account">
                    {signupMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Email Verification */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <strong>{displayEmail}</strong>. Enter it below to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {codeSent && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm text-green-700 dark:text-green-300">
                  Verification code sent! Check your inbox (and spam folder).
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">6-Digit Code</label>
                <Input
                  placeholder="123456"
                  value={verifyCode}
                  onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setVerifyError(null); }}
                  className="font-mono text-center text-xl tracking-widest"
                  maxLength={6}
                  data-testid="input-verify-code"
                />
                {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
              </div>
              <Button
                className="w-full"
                onClick={() => verifyEmailMutation.mutate()}
                disabled={verifyCode.length !== 6 || verifyEmailMutation.isPending}
                data-testid="button-verify-email"
              >
                {verifyEmailMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : <>Verify Email <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Didn't receive it?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { sendVerificationCode(); setVerifyCode(""); setVerifyError(null); }}
                  disabled={resendCooldown > 0}
                  data-testid="button-resend-code"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Parental Consent */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Parental Consent Verification</CardTitle>
              <CardDescription>
                Because Spelling Playground is designed for children, we are required by law (COPPA) to obtain verifiable parental consent before collecting any information from your children. Please review and accept each item below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                Account: <strong className="text-foreground">{displayFirstName} {displayLastName}</strong>{displayEmail && ` (${displayEmail})`}
              </div>

              <div className="space-y-4">
                <div
                  className="flex items-start gap-3 p-3 rounded-md border cursor-pointer"
                  onClick={e => { if ((e.target as HTMLElement).closest('[role="checkbox"]')) return; setAcceptedTos(v => !v); }}
                  data-testid="container-tos"
                >
                  <Checkbox checked={acceptedTos} onCheckedChange={v => setAcceptedTos(v === true)} className="mt-0.5" data-testid="checkbox-tos" />
                  <span className="text-sm cursor-pointer leading-snug">
                    I agree to the{" "}
                    <a href="/legal/family-tos" target="_blank" rel="noopener noreferrer" className="underline text-primary" onClick={e => e.stopPropagation()}>
                      Terms of Service
                    </a>
                  </span>
                </div>

                <div
                  className="flex items-start gap-3 p-3 rounded-md border cursor-pointer"
                  onClick={e => { if ((e.target as HTMLElement).closest('[role="checkbox"]')) return; setAcceptedPrivacy(v => !v); }}
                  data-testid="container-privacy"
                >
                  <Checkbox checked={acceptedPrivacy} onCheckedChange={v => setAcceptedPrivacy(v === true)} className="mt-0.5" data-testid="checkbox-privacy" />
                  <span className="text-sm cursor-pointer leading-snug">
                    I have read and agree to the{" "}
                    <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-primary" onClick={e => e.stopPropagation()}>
                      Privacy Policy
                    </a>
                  </span>
                </div>

                <div
                  className="flex items-start gap-3 p-3 rounded-md border cursor-pointer"
                  onClick={e => { if ((e.target as HTMLElement).closest('[role="checkbox"]')) return; setAcceptedParentalConsent(v => !v); }}
                  data-testid="container-parental-consent"
                >
                  <Checkbox checked={acceptedParentalConsent} onCheckedChange={v => setAcceptedParentalConsent(v === true)} className="mt-0.5" data-testid="checkbox-parental-consent" />
                  <span className="text-sm cursor-pointer leading-snug">
                    I certify that I am the parent or legal guardian of any children who will use this service, and I consent to the collection of my child's information as described in the Privacy Policy.
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => acceptLegalMutation.mutate()}
                disabled={!allConsentsChecked || acceptLegalMutation.isPending}
                data-testid="button-accept-consent"
              >
                {acceptLegalMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Continue to Payment <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                All three boxes must be checked to continue. Your acceptance is logged with a timestamp for your records.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>
                Choose your plan and complete payment to activate your family account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                Account: <strong className="text-foreground">{displayFirstName} {displayLastName}</strong>{displayEmail && ` (${displayEmail})`}
              </div>

              {/* Plan selector */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose your plan:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPriceInterval("month")} data-testid="button-plan-monthly"
                    className={`rounded-lg border p-4 text-left transition-colors ${priceInterval === "month" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                    <p className="font-semibold text-base">Monthly</p>
                    {promoValid ? (
                      <div className="mt-1"><span className="text-sm line-through text-muted-foreground mr-1">$1.99</span><span className="text-xl font-bold text-green-600 dark:text-green-400">${(1.99 * (1 - promoValid.discountPercent / 100)).toFixed(2)}</span></div>
                    ) : (<p className="text-xl font-bold text-primary mt-1">$1.99</p>)}
                    <p className="text-xs text-muted-foreground">per month</p>
                  </button>
                  <button type="button" onClick={() => setPriceInterval("year")} data-testid="button-plan-annual"
                    className={`rounded-lg border p-4 text-left transition-colors relative ${priceInterval === "year" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                    <span className="absolute top-2 right-2 text-xs bg-green-500 text-white rounded px-1.5 py-0.5 font-medium">Save 16%</span>
                    <p className="font-semibold text-base">Annual</p>
                    {promoValid ? (
                      <div className="mt-1"><span className="text-sm line-through text-muted-foreground mr-1">$19.99</span><span className="text-xl font-bold text-green-600 dark:text-green-400">${(19.99 * (1 - promoValid.discountPercent / 100)).toFixed(2)}</span></div>
                    ) : (<p className="text-xl font-bold text-primary mt-1">$19.99</p>)}
                    <p className="text-xs text-muted-foreground">per year</p>
                  </button>
                </div>
                {promoValid && <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center">{promoValid.discountPercent}% off applied!</p>}
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
                    <Button variant="outline" onClick={() => { setPromoValid(null); setPromoCode(""); }} data-testid="button-remove-promo">Remove</Button>
                  ) : (
                    <Button variant="outline" onClick={() => validatePromo()} disabled={!promoCode.trim() || promoValidating} data-testid="button-apply-promo">
                      {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  )}
                </div>
                {promoValid && <p className="text-sm text-green-600 dark:text-green-400">{promoValid.discountPercent}% discount applied!</p>}
                {promoError && <p className="text-sm text-destructive">{promoError}</p>}
              </div>

              {/* Auto-renewal */}
              <div
                className="flex items-start gap-3 p-3 rounded-md border cursor-pointer"
                onClick={e => { if ((e.target as HTMLElement).closest('[role="checkbox"]')) return; setAutoRenew(v => !v); }}
                data-testid="checkbox-auto-renew-container"
              >
                <Checkbox id="auto-renew" checked={autoRenew} onCheckedChange={v => setAutoRenew(v === true)} data-testid="checkbox-auto-renew" className="mt-0.5" />
                <div>
                  <label htmlFor="auto-renew" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Auto-renew my subscription
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {autoRenew
                      ? `You will be charged $${discountedPrice.toFixed(2)} per ${priceInterval === "month" ? "month" : "year"} automatically. Cancel anytime in your account settings.`
                      : "Your subscription will end on the expiry date and will not be renewed automatically."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={() => checkoutMutation.mutate()} className="flex-1" disabled={checkoutMutation.isPending} data-testid="button-subscribe-stripe">
                  {checkoutMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting...</> : <><ExternalLink className="w-4 h-4 mr-2" /> Subscribe with Stripe</>}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You'll be taken to Stripe's secure checkout and returned here when done.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Family Account Created!</CardTitle>
              <CardDescription>Your account is active. You can now create accounts for your children.</CardDescription>
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
              <Button onClick={() => setLocation("/family")} className="w-full" data-testid="button-go-to-dashboard">
                <Users className="w-4 h-4 mr-2" /> Go to Family Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
