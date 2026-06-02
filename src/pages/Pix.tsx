import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  Copy, Check, Landmark, QrCode, Clock,
  ShieldCheck, ArrowLeft, Lock, Heart, CheckCircle2,
} from "lucide-react";
import { VakinhaLogo } from "@/components/VakinhaLogo";
import { toast } from "@/hooks/use-toast";
import { trackPurchase } from "@/lib/tiktokPixel";
import { supabase } from "@/integrations/supabase/client";
import pixLogo from "@/assets/pix-logo.png";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EXPIRA_EM_SEGUNDOS = 15 * 60;

type PixData = {
  qr_code:        string;
  qr_code_base64?: string;
  transaction_id:  number | string;
  reference:       string;
  amount:          number;
  expires_at?:     string;
  donor_name?:     string;
};

// ── Passos de instrução ────────────────────────────────────────
const STEPS = [
  { icon: Landmark, title: "Abra seu banco",       desc: "Acesse o app do seu banco e vá para o ambiente Pix." },
  { icon: QrCode,   title: "Escaneie ou cole",     desc: "Use QR Code ou cole o código copiado abaixo." },
  { icon: Check,    title: "Confirme e pronto!",   desc: "Confira as informações e finalize. É instantâneo." },
];

// ══════════════════════════════════════════════════════════════
//  PÁGINA PIX
// ══════════════════════════════════════════════════════════════
const Pix = () => {
  const [params] = useSearchParams();
  const navigate  = useNavigate();

  const valor = useMemo(() => {
    const v = parseFloat(params.get("valor") || "0");
    return isNaN(v) || v <= 0 ? 50 : v;
  }, [params]);

  const [pix, setPix]         = useState<PixData | null>(null);
  const [copied, setCopied]   = useState(false);
  const [restante, setRestante] = useState(EXPIRA_EM_SEGUNDOS);
  const [paid, setPaid]       = useState(false);
  const trackedRef             = useRef(false);

  // Carrega dados do PIX gerados no checkout
  useEffect(() => {
    const raw = sessionStorage.getItem("inter_pix") ?? sessionStorage.getItem("paradise_pix");
    if (!raw) { navigate("/checkout"); return; }
    try { setPix(JSON.parse(raw)); }
    catch  { navigate("/checkout"); }
  }, [navigate]);

  // Countdown
  useEffect(() => {
    const id = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Polling de confirmação com backoff exponencial em erro (5s → 7.5s → 11s → 15s).
  // Reseta para 5s a cada resposta bem-sucedida. Para quando aprovado.
  useEffect(() => {
    if (!pix || paid) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey   = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/check-inter-pix?id=${pix.transaction_id}`;

    let cancelled = false;
    let delay = 5000;
    const MIN_DELAY = 5000;
    const MAX_DELAY = 15000;

    const tick = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } });
        const j = await r.json();
        if (j?.status === "approved" || j?.status === "paid") {
          setPaid(true);
          sessionStorage.removeItem("inter_pix");
          sessionStorage.removeItem("paradise_pix");
          if (!trackedRef.current) {
            trackedRef.current = true;
            const realAmount = j?.amount ? parseFloat(j.amount) : pix.amount;
            trackPurchase(realAmount, String(pix.reference));
          }
          return; // para o polling
        }
        delay = MIN_DELAY; // sucesso → reseta
      } catch (e) {
        console.warn("poll error", e);
        delay = Math.min(Math.round(delay * 1.5), MAX_DELAY);
      }
      if (!cancelled) setTimeout(tick, delay);
    };

    const timer = setTimeout(tick, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pix, paid]);


  const handleCopy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      toast({ title: "Código PIX copiado! 🎉", description: "Cole no app do seu banco para finalizar." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");
  const expirado = restante === 0;

  // ── Estado: Pago ── ─────────────────────────────────────────
  if (paid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center section-soft px-4 text-center">
        <div className="animate-fade-in-up rounded-2xl bg-white p-8 shadow-elevated max-w-sm w-full">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-foreground">
            {pix?.donor_name ? `${pix.donor_name}, pagamento confirmado! 🎉` : "Pagamento confirmado! 🎉"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua doação de <strong className="text-primary">R$ {formatBRL(valor)}</strong> foi
            recebida. A família da Duda agradece de coração! 💙
          </p>
          <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-foreground">
            <Heart className="mx-auto mb-2 h-6 w-6 fill-primary text-primary" />
            Você fez parte da história da Duda.
            Compartilhe e inspire mais pessoas.
          </div>
          <button
            onClick={() => {
              navigator.share?.({ title: "Eu ajudei a Duda!", url: window.location.origin });
            }}
            className="btn-primary mt-5 w-full"
            id="pix-share-btn"
          >
            Compartilhar 💙
          </button>
          <button
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-xl py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Voltar à campanha
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen section-soft">

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="border-b border-border bg-white shadow-[var(--shadow-trust)]">
        <div className="bg-primary py-1.5 text-center text-xs font-semibold text-white">
          <span className="flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            PIX gerado · Ambiente 100% seguro
          </span>
        </div>
        <div className="container flex h-14 items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <VakinhaLogo size="sm" />
          <div className="w-16" />
        </div>
      </header>

      <main className="container max-w-xl py-8">

        {/* ── Card principal ────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-6 shadow-elevated">

          {/* Cabeçalho */}
          <div className="flex flex-col items-center text-center">
            <span
              aria-label="Pix"
              className="h-12 w-12 bg-primary"
              style={{
                WebkitMaskImage: `url(${pixLogo})`,
                maskImage: `url(${pixLogo})`,
                WebkitMaskRepeat:   "no-repeat",
                maskRepeat:         "no-repeat",
                WebkitMaskSize:     "contain",
                maskSize:           "contain",
                WebkitMaskPosition: "center",
                maskPosition:       "center",
              }}
            />
            <h1 className="mt-3 font-display text-2xl font-bold text-foreground">
              Finalize com PIX 💙
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escaneie o QR Code ou copie o código abaixo
            </p>
          </div>

          {/* ── QR Code ─────────────────────────────────────── */}
          <div className="mt-6 flex justify-center">
            <div className={`rounded-2xl border-4 bg-white p-4 transition-all ${
              expirado ? "border-destructive/40 opacity-50" : "border-primary/20 shadow-[var(--shadow-trust)]"
            }`}>
              {expirado || !pix ? (
                <div className="flex h-[200px] w-[200px] items-center justify-center text-center text-sm text-muted-foreground">
                  {expirado ? (
                    <div>
                      <p className="font-bold text-destructive">QR expirado</p>
                      <p className="mt-1 text-xs">Volte e gere uma nova doação</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Gerando QR...
                    </div>
                  )}
                </div>
              ) : pix.qr_code_base64 ? (
                <img src={pix.qr_code_base64} alt="QR Code PIX" className="h-[200px] w-[200px]" />
              ) : (
                <QRCodeCanvas value={pix.qr_code} size={200} level="M" includeMargin={false} />
              )}
            </div>
          </div>

          {/* ── Valor + timer ───────────────────────────────── */}
          <div className="mt-5 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Valor:</span>
            <span className="text-xl font-extrabold text-primary">R$ {formatBRL(valor)}</span>
          </div>

          {!expirado && (
            <div className={`mt-2 flex items-center justify-center gap-2 text-sm font-medium ${
              restante < 120 ? "text-destructive animate-pulse-soft" : "text-muted-foreground"
            }`}>
              <Clock className="h-4 w-4" />
              Expira em <strong>{mm}:{ss}</strong>
              {restante < 120 && " — pague agora!"}
            </div>
          )}

          {/* ── Copiar código ───────────────────────────────── */}
          <div className="mt-5 flex flex-col gap-2">
            <input
              type="text"
              value={pix?.qr_code ?? ""}
              readOnly
              onFocus={(e) => e.target.select()}
              placeholder={pix ? "" : "Gerando código..."}
              className="w-full truncate rounded-xl border-2 border-border bg-muted/50 px-4 py-3 text-xs text-foreground outline-none transition-colors focus:border-primary"
            />
            <button
              onClick={handleCopy}
              disabled={expirado || !pix}
              className="btn-primary justify-center py-3.5 text-sm"
              id="pix-copy-btn"
            >
              {copied ? (
                <><Check className="h-4 w-4" /> Código copiado!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copiar código PIX</>
              )}
            </button>
          </div>

          {/* ── Instruções passo a passo ─────────────────────── */}
          <div className="mt-8">
            <h2 className="mb-4 text-center text-sm font-bold text-foreground">Como pagar em 3 passos:</h2>
            <ol className="space-y-4">
              {STEPS.map(({ icon: Icon, title, desc }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* ── Selos finais ──────────────────────────────────── */}
          <div className="mt-6 flex items-center justify-center gap-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-primary" /> Pagamento seguro
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1">
              <Lock className="h-4 w-4 text-primary" /> Dados protegidos
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Após o pagamento, a confirmação aparecerá automaticamente nesta tela. 💙
        </p>
      </main>
    </div>
  );
};

export default Pix;
