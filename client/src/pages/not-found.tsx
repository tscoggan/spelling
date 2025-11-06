import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 space-y-6">
          <div className="flex mb-4 gap-4 items-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-3xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="text-lg text-muted-foreground">
            Oops! The page you're looking for doesn't exist.
          </p>

          <Link href="/">
            <Button size="lg" className="w-full text-xl h-14" data-testid="button-back-home">
              <Home className="w-6 h-6 mr-2" />
              Go Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
