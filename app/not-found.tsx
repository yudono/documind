import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative z-10 text-center px-4">
        <div className="glass-card rounded-3xl p-12 max-w-2xl mx-auto border border-white/10 backdrop-blur-xl">
          {/* Icon */}
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm border border-white/10">
            <AlertCircle className="w-12 h-12 text-primary" />
          </div>

          {/* Error code */}
          <h1 className="text-8xl md:text-9xl font-display font-bold bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent mb-4 animate-fade-up">
            404
          </h1>

          {/* Message */}
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4 animate-fade-up">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto animate-fade-up">
            Oops! The page you're looking for doesn't exist. It might have been
            moved or deleted.
          </p>

          {/* Action button */}
          <Link href="/" className="animate-fade-up inline-block">
            <Button size="lg" className="group">
              <Home className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
