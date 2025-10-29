"use client";

import Link from "next/link";
import { Home, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-destructive/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative z-10 text-center px-4">
        <div className="glass-card rounded-3xl p-12 max-w-2xl mx-auto border border-white/10 backdrop-blur-xl">
          {/* Icon */}
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-destructive/20 to-primary/20 backdrop-blur-sm border border-white/10">
            <ServerCrash className="w-12 h-12 text-destructive" />
          </div>

          {/* Error code */}
          <h1 className="text-8xl md:text-9xl font-display font-bold bg-gradient-to-br from-destructive via-destructive to-primary bg-clip-text text-transparent mb-4 animate-fade-up">
            500
          </h1>

          {/* Message */}
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4 animate-fade-up">
            Internal Server Error
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto animate-fade-up">
            Something went wrong on our end. Our team has been notified and
            we're working to fix it.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up">
            <Link href="/">
              <Button size="lg" className="group w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Back to Home
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto"
            >
              Try Again
            </Button>
          </div>

          {process.env.NODE_ENV !== "production" && (
            <p className="mt-6 text-xs text-muted-foreground">
              {error?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
