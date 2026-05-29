import { Heart, CheckCircle2, MessageCircle, ShieldCheck, Users, Clock, Share2 } from "lucide-react";
import bannerCeleste from "@/assets/banner-celeste.jpg";
import institutoLogo from "@/assets/instituto-logo.png";
import seloSeguranca from "@/assets/selo-seguranca.png";
import avatar1 from "@/assets/avatar1.jpg";
import avatar2 from "@/assets/avatar2.jpg";
import avatar3 from "@/assets/avatar3.jpg";
import avatar4 from "@/assets/avatar4.jpg";
import avatar5 from "@/assets/avatar5.svg";
import avatar6 from "@/assets/avatar6.webp";
import avatar7 from "@/assets/avatar7.webp";
import { useDonationTotals } from "@/lib/donationStore";

// ── Constantes da campanha ─────────────────────────────────────
const META = 4_000_000;

// Valores sugeridos calibrados por ancoragem psicológica:
// R$25 = ponto de entrada baixo (reduz barreira)
// R$50 = âncora principal destacada (mais escolhido)
// R$100 = decoy que faz R$50 parecer razoável
// R$250 = para quem quer ser reconhecido
const DONATION_TIERS = [
  { value: 25,  label: "R$ 25",  note: "1 sessão de fisioterapia" },
  { value: 50,  label: "R$ 50",  note: "1 semana de insumos", popular: true },
  { value: 100, label: "R$ 100", note: "1 consulta médica" },
  { value: 250, label: "R$ 250", note: "1 mês de suporte" },
];

// ── Comentários / prova social ─────────────────────────────────
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
      { name: "Letícia Maria",     avatar: avatar5, time: "14 min", amount: "R$ 50",  text: "Aqui eu ajudei com 50 reais, queria poder doar um pouco mais 😓" },
      { name: "Gabriela Oliveira", avatar: avatar6, time: "6 min",  text: "Vamos apoiar essa família!" },
      { name: "Renato Silva",      avatar: avatar7, time: "1 min",  amount: "R$ 300", text: "Doei 300 reais, espero que ajude no tratamento dessa criança." },
    ],
  },
];

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Props ──────────────────────────────────────────────────────
interface Props {
  onDonateClick: () => void;
}

// ══════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export const DonationCampaign = ({ onDonateClick }: Props) => {
  const { arrecadado, apoiadores } = useDonationTotals();
  const pct = Math.min(100, (arrecadado / META) * 100);

  return (
    <section id="campanha" className="section-soft py-6">
      <div className="container">

        {/* ── Breadcrumb / categoria ────────────────────────── */}
        <div className="mb-4 animate-fade-in-up">
          <span className="trust-badge">
            <ShieldCheck className="h-3.5 w-3.5" />
            Saúde · História Verificada
          </span>
        </div>

        {/* ── Headline principal ────────────────────────────── */}
        <div className="mb-6 animate-fade-in-up delay-100">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
            Ajude a Duda a Vencer a AME Tipo 1:{" "}
            <span className="text-primary">cada doação garante seu tratamento.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Campanha · ID #4452341 · Criada em 07/11/2025
          </p>
        </div>

        {/* ── Grid principal ────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">

          {/* ════════════════════════════════════════════════ */}
          {/*  COLUNA ESQUERDA                                */}
          {/* ════════════════════════════════════════════════ */}
          <div className="min-w-0">

            {/* Banner */}
            <div className="animate-fade-in-up delay-200 overflow-hidden rounded-2xl shadow-elevated">
              <img
                src={bannerCeleste}
                alt="Pequena Duda sorrindo — bebê com AME Tipo 1"
                className="h-auto w-full object-cover"
                width={1280}
                height={768}
                loading="eager"
              />
            </div>

            {/* Avatares + corações */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-card animate-fade-in-up delay-300">
              <ul className="flex items-center -space-x-2">
                {[avatar1, avatar2, avatar3, avatar5, avatar6].map((a, i) => (
                  <li key={i} className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-white">
                    <img src={a} alt="" className="h-full w-full object-cover" />
                  </li>
                ))}
                <li className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold ring-2 ring-white">
                  +
                </li>
              </ul>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  <strong className="text-foreground">2.843</strong> corações recebidos
                </span>
                <Heart className="h-4 w-4 fill-primary text-primary animate-pulse-soft" />
              </div>
            </div>

            {/* ── Card Instituto (mobile) ───────────────────── */}
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-card p-3 shadow-card lg:hidden">
              <img
                src={institutoLogo}
                alt="Instituto Mundo Melhor"
                loading="lazy"
                width={48}
                height={48}
                className="h-12 w-12 flex-shrink-0 rounded-full bg-muted object-contain p-1"
              />
              <div className="min-w-0 flex-1 text-xs">
                <h3 className="text-sm font-bold text-foreground">Instituto Mundo Melhor</h3>
                <p className="text-muted-foreground">Ativo e verificado desde maio/2025</p>
                <p className="text-muted-foreground">3 campanhas criadas · 8 apoiadas</p>
              </div>
            </div>

            {/* ── Resumo mobile inline ─────────────────────── */}
            <div className="mt-4 lg:hidden animate-fade-in-up delay-300">
              <MobileSummary arrecadado={arrecadado} pct={pct} apoiadores={apoiadores} onDonateClick={onDonateClick} />
            </div>

            {/* ── Tabs de conteúdo ─────────────────────────── */}
            <div className="mt-8 flex gap-6 border-b border-border">
              {["Sobre a Duda", "Novidades", "Quem ajudou"].map((t, i) => (
                <button
                  key={t}
                  className={`pb-3 text-sm font-semibold transition-colors ${
                    i === 0
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ── História verificada ──────────────────────── */}
            <article className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/90">
              <p className="flex items-center gap-2 font-semibold text-primary text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                História verificada pela equipe da campanha
              </p>

              <p>
                Olá! Sou do Rio de Janeiro, a mãe da <strong>Duda Motta</strong>, de apenas
                1 ano, que enfrenta um diagnóstico devastador:{" "}
                <strong>Atrofia Muscular Espinhal (AME) Tipo 1</strong>. Essa condição genética
                compromete os movimentos, a respiração e a deglutição. Sem suporte adequado,
                pode ser fatal antes dos dois anos de vida.
              </p>

              {/* Bloco de urgência — quebra de atenção */}
              <div className="rounded-xl border-l-4 border-destructive bg-destructive/5 p-4">
                <p className="font-bold text-destructive flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  Por que agora?
                </p>
                <p className="mt-1 text-sm">
                  A janela terapêutica da Duda é pequena. Cada dia sem os equipamentos e terapias
                  corretos compromete irreversivelmente o desenvolvimento das suas funções vitais.
                </p>
              </div>

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

              {/* Lista de necessidades com impacto concreto */}
              <div className="rounded-xl bg-card p-5 shadow-card">
                <p className="mb-3 font-bold text-foreground flex items-center gap-2">
                  ✨ Como sua doação vai ajudar:
                </p>
                <ul className="space-y-2 text-sm">
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

              {/* CTA dentro do conteúdo — momento emocional alto */}
              <div id="doe-agora" className="pt-2">
                <button onClick={onDonateClick} className="btn-primary w-full text-base py-4" id="mid-cta">
                  Quero Ajudar a Duda Agora 💛
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  🔒 Doação 100% segura via PIX · Qualquer valor ajuda
                </p>
              </div>

              <p>
                🚨 <strong>Por que sua ajuda é urgente?</strong>{" "}
                O custo diário de todos esses cuidados ultrapassa o que nossa família consegue
                arcar sozinha. Sem esse suporte, perdemos tempo precioso na busca pela
                estabilidade dela.
              </p>

              <p>
                🌟 <strong>Como você pode fazer a diferença:</strong>
                <br />• Doe qualquer valor — cada contribuição mantém a Duda respirando com mais segurança.
                <br />• Compartilhe em suas redes, grupos de amigos e familiares.
                <br />• Conecte-nos a influenciadores ou empresas que possam ampliar nossa voz.
              </p>

              <p>
                Juntos, podemos oferecer à Duda o conforto e o suporte que ela merece.
                A vida da Duda está em nossas mãos — contamos com você! 🙏
              </p>

              {/* Segundo CTA — fundo do artigo */}
              <button onClick={onDonateClick} className="btn-primary w-full text-base py-4" id="bottom-article-cta">
                Quero Ajudar 💛
              </button>

              {/* Botão compartilhar */}
              <button
                onClick={() => navigator.share?.({ title: "Ajude a Duda!", url: window.location.href })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                id="share-btn"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar esta campanha
              </button>
            </article>

            {/* ── Comentários / Prova social ───────────────── */}
            <div className="mt-12">
              <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-foreground">
                <MessageCircle className="h-5 w-5 text-primary" />
                {COMENTARIOS.length} Comentários de quem ajudou
              </h2>
              <div className="space-y-5">
                {COMENTARIOS.map((c) => (
                  <div key={c.name}>
                    <CommentItem c={c} />
                    {c.respostas && c.respostas.length > 0 && (
                      <div className="mt-4 space-y-4 border-l-2 border-primary/20 pl-4 sm:pl-8">
                        {c.respostas.map((r) => (
                          <CommentItem key={r.name} c={r} isReply />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Doe para poder comentar e mostrar seu apoio. 💙
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/*  COLUNA DIREITA — Sidebar sticky (desktop)      */}
          {/* ════════════════════════════════════════════════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-[100px]">

              {/* Card principal de doação */}
              <div className="rounded-2xl bg-card p-6 shadow-elevated animate-fade-in-up">
                <SummaryContent
                  arrecadado={arrecadado}
                  pct={pct}
                  apoiadores={apoiadores}
                  onDonateClick={onDonateClick}
                />
              </div>

              {/* Selos de segurança */}
              <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sua doação é protegida
                </p>
                <div className="flex items-center gap-3">
                  <img src={seloSeguranca} alt="Selo de segurança" className="h-12 w-auto" loading="lazy" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Pagamento criptografado</p>
                    <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Dados protegidos (LGPD)</p>
                    <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Recibo enviado por e-mail</p>
                  </div>
                </div>
              </div>

              {/* Card do organizador */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <img
                  src={institutoLogo}
                  alt="Instituto Mundo Melhor"
                  loading="lazy"
                  width={56}
                  height={56}
                  className="h-14 w-14 flex-shrink-0 rounded-full bg-muted object-contain p-1"
                />
                <div className="flex-1 text-xs">
                  <h3 className="text-sm font-bold text-foreground">Instituto Mundo Melhor</h3>
                  <p className="text-muted-foreground">Verificado · Ativo desde maio/2025</p>
                  <p className="text-muted-foreground">3 campanhas · 8 apoiadas</p>
                </div>
              </div>

              {/* Contador de apoiadores ativos */}
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  <strong>{apoiadores.toLocaleString("pt-BR")}</strong> pessoas já confiaram nesta campanha
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── CTA fixo mobile (sempre visível) ─────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.10)] lg:hidden">
        <button
          onClick={onDonateClick}
          className="btn-primary w-full py-4 text-base"
          id="mobile-sticky-cta"
        >
          Ajudar a Duda Agora 💛
        </button>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          🔒 Seguro · Rápido · Via PIX
        </p>
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
      width={isReply ? 40 : 48}
      height={isReply ? 40 : 48}
      className={`flex-shrink-0 rounded-full object-cover ring-2 ring-primary/20 ${isReply ? "h-10 w-10" : "h-12 w-12"}`}
    />
    <div className="min-w-0 flex-1 rounded-xl bg-card p-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
        {c.amount && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            doou {c.amount}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-foreground/80">{c.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
        <span className="cursor-pointer font-semibold hover:text-primary">Curtir 👍</span>
        <span className="cursor-pointer font-semibold hover:text-primary">Responder</span>
        <span>{c.time} atrás</span>
      </div>
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
    {/* Percentual e valor */}
    <div className="mb-2 flex items-end justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Arrecadado
      </span>
      <span className="text-sm font-bold text-primary">{pct.toFixed(1)}% da meta</span>
    </div>
    <p className="text-3xl font-extrabold text-foreground">R$ {formatBRL(arrecadado)}</p>

    {/* Barra de progresso animada */}
    <div className="progress-bar mt-3">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>

    {/* Meta e apoiadores */}
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Meta</span>
      <span className="font-semibold">R$ {formatBRL(META)}</span>
    </div>
    <div className="mt-1 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Apoiadores</span>
      <span className="font-semibold">{apoiadores.toLocaleString("pt-BR")}</span>
    </div>

    {/* Tiers de doação — psicologia de preço */}
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Escolha um valor:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DONATION_TIERS.map((tier) => (
          <button
            key={tier.value}
            onClick={onDonateClick}
            className={`relative flex flex-col items-center rounded-xl border-2 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 ${
              tier.popular
                ? "border-accent bg-accent/10 text-accent-foreground"
                : "border-border bg-white text-foreground hover:border-primary/50"
            }`}
            id={`tier-${tier.value}`}
          >
            {tier.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground whitespace-nowrap">
                + escolhido
              </span>
            )}
            <span className="text-base">{tier.label}</span>
            <span className="mt-0.5 text-[10px] font-normal text-muted-foreground">{tier.note}</span>
          </button>
        ))}
      </div>
    </div>

    {/* CTA principal */}
    <button onClick={onDonateClick} className="btn-primary mt-5 w-full py-4 text-base" id="sidebar-cta">
      Quero Ajudar 💛
    </button>

    {/* Micro-confiança */}
    <p className="mt-3 text-center text-xs text-muted-foreground">
      🔒 Pagamento seguro · PIX instantâneo
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
  <div className="rounded-xl bg-card p-4 shadow-card">
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-primary">{pct.toFixed(1)}%</span>
      <div className="progress-bar flex-1">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
    <div className="mt-2 flex flex-nowrap items-baseline gap-2 whitespace-nowrap">
      <strong className="text-xl font-extrabold text-foreground sm:text-2xl">
        R$ {formatBRL(arrecadado)}
      </strong>
      <span className="text-xs text-muted-foreground">
        de R$ {formatBRL(META)} · {apoiadores.toLocaleString("pt-BR")} apoiadores
      </span>
    </div>
    <button onClick={onDonateClick} className="btn-primary mt-4 w-full py-3 text-base" id="mobile-summary-cta">
      Ajudar Agora 💛
    </button>
  </div>
);
