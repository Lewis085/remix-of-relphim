import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Copy, Check, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackPurchase } from "@/lib/tiktokPixel";
import pixLogo from "@/assets/pix-logo.png";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EXPIRA = 15 * 60;

type PixData = {
  qr_code: string;
  qr_code_base64?: string;
  transaction_id: number | string;
  reference: string;
  amount: number;
};

interface PixBottomSheetProps {
  open: boolean;
  amount: number; // em reais
  onClose: () => void;
}

export const PixBottomSheet = ({ open, amount, onClose }: PixBottomSheetProps) => {
  const [pix, setPix] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restante, setRestante] = useState(EXPIRA);
  const [paid, setPaid] = useState(false);
  const trackedRef = useRef(false);
  const requestedRef = useRef<string | null>(null);

  // Bloqueia scroll
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setPix(null);
      setError(null);
      setPaid(false);
      setRestante(EXPIRA);
      setCopied(false);
      trackedRef.current = false;
      requestedRef.current = null;
    }
  }, [open]);

  // Gera PIX ao abrir
  useEffect(() => {
    if (!open || amount <= 0) return;
    const key = `${amount}-${Date.now()}`;
    if (requestedRef.current) return;
    requestedRef.current = key;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "create-inter-pix",
          { body: { amount: Math.round(amount * 100) } },
        );
        if (fnErr || !data?.qr_code) throw fnErr || new Error("Falha ao gerar PIX");
        setPix({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          transaction_id: data.transaction_id,
          reference: data.reference,
          amount,
        });
      } catch (e) {
        console.error(e);
        setError("Não foi possível gerar o PIX. Tente novamente.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, amount]);

  // Timer
  useEffect(() => {
    if (!open || !pix) return;
    const id = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [open, pix]);

  // Polling
  useEffect(() => {
    if (!open || !pix || paid) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/check-inter-pix?id=${pix.transaction_id}`;
    const id = setInterval(async () => {
      try {
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
        });
        const j = await r.json();
        if (j?.status === "approved" || j?.status === "paid") {
          setPaid(true);
          if (!trackedRef.current) {
            trackedRef.current = true;
            trackPurchase(pix.amount, String(pix.reference));
          }
        }
      } catch (e) {
        console.warn("poll error", e);
      }
    }, 8000);
    return () => clearInterval(id);
  }, [open, pix, paid]);

  const copy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      toast({ title: "Código PIX copiado!", description: "Cole no app do seu banco." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");
  const expirado = restante === 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl bg-card p-5 shadow-elevated animate-in slide-in-from-bottom duration-300 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span
            aria-label="Pix"
            className="h-10 w-10 bg-primary"
            style={{
              WebkitMaskImage: `url(${pixLogo})`,
              maskImage: `url(${pixLogo})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />
          <h2 className="mt-2 text-lg font-extrabold uppercase text-foreground">
            {paid ? "Pagamento confirmado 🎉" : "Pague com Pix 💚"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {paid ? "Obrigado pela sua contribuição!" : "Escaneie o QR ou copie o código"}
          </p>
        </div>

        {/* Conteúdo */}
        <div className="mt-4 flex justify-center">
          <div className="rounded-lg border-2 border-border bg-white p-3">
            {loading ? (
              <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Gerando QR...
              </div>
            ) : error ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center px-3 text-center text-xs text-destructive">
                {error}
              </div>
            ) : expirado || !pix ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-center text-sm text-muted-foreground">
                QR Code expirado.
              </div>
            ) : pix.qr_code_base64 ? (
              <img src={pix.qr_code_base64} alt="QR Code Pix" className="h-[200px] w-[200px]" />
            ) : (
              <QRCodeCanvas value={pix.qr_code} size={200} level="M" includeMargin={false} />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-y border-border py-2.5">
          <span className="text-sm font-semibold text-foreground">Valor:</span>
          <span className="text-base font-bold text-primary">R$ {formatBRL(amount)}</span>
        </div>

        {pix && !paid && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Expira em{" "}
              <strong className={expirado ? "text-destructive" : "text-foreground"}>
                {mm}:{ss}
              </strong>
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <input
            type="text"
            value={pix?.qr_code ?? ""}
            readOnly
            onFocus={(e) => e.target.select()}
            placeholder={loading ? "Gerando código..." : ""}
            className="w-full truncate rounded-lg border border-input bg-muted px-3 py-2.5 text-xs text-foreground outline-none"
          />
          <button
            onClick={copy}
            disabled={!pix || expirado}
            className="btn-vakinha justify-center text-xs uppercase"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar código
              </>
            )}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted p-2.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            Pagamento processado em ambiente <strong>seguro</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
