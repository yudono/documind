"use client";

import React, { useEffect, useRef, useState } from "react";

interface SpotlightProps {
  className?: string;
  color?: string; // tailwind color hex or rgba
  size?: number; // px radius
  opacity?: number; // 0..1
  children?: React.ReactNode;
}

export function Spotlight({
  className,
  color = "rgba(59,130,246,0.25)", // blue-500 at 25%
  size = 600,
  opacity = 0.8,
  children,
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className={"relative overflow-hidden " + (className || "")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(${size}px ${size}px at ${pos.x}px ${pos.y}px, ${color}, rgba(0,0,0,0) 60%)`,
          opacity,
          mixBlendMode: "screen",
        }}
      />
      {children}
    </div>
  );
}

export default Spotlight;