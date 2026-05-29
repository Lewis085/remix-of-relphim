import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { addDonation } from "@/lib/donationStore";
import notifAvatar from "@/assets/notif-avatar.png";

type Notif = { id: number; name: string; amount: number; avatar: string };

const AVATARS = [notifAvatar];

const NAMES = [
  "Marcelo Rodrigues",
  "Ana Beatriz Silva",
  "João Pedro Almeida",
  "Mariana Costa",
  "Rafael Souza",
  "Camila Ferreira",
  "Lucas Oliveira",
  "Patrícia Mendes",
  "Bruno Carvalho",
  "Juliana Ramos",
  "Felipe Martins",
  "Larissa Gomes",
  "Eduardo Lima",
  "Fernanda Rocha",
  "Gabriel Nunes",
];

const AMOUNTS = [20, 30, 50, 75, 100, 150, 200, 250, 500, 1000];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Trava global: evita contar a mesma doação 2x se o componente remontar
// (StrictMode em dev, navegação, hot-reload, etc.)
const countedIds = new Set<number>();
let nextId = 1;

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fireConfetti = () => {
  const colors = ["#24CA68", "#1ea85a", "#ffffff"];
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { x: 0.15, y: 0.85 },
    colors,
    startVelocity: 35,
    gravity: 0.9,
    scalar: 0.9,
  });
};

export const DonationNotification = () => {
  const [notif, setNotif] = useState<Notif | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    const show = () => {
      const n: Notif = {
        id: nextId++,
        name: pick(NAMES),
        amount: pick(AMOUNTS),
        avatar: pick(AVATARS),
      };
      setNotif(n);
      if (!countedIds.has(n.id)) {
        countedIds.add(n.id);
        addDonation(n.amount);
      }
      // próximo frame para animar entrada
      requestAnimationFrame(() => setVisible(true));
      fireConfetti();

      hideTimer = setTimeout(() => {
        setVisible(false);
        nextTimer = setTimeout(() => {
          setNotif(null);
          schedule();
        }, 400);
      }, 5000);
    };

    const schedule = () => {
      const delay = 8000 + Math.random() * 7000; // 8-15s
      nextTimer = setTimeout(show, delay);
    };

    // primeira aparição
    nextTimer = setTimeout(show, 4000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, []);

  if (!notif) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 left-4 z-50 flex max-w-[320px] items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg transition-all duration-300 lg:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
        <img
          src={notif.avatar}
          alt={notif.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="min-w-0 text-sm leading-tight">
        <h4 className="truncate font-bold text-foreground">{notif.name}</h4>
        <p className="text-muted-foreground">
          Acabou de doar{" "}
          <strong className="text-primary">R$&nbsp;{formatBRL(notif.amount)}</strong>.
        </p>
      </div>
    </div>
  );
};
