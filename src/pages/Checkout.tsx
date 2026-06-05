import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Crown, Lock, ShieldCheck, Heart, User, Mail, Phone, ArrowLeft } from "lucide-react";
import { VakinhaLogo } from "@/components/VakinhaLogo";
import seloSeguranca from "@/assets/selo-seguranca.webp";
import pixLogo from "@/assets/pix-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackInitiateCheckout, trackIdentify, getTtclid } from "@/lib/tiktokPixel";

// ── Configuração de preços (psicologia de ancoragem) ──────────
const PRESETS = [25, 50, 100, 250];
const POPULAR = 50;
const MIN = 20;
const MAX = 2000;

// Impacto tangível por valor — ancora a decisão no benefício concreto
const IMPACT: Record<number, string> = {
  25:  "1 sessão de fisioterapia",
  35:  "1 dia de insumos essenciais",
  50:  "1 semana de insumos",
  75:  "1 consulta especializada",
  100: "1 consulta médica",
  150: "1 mês de terapia ocupacional",
  200: "kit de adaptação",
  250: "1 mês de suporte completo",
  350: "cadeira adaptada parcial",
};



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

// ── Validações simples ─────────────────────────────────────────
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPhone = (p: string) => p.replace(/\D/g, "").length >= 10;
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

// ══════════════════════════════════════════════════════════════
//  PÁGINA DE CHECKOUT — MULTI-STEP
//  Step 1: Escolha do valor + extras
//  Step 2: Formulário de dados (nome, email, telefone)
//  → Gera PIX e navega para /pix
// ══════════════════════════════════════════════════════════════
const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initial = useMemo(() => {
    const v = parseFloat(params.get("valor") || "0");
    return isNaN(v) ? 0 : v;
  }, [params]);

  // ── Step state ──────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: Valor ───────────────────────────────────────────
  const [amount, setAmount] = useState(initial || POPULAR);

  // ── Step 2: Dados pessoais ──────────────────────────────────
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (initial > 0) setAmount(initial);
  }, [initial]);

  const total = amount;
  const valid = total >= MIN && total <= MAX;

  const error =
    total > MAX ? `Valor máximo: R$ ${MAX.toLocaleString("pt-BR")},00` :
    total < MIN && total > 0 ? `Valor mínimo: R$ ${MIN.toLocaleString("pt-BR")},00` : "";

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmount(parseInt(digits || "0", 10) / 100);
  };

  // ── Step 2 validation ───────────────────────────────────────
  const formValid = nome.trim().length >= 2 && sobrenome.trim().length >= 1 && isValidEmail(email);

  const goToStep2 = () => {
    if (!valid) return;
    setStep(2);
    // Funil TikTok: o usuário INICIOU o checkout ao chegar no formulário
    trackInitiateCheckout(total);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBackToStep1 = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!valid || !formValid) return;
    setProcessing(true);

    // Advanced Matching: envia email/telefone pro TikTok cruzar com a base de usuários
    trackIdentify(email, telefone);

    try {
      const totalCents = Math.round(total * 100);

      const { data, error: fnErr } = await supabase.functions.invoke("create-inter-pix", {
        body: { 
          amount: totalCents,
          donor_name: `${nome.trim()} ${sobrenome.trim()}`.trim(),
          donor_email: email.trim(),
          donor_phone: telefone.replace(/\D/g, ""),
          ttclid: getTtclid() || undefined,
          url: window.location.href,
        },
      });
      if (fnErr || !data?.qr_code) throw fnErr || new Error("Falha ao gerar PIX");

      const chargedAmount = totalCents / 100;

      sessionStorage.setItem(
        "inter_pix",
        JSON.stringify({
          qr_code:        data.qr_code,
          qr_code_base64: data.qr_code_base64,
          transaction_id: data.transaction_id,
          reference:      data.reference,
          amount:         chargedAmount,
          expires_at:     data.expires_at,
          donor_name:     nome.trim(),
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

  // ── Indicador de etapas ─────────────────────────────────────
  const StepIndicator = () => (
    <div className="mb-6 flex items-center justify-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
        step === 1 ? "bg-primary text-white shadow-[var(--shadow-elevated)]" : "bg-primary/15 text-primary"
      }`}>1</span>
      <span className="h-px w-8 bg-border" />
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
        step === 2 ? "bg-primary text-white shadow-[var(--shadow-elevated)]" : "bg-muted text-muted-foreground"
      }`}>2</span>
    </div>
  );

  return (
    <div className="min-h-screen section-soft">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="border-b border-border bg-white shadow-[var(--shadow-trust)]">
        <div className="bg-primary py-1.5 text-center text-xs font-semibold text-white">
          <span className="flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Ambiente 100% seguro · Dados protegidos pela LGPD
          </span>
        </div>
        <div className="container flex h-14 items-center justify-between">
          <button
            onClick={() => step === 2 ? goBackToStep1() : navigate(-1)}
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

        {/* Contexto emocional */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-primary/8 border border-primary/20 p-4">
          <Heart className="h-8 w-8 flex-shrink-0 fill-primary text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Você está ajudando a Kerlen a viver melhor
            </h1>
            <p className="text-xs text-muted-foreground">
              Campanha #4452341 · Cada centavo chega diretamente ao tratamento
            </p>
          </div>
        </div>

        <StepIndicator />

        {/* ════════════════════════════════════════════════════════
            STEP 1 — Seleção de valor
            ════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="animate-fade-in-up">

            {/* ── Trust signal no topo ───────────────────────── */}
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-foreground/80">
                <strong className="text-foreground">100% seguro e verificado.</strong>{" "}
                Sua doação é gerenciada pelo <strong className="text-foreground">Instituto Impacto Positivo</strong> e repassada integralmente à família da Kerlen.
                Doação única — nenhuma cobrança futura.
              </p>
            </div>

            {/* Seleção de valor */}
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h2 className="mb-1 text-sm font-bold text-foreground">Escolha o valor da sua doação</h2>
              <p className="mb-4 text-xs text-muted-foreground">Cada valor tem um impacto direto na vida da Kerlen</p>

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
                        className={`w-full rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                          isSelected
                            ? "border-primary bg-primary text-white shadow-elevated"
                            : isPopular
                              ? "border-accent/60 bg-accent/5 text-foreground hover:border-accent"
                              : "border-border bg-white text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="block">R$ {p.toLocaleString("pt-BR")},00</span>
                        {IMPACT[p] && (
                          <span className={`mt-0.5 block text-[9px] font-medium leading-tight ${
                            isSelected ? "text-white/80" : "text-muted-foreground"
                          }`}>
                            {IMPACT[p]}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>



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

            {/* Forma de pagamento */}
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
                    WebkitMaskImage: `url(${pixLogo})`, maskImage: `url(${pixLogo})`,
                    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain", maskSize: "contain",
                    WebkitMaskPosition: "center", maskPosition: "center",
                  }}
                />
                <span className="text-xs font-semibold text-primary/70">Instantâneo</span>
              </div>
            </div>



            {/* Resumo + CTA "Continuar" */}
            <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
              <h2 className="mb-4 text-sm font-bold text-foreground">Resumo</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-base font-extrabold text-foreground">
                  <span>Total:</span>
                  <span className="text-primary">R$ {formatBRL(total)}</span>
                </div>
              </div>

              <button
                onClick={goToStep2}
                disabled={!valid}
                className="btn-primary mt-5 w-full py-4 text-base"
                id="checkout-continue"
              >
                <Heart className="h-5 w-5 fill-white" />
                Ajudar a Kerlen com R$ {formatBRL(total)}
              </button>

              <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
                Doação única · Nenhuma cobrança futura · PIX seguro
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 2 — Formulário de dados pessoais
            ════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h2 className="mb-1 text-sm font-bold text-foreground">Quase lá! Preencha seus dados</h2>
              <p className="mb-5 text-xs text-muted-foreground">
                Para emitirmos o recibo da sua doação de <strong className="text-primary">R$ {formatBRL(total)}</strong>
              </p>

              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label htmlFor="donor-name" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Nome
                  </label>
                  <input
                    id="donor-name"
                    type="text"
                    autoComplete="given-name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full rounded-xl border-2 border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>

                {/* Sobrenome */}
                <div>
                  <label htmlFor="donor-surname" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Sobrenome
                  </label>
                  <input
                    id="donor-surname"
                    type="text"
                    autoComplete="family-name"
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    placeholder="Seu sobrenome"
                    className="w-full rounded-xl border-2 border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label htmlFor="donor-email" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> E-mail
                  </label>
                  <input
                    id="donor-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border-2 border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label htmlFor="donor-phone" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> WhatsApp <span className="text-muted-foreground/60">(opcional)</span>
                  </label>
                  <input
                    id="donor-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border-2 border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              {/* Resumo compacto */}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Total:</span>
                <span className="text-xl font-extrabold text-primary">R$ {formatBRL(total)}</span>
              </div>

              {/* CTA final */}
              <button
                onClick={submit}
                disabled={!formValid || processing}
                className="btn-primary mt-5 w-full py-4 text-base"
                id="checkout-submit"
              >
                {processing ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Gerar PIX · R$ {formatBRL(total)}
                  </>
                )}
              </button>

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
                gerenciada pelo Instituto Impacto Positivo e repassada
                integralmente à família da Kerlen.
              </p>
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              Seus dados são usados apenas para emissão do recibo. Não armazenamos informações pessoais. 💙
            </p>
          </div>
        )}

        {/* Selo (apenas no step 1) */}
        {step === 1 && (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
              <img src={seloSeguranca} alt="Selo de segurança" className="h-12 flex-shrink-0 object-contain" />
              <p className="text-xs text-muted-foreground">
                Garantimos uma <strong>experiência 100% segura</strong>. Sua doação chega diretamente
                gerenciada pelo Instituto Impacto Positivo e repassada
                integralmente à família da Kerlen.
              </p>
            </div>
            <div className="mt-4 rounded-md border border-border/50 bg-primary/5 p-4 text-center">
              <p className="text-[13px] font-medium text-foreground/90">
                Após a confirmação do PIX, você receberá um comprovante. Obrigado por ajudar a Kerlen! 💙
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Checkout;
