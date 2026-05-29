import { Instagram, Facebook, Youtube } from "lucide-react";
import { VakinhaLogo } from "./VakinhaLogo";

const linkColumns = [
  {
    title: "Links rápidos",
    items: ["Quem somos", "Vaquinhas", "Criar vaquinhas", "Login", "Vaquinhas mais amadas", "Política de privacidade", "Termos de uso"],
  },
  {
    title: "Ajuda",
    items: ["Dúvidas frequentes", "Taxas e prazos", "Loja de corações", "Vakinha Premiada", "Blog do Vakinha", "Segurança e transparência", "Busca por recibo"],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="mt-12 bg-muted/40">
      <div className="border-y border-border bg-muted/60 py-3">
        <div className="container">
          <p className="text-xs text-muted-foreground">
            <strong>AVISO LEGAL:</strong> O texto e as imagens incluídos nessa página são de única e exclusiva responsabilidade do criador da vaquinha e não representam a opinião ou endosso da plataforma Vakinha.
          </p>
        </div>
      </div>

      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <VakinhaLogo />
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary">
              <Instagram className="h-5 w-5" />
            </a>
            <span className="h-4 w-px bg-border" />
            <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary">
              <Facebook className="h-5 w-5" />
            </a>
            <span className="h-4 w-px bg-border" />
            <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-primary">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="grid gap-8 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {linkColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-bold text-foreground">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-primary">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="mb-3 text-sm font-bold text-foreground">Fale conosco</h4>
            <p className="text-sm text-muted-foreground">Clique aqui para falar conosco</p>
            <p className="mt-3 text-xs text-muted-foreground">De Segunda à Sexta<br />Das 9:30 às 17:00</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
