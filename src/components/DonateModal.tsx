import { useEffect, useState } from "react";
import { X, Crown } from "lucide-react";
import { VakinhaLogo } from "./VakinhaLogo";
import { PixBottomSheet } from "./PixBottomSheet";

const VALUES = [25, 35, 50, 70, 100, 150, 200, 250];
const BIG_VALUE = 350;
const POPULAR = 70;

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
}

export const DonateModal = ({ open, onClose }: DonateModalProps) => {
  const [pixOpen, setPixOpen] = useState(false);
  const [pixAmount, setPixAmount] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const goPix = (valor: number) => {
    setPixAmount(valor);
    setPixOpen(true);
  };

  if (!open && !pixOpen) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
          onClick={onClose}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-6 shadow-elevated animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex flex-col items-center text-center">
              <VakinhaLogo />
              <h3 className="mt-4 text-lg font-bold text-foreground">Escolha o valor da doação</h3>
              <p className="mt-1 text-sm text-muted-foreground">Toda contribuição faz a diferença 💚</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              {VALUES.map((v) => {
                const popular = v === POPULAR;
                return (
                  <div key={v} className="relative">
                    {popular && (
                      <span className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground shadow">
                        <Crown className="h-3 w-3" /> Mais escolhido
                      </span>
                    )}
                    <button
                      onClick={() => goPix(v)}
                      className={`w-full rounded-lg border-2 border-primary px-3 py-3 text-base font-bold transition-all hover:bg-primary hover:text-primary-foreground ${
                        popular ? "bg-primary text-primary-foreground" : "bg-card text-primary"
                      }`}
                    >
                      R$ {v}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => goPix(BIG_VALUE)}
              className="mt-3 w-full rounded-lg border-2 border-primary bg-primary px-3 py-3.5 text-lg font-extrabold text-primary-foreground transition-all hover:opacity-90"
            >
              R$ {BIG_VALUE}
            </button>
          </div>
        </div>
      )}

      <PixBottomSheet
        open={pixOpen}
        amount={pixAmount}
        onClose={() => {
          setPixOpen(false);
          onClose();
        }}
      />
    </>
  );
};
