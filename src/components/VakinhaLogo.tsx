import { Heart } from "lucide-react";

interface CampaignLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const VakinhaLogo = ({ className = "", size = "md" }: CampaignLogoProps) => {
  const sizes = {
    sm: { icon: "h-4 w-4", text: "text-base" },
    md: { icon: "h-5 w-5", text: "text-lg" },
    lg: { icon: "h-6 w-6", text: "text-2xl" },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="Campanha Duda AME">
      <Heart className={`${s.icon} text-primary`} />
      <span className={`font-display ${s.text} text-foreground`}>
        Ajude a Duda
      </span>
    </div>
  );
};
