import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Checkout from "./Checkout";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const EXPECTED = [25, 35, 50, 70, 100, 150, 200, 250];
const BIG = 350;
const FORBIDDEN = [60, 75, 90, 125, 175, 400, 500, 750, 1000];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/checkout?valor=70"]}>
      <Checkout />
    </MemoryRouter>,
  );

describe("Checkout — presets e textos", () => {
  it("mostra título com 'pequena Duda' (não Celeste)", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/pequena Duda/i);
    expect(screen.queryByText(/Celeste/i)).toBeNull();
  });

  it("renderiza os 8 presets esperados", () => {
    renderPage();
    EXPECTED.forEach((v) => {
      expect(
        screen.getByRole("button", { name: new RegExp(`^R\\$\\s*${v}(?:\\.0{3})?,00$`) }),
      ).toBeInTheDocument();
    });
  });

  it("renderiza R$350 como botão grande", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: new RegExp(`^R\\$\\s*${BIG},00$`, "i") }),
    ).toBeInTheDocument();
  });

  it("não exibe presets antigos/proibidos", () => {
    renderPage();
    FORBIDDEN.forEach((v) => {
      const btn = screen.queryByRole("button", {
        name: new RegExp(`^R\\$\\s*${v}(\\.|,)?\\d*\\s*$`),
      });
      expect(btn, `preset proibido R$${v} apareceu`).toBeNull();
    });
  });
});
