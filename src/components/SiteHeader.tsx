import { ShieldCheck, Heart } from "lucide-react";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Barra de credibilidade — discreta, uma linha */}
      <div className="bg-primary/95 py-1 text-center text-[11px] font-medium tracking-wide text-white/90">
        <span className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3 w-3 opacity-70" />
          Campanha verificada · Doação segura via PIX
        </span>
      </div>

      {/* Header principal */}
      <div className="border-b border-border/60 bg-white/98 backdrop-blur-sm">
        <div className="container flex h-12 items-center justify-between">
          {/* Identidade */}
          <a href="/" className="flex items-center gap-2" aria-label="Campanha Duda">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-display text-lg text-foreground">
              Ajude a Duda
            </span>
          </a>

          {/* CTA — sem emoji, direto */}
          <a
            href="#doe-agora"
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            id="header-cta"
          >
            Doar agora
          </a>
        </div>
      </div>
    </header>
  );
};
