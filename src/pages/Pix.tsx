import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, Landmark, QrCode, Clock, ShieldCheck, ArrowLeft } from "lucide-react";
import { VakinhaLogo } from "@/components/VakinhaLogo";
import { toast } from "@/hooks/use-toast";
import { trackPurchase } from "@/lib/tiktokPixel";
import { supabase } from "@/integrations/supabase/client";
import pixLogo from "@/assets/pix-logo.png";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EXPIRA_EM_SEGUNDOS = 15 * 60;

type PixData = {
  qr_code: string;
  qr_code_base64?: string;
  transaction_id: number | string;
  reference: string;
  amount: number;
  expires_at?: string;
};

const Pix = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const valor = useMemo(() => {
    const v = parseFloat(params.get("valor") || "0");
    return isNaN(v) || v <= 0 ? 50 : v;
  }, [params]);

  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [restante, setRestante] = useState(EXPIRA_EM_SEGUNDOS);
  const [paid, setPaid] = useState(false);
  const trackedRef = useRef(false);

  // Carrega dados do PIX gerados no checkout
  useEffect(() => {
    const raw = sessionStorage.getItem("paradise_pix");
    if (!raw) {
      navigate("/checkout");
      return;
    }
    try {
      setPix(JSON.parse(raw));
    } catch {
      navigate("/checkout");
    }
  }, [navigate]);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Polling de status
  useEffect(() => {
    if (!pix || paid) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/check-paradise-transaction?id=${pix.transaction_id}`;
    const id = setInterval(async () => {
      try {
        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
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
    }, 3000);
    return () => clearInterval(id);
  }, [pix, paid]);

  const handleCopy = async () => {
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

  return (
    <div className="min-h-screen bg-[hsl(var(--vakinha-soft))]">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <VakinhaLogo />
          <div className="w-16" />
        </div>
      </header>

      <main className="container max-w-xl py-8">
        <div className="rounded-xl bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <span
              aria-label="Pix"
              className="h-12 w-12 bg-primary"
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
            <h1 className="mt-3 text-xl font-extrabold uppercase text-foreground">
              {paid ? "Pagamento confirmado 🎉" : "Pague com Pix 💚"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {paid ? "Obrigado pela sua contribuição!" : "Sua contribuição ajuda muito!"}
            </p>
          </div>

          {/* QR Code */}
          <div className="mt-6 flex justify-center">
            <div className="rounded-lg border-2 border-border bg-white p-4">
              {expirado || !pix ? (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                  {expirado ? "QR Code expirado." : "Gerando QR..."}
                  {expirado && (
                    <>
                      <br />
                      Volte e gere uma nova doação.
                    </>
                  )}
                </div>
              ) : pix.qr_code_base64 ? (
                <img
                  src={pix.qr_code_base64}
                  alt="QR Code Pix"
                  className="h-[220px] w-[220px]"
                />
              ) : (
                <QRCodeCanvas value={pix.qr_code} size={220} level="M" includeMargin={false} />
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 flex items-center justify-between border-y border-border py-3">
            <span className="font-semibold text-foreground">Valor total:</span>
            <span className="text-lg font-bold text-primary">R$ {formatBRL(valor)}</span>
          </div>

          {/* Timer */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Este código expira em{" "}
              <strong className={expirado ? "text-destructive" : "text-foreground"}>
                {mm}:{ss}
              </strong>
            </span>
          </div>

          {/* Copia e cola */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Copie o código Pix abaixo e cole no app do seu banco para finalizar o pagamento.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={pix?.qr_code ?? ""}
              readOnly
              onFocus={(e) => e.target.select()}
              className="flex-1 truncate rounded-lg border border-input bg-muted px-3 py-2.5 text-xs text-foreground outline-none"
            />
            <button
              onClick={handleCopy}
              disabled={expirado || !pix}
              className="btn-vakinha justify-center whitespace-nowrap text-xs uppercase"
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

          {/* Instruções */}
          <div className="mt-8">
            <h3 className="text-center font-bold text-foreground">Como pagar?</h3>
            <ol className="mt-4 space-y-4">
              {[
                { icon: Landmark, text: "Abra o app do seu banco e entre no ambiente Pix" },
                {
                  icon: QrCode,
                  text: "Escolha Pagar com QR Code e aponte a câmera, ou cole o código copiado.",
                },
                {
                  icon: Check,
                  text: "Confirme as informações e finalize o pagamento.",
                },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="pt-1 text-sm text-foreground/80">{text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Selo */}
          <div className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>
              Pagamento processado em ambiente <strong>seguro</strong>.
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Após realizar o pagamento, a confirmação pode levar alguns segundos.
        </p>
      </main>
    </div>
  );
};

export default Pix;
