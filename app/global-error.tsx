"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold font-display">Something went wrong</h1>
            <p className="mt-3 text-muted-foreground">
              An unexpected error occurred. You can try again or go back.
            </p>

            {process.env.NODE_ENV !== "production" && (
              <p className="mt-3 text-xs text-muted-foreground">
                {error?.message}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}