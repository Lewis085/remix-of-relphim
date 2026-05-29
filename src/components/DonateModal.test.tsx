import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonateModal } from "./DonateModal";

const EXPECTED = [25, 35, 50, 70, 100, 150, 200, 250];
const BIG = 350;
const FORBIDDEN = [30, 40, 45, 55, 60, 80, 75, 125, 185, 220, 260, 300, 400, 500, 750, 1000];

describe("DonateModal — valores de doação", () => {
  it("renderiza exatamente os 8 valores do grid", () => {
    render(<DonateModal open onClose={() => {}} />);
    EXPECTED.forEach((v) => {
      expect(screen.getByRole("button", { name: new RegExp(`R\\$\\s*${v}\\b`) })).toBeInTheDocument();
    });
  });

  it("renderiza o botão grande de R$350", () => {
    render(<DonateModal open onClose={() => {}} />);
    expect(
      screen.getByRole("button", { name: new RegExp(`^R\\$\\s*${BIG}$`, "i") }),
    ).toBeInTheDocument();
  });

  it("não renderiza nenhum dos valores antigos/proibidos", () => {
    render(<DonateModal open onClose={() => {}} />);
    FORBIDDEN.forEach((v) => {
      const btn = screen.queryByRole("button", { name: new RegExp(`^R\\$\\s*${v}\\s*$`) });
      expect(btn, `valor proibido R$${v} apareceu`).toBeNull();
    });
  });
});
