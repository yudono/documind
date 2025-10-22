import React from "react";

interface BentoGridProps {
  className?: string;
  children: React.ReactNode;
}

export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div className={"grid gap-6 sm:grid-cols-2 lg:grid-cols-4 " + (className || "")}>{children}</div>
  );
}

interface BentoGridItemProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export function BentoGridItem({ title, description, icon, className }: BentoGridItemProps) {
  return (
    <div className={(
      "relative rounded-2xl p-6 bg-white/80 backdrop-blur-sm border " +
      "border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 " +
      "hover:-translate-y-1"
    ) + (className ? ` ${className}` : "")}>
      <div className="flex items-center mb-4">
        {icon && <div className="mr-3">{icon}</div>}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
      <div className="absolute inset-0 -z-10 rounded-2xl" style={{
        background:
          "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))",
      }} />
    </div>
  );
}

export default BentoGrid;