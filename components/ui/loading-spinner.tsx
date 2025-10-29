import React from "react";

type LoadingSpinnerProps = {
  size?: number;
  className?: string;
};

export function LoadingSpinner({ size = 48, className }: LoadingSpinnerProps) {
  const px = `${size}px`;
  return (
    <div
      className={"animate-spin rounded-full border-b-2 border-primary " + (className || "")}
      style={{ width: px, height: px }}
    />
  );
}

export function FullPageLoader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children ?? <LoadingSpinner />}
    </div>
  );
}