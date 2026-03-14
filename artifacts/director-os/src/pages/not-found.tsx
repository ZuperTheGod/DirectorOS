import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-8">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The cinematic sequence you're looking for doesn't exist on this timeline.
        </p>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow px-8 h-12 rounded-xl">
            Return to Studio
          </Button>
        </Link>
      </div>
    </div>
  );
}
