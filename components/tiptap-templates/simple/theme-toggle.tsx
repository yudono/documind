"use client"

import * as React from "react"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"

// --- Icons ---
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false)

  // Force light mode regardless of system preference or toggles
  React.useEffect(() => {
    document.documentElement.classList.remove("dark")
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((isDark) => !isDark)

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={"Light mode"}
      data-style="ghost"
    >
      <SunIcon className="tiptap-button-icon" />
    </Button>
  )
}
