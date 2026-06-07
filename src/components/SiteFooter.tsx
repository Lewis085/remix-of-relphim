import { Heart } from "lucide-react";

export const SiteFooter = () => {
  return (
    <footer className="mt-16 border-t border-border/60">

      {/* Bloco final emocional — sem repetir CTA agressivo */}
      <div className="bg-primary py-12 text-center text-white">
        <p className="font-display text-2xl sm:text-3xl">
          100% do valor arrecadado é gerenciado pelo Instituto Impacto Positivo
          e repassado integralmente à família da Kerlen.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/70 leading-relaxed">
          Você tem dúvidas? Fale com a equipe responsável pela campanha.
          <br className="hidden sm:block" />
          Ou compartilhe esta página e ajude a Kerlen a alcançar mais pessoas.
        </p>
        <a
          href="#doe-agora"
          className="mt-6 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
          id="footer-cta"
        >
          Quero ajudar
        </a>
      </div>

      {/* Legal — mínimo, discreto */}
      <div 
        className="bg-background py-4"
        style={{ paddingBottom: "calc(1rem + 5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="container text-center text-[11px] text-muted-foreground leading-relaxed lg:pb-0">
          <p>
            O conteúdo desta campanha é de responsabilidade da família organizadora.
            Doações processadas com segurança via PIX institucional.
          </p>
          <p className="mt-1 select-none pointer-events-none opacity-80 font-medium">
            Impacto Positivo — CNPJ: 49.190.870/0001-60
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 opacity-60">
            <Heart className="h-2.5 w-2.5" /> 2026
          </p>
        </div>
      </div>
    </footer>
  );
};
