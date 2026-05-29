import { Heart } from "lucide-react";

interface CampaignLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Logo identitária da campanha — substituiu o VakinhaLogo.
 * Usa apenas Lucide Icons (já no projeto), sem dependência externa.
 */
export const VakinhaLogo = ({ className = "", size = "md" }: CampaignLogoProps) => {
  const sizes = {
    sm: { icon: "h-5 w-5", text: "text-base" },
    md: { icon: "h-6 w-6", text: "text-lg" },
    lg: { icon: "h-8 w-8", text: "text-2xl" },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="Campanha Duda AME">
      <span className={`flex items-center justify-center rounded-full bg-primary p-1.5`}>
        <Heart className={`${s.icon} fill-white text-white`} />
      </span>
      <span className={`font-display ${s.text} font-bold leading-none`}>
        Ajude a <span className="text-primary">Duda</span>
      </span>
    </div>
  );
};
