import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { addDonation } from "@/lib/donationStore";
import notifAvatar from "@/assets/notif-avatar.png";

// ── Tipos de notificação ───────────────────────────────────────
type NotifType = "donation" | "milestone" | "share";

interface Notif {
  id: number;
  type: NotifType;
  name: string;
  amount?: number;
  avatar: string;
  emoji?: string;
  message?: string;
}

// ── Dados realistas ────────────────────────────────────────────
const NAMES = [
  "Marcelo R.",    "Ana Beatriz S.", "João Pedro A.", "Mariana C.",
  "Rafael S.",     "Camila F.",      "Lucas O.",      "Patrícia M.",
  "Bruno C.",      "Juliana R.",     "Felipe M.",     "Larissa G.",
  "Eduardo L.",    "Fernanda R.",    "Gabriel N.",    "Thiago B.",
  "Isabela P.",    "Diego A.",       "Amanda V.",     "Carlos H.",
];

// Valores calibrados por psicologia: maioria pequenos (prova de acessibilidade),
// alguns grandes (âncora de generosidade)
const AMOUNTS = [25, 30, 50, 50, 50, 75, 100, 100, 150, 200, 250, 500];

// Avatares emoji como fallback — nunca quebra no UI
const AVATAR_EMOJIS = ["👩", "👨", "👩‍🦱", "👨‍🦳", "👩‍🦰", "🧑", "👴", "👵", "🧑‍🦱", "🧔"];

// Mensagens de compartilhamento — geram FOMO social
const SHARE_MESSAGES = [
  "compartilhou essa campanha no WhatsApp",
  "enviou para a família toda",
  "compartilhou no Instagram",
  "indicou para os amigos",
];

// Marcos de campanha — urgência positiva
const MILESTONES = [
  { threshold: 190_000,  message: "🎉 R$ 190.000 arrecadados! A Duda agradece cada coração." },
  { threshold: 200_000,  message: "🏆 R$ 200.000! Vocês são incríveis. Ajudem mais!" },
  { threshold: 210_000,  message: "💙 Mais de R$ 210.000! A meta está cada vez mais próxima." },
  { threshold: 250_000,  message: "🌟 R$ 250.000 arrecadados! A Duda está mais forte com vocês." },
  { threshold: 300_000,  message: "🚀 R$ 300.000! A família da Duda não tem palavras para agradecer." },
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Trava global: evita contar a mesma doação 2x em StrictMode / hot-reload
const countedIds = new Set<number>();
const shownMilestones = new Set<number>();
let nextId = 1;

// ── Confetti calibrado para a nova paleta azul ────────────────
const fireConfetti = (big = false) => {
  const colors = ["#1A7FE8", "#38bdf8", "#fbbf24", "#ffffff", "#60efff"];
  confetti({
    particleCount: big ? 120 : 55,
    spread:        big ? 90  : 65,
    origin:        { x: 0.12, y: 0.88 },
    colors,
    startVelocity: big ? 55  : 35,
    gravity:       0.85,
    scalar:        0.9,
  });
};

// ══════════════════════════════════════════════════════════════
//  COMPONENTE
// ══════════════════════════════════════════════════════════════
export const DonationNotification = () => {
  const [notif, setNotif] = useState<Notif | null>(null);
  const [visible, setVisible] = useState(false);

  // ref para não fechar antes de exibir
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dismiss = () => {
      setVisible(false);
      nextTimerRef.current = setTimeout(() => {
        setNotif(null);
        schedule();
      }, 400);
    };

    const show = (n: Notif) => {
      // Cancela o timer anterior caso ainda esteja rodando
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      setNotif(n);

      // Adiciona doação ao store (só uma vez por id)
      if (n.type === "donation" && n.amount && !countedIds.has(n.id)) {
        countedIds.add(n.id);
        addDonation(n.amount);
      }

      requestAnimationFrame(() => setVisible(true));

      // Confetti apenas em doações e marcos
      if (n.type === "donation")  fireConfetti(false);
      if (n.type === "milestone") fireConfetti(true);

      // Exibe por 5s, depois some
      hideTimerRef.current = setTimeout(dismiss, 5000);
    };

    const buildDonation = (): Notif => ({
      id:     nextId++,
      type:   "donation",
      name:   pick(NAMES),
      amount: pick(AMOUNTS),
      avatar: notifAvatar,
      emoji:  pick(AVATAR_EMOJIS),
    });

    const buildShare = (): Notif => ({
      id:      nextId++,
      type:    "share",
      name:    pick(NAMES),
      avatar:  notifAvatar,
      emoji:   pick(AVATAR_EMOJIS),
      message: pick(SHARE_MESSAGES),
    });

    // Decide o que mostrar: 70% doação, 20% share, 10% marco
    const scheduleNext = () => {
      const roll = Math.random();
      if (roll < 0.70) return show(buildDonation());
      if (roll < 0.90) return show(buildShare());
      // Marco: pega o primeiro não mostrado ainda
      const pending = MILESTONES.find((m) => !shownMilestones.has(m.threshold));
      if (pending) {
        shownMilestones.add(pending.threshold);
        return show({
          id:      nextId++,
          type:    "milestone",
          name:    "Marco alcançado!",
          avatar:  notifAvatar,
          emoji:   "🎉",
          message: pending.message,
        });
      }
      return show(buildDonation());
    };

    const schedule = () => {
      // Intervalo 8–16s — frequente o suficiente para urgência,
      // espaçado o suficiente para não irritar
      const delay = 8000 + Math.random() * 8000;
      nextTimerRef.current = setTimeout(scheduleNext, delay);
    };

    // Primeira notificação aparece após 4s (página já carregou)
    nextTimerRef.current = setTimeout(scheduleNext, 4000);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, []);

  if (!notif) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`
        fixed bottom-24 left-3 z-50 w-[280px] max-w-[calc(100vw-1.5rem)]
        overflow-hidden rounded-lg border border-border/60 bg-white
        shadow-[0_4px_20px_rgba(0,0,0,0.08)]
        transition-all duration-300 ease-out
        lg:bottom-6
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
      `}
    >

      <div className="flex items-start gap-3 p-3">
        {/* Avatar com fallback emoji */}
        <div className="flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-lg">
            <img
              src={notif.avatar}
              alt={notif.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
                el.parentElement!.textContent = notif.emoji ?? "";
              }}
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1 text-sm leading-snug">
          {notif.type === "donation" && (
            <>
              <p className="font-semibold text-foreground">{notif.name}</p>
              <p className="text-muted-foreground">
                ajudou a Duda com{" "}
                <strong className="text-primary">
                  R$&nbsp;{formatBRL(notif.amount!)}
                </strong>
              </p>
            </>
          )}

          {notif.type === "share" && (
            <>
              <p className="font-semibold text-foreground">{notif.name}</p>
              <p className="text-muted-foreground">
                {notif.message}
              </p>
            </>
          )}

          {notif.type === "milestone" && (
            <p className="font-semibold text-foreground leading-tight">
              {notif.message}
            </p>
          )}

          {/* Timestamp "ao vivo" */}
          <p className="mt-0.5 text-[11px] text-muted-foreground">agora há pouco</p>
        </div>

        {/* Botão fechar */}
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar notificação"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
