import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown } from "lucide-react";
import confetti from "canvas-confetti";
import { VakinhaLogo } from "@/components/VakinhaLogo";
import seloSeguranca from "@/assets/selo-seguranca.png";
import pixLogo from "@/assets/pix-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PRESETS = [25, 35, 50, 70, 100, 150, 200, 250];
const BIG_PRESET = 350;
const POPULAR = 70;
const MIN = 20;
const MAX = 400;

const TURBO = [
  { id: "mult", name: "Multiplicador de impacto", value: 10, emoji: "💚" },
  { id: "brinq", name: "Brinquedo solidário", value: 15, emoji: "🧸" },
  { id: "cesta", name: "Doar cesta básica", value: 20, emoji: "🛒" },
];

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initial = useMemo(() => {
    const v = parseFloat(params.get("valor") || "0");
    return isNaN(v) ? 0 : v;
  }, [params]);

  const [amount, setAmount] = useState(initial);
  const [extras, setExtras] = useState<string[]>([]);
  const [accept] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setAmount(initial);
  }, [initial]);

  const extrasTotal = TURBO.filter((t) => extras.includes(t.id)).reduce((s, t) => s + t.value, 0);
  const total = +(amount + extrasTotal).toFixed(2);
  const valid = total > 0 && total <= MAX && accept;

  const error =
    total > MAX
      ? `Valor máximo permitido é de R$ ${MAX.toLocaleString("pt-BR")},00`
      : "";

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmount(parseInt(digits || "0", 10) / 100);
  };

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const fireConfetti = () => {
    const end = Date.now() + 800;
    const colors = ["#24CA68", "#1ea85a", "#ffffff"];
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const submit = async () => {
    if (!valid) return;
    setProcessing(true);
    try {
      // Desconto sutil entre 7 e 9 centavos para gerar valor "quebrado" no PIX
      const totalCents = Math.round(total * 100);
      const discount = Math.floor(Math.random() * 3) + 7; // 7, 8 ou 9
      const chargeCents = Math.max(100, totalCents - discount);

      const { data, error } = await supabase.functions.invoke("create-paradise-transaction", {
        body: { amount: chargeCents },
      });
      if (error || !data?.qr_code) throw error || new Error("Falha ao gerar PIX");

      const chargedAmount = chargeCents / 100;

      sessionStorage.setItem(
        "paradise_pix",
        JSON.stringify({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          transaction_id: data.transaction_id,
          reference: data.reference,
          amount: chargedAmount,
          expires_at: data.expires_at,
        }),
      );

      fireConfetti();
      navigate(`/pix?valor=${chargedAmount}`);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <h1 className="text-2xl font-extrabold text-foreground">Ajude no tratamento da pequena Duda</h1>
        <p className="mt-1 text-sm text-muted-foreground">ID: 4452341</p>

        {/* Label da contribuição */}
        <div className="mt-6">
          <span className="text-sm font-semibold text-foreground">Valor da contribuição</span>
          {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
        </div>

        {/* Presets */}
        <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-4">
          {PRESETS.map((p) => {
            const popular = p === POPULAR;
            return (
              <div key={p} className="relative">
                {popular && (
                  <span className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground shadow">
                    <Crown className="h-3 w-3" /> Mais escolhido
                  </span>
                )}
                <button
                  onClick={() => setAmount(p)}
                  className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                    amount === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : popular
                        ? "border-primary bg-card text-primary hover:bg-primary hover:text-primary-foreground"
                        : "border-border bg-card hover:border-primary hover:text-primary"
                  }`}
                >
                  R$ {p.toLocaleString("pt-BR")},00
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setAmount(BIG_PRESET)}
          className={`mt-3 w-full rounded-lg border-2 px-4 py-3.5 text-base font-extrabold transition-all ${
            amount === BIG_PRESET
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary bg-card text-primary hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          R$ {BIG_PRESET.toLocaleString("pt-BR")},00
        </button>

        {/* Payment */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Forma de pagamento</h2>
          <div className="mt-3 inline-flex items-center gap-3 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary-foreground">
              <span className="h-2 w-2 rounded-full bg-primary-foreground" />
            </span>
            <span className="font-semibold">Pix</span>
            <span
              aria-hidden="true"
              className="h-5 w-5 bg-primary-foreground"
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
          </div>
        </div>

        {/* Turbo */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Turbine sua doação 💚</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajude MUITO MAIS turbinando sua doação
          </p>
          <div className="mt-3 grid grid-cols-3 gap-0 overflow-hidden rounded-lg border-2 border-dashed border-border">
            {TURBO.map((t, i) => {
              const selected = extras.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleExtra(t.id)}
                  className={`flex flex-col items-center justify-center gap-1 p-3 transition-all ${
                    i < TURBO.length - 1 ? "border-r-2 border-dashed border-border" : ""
                  } ${selected ? "bg-primary/80 text-primary-foreground" : "bg-card hover:bg-muted"}`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-xs font-semibold leading-tight">{t.name}</span>
                  <span className="text-xs">R$ {formatBRL(t.value)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Contribuição:</span>
            <span>R$ {formatBRL(amount)}</span>
          </div>
          {extrasTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Turbinar:</span>
              <span>R$ {formatBRL(extrasTotal)}</span>
            </div>
          )}
          <div className="my-3 h-px bg-border" />
          <div className="flex justify-between text-base font-bold text-foreground">
            <span>Total:</span>
            <span>R$ {formatBRL(total)}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={submit}
          disabled={!valid || processing}
          className="btn-vakinha mt-6 w-full uppercase tracking-wider"
        >
          {processing ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <>
              <Check className="h-5 w-5" /> Contribuir
            </>
          )}
        </button>

        {/* Selo */}
        <div className="mt-6 flex items-center gap-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <img
            src={seloSeguranca}
            alt="Selo de segurança"
            className="h-10 flex-shrink-0 object-contain"
          />
          <span>
            Garantimos uma <strong>experiência segura</strong> para todos os nossos doadores.
          </span>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Informamos que o preenchimento do seu cadastro completo estará disponível em seu painel
          pessoal na plataforma após a conclusão desta doação.
        </p>
      </main>
    </div>
  );
};

export default Checkout;
