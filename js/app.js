import { SECTIONS as MODEL_SECTIONS } from '../content/sections.js';
import { readerFeedback } from './reader-feedback.js';
import { ILLUSTRATIONS } from '../content/illustrations.js';
const SECTIONS = MODEL_SECTIONS.map(s => ({...s, ...ILLUSTRATIONS[s.id]}));
import { initIntro } from './visualizations/00-intro.js';
import { initEmergentOrganism } from './visualizations/01-emergent-organism.js';
import { initNodeLimits } from './visualizations/02-node-limits.js';
import { initNodeQuantity } from './visualizations/02-node-quantity.js';
import { initNodeQuality } from './visualizations/03-node-quality.js';
import { initNodeCapacity } from './visualizations/04-node-capacity.js';
import { initIllusionOfSignificance } from './visualizations/04b-illusion.js?v=7';
import { initConnectionQuantity } from './visualizations/04-connection-quantity.js';
import { initConnectionQuality } from './visualizations/05-connection-quality.js';
import { initCohesion } from './visualizations/07-cohesion.js';
import { initAlignment } from './visualizations/08-alignment.js';
import { initEnvironment } from './visualizations/08b-environment.js';
import { initCollectiveMemory } from './visualizations/09-collective-memory.js';
import { initExternalStorage } from './visualizations/09b-external-storage.js';
import { initEntropy } from './visualizations/10-entropy.js';
import { initProductivity } from './visualizations/10-productivity.js';
import { initComparativeEmergence } from './visualizations/10b-comparative-emergence.js';
import { initWhatsNext } from './visualizations/11-whats-next.js';

const VIZ_INIT = {
  intro: initIntro,
  'node-capacity': initNodeCapacity,
  'illusion-of-significance': initIllusionOfSignificance,
  'node-limits': initNodeLimits,
  'node-quantity': initNodeQuantity,
  'emergent-organism': initEmergentOrganism,
  'connection-quantity': initConnectionQuantity,
  'connection-quality': initConnectionQuality,
  cohesion: initCohesion,
  alignment: initAlignment,
  environment: initEnvironment,
  'collective-memory': initCollectiveMemory,
  'external-storage': initExternalStorage,
  entropy: initEntropy,
  productivity: initProductivity,
  'comparative-emergence': initComparativeEmergence,
  'whats-next': initWhatsNext,
};

const vizInstances = new Map();
const stageObservers = new Set();
const feedbackObservers = new Set();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeSectionId = null;
let motionPaused = reduceMotion.matches;
let scrollFrame = null;
let heroController = null;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function buildPage() {
  const container = document.getElementById('scroll-container');
  if (!container) return;

  container.replaceChildren(buildHero());
  SECTIONS.forEach((section, index) => {
    container.appendChild(buildSection(section, index));
  });
  container.appendChild(buildFooter());
  buildChapterNavigation();
}

function buildHero() {
  const hero = createElement('section', 'hero');
  hero.id = 'hero';
  hero.setAttribute('aria-labelledby', 'hero-title');

  const canvas = document.createElement('canvas');
  canvas.id = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const eyebrow = createElement('p', 'hero-eyebrow', 'Interactive essay + simulations');
  const title = createElement('h1', 'hero-title', 'Emergent Humanity');
  title.id = 'hero-title';
  const subtitle = createElement(
    'p',
    'hero-subtitle',
    'A group of humans can do things no member can do alone. From small communities to civilization, this essay explores humanity as an emergent system: what appears when people connect, exchange information, remember, specialize, and coordinate.'
  );

  const actions = createElement('div', 'hero-actions');
  const start = createElement('a', 'hero-primary-action', 'Start reading');
  start.href = `#section-${SECTIONS[0]?.id ?? 'node-capacity'}`;
  const overview = createElement('button', 'hero-secondary-action', 'Browse chapters');
  overview.type = 'button';
  overview.addEventListener('click', () => {
    const menu = document.getElementById('chapter-menu');
    if (menu instanceof HTMLDetailsElement) {
      menu.open = true;
      menu.querySelector('summary')?.focus();
    }
  });
  const reading = createElement('a', 'hero-secondary-action', 'Read without animation');
  reading.href = 'essay.html';
  actions.append(start, overview, reading);

  const scrollHint = createElement('div', 'scroll-indicator');
  scrollHint.setAttribute('aria-hidden', 'true');
  scrollHint.append(
    createElement('span', 'scroll-indicator-text', 'Scroll to start'),
    createElement('div', 'scroll-indicator-arrow')
  );

  hero.append(canvas, eyebrow, title, subtitle, actions, scrollHint);
  return hero;
}

function buildSection(section, index) {
  const wrapper = createElement('section', 'section');
  wrapper.id = `section-${section.id}`;
  wrapper.dataset.sectionId = section.id;
  wrapper.dataset.sectionIndex = String(index);
  wrapper.setAttribute('aria-labelledby', `title-${section.id}`);

  const vizPane = createElement('div', 'viz-pane');
  const canvas = document.createElement('canvas');
  canvas.id = `canvas-${section.id}`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${section.title} interactive visualization`);

  const stats = createElement('div', 'viz-stats');
  stats.id = `stats-${section.id}`;
  // Continuously changing visual statistics must not interrupt screen-reader navigation.
  stats.setAttribute('aria-atomic', 'true');

  const stage = createElement('div', 'animation-stage');
  stage.append(canvas);
  const feedback = createElement('p', 'viz-feedback');
  feedback.id = `feedback-${section.id}`;
  const syncFeedback = () => {
    const message = readerFeedback(section.id, stats.textContent);
    if(feedback.textContent !== message) feedback.textContent = message;
  };
  const observer = new MutationObserver(syncFeedback);
  observer.observe(stats, {childList:true,subtree:true,characterData:true});
  feedbackObservers.add(observer);syncFeedback();
  canvas.setAttribute('aria-describedby',feedback.id);
  vizPane.append(stage, feedback, stats);

  if (section.vizHint) {
    const hint = createElement('div', 'viz-hint', section.vizHint);
    hint.id = `hint-${section.id}`;
    vizPane.appendChild(hint);
    canvas.setAttribute('aria-describedby', `${hint.id} ${feedback.id}`);
  }

  if (section.controls?.length) {
    const controls = createElement('div', 'viz-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `Controls for ${section.title}`);
    section.controls.forEach((control) => controls.appendChild(buildControl(control)));
    vizPane.appendChild(controls);
  }

  const textPane = createElement('div', 'text-pane');
  const textContent = createElement('div', 'text-content');
  textContent.append(
    createElement('div', 'section-number', section.number),
    Object.assign(createElement('h2', 'section-title', section.title), { id: `title-${section.id}` }),
    createElement('p', 'section-subtitle', section.subtitle)
  );

  section.body.forEach((paragraph) => {
    textContent.appendChild(createElement('p', 'text-body', paragraph));
  });

  if (section.insight) {
    const insight = createElement('aside', 'insight', section.insight);
    insight.setAttribute('aria-label', 'Key insight');
    textContent.appendChild(insight);
  }

  if (section.keyTerms?.length) {
    const terms = createElement('p', 'key-terms');
    const label = createElement('strong', '', 'Key terms: ');
    terms.append(label, document.createTextNode(section.keyTerms.join(', ')));
    textContent.appendChild(terms);
  }

  const sources = createElement('a', 'chapter-sources', 'Sources & further reading');
  sources.href = `methods.html#${section.id}`;
  textContent.append(sources);
  textPane.appendChild(textContent);
  wrapper.append(vizPane, textPane);
  return wrapper;
}

function buildControl(control) {
  if (control.type === 'button') {
    const button = createElement(
      'button',
      `viz-btn${control.variant ? ` viz-btn--${control.variant}` : ''}`,
      control.label
    );
    button.type = 'button';
    button.id = `ctrl-${control.id}`;
    return button;
  }

  if (control.type === 'slider') {
    const wrapper = createElement('div', 'slider-container');
    const label = createElement('label', 'slider-label', control.label);
    label.htmlFor = `ctrl-${control.id}`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `ctrl-${control.id}`;
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = control.value;

    const output = createElement('output', 'slider-value');
    output.setAttribute('for', input.id);
    updateSliderOutput(input, output);
    input.addEventListener('input', () => updateSliderOutput(input, output));

    wrapper.append(label, input, output);
    return wrapper;
  }

  if (control.type === 'switch') {
    const wrapper = createElement('label', 'switch-container');
    const text = createElement('span', 'switch-label', control.label);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `ctrl-${control.id}`;
    input.className = 'switch-input';
    input.checked = Boolean(control.value);

    const track = createElement('span', 'switch-track');
    track.setAttribute('aria-hidden', 'true');
    track.appendChild(createElement('span', 'switch-thumb'));
    wrapper.append(text, input, track);
    return wrapper;
  }

  return createElement('span', 'control-error', `Unsupported control: ${control.type}`);
}

function updateSliderOutput(input, output) {
  const value = Number(input.value);
  const min = Number(input.min);
  const max = Number(input.max);
  const isNormalized = Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max <= 1;
  const descriptions={
    'ctrl-population-slider':value<.4?'Few':value<.8?'More':'Many',
    'ctrl-polarize-slider':value<.3?'Open':value<.7?'Selective':'Very selective',
    'ctrl-fidelity-slider':value<.3?'Low':value<.7?'Mixed':'High',
    'ctrl-channel-noise':value===0?'None':value<.06?'Low':value<.11?'Medium':'High'
  };
  const display=descriptions[input.id] ?? (isNormalized ? `${Math.round(value * 100)}%` : String(value));
  output.value = display;
  output.textContent = display;
  input.setAttribute('aria-valuetext', display);
}

function buildFooter() {
  const footer = createElement('footer', 'footer');
  const text = createElement('span', '', 'Keep questioning the picture. ');
  const model = createElement('a', '', 'Sources & explanations');
  model.href = 'methods.html';
  const separator = document.createTextNode(' · ');
  const source = createElement('a', '', 'View the source on GitHub');
  source.href = 'https://github.com/mariomarcolongo/emergent-humanity';
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  const experiments=createElement('a','','Try the experiments');experiments.href='lab.html';
  footer.append(text, model, document.createTextNode(' · '), experiments, separator, source);
  return footer;
}

function buildChapterNavigation() {
  const nav = document.getElementById('chapter-nav');
  if (!nav) return;
  const list = createElement('ol', 'chapter-list');

  SECTIONS.forEach((section) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#section-${section.id}`;
    link.dataset.sectionLink = section.id;
    link.append(
      createElement('span', 'chapter-list-number', section.number),
      createElement('span', 'chapter-list-title', section.title)
    );
    link.addEventListener('click', () => {
      const menu = document.getElementById('chapter-menu');
      if (menu instanceof HTMLDetailsElement) menu.open = false;
    });
    item.appendChild(link);
    list.appendChild(item);
  });

  nav.replaceChildren(list);
}

function ensureVisualization(sectionId) {
  if (vizInstances.has(sectionId)) return vizInstances.get(sectionId);

  const init = VIZ_INIT[sectionId];
  const canvas = document.getElementById(`canvas-${sectionId}`);
  if (!init || !(canvas instanceof HTMLCanvasElement)) return null;

  const section = SECTIONS.find((item) => item.id === sectionId);
  const controls = {};
  section?.controls?.forEach((control) => {
    const element = document.getElementById(`ctrl-${control.id}`);
    if (element) controls[control.id] = element;
  });

  try {
    const instance = init(canvas, controls);
    if (!instance || typeof instance.activate !== 'function') {
      throw new TypeError(`Visualization "${sectionId}" did not return a valid lifecycle object.`);
    }
    instance.deactivate?.();
    if (motionPaused) instance.renderStatic?.();
    const resizeObserver = new ResizeObserver(() => {
      if (instance.resize) instance.resize();
      else instance.engine?.resize?.();
      if (motionPaused) {instance.deactivate?.();instance.renderStatic?.();}
    });
    resizeObserver.observe(canvas.parentElement);
    stageObservers.add(resizeObserver);
    vizInstances.set(sectionId, instance);
    return instance;
  } catch (error) {
    console.error(`Failed to initialize visualization: ${sectionId}`, error);
    const pane = canvas.closest('.viz-pane');
    pane?.classList.add('viz-error');
    const stats = document.getElementById(`stats-${sectionId}`);
    if (stats) stats.textContent = 'Visualization unavailable. The chapter text is still accessible.';
    return null;
  }
}

function activateSection(sectionId) {
  if (activeSectionId === sectionId) return;

  if (activeSectionId) {
    vizInstances.get(activeSectionId)?.deactivate?.();
  }

  activeSectionId = sectionId;
  const instance = sectionId ? ensureVisualization(sectionId) : null;
  if (!motionPaused && !document.hidden) instance?.activate?.();
  else instance?.renderStatic?.();
  updateChapterStatus(sectionId);
}

function setupVisualizationPreloading() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) ensureVisualization(entry.target.dataset.sectionId);
      });
    },
    { rootMargin: '60% 0px 60% 0px', threshold: 0 }
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  document.querySelectorAll('.section').forEach((section) => {
    observer.observe(section);
    revealObserver.observe(section);
  });
}

function setupScrollTracking() {
  const update = () => {
    scrollFrame = null;
    const viewportCenter = window.innerHeight * 0.48;
    const hero = document.getElementById('hero');
    const sections = [...document.querySelectorAll('.section')];

    let selectedId = null;
    let selectedDistance = Infinity;

    if (hero) {
      const rect = hero.getBoundingClientRect();
      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
        selectedDistance = 0;
      }
    }

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const containsCenter = rect.top <= viewportCenter && rect.bottom >= viewportCenter;
      const distance = containsCenter ? 0 : Math.abs((rect.top + Math.min(rect.height, window.innerHeight) / 2) - viewportCenter);
      if (distance < selectedDistance) {
        selectedDistance = distance;
        selectedId = section.dataset.sectionId;
      }
    });

    activateSection(selectedId);
    updateReadingProgress();
  };

  const requestUpdate = () => {
    if (scrollFrame === null) scrollFrame = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
}

function updateChapterStatus(sectionId) {
  const label = document.getElementById('chapter-label');
  const count = document.getElementById('chapter-count');
  const current = SECTIONS.findIndex((section) => section.id === sectionId);

  if (label) label.textContent = current >= 0 ? SECTIONS[current].title : 'Introduction';
  if (count) count.textContent = current >= 0
    ? `${String(current + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}`
    : `00 / ${String(SECTIONS.length).padStart(2, '0')}`;

  document.querySelectorAll('[data-section-link]').forEach((link) => {
    const isCurrent = link.dataset.sectionLink === sectionId;
    link.classList.toggle('is-current', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function updateReadingProgress() {
  const progress = document.getElementById('reading-progress-bar');
  if (!progress) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  progress.style.transform = `scaleX(${ratio})`;
}

function setupResizeHandling() {
  let timeout;
  window.addEventListener('resize', () => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      vizInstances.forEach((instance) => {
        if (typeof instance.resize === 'function') instance.resize();
        else if (typeof instance.engine?.resize === 'function') instance.engine.resize();
      });
    }, 120);
  }, { passive: true });
}

function setupHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let nodes = [];
  let frame = null;
  let active = true;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = reduceMotion.matches ? 70 : (window.innerWidth < 760 ? 80 : 130);
    const radius = Math.min(width, height) * 0.34;
    nodes = Array.from({ length: count }, () => {
      const r = radius * Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      return {
        x: width / 2 + Math.cos(angle) * r,
        y: height / 2 + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
      };
    });
    draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if ((dx * dx) + (dy * dy) < 3600) {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }
    }
    ctx.strokeStyle = 'rgba(79, 156, 247, 0.14)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = 'rgba(121, 183, 255, 0.62)';
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const loop = () => {
    frame = null;
    if (!active || motionPaused || document.hidden) return;
    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    });
    draw();
    frame = requestAnimationFrame(loop);
  };

  const start = () => {
    if (frame === null && active && !motionPaused && !document.hidden) {
      frame = requestAnimationFrame(loop);
    }
  };

  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) start();
    else stop();
  }, { threshold: 0.05 });
  observer.observe(canvas);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reduceMotion.addEventListener?.('change', () => {
    resize();
    if (reduceMotion.matches) stop();
    else start();
  });

  resize();
  start();
  heroController = { stop, resize, start };
}

function setupAudio() {
  const button = document.getElementById('toggle-audio');
  if (!(button instanceof HTMLButtonElement)) return;

  let context = null;
  let master = null;
  let playing = false;

  const updateButton = () => {
    button.setAttribute('aria-pressed', String(playing));
    button.classList.toggle('playing', playing);
    const label = button.querySelector('.audio-label');
    if (label) label.textContent = playing ? 'Audio on' : 'Audio off';
  };

  const createSoundscape = () => {
    context = new (window.AudioContext || window.webkitAudioContext)();
    master = context.createGain();
    master.gain.value = 0.0001;
    master.connect(context.destination);

    [55, 82.41, 110].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const lfo = context.createOscillator();
      const lfoDepth = context.createGain();

      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.34 : 0.14;
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      lfo.frequency.value = 0.03 + index * 0.015;
      lfoDepth.gain.value = 5 + index * 2;

      lfo.connect(lfoDepth);
      lfoDepth.connect(oscillator.detune);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      oscillator.start();
      lfo.start();
    });
  };

  button.addEventListener('click', async () => {
    if (!context) createSoundscape();
    if (!context || !master) return;

    if (!playing) {
      await context.resume();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.35);
      playing = true;
    } else {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
      playing = false;
      window.setTimeout(() => {
        if (!playing && context?.state === 'running') context.suspend();
      }, 240);
    }
    updateButton();
  });

  window.playInteractionSound = (type = 'click') => {
    if (!playing || !context || context.state !== 'running' || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type === 'slider' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(type === 'slider' ? 260 : 150, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(70, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.012, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  };

  updateButton();
}

function setupGlobalInteractionPolish() {
  document.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'range') {
      window.playInteractionSound?.('slider');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const menu = document.getElementById('chapter-menu');
    if (menu instanceof HTMLDetailsElement && menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
}

function setupMotionControls() {
  const button=createElement('button','audio-btn','Pause animations');
  button.type='button';button.id='animation-motion-toggle';
  const sync=()=>{document.documentElement.dataset.motionPaused=String(motionPaused);button.textContent=motionPaused?'Resume animations':'Pause animations';button.setAttribute('aria-pressed',String(motionPaused));};
  const apply=()=>{sync();if(motionPaused){heroController?.stop();vizInstances.forEach(v=>v.deactivate?.());}else{heroController?.start();vizInstances.get(activeSectionId)?.activate?.();}};
  button.addEventListener('click',()=>{motionPaused=!motionPaused;apply();});
  const measurements=createElement('button','audio-btn','Show measurements');
  measurements.type='button';measurements.id='toggle-measurements';measurements.setAttribute('aria-pressed','false');
  measurements.addEventListener('click',()=>{const show=document.documentElement.dataset.measurements!=='true';document.documentElement.dataset.measurements=String(show);measurements.textContent=show?'Hide measurements':'Show measurements';measurements.setAttribute('aria-pressed',String(show));document.dispatchEvent(new Event('measurements-change'));});
  document.querySelector('.audio-menu-panel')?.append(button,measurements);sync();
  reduceMotion.addEventListener('change',()=>{motionPaused=reduceMotion.matches;apply();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){vizInstances.forEach(v=>v.deactivate?.());}else if(!motionPaused){vizInstances.get(activeSectionId)?.activate?.();}});
  const refresh=event=>{if(!motionPaused||!event.target.closest('.viz-controls'))return;requestAnimationFrame(()=>{const v=vizInstances.get(activeSectionId);v?.deactivate?.();v?.renderStatic?.();});};
  document.addEventListener('click',refresh);document.addEventListener('input',refresh);
}

function init() {
  buildPage();
  setupHeroCanvas();
  setupMotionControls();
  setupVisualizationPreloading();
  setupScrollTracking();
  setupResizeHandling();
  setupAudio();
  setupGlobalInteractionPolish();
}

document.addEventListener('DOMContentLoaded', init, { once: true });
window.addEventListener('pagehide', () => {
  heroController?.stop?.();
  stageObservers.forEach(observer=>observer.disconnect());
  feedbackObservers.forEach(observer=>observer.disconnect());
  vizInstances.forEach((instance) => instance.destroy?.());
}, { once: true });
