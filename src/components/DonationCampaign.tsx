import { Heart, CheckCircle2, MessageCircle } from "lucide-react";
import bannerCeleste from "@/assets/banner-celeste.jpg";
import institutoLogo from "@/assets/instituto-logo.png";
import avatar1 from "@/assets/avatar1.jpg";
import avatar2 from "@/assets/avatar2.jpg";
import avatar3 from "@/assets/avatar3.jpg";
import avatar4 from "@/assets/avatar4.jpg";
import avatar5 from "@/assets/avatar5.svg";
import avatar6 from "@/assets/avatar6.webp";
import avatar7 from "@/assets/avatar7.webp";
import { useDonationTotals } from "@/lib/donationStore";

const META = 4000000;

interface Comentario {
  name: string;
  avatar: string;
  time: string;
  text: string;
  respostas?: Comentario[];
}

const COMENTARIOS: Comentario[] = [
  { name: "Ana Clara", avatar: avatar1, time: "2 min", text: "Eu ajudei com 150 reais, pois eu conheço essa família, dó no coração ver tanta dor que eles passam." },
  { name: "Pedro Henrique", avatar: avatar2, time: "4 min", text: "Ajudei de coração mesmo, olha que situação complicada..." },
  { name: "Maria Eduarda", avatar: avatar3, time: "7 min", text: "Cada doação importa. Duda merece nosso apoio!" },
  {
    name: "Laura Sofia",
    avatar: avatar4,
    time: "9 min",
    text: "Muito triste gente!",
    respostas: [
      { name: "Letícia Maria", avatar: avatar5, time: "14 min", text: "Aqui eu ajudei com 50 reais, queria poder doar um pouco mais 😓" },
      { name: "Gabriela Oliveira", avatar: avatar6, time: "6 min", text: "Vamos apoiar essa família!" },
      { name: "Renato Silva", avatar: avatar7, time: "1 min", text: "Doei 300 reais espero que ajude no tratamento dessa criança." },
    ],
  },
];

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  onDonateClick: () => void;
}

export const DonationCampaign = ({ onDonateClick }: Props) => {
  const { arrecadado, apoiadores } = useDonationTotals();
  const pct = Math.min(100, (arrecadado / META) * 100);
  


  return (
    <section className="bg-[hsl(var(--vakinha-soft))] py-6">
      <div className="container">
        {/* Top */}
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Saúde / Tratamentos
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl lg:text-4xl">
            Ajude a Duda, a vencer a AME Tipo 1: foco no tratamento e na qualidade de vida!
          </h1>
          <span className="text-sm text-muted-foreground">ID: 4452341</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* LEFT */}
          <div className="min-w-0">
            <div className="overflow-hidden rounded-xl shadow-card">
              <img
                src={bannerCeleste}
                alt="Pequena Duda"
                className="h-auto w-full object-cover"
                width={1280}
                height={768}
              />
            </div>

            {/* Donors + hearts received (estilo referência) */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 shadow-card">
              <ul className="flex items-center -space-x-2">
                {[avatar1, avatar2, avatar3, avatar5, avatar6].map((a, i) => (
                  <li key={i} className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-card">
                    <img src={a} alt="" className="h-full w-full object-cover" />
                  </li>
                ))}
                <li className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground ring-2 ring-card">
                  +
                </li>
              </ul>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  <strong className="text-foreground">2.843</strong> corações recebidos
                </span>
                <Heart className="h-4 w-4 fill-primary text-primary" />
              </div>
            </div>

            {/* Mobile: Instituto card (vem antes do progresso, como na referência) */}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-card p-3 shadow-card lg:hidden">
              <img
                src={institutoLogo}
                alt="Instituto"
                loading="lazy"
                width={48}
                height={48}
                className="h-12 w-12 flex-shrink-0 rounded-full bg-muted object-contain p-1"
              />
              <div className="min-w-0 flex-1 text-xs">
                <h3 className="text-sm font-bold text-foreground">Instituto Mundo Melhor</h3>
                <p className="text-muted-foreground">Ativo no Vakinha desde maio/2025</p>
                <p className="text-muted-foreground">3 vaquinhas criadas · 8 vaquinhas apoiadas</p>
              </div>
            </div>

            {/* Mobile inline summary (estilo referência) */}
            <div className="mt-4 lg:hidden">
              <MobileSummary arrecadado={arrecadado} pct={pct} onDonateClick={onDonateClick} />
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-6 border-b border-border">
              {["Sobre", "Novidades", "Quem ajudou"].map((t, i) => (
                <button
                  key={t}
                  className={`pb-3 text-sm font-semibold transition-colors ${
                    i === 0 ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Story */}
            <article className="prose prose-sm mt-5 max-w-none text-foreground">
              <p className="text-xs text-muted-foreground">
                <strong>Vaquinha criada em:</strong> 07/11/2025
              </p>
              <p className="mt-3 flex items-center gap-2 font-semibold text-primary">
                <CheckCircle2 className="h-5 w-5" /> História Verificada
              </p>

              <p className="mt-4 leading-relaxed">
                Olá! Sou do Rio de Janeiro, a mãe da <strong>Duda Motta</strong>, de apenas 1
                ano que enfrenta um diagnóstico desafiador: <strong>Atrofia Muscular Espinhal (AME)
                Tipo 1</strong>. Essa condição genética compromete os movimentos, a respiração e a
                deglutição, sem um suporte adequado, pode ser fatal antes dos dois anos de vida.
              </p>

              <p className="mt-3 leading-relaxed">
                <strong>O que é AME?</strong> A AME é uma condição genética rara que causa a
                degeneração dos neurônios motores. Esses neurônios controlam funções vitais como
                andar, respirar e engolir. Quando morrem, não se regeneram. A ausência do gene SMN1
                impede o corpo de produzir uma proteína essencial à sobrevivência dessas células. A
                expectativa de vida de pacientes com atrofia muscular espinhal (AME) tipo I é
                geralmente considerada inferior a 2 anos.
              </p>

              <p className="mt-3 leading-relaxed">
                Para oferecer à Duda a melhor chance possível, estamos lutando por um tratamento
                contínuo e de qualidade. Embora o medicamento <strong>ZOLGENSMA</strong> — que pode
                mudar o rumo dessa história — custe cerca de 7 milhões de reais, nossa prioridade
                imediata é garantir todos os cuidados de suporte necessários.
              </p>

              <p className="mt-3 leading-relaxed">
                ✨ <strong>Nosso foco agora é manter a Duda estável e confortável:</strong>
                <br />
                • Equipamentos respiratórios (BiPAP, insumos e acessórios)
                <br />
                • Apoio terapêutico contínuo (fisioterapia e fonoaudiologia)
                <br />
                • Insumos e cuidados especiais (colchão pneumático, cadeira adaptada)
                <br />
                • Transporte para consultas e sessões de terapia
              </p>

              <p className="mt-3 leading-relaxed">
                Cada dia é uma vitória nessa luta. Esses recursos são fundamentais para manter a
                saúde da Duda e prepará-la para qualquer oportunidade de tratamento futuro.
              </p>

              <button onClick={onDonateClick} className="btn-vakinha mt-6 w-full text-lg">
                Quero Ajudar 💖
              </button>

              <p className="mt-6 leading-relaxed">
                🚨 <strong>Por que sua ajuda é tão importante?</strong>
                <br />
                O custo diário de todos esses cuidados ultrapassa o que nossa família consegue
                arcar sozinha. Sem esse suporte, corremos o risco de perder tempo precioso na busca
                pela estabilidade dela.
              </p>

              <p className="mt-3 leading-relaxed">
                🌟 <strong>Como você pode fazer a diferença:</strong>
                <br />
                • Doe qualquer valor — cada contribuição faz a Duda sorrir e respirar com mais
                segurança.
                <br />
                • Compartilhe esta campanha em suas redes, grupos de amigos e familiares.
                <br />
                • Conecte-nos a influenciadores, empresas ou veículos de mídia que possam
                amplificar nossa voz.
              </p>

              <p className="mt-3 leading-relaxed">
                Juntos, podemos oferecer à Duda o conforto, a estabilidade e o suporte que ela
                merece. Conte com nosso imenso agradecimento e fique com a certeza de que seu gesto
                solidário faz toda a diferença.
              </p>

              <p className="mt-3 leading-relaxed">
                Que Deus ilumine cada coração generoso. A vida da Duda está em nossas mãos —
                contamos com você! 🙏
              </p>

              <button onClick={onDonateClick} className="btn-vakinha mt-6 w-full text-lg">
                Quero Ajudar 💖
              </button>
            </article>

            {/* Comments */}
            <div className="mt-10">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <MessageCircle className="h-5 w-5 text-primary" />
                Mostrando {COMENTARIOS.length} Comentários
              </h2>
              <div className="space-y-5">
                {COMENTARIOS.map((c) => (
                  <div key={c.name}>
                    <CommentItem c={c} />
                    {c.respostas && c.respostas.length > 0 && (
                      <div className="mt-4 space-y-4 border-l-2 border-border pl-4 sm:pl-8">
                        {c.respostas.map((r) => (
                          <CommentItem key={r.name} c={r} isReply />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Você precisa estar logado para comentar.
              </p>
            </div>
          </div>

          {/* RIGHT — desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl bg-card p-5 shadow-elevated">
              <SummaryContent
                arrecadado={arrecadado}
                pct={pct}
                apoiadores={apoiadores}
                onDonateClick={onDonateClick}
              />
              <div className="mt-6 flex gap-3 border-t border-border pt-4">
                <img
                  src={institutoLogo}
                  alt="Instituto"
                  loading="lazy"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full bg-muted object-contain p-1"
                />
                <div className="flex-1 text-xs">
                  <h3 className="text-sm font-bold">Instituto Mundo Melhor</h3>
                  <p className="text-muted-foreground">Ativo no Vakinha desde maio/2025</p>
                  <p className="text-muted-foreground">3 vaquinhas criadas · 8 vaquinhas apoiadas</p>
                  <a href="#" className="text-primary hover:underline">Leia mais</a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <button onClick={onDonateClick} className="btn-vakinha w-full text-base">
          Ajudar Agora
        </button>
      </div>
    </section>
  );
};

interface SummaryProps {
  arrecadado: number;
  pct: number;
  apoiadores: number;
  onDonateClick: () => void;
}

const CommentItem = ({ c, isReply = false }: { c: Comentario; isReply?: boolean }) => (
  <div className="flex gap-3">
    <img
      src={c.avatar}
      alt={c.name}
      loading="lazy"
      width={isReply ? 40 : 48}
      height={isReply ? 40 : 48}
      className={`flex-shrink-0 rounded-full object-cover ${isReply ? "h-10 w-10" : "h-12 w-12"}`}
    />
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/80">{c.text}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="cursor-pointer font-semibold hover:text-primary">Responder</span>
        <span className="cursor-pointer font-semibold hover:text-primary">Curtir</span>
        {isReply && <span className="cursor-pointer font-semibold hover:text-primary">Seguir</span>}
        <span>{c.time}</span>
      </div>
    </div>
  </div>
);

const SummaryContent = ({ arrecadado, pct, apoiadores, onDonateClick }: SummaryProps) => (
  <>
    <div className="mb-2 flex items-end justify-between">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Arrecadado</span>
      <span className="text-sm font-bold text-primary">{pct.toFixed(2)}%</span>
    </div>
    <h2 className="text-3xl font-extrabold text-foreground">R$ {formatBRL(arrecadado)}</h2>

    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-gradient-progress transition-all duration-1000"
        style={{ width: `${pct}%` }}
      />
    </div>

    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Meta</span>
      <span className="font-semibold">R$ {formatBRL(META)}</span>
    </div>
    <div className="mt-1 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Apoiadores</span>
      <span className="font-semibold">{apoiadores.toLocaleString("pt-BR")}</span>
    </div>

    <button onClick={onDonateClick} className="btn-vakinha mt-5 w-full text-base">
      Quero Ajudar
    </button>
  </>
);

interface MobileSummaryProps {
  arrecadado: number;
  pct: number;
  onDonateClick: () => void;
}

const MobileSummary = ({ arrecadado, pct, onDonateClick }: MobileSummaryProps) => (
  <div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-primary">{pct.toFixed(2)}%</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-progress"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
    <div className="mt-2 flex flex-nowrap items-baseline gap-2 whitespace-nowrap">
      <strong className="text-xl font-extrabold text-foreground sm:text-2xl">R$ {formatBRL(arrecadado)}</strong>
      <span className="text-xs text-muted-foreground sm:text-sm">de R$ {formatBRL(META)}</span>
    </div>
    <button onClick={onDonateClick} className="btn-vakinha mt-4 w-full text-base">
      Ajudar Agora
    </button>
  </div>
);
