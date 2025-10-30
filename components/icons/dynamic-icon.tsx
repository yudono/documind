import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: keyof typeof Icons;
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = Icons[name] as React.ComponentType<LucideProps>; // <<< cast sini

  if (!Icon) return null;

  return <Icon {...props} />;
}
