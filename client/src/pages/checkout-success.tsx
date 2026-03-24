import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, School, Users } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";
import { apiRequest } from "@/lib/queryClient";

type VerifyState =
  | { status: "loading" }
  | { status: "success"; accountType: "family_subscription" | "school_verification"; isLoggedIn: boolean }
  | { status: "error"; message: string; sessionLost?: boolean; accountType?: "family_subscription" | "school_verification" };

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const [state, setState] = useState<VerifyState>({ status: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const type = params.get("type") as "family_subscription" | "school_verification" | null;

    if (!sessionId || !type) {
      setState({ status: "error", message: "Missing payment session information." });
      return;
    }

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}&type=${encodeURIComponent(type)}`
        );
        if (res.status === 401) {
          setState({
            status: "error",
            message: "Your session expired while completing payment. Please log in to verify your payment.",
            sessionLost: true,
            accountType: type,
          });
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).error || "Payment could not be verified.");
        }
        // Check if the browser session is still alive
        const userRes = await fetch("/api/user", { credentials: "include" });
        const isLoggedIn = userRes.ok;
        setState({ status: "success", accountType: type, isLoggedIn });
      } catch (err: any) {
        setState({ status: "error", message: err.message || "Verification failed." });
      }
    })();
  }, []);

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

      <div className="max-w-md mx-auto relative z-10 pt-12">
        {state.status === "loading" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Verifying your payment&hellip;</p>
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we confirm your payment with Stripe.
              </p>
            </CardContent>
          </Card>
        )}

        {state.status === "error" && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle>Payment Verification Failed</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.sessionLost ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Log back in and you'll be taken directly to the payment step to complete your subscription.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setLocation(state.accountType === "school_verification" ? "/school/signup" : "/family/signup")}
                    data-testid="button-log-in-to-continue"
                  >
                    Log In to Continue
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Your account was not activated. You can retry your payment below. If you believe you were charged in error, please contact support.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/family/signup")}
                    data-testid="button-retry-payment"
                  >
                    Retry Payment
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/")}
                data-testid="button-go-home"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        )}

        {state.status === "success" && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>
                {state.accountType === "family_subscription"
                  ? "Family Account Activated!"
                  : "School Account Verified!"}
              </CardTitle>
              <CardDescription>
                {state.accountType === "family_subscription"
                  ? "Your family subscription is now active. You can create child accounts and access all family features."
                  : "Your $0.99 adult verification is complete. Your school account is fully activated."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!state.isLoggedIn ? (
                <>
                  <p className="text-sm text-center text-muted-foreground">
                    Your session expired during checkout, but your account has been activated. Please log in to access it.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/auth")}
                    data-testid="button-log-in-after-payment"
                  >
                    Log In to Access Your Account
                  </Button>
                </>
              ) : state.accountType === "family_subscription" ? (
                <Button
                  className="w-full"
                  onClick={() => setLocation("/family")}
                  data-testid="button-go-to-family-dashboard"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Go to Family Dashboard
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => setLocation("/school")}
                  data-testid="button-go-to-school-dashboard"
                >
                  <School className="w-4 h-4 mr-2" />
                  Go to School Dashboard
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/")}
                data-testid="button-go-home"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
