/**
 * Élise Cerimonial — script.js
 * JavaScript Squad v1.0 | 2025
 *
 * Arquitetura: Módulo de funções independentes, sem dependências externas.
 * Cada função tem responsabilidade única e é chamada no DOMContentLoaded.
 *
 * Funções:
 *  - initNav()                Comportamento da navegação (scroll + sticky)
 *  - initMobileMenu()         Menu mobile com focus trap e acessibilidade
 *  - initHero()               Animação de entrada do hero
 *  - initScrollReveal()       Reveal de elementos via IntersectionObserver
 *  - initStatsCounter()       Contador animado das métricas
 *  - initTestimonialsSlider() Slider com auto-play, teclado e touch
 *  - initSmoothScroll()       Scroll suave para âncoras
 *  - initNewsletter()         Validação e feedback do formulário newsletter
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   CONSTANTES
   Valores centralizados — evita números mágicos no código.
───────────────────────────────────────────────────────────── */
const NAV_SCROLL_THRESHOLD  = 80;     // px de scroll para ativar nav sólida
const SLIDER_INTERVAL_MS    = 5000;   // ms entre slides automáticos
const COUNTER_DURATION_MS   = 2000;   // ms para animar os contadores
const REVEAL_THRESHOLD      = 0.15;   // % do elemento visível para revelar
const REVEAL_ROOT_MARGIN    = '0px 0px -40px 0px'; // margem do observer
const SWIPE_MIN_DISTANCE_PX = 50;     // px mínimos para registrar swipe

/* ─────────────────────────────────────────────────────────────
   UTILITÁRIOS DOM
   Wrappers semânticos que tornam queries legíveis e tipadas.
───────────────────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** @returns {boolean} true se o usuário prefere movimento reduzido */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════════════════════════════
   1. NAV — Sticky + mudança de estado ao rolar
═══════════════════════════════════════════════════════════════ */

/**
 * Monitora o scroll e aplica data-scrolled="true" no header
 * quando o usuário passa do NAV_SCROLL_THRESHOLD.
 * O CSS usa esse atributo para ativar o fundo fosco e a borda.
 */
function initNav() {
  const nav = qs('#site-nav');
  if (!nav) return;

  function updateNavState() {
    nav.dataset.scrolled = String(window.scrollY > NAV_SCROLL_THRESHOLD);
  }

  // Estado inicial (ex: página recarregada com scroll já ativo)
  updateNavState();
  window.addEventListener('scroll', updateNavState, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   2. MOBILE MENU — Overlay fullscreen com focus trap
═══════════════════════════════════════════════════════════════ */

/**
 * Abre/fecha o menu mobile com:
 * - Bloqueio de scroll do body
 * - Focus trap dentro do overlay (acessibilidade)
 * - Fechamento por tecla Escape
 * - Restauração de foco no botão hamburger ao fechar
 */
function initMobileMenu() {
  const hamburger = qs('.nav__hamburger');
  const menu      = qs('#mobile-menu');
  const closeBtn  = qs('.mobile-menu__close', menu);

  if (!hamburger || !menu) return;

  /** Retorna todos os elementos focáveis dentro do menu */
  function getFocusableElements() {
    return qsa('a[href], button:not([disabled])', menu);
  }

  function openMenu() {
    menu.classList.add('is-open');
    menu.removeAttribute('aria-hidden');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    // Foco no primeiro link após abrir
    const focusable = getFocusableElements();
    focusable[1]?.focus(); // índice 1 = primeiro link (0 = btn close)
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger.focus(); // devolve foco ao botão de origem
  }

  hamburger.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);

  // Fecha ao clicar em qualquer link do menu
  qsa('.mobile-menu__link, .mobile-menu__cta', menu)
    .forEach(link => link.addEventListener('click', closeMenu));

  // Focus trap + Escape dentro do overlay
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (!focusable.length) { e.preventDefault(); return; }

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   3. HERO — Animação de entrada do plano de fundo
═══════════════════════════════════════════════════════════════ */

/**
 * Ativa o zoom-out do Hero APENAS após a imagem de fundo carregar.
 *
 * Problema anterior: requestAnimationFrame disparava imediatamente,
 * fazendo o zoom animar sobre o background-color antes da foto aparecer.
 *
 * Solução: lê o URL do background-image calculado via getComputedStyle,
 * cria um Image() para aguardar o onload e só então adiciona .is-loaded.
 * Fallback imediato em caso de erro ou imagem já em cache.
 */
function initHero() {
  const hero   = qs('.hero');
  const heroBg = qs('.hero__bg');
  if (!hero || !heroBg) return;

  // Extrai a URL do background-image definido no CSS
  const bgValue = window.getComputedStyle(heroBg).backgroundImage;
  const match   = bgValue.match(/url\(["']?([^"')]+)["']?\)/);

  if (!match) {
    // Sem URL detectada (ex.: CSS ainda não carregou) — ativa imediatamente
    requestAnimationFrame(() => hero.classList.add('is-loaded'));
    return;
  }

  const markLoaded = () => {
    if (!hero.classList.contains('is-loaded')) {
      hero.classList.add('is-loaded');
    }
  };

  const img    = new Image();
  img.onload   = markLoaded;
  img.onerror  = markLoaded; // degradação graciosa: anima mesmo sem a foto
  img.src      = match[1];

  // Se a imagem já estava em cache, .complete = true e onload não dispara
  if (img.complete) markLoaded();
}

/* ═══════════════════════════════════════════════════════════════
   4. SCROLL REVEAL — Elementos aparecem ao entrar na viewport
═══════════════════════════════════════════════════════════════ */

/**
 * Usa IntersectionObserver para adicionar .is-visible em cada
 * .reveal e .gold-divider quando entram na viewport.
 * O CSS define a transição de opacidade e translateY.
 * Respeitamos prefers-reduced-motion: se ativo, tudo visível imediatamente.
 */
function initScrollReveal() {
  // Sem animações para quem prefere movimento reduzido
  if (prefersReducedMotion()) {
    qsa('.reveal, .gold-divider').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const targets = qsa('.reveal, .gold-divider:not(.hero .gold-divider)');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // observa apenas uma vez
      });
    },
    { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN }
  );

  targets.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   5. STATS COUNTER — Animação de contagem das métricas
═══════════════════════════════════════════════════════════════ */

/**
 * Quando a seção .stats entra na viewport, anima cada .stat__number
 * de 0 até o valor em data-target.
 * - data-prefix: string antes do número (ex: "+")
 * - data-suffix: string depois do número (ex: "%")
 * - Curva de easing: ease-out cúbico (desacelera no final)
 * - Dispara apenas uma vez por sessão de página
 */
function initStatsCounter() {
  const statsSection = qs('.stats');
  const counters = qsa('.stat__number[data-target]');
  if (!statsSection || !counters.length) return;

  let hasAnimated = false;

  /**
   * Anima um único contador.
   * @param {HTMLElement} el - O elemento com data-target
   */
  function animateCounter(el) {
    const target   = parseInt(el.dataset.target ?? '0', 10);
    const prefix   = el.dataset.prefix ?? '';
    const suffix   = el.dataset.suffix ?? '';
    const duration = prefersReducedMotion() ? 0 : COUNTER_DURATION_MS;

    if (duration === 0) {
      el.textContent = prefix + target + suffix;
      return;
    }

    const startTime = performance.now();

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing ease-out cúbico: desacelera suavemente ao final
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.round(eased * target) + suffix;

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (hasAnimated) return;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        hasAnimated = true;
        counters.forEach(animateCounter);
        observer.disconnect();
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(statsSection);
}

/* ═══════════════════════════════════════════════════════════════
   6. SMOOTH SCROLL — Scroll suave para âncoras internas
═══════════════════════════════════════════════════════════════ */

/**
 * Intercepta cliques em links âncora (href="#...") e rola
 * suavemente para o alvo, compensando a altura da nav fixa.
 */
function initSmoothScroll() {
  const NAV_HEIGHT = 80; // px — altura da nav fixa

  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      const target   = qs(targetId);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   8. ACTIVE NAV — Destaca o link da seção visível no momento
═══════════════════════════════════════════════════════════════ */

/**
 * Usa IntersectionObserver para marcar o link da nav correspondente
 * à seção atualmente visível na viewport.
 * Atualiza aria-current para acessibilidade de leitores de tela.
 */
function initActiveNavLink() {
  const navLinks = qsa('.nav__link[href^="#"]');
  if (!navLinks.length) return;

  // Mapeia href → link element para lookup rápido
  const linkMap = new Map(navLinks.map(link => [link.getAttribute('href'), link]));

  // Coleta as seções referenciadas pelos links
  const sections = [];
  linkMap.forEach((_, href) => {
    const el = qs(href);
    if (el) sections.push(el);
  });
  if (!sections.length) return;

  let activeSectionId = null;

  function setActive(id) {
    if (activeSectionId === id) return;
    activeSectionId = id;
    navLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    {
      // Considera a seção "ativa" quando ocupa a faixa central da tela
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0,
    }
  );

  sections.forEach(el => observer.observe(el));

  // Ao carregar, marca a primeira seção como ativa
  setActive(sections[0].id);
}

/* ═══════════════════════════════════════════════════════════════
   9. NEWSLETTER — Validação e feedback de inscrição
═══════════════════════════════════════════════════════════════ */

/**
 * Campo "Receba inspirações" do rodapé.
 * Ao enviar um e-mail válido, abre o cliente de e-mail do usuário
 * com destinatário, assunto e corpo pré-preenchidos via mailto:.
 */
function initNewsletter() {
  const input = qs('#newsletter-email');
  const btn   = qs('.footer__newsletter-btn');
  if (!input || !btn) return;

  const DEST    = 'contatoarcerimonial@gmail.com';
  const SUBJECT = 'Quero receber inspirações';

  /** @param {string} email @returns {boolean} */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError() {
    input.style.boxShadow = 'inset 0 0 0 1px #C0392B';
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  function clearError() {
    input.style.boxShadow = '';
    input.removeAttribute('aria-invalid');
  }

  function handleSubmit() {
    const email = input.value.trim();
    if (!isValidEmail(email)) {
      showError();
      return;
    }

    clearError();

    const body =
      'Olá! Vim do site e gostaria de receber inspirações, por favor!\n' +
      'Meu e-mail é: ' + email;

    const mailto =
      'mailto:' + DEST +
      '?subject=' + encodeURIComponent(SUBJECT) +
      '&body='    + encodeURIComponent(body);

    window.location.href = mailto;
  }

  btn.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
    else clearError();
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. ABOUT HISTORY — Bloco expansível "Nossa História Completa"
═══════════════════════════════════════════════════════════════ */

/**
 * Alterna a visibilidade do bloco ".about__history" ao clicar
 * no botão ".about__history-toggle".
 * Usa aria-expanded + classe .is-open para acessibilidade e animação CSS.
 */
function initAboutHistory() {
  const toggle = qs('.about__history-toggle');
  const panel  = qs('#about-history');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', String(!isOpen));
    panel.setAttribute('aria-hidden', String(isOpen));
    panel.classList.toggle('is-open', !isOpen);

    // Rola suavemente até o painel ao abrir
    if (!isOpen) {
      const navH = 80;
      const top  = panel.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   11. EXPERIENCE EXPAND — Blocos expansíveis Day Bride / Groom
═══════════════════════════════════════════════════════════════ */

/**
 * Controla os dois blocos expansíveis da seção de Experiências.
 * Alterna texto do botão entre "Saiba mais" e "Ocultar".
 * Fecha o outro bloco ao abrir um novo (accordion).
 */
function initExperienceExpand() {
  const toggles = qsa('.experience-expand-toggle');
  if (!toggles.length) return;

  function closePanel(toggle, panel) {
    toggle.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    panel.classList.remove('is-open');
    const label = toggle.querySelector('.experience-expand-toggle__label');
    if (label) label.textContent = 'Saiba mais';
  }

  toggles.forEach(toggle => {
    const panelId = toggle.getAttribute('aria-controls');
    const panel   = qs('#' + panelId);
    if (!panel) return;

    toggle.addEventListener('click', () => {
      const isOpen  = toggle.getAttribute('aria-expanded') === 'true';

      // Fecha o outro painel (comportamento accordion)
      toggles.forEach(other => {
        if (other === toggle) return;
        const otherId  = other.getAttribute('aria-controls');
        const otherPanel = qs('#' + otherId);
        if (otherPanel) closePanel(other, otherPanel);
      });

      if (isOpen) {
        closePanel(toggle, panel);
      } else {
        toggle.setAttribute('aria-expanded', 'true');
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.add('is-open');
        const label = toggle.querySelector('.experience-expand-toggle__label');
        if (label) label.textContent = 'Ocultar';

        // Rola até o painel com offset da nav
        const navH = 80;
        const top  = panel.getBoundingClientRect().top + window.scrollY - navH - 16;
        window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   12. WHATSAPP FAB — Botão flutuante de contato
═══════════════════════════════════════════════════════════════ */

/**
 * Controla a visibilidade do botão flutuante do WhatsApp.
 *
 * O botão permanece oculto enquanto o Hero está na viewport —
 * evitando competição visual com o CTA principal da página.
 * Assim que o Hero sai da tela, o botão desliza para dentro.
 *
 * Usa IntersectionObserver para eficiência (sem scroll listener).
 */
function initWhatsAppButton() {
  const fab  = qs('#whatsapp-btn');
  const hero = qs('.hero');
  if (!fab || !hero) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      // Visível quando o Hero NÃO está mais na viewport
      fab.classList.toggle('is-visible', !entry.isIntersecting);
    },
    { threshold: 0.1 }
  );

  observer.observe(hero);
}

/* ═══════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   Aguarda o DOM estar pronto antes de inicializar cada módulo.
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initMobileMenu();
  initHero();
  initScrollReveal();
  initStatsCounter();
  initSmoothScroll();
  initActiveNavLink();
  initAboutHistory();
  initExperienceExpand();
  initNewsletter();
  initWhatsAppButton();
});
