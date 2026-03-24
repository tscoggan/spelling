import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Family accounts that haven't completed payment must finish signup before
  // accessing any protected page. Only redirect when vpcStatus is explicitly
  // non-verified (not when it's undefined, which means we haven't fetched it yet).
  const familyVpcStatus = (user as any).familyVpcStatus;
  const isFamilyAccount = user.accountType === 'family_parent' || user.accountType === 'family_child';
  if (isFamilyAccount && familyVpcStatus !== undefined && familyVpcStatus !== 'verified') {
    return (
      <Route path={path}>
        <Redirect to="/family/signup" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
