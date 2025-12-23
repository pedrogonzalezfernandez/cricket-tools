import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface NavButtonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  "data-testid"?: string;
}

export function NavButton({ icon: Icon, title, description, onClick, "data-testid": testId }: NavButtonProps) {
  return (
    <Button
      variant="nav"
      className="w-full py-5 px-6 h-auto flex flex-col items-center gap-1 rounded-xl"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-center justify-center gap-3 mb-1">
        <Icon className="w-5 h-5" />
        <span className="text-lg font-medium">{title}</span>
      </div>
      <p className="text-sm opacity-70 font-light">{description}</p>
    </Button>
  );
}
