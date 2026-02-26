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
  | { status: "success"; accountType: "family_subscription" | "school_verification" }
  | { status: "error"; message: string };

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
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).error || "Payment could not be verified.");
        }
        setState({ status: "success", accountType: type });
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
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                If you were charged, please contact support. Otherwise, you can try again.
              </p>
              <Button className="w-full" onClick={() => setLocation("/")} data-testid="button-go-home">
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
                  ? "Your $5/year family subscription is active. You can now create child accounts and access all family features."
                  : "Your $0.99 adult verification is complete. Your school account is fully activated."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.accountType === "family_subscription" ? (
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
