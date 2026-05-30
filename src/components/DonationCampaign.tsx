import { Heart, CheckCircle2, MessageCircle, ShieldCheck, Users, Clock, Share2 } from "lucide-react";
import bannerCeleste from "@/assets/banner-celeste.jpg";
import institutoLogo from "@/assets/instituto-logo.webp";
import seloSeguranca from "@/assets/selo-seguranca.png";
import avatar1 from "@/assets/avatar1.jpg";
import avatar2 from "@/assets/avatar2.jpg";
import avatar3 from "@/assets/avatar3.jpg";
import avatar4 from "@/assets/avatar4.jpg";
import avatar5 from "@/assets/avatar5.svg";
import avatar6 from "@/assets/avatar6.webp";
import avatar7 from "@/assets/avatar7.webp";
import { useDonationTotals } from "@/lib/donationStore";

// ── Constantes ─────────────────────────────────────────────────
const META = 4_000_000;

const DONATION_TIERS = [
  { value: 25,  label: "R$ 25",  note: "1 sessão de fisioterapia" },
  { value: 50,  label: "R$ 50",  note: "1 semana de insumos", popular: true },
  { value: 100, label: "R$ 100", note: "1 consulta médica" },
  { value: 250, label: "R$ 250", note: "1 mês de suporte" },
];

// ── Comentários ────────────────────────────────────────────────
interface Comentario {
  name: string;
  avatar: string;
  time: string;
  text: string;
  amount?: string;
  respostas?: Comentario[];
}

const COMENTARIOS: Comentario[] = [
  {
    name: "Ana Clara",
    avatar: avatar1,
    time: "2 min",
    amount: "R$ 150",
    text: "Eu ajudei com 150 reais, pois conheço essa família. Dó no coração ver tanta dor que eles passam.",
  },
  {
    name: "Pedro Henrique",
    avatar: avatar2,
    time: "4 min",
    amount: "R$ 50",
    text: "Ajudei de coração mesmo, olha que situação complicada...",
  },
  {
    name: "Maria Eduarda",
    avatar: avatar3,
    time: "7 min",
    text: "Cada doação importa. Duda merece nosso apoio!",
  },
  {
    name: "Laura Sofia",
    avatar: avatar4,
    time: "9 min",
    text: "Muito triste gente! Compartilhei com minha família toda.",
    respostas: [
      { name: "Letícia Maria",     avatar: avatar5, time: "14 min", amount: "R$ 50",  text: "Aqui eu ajudei com 50 reais, queria poder doar um pouco mais" },
      { name: "Gabriela Oliveira", avatar: avatar6, time: "6 min",  text: "Vamos apoiar essa família!" },
      { name: "Renato Silva",      avatar: avatar7, time: "1 min",  amount: "R$ 300", text: "Doei 300 reais, espero que ajude no tratamento dessa criança." },
    ],
  },
];

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  onDonateClick: () => void;
}

// ══════════════════════════════════════════════════════════════
export const DonationCampaign = ({ onDonateClick }: Props) => {
  const { arrecadado, apoiadores } = useDonationTotals();
  const pct = Math.min(100, (arrecadado / META) * 100);

  return (
    <section id="campanha" className="py-6 sm:py-10">
      <div className="container">

        {/* ── Categoria ────────────────────────────────────── */}
        <div className="mb-3 animate-fade-in-up">
          <span className="trust-badge">
            <ShieldCheck className="h-3 w-3" />
            Saúde · História verificada
          </span>
        </div>

        {/* ── Headline ─────────────────────────────────────── */}
        <div className="mb-6 animate-fade-in-up delay-100">
          <h1 className="max-w-2xl text-3xl sm:text-4xl lg:text-[2.75rem] text-foreground">
            Ajude a Duda a vencer<br className="hidden sm:block" />
            a AME Tipo 1
          </h1>
          <p className="mt-2.5 max-w-lg text-[15px] text-muted-foreground leading-relaxed">
            Duda tem 1 ano e precisa de tratamento contínuo para sobreviver.
            Cada contribuição garante mais um dia de cuidado e esperança.
          </p>
        </div>

        {/* ── Grid ─────────────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* COLUNA ESQUERDA */}
          <div className="min-w-0">

            {/* Banner */}
            <div className="animate-fade-in-up delay-200 overflow-hidden rounded-xl">
              <img
                src={bannerCeleste}
                alt="Pequena Duda — bebê com AME Tipo 1"
                className="h-auto w-full object-cover"
                width={1280}
                height={768}
                loading="eager"
              />
            </div>

            {/* Apoiadores — inline, sem card wrapper */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ul className="flex items-center -space-x-1.5">
                  {[avatar1, avatar2, avatar3, avatar5, avatar6].map((a, i) => (
                    <li key={i} className="h-6 w-6 overflow-hidden rounded-full ring-[1.5px] ring-background">
                      <img src={a} alt="" className="h-full w-full object-cover" />
                    </li>
                  ))}
                </ul>
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{apoiadores.toLocaleString("pt-BR")}</strong> apoiadores
                </span>
              </div>
              <button
                onClick={() => navigator.share?.({ title: "Ajude a Duda!", url: window.location.href })}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                id="share-btn"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </button>
            </div>

            {/* Instituto (mobile) */}
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 p-3 lg:hidden">
              <img
                src={institutoLogo}
                alt="Instituto Mundo Melhor"
                loading="lazy"
                width={40}
                height={40}
                className="h-10 w-10 flex-shrink-0 rounded-full bg-muted object-contain"
              />
              <div className="text-xs text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">Instituto Mundo Melhor</p>
                <p>Verificado · Ativo desde maio/2025</p>
              </div>
            </div>

            {/* Resumo mobile */}
            <div className="mt-4 lg:hidden animate-fade-in-up delay-300">
              <MobileSummary arrecadado={arrecadado} pct={pct} apoiadores={apoiadores} onDonateClick={onDonateClick} />
            </div>

            {/* Tabs */}
            <div className="mt-10 flex gap-6 border-b border-border/60">
              {["Sobre a Duda", "Novidades", "Quem ajudou"].map((t, i) => (
                <button
                  key={t}
                  className={`pb-2.5 text-sm font-medium transition-colors ${
                    i === 0
                      ? "border-b-2 border-foreground text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ── História ──────────────────────────────────── */}
            <article className="mt-8 space-y-5 text-[15px] leading-[1.75] text-foreground/85">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                História verificada pela equipe da campanha
              </p>

              <p>
                Olá! Sou do Rio de Janeiro, a mãe da <strong>Duda Motta</strong>, de apenas
                1 ano, que enfrenta um diagnóstico devastador:{" "}
                <strong>Atrofia Muscular Espinhal (AME) Tipo 1</strong>. Essa condição genética
                compromete os movimentos, a respiração e a deglutição. Sem suporte adequado,
                pode ser fatal antes dos dois anos de vida.
              </p>

              {/* Urgência — editorial, não alarme */}
              <aside className="border-l-[3px] border-accent/70 bg-accent/5 py-3 pl-4 pr-4 rounded-r-lg">
                <p className="text-sm font-semibold text-accent flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  Por que agora?
                </p>
                <p className="mt-1 text-sm text-foreground/80">
                  A janela terapêutica da Duda é pequena. Cada dia sem os equipamentos e terapias
                  corretos compromete irreversivelmente o desenvolvimento das suas funções vitais.
                </p>
              </aside>

              <p>
                <strong>O que é AME?</strong> Uma condição genética rara que destrói os neurônios
                motores. Eles controlam respiração, movimento e deglutição. Quando morrem, não voltam.
                A expectativa de vida sem suporte é inferior a 2 anos.
              </p>

              <p>
                Estamos lutando pelo medicamento <strong>ZOLGENSMA</strong> — que custa cerca de
                7 milhões de reais — mas nossa prioridade imediata é garantir todos os cuidados
                de suporte que mantêm a Duda estável e com qualidade de vida.
              </p>

              {/* Lista de impacto */}
              <div className="rounded-lg border border-border/60 p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Como sua doação vai ajudar:
                </p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    { item: "Equipamentos respiratórios",   detail: "BiPAP, insumos e acessórios" },
                    { item: "Terapia contínua",             detail: "Fisioterapia e fonoaudiologia" },
                    { item: "Insumos especiais",            detail: "Colchão pneumático, cadeira adaptada" },
                    { item: "Transporte médico",            detail: "Consultas e sessões de terapia" },
                  ].map(({ item, detail }) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>{item}:</strong> {detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA emocional */}
              <div id="doe-agora" className="pt-1">
                <button onClick={onDonateClick} className="btn-primary w-full py-4 text-[15px]" id="mid-cta">
                  Quero ajudar a Duda
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Doação segura via PIX · Qualquer valor
                </p>
              </div>

              <p>
                O custo diário de todos esses cuidados ultrapassa o que nossa família consegue
                arcar sozinha. Sem esse suporte, perdemos tempo precioso na busca pela
                estabilidade dela.
              </p>

              <p>
                <strong>Como você pode fazer a diferença:</strong>
              </p>
              <ul className="space-y-1 text-sm pl-1">
                <li className="flex gap-2"><span className="text-primary">·</span> Doe qualquer valor — cada contribuição mantém a Duda respirando com mais segurança.</li>
                <li className="flex gap-2"><span className="text-primary">·</span> Compartilhe em suas redes, grupos de amigos e familiares.</li>
                <li className="flex gap-2"><span className="text-primary">·</span> Conecte-nos a influenciadores ou empresas que possam ampliar nossa voz.</li>
              </ul>

              <p>
                Juntos, podemos oferecer à Duda o conforto e o suporte que ela merece.
                A vida da Duda está em nossas mãos — contamos com você.
              </p>

              <button onClick={onDonateClick} className="btn-primary w-full py-4 text-[15px]" id="bottom-article-cta">
                Quero ajudar
              </button>
            </article>

            {/* ── Comentários ───────────────────────────────── */}
            <div className="mt-14">
              <h2 className="mb-6 flex items-center gap-2 text-2xl text-foreground">
                <MessageCircle className="h-5 w-5 text-primary" />
                Quem já ajudou
              </h2>
              <div className="space-y-5">
                {COMENTARIOS.map((c) => (
                  <div key={c.name}>
                    <CommentItem c={c} />
                    {c.respostas && c.respostas.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-border/40 pl-4 sm:pl-6 ml-6 sm:ml-7">
                        {c.respostas.map((r) => (
                          <CommentItem key={r.name} c={r} isReply />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Doe para poder comentar e mostrar seu apoio.
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA — Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-[88px]">

              {/* Card doação */}
              <div className="rounded-xl border border-border/60 bg-card p-6 animate-fade-in-up">
                <SummaryContent
                  arrecadado={arrecadado}
                  pct={pct}
                  apoiadores={apoiadores}
                  onDonateClick={onDonateClick}
                />
              </div>

              {/* Segurança */}
              <div className="mt-3 rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <img src={seloSeguranca} alt="Selo de segurança" className="h-10 w-auto opacity-80" loading="lazy" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Pagamento criptografado</p>
                    <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Dados protegidos (LGPD)</p>
                    <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Recibo enviado por e-mail</p>
                  </div>
                </div>
              </div>

              {/* Organizador */}
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4">
                <img
                  src={institutoLogo}
                  alt="Instituto Mundo Melhor"
                  loading="lazy"
                  width={44}
                  height={44}
                  className="h-11 w-11 flex-shrink-0 rounded-full bg-muted object-contain"
                />
                <div className="text-xs text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground">Instituto Mundo Melhor</p>
                  <p>Verificado · Ativo desde maio/2025</p>
                  <p>3 campanhas · 8 apoiadas</p>
                </div>
              </div>

              {/* Contador */}
              <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <strong className="text-foreground">{apoiadores.toLocaleString("pt-BR")}</strong> pessoas já confiaram
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-white/98 backdrop-blur-sm p-3 lg:hidden">
        <button
          onClick={onDonateClick}
          className="btn-primary w-full py-3.5 text-[15px]"
          id="mobile-sticky-cta"
        >
          Doar agora
        </button>
      </div>
    </section>
  );
};

// ── Sub-componentes ────────────────────────────────────────────

const CommentItem = ({ c, isReply = false }: { c: Comentario; isReply?: boolean }) => (
  <div className="flex gap-3">
    <img
      src={c.avatar}
      alt={c.name}
      loading="lazy"
      width={isReply ? 32 : 40}
      height={isReply ? 32 : 40}
      className={`flex-shrink-0 rounded-full object-cover ${isReply ? "h-8 w-8" : "h-10 w-10"}`}
    />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{c.name}</span>
        {c.amount && (
          <span className="text-xs font-medium text-primary">
            doou {c.amount}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{c.time} atrás</span>
      </div>
      <p className="mt-0.5 text-sm text-foreground/75 leading-relaxed">{c.text}</p>
    </div>
  </div>
);

interface SummaryProps {
  arrecadado: number;
  pct: number;
  apoiadores: number;
  onDonateClick: () => void;
}

const SummaryContent = ({ arrecadado, pct, apoiadores, onDonateClick }: SummaryProps) => (
  <>
    <p className="text-sm text-muted-foreground">Arrecadado</p>
    <p className="mt-1 text-3xl font-semibold text-foreground font-display">
      R$ {formatBRL(arrecadado)}
    </p>

    {/* Barra */}
    <div className="progress-bar mt-3">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>

    <div className="mt-2.5 flex items-center justify-between text-sm text-muted-foreground">
      <span>{pct.toFixed(1)}% da meta</span>
      <span>{apoiadores.toLocaleString("pt-BR")} apoiadores</span>
    </div>

    {/* Tiers */}
    <div className="mt-5 grid grid-cols-2 gap-2">
      {DONATION_TIERS.map((tier) => (
        <button
          key={tier.value}
          onClick={onDonateClick}
          className={`relative flex flex-col items-center rounded-lg border py-3 text-sm transition-all hover:-translate-y-px ${
            tier.popular
              ? "border-accent bg-accent/5 text-foreground"
              : "border-border/80 bg-card text-foreground hover:border-primary/40"
          }`}
          id={`tier-${tier.value}`}
        >
          {tier.popular && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-px text-[10px] font-semibold text-white whitespace-nowrap">
              + escolhido
            </span>
          )}
          <span className="font-semibold">{tier.label}</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">{tier.note}</span>
        </button>
      ))}
    </div>

    {/* CTA */}
    <button onClick={onDonateClick} className="btn-primary mt-4 w-full py-3.5 text-[15px]" id="sidebar-cta">
      Quero ajudar
    </button>

    <p className="mt-2.5 text-center text-xs text-muted-foreground">
      Pagamento seguro via PIX
    </p>
  </>
);

interface MobileSummaryProps {
  arrecadado: number;
  pct: number;
  apoiadores: number;
  onDonateClick: () => void;
}

const MobileSummary = ({ arrecadado, pct, apoiadores, onDonateClick }: MobileSummaryProps) => (
  <div className="rounded-lg border border-border/60 bg-card p-4">
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-primary">{pct.toFixed(1)}%</span>
      <div className="progress-bar flex-1">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
    <div className="mt-2 flex flex-nowrap items-baseline gap-2 whitespace-nowrap">
      <strong className="text-xl font-display text-foreground">
        R$ {formatBRL(arrecadado)}
      </strong>
      <span className="text-xs text-muted-foreground">
        de R$ {formatBRL(META)} · {apoiadores.toLocaleString("pt-BR")} apoiadores
      </span>
    </div>
    <button onClick={onDonateClick} className="btn-primary mt-3 w-full py-3 text-[15px]" id="mobile-summary-cta">
      Doar agora
    </button>
  </div>
);
