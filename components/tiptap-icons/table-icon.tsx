import * as React from "react"

export const TableIcon = React.memo(
  ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        width="24"
        height="24"
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Outer border */}
        <rect x="3" y="4" width="18" height="16" rx="2" ry="2" fill="currentColor" />
        {/* Inner grid lines - use strokes by overlaying paths with background color holes */}
        <rect x="5" y="6" width="14" height="12" fill="white" />
        {/* Columns */}
        <rect x="5" y="6" width="4.666" height="12" fill="currentColor" opacity="0.15" />
        <rect x="9.666" y="6" width="4.666" height="12" fill="currentColor" opacity="0.15" />
        <rect x="14.332" y="6" width="4.668" height="12" fill="currentColor" opacity="0.15" />
        {/* Header row */}
        <rect x="5" y="6" width="14" height="3.5" fill="currentColor" opacity="0.25" />
        {/* Row separators */}
        <rect x="5" y="9.5" width="14" height="0.75" fill="currentColor" opacity="0.25" />
        <rect x="5" y="13" width="14" height="0.75" fill="currentColor" opacity="0.15" />
        <rect x="5" y="16.5" width="14" height="0.75" fill="currentColor" opacity="0.15" />
      </svg>
    )
  }
)

TableIcon.displayName = "TableIcon"