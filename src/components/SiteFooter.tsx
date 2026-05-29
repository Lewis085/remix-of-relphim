import { ShieldCheck, Lock, Heart, CheckCircle2 } from "lucide-react";

const trustItems = [
  { icon: ShieldCheck, label: "Identidade verificada" },
  { icon: Lock,        label: "Pagamento 100% seguro" },
  { icon: CheckCircle2, label: "História verificada" },
];

export const SiteFooter = () => {
  return (
    <footer className="mt-16 border-t border-border bg-white">

      {/* ── Bloco de confiança ───────────────────────────────── */}
      <div className="section-soft py-8">
        <div className="container">
          <p className="mb-6 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Por que você pode confiar nesta campanha?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-5 w-5 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA final ────────────────────────────────────────── */}
      <div className="bg-primary py-10 text-center text-white">
        <p className="mb-1 font-display text-xl font-bold">
          Cada Real Faz a Diferença na Vida da Duda
        </p>
        <p className="mb-6 text-sm text-white/80">
          Doe qualquer valor. Rápido, seguro e via PIX.
        </p>
        <a href="#doe-agora" className="btn-primary inline-flex" id="footer-cta">
          Quero Ajudar Agora 💛
        </a>
      </div>

      {/* ── Rodapé legal ─────────────────────────────────────── */}
      <div className="bg-muted/50 py-4">
        <div className="container text-center text-xs text-muted-foreground">
          <p>
            <strong>Aviso:</strong> O conteúdo desta página é de responsabilidade exclusiva da família
            organizadora. Doações processadas com segurança via PIX.
          </p>
          <p className="mt-1 flex items-center justify-center gap-1">
            Feito com <Heart className="h-3 w-3 fill-primary text-primary" /> para salvar vidas
          </p>
        </div>
      </div>
    </footer>
  );
};
