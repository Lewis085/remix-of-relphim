import { Search, Menu, ChevronDown } from "lucide-react";
import { VakinhaLogo } from "./VakinhaLogo";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="/" className="flex items-center" aria-label="Vakinha">
          <VakinhaLogo />
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {["Como ajudar", "Descubra", "Como funciona"].map((label) => (
            <button
              key={label}
              className="flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {label}
              <ChevronDown className="h-4 w-4" />
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <button className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary" aria-label="Buscar">
            <Search className="h-4 w-4" />
            <span>Buscar</span>
          </button>
          <button className="text-sm font-medium text-foreground/80 hover:text-primary">
            Minha conta
          </button>
          <button className="rounded-lg border-2 border-primary px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground">
            Criar vaquinha
          </button>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <button aria-label="Buscar">
            <Search className="h-5 w-5 text-foreground/70" />
          </button>
          <button aria-label="Menu">
            <Menu className="h-6 w-6 text-foreground/70" />
          </button>
        </div>
      </div>
    </header>
  );
};
