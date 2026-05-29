import { ShieldCheck, Lock, Heart } from "lucide-react";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full">
      {/* ── Barra de confiança (topo) ─────────────────────────── */}
      <div className="bg-primary py-1.5 text-center text-xs font-semibold text-white">
        <span className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Campanha verificada · Doação 100% segura via PIX oficial
          <Lock className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* ── Barra principal ───────────────────────────────────── */}
      <div className="border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[var(--shadow-trust)]">
        <div className="container flex h-14 items-center justify-between gap-4">
          {/* Logo / identidade da campanha */}
          <a href="/" className="flex items-center gap-2" aria-label="Campanha Duda AME">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Heart className="h-4 w-4 fill-white text-white" />
            </span>
            <span className="font-display text-base font-bold text-foreground leading-tight hidden sm:block">
              Ajude a <span className="text-primary">Duda</span>
            </span>
          </a>

          {/* Prova social rápida — desktop */}
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <span className="font-bold text-foreground">2.843</span> pessoas já doaram
            <Heart className="h-4 w-4 fill-primary text-primary animate-pulse-soft" />
          </div>

          {/* CTA sempre visível */}
          <a
            href="#doe-agora"
            className="btn-primary px-4 py-2 text-sm"
            id="header-cta"
          >
            Quero Ajudar 💛
          </a>
        </div>
      </div>
    </header>
  );
};
