import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Checkout from "./Checkout";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const renderCheckout = (valor = "0") =>
  render(
    <MemoryRouter initialEntries={[`/checkout?valor=${valor}`]}>
      <Checkout />
    </MemoryRouter>,
  );

const getContribuir = () => screen.getByRole("button", { name: /contribuir/i });

describe("Checkout — habilitação do botão Contribuir", () => {
  beforeEach(() => vi.clearAllMocks());

  it("começa desabilitado quando não há preset nem order bump selecionado", () => {
    renderCheckout("0");
    expect(getContribuir()).toBeDisabled();
  });

  it("habilita ao selecionar apenas um order bump (sem preset)", async () => {
    const user = userEvent.setup();
    renderCheckout("0");

    expect(getContribuir()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Multiplicador de impacto/i }));

    expect(getContribuir()).toBeEnabled();
    expect(screen.getByText(/Total:/i).parentElement).toHaveTextContent("R$ 10,00");
  });

  it("habilita ao selecionar apenas preset (sem order bump)", async () => {
    const user = userEvent.setup();
    renderCheckout("0");

    await user.click(screen.getByRole("button", { name: /^R\$\s*70,00$/ }));

    expect(getContribuir()).toBeEnabled();
  });

  it("permite combinar preset + múltiplos order bumps somando o total", async () => {
    const user = userEvent.setup();
    renderCheckout("0");

    await user.click(screen.getByRole("button", { name: /^R\$\s*100,00$/ }));
    await user.click(screen.getByRole("button", { name: /Multiplicador de impacto/i })); // +10
    await user.click(screen.getByRole("button", { name: /Brinquedo solidário/i })); // +15
    await user.click(screen.getByRole("button", { name: /Doar cesta básica/i })); // +20

    expect(getContribuir()).toBeEnabled();
    // 100 + 10 + 15 + 20 = 145
    expect(screen.getByText("R$ 145,00")).toBeInTheDocument();
  });

  it("nunca ultrapassa R$400 mesmo com maior preset + todos os bumps", async () => {
    const user = userEvent.setup();
    renderCheckout("0");

    // R$350 + todos os bumps (10 + 15 + 20) = 395 -> dentro do teto de 400
    await user.click(screen.getByRole("button", { name: /^R\$\s*350,00$/ }));
    await user.click(screen.getByRole("button", { name: /Multiplicador de impacto/i }));
    await user.click(screen.getByRole("button", { name: /Brinquedo solidário/i }));
    await user.click(screen.getByRole("button", { name: /Doar cesta básica/i }));

    expect(getContribuir()).toBeEnabled();
    expect(screen.getByText("R$ 395,00")).toBeInTheDocument();
    expect(screen.queryByText(/Valor máximo/i)).toBeNull();
  });
});
