/*
 * Elliptical 3D orbit gallery for Jekyll selected-work showcase.
 * Adapted from React Bits OrbitImages by Dominik Koch (https://x.com/dominikkoch).
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 * Zoom spotlight, AeroShards background morph sync, bilingual metadata and controls are site-specific.
 */
(() => {
  'use strict';

  const root = document.querySelector('[data-robot-carousel]');
  if (!root) return;

  const viewport = root.querySelector('[data-carousel-viewport]');
  const orbitRoot = root.querySelector('[data-orbit-root]');
  const items = [...root.querySelectorAll('[data-carousel-item]')];
  if (!viewport || !orbitRoot || items.length < 2) return;

  const zoomBox = root.querySelector('[data-carousel-zoom]');
  const zoomLink = root.querySelector('[data-carousel-zoom-link]');
  const zoomImage = root.querySelector('[data-carousel-zoom-image]');
  const titleEl = root.querySelector('[data-carousel-title]');
  const categoryEl = root.querySelector('[data-carousel-category]');
  const counterEl = root.querySelector('[data-carousel-count]');
  const projectLink = root.querySelector('[data-carousel-link]');
  const errorEl = root.querySelector('[data-carousel-error]');
  const liveEl = root.querySelector('[data-carousel-live]');
  const hintEl = root.querySelector('[data-carousel-hint]');
  const viewButton = root.querySelector('[data-carousel-view]');
  const playButton = root.querySelector('[data-carousel-play]');
  const prevButton = root.querySelector('[data-carousel-prev]');
  const nextButton = root.querySelector('[data-carousel-next]');
  const viewSymbol = root.querySelector('[data-carousel-view-symbol]');
  const playSymbol = root.querySelector('[data-carousel-play-symbol]');
  const orbitPath = orbitRoot.querySelector('[data-orbit-path]');
  const strokeEls = [...orbitRoot.querySelectorAll('[data-orbit-stroke]')];
  const svgEls = [...orbitRoot.querySelectorAll('[data-orbit-svg]')];
  const clipRect = orbitRoot.querySelector('[data-orbit-clip]');

  const aero = root.closest('.home-work-stage')?.querySelector('[data-aero-shards]') || null;
  const restPlacement = aero?.dataset.aeroPlacement || 'center';
  const zoomPlacement = aero?.dataset.aeroZoomPlacement || (restPlacement === 'center' ? 'full' : 'center');

  const SAMPLES = 720;
  const FRONT_GROW = 0.3;
  const BACK_SHRINK = 0.45;
  const BACK_DIM = 0.55;
  const INTRO_SPREAD = 1.3;
  const INTRO_FADE = 0.45;
  const DRAG_THRESHOLD = 5;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mod = (value, size) => ((value % size) + size) % size;
  const wrapSigned = value => value - Math.round(value);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  const language = () => (document.documentElement.dataset.lang === 'en' ? 'en' : 'vi');
  const text = (vi, en) => (language() === 'en' ? en : vi);
  const translated = (item, key) => item.dataset[key + (language() === 'en' ? 'En' : 'Vi')] || item.dataset[key + 'Vi'] || '';

  const cubicBezier = (x1, y1, x2, y2) => {
    const sample = (a1, a2, t) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
    const slope = (a1, a2, t) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
    return x => {
      if (x <= 0 || x >= 1) return x;
      let t = x;
      for (let i = 0; i < 8; i += 1) {
        const s = slope(x1, x2, t);
        if (Math.abs(s) < 1e-6) break;
        t = clamp(t - (sample(x1, x2, t) - x) / s, 0, 1);
      }
      return sample(y1, y2, t);
    };
  };

  const EASINGS = {
    linear: t => t,
    easeIn: cubicBezier(0.42, 0, 1, 1),
    easeOut: cubicBezier(0, 0, 0.58, 1),
    easeInOut: cubicBezier(0.42, 0, 0.58, 1)
  };

  const generateEllipsePath = (cx, cy, rx, ry) =>
    `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;

  const cfg = {
    shape: 'ellipse',
    baseWidth: 1400,
    radiusX: 340,
    radiusY: 80,
    rotation: -8,
    duration: 30,
    itemSize: 90,
    itemRadius: 14,
    depth: 0.6,
    showPath: true,
    pathWidth: 2,
    pathDash: 0,
    direction: 'normal',
    easing: 'linear',
    fill: true,
    alignToPath: false,
    shadow: 0.3,
    hoverScale: 1.08,
    hoverSpeed: 0.3,
    draggable: true,
    clickToFront: true,
    paused: false,
    intro: true
  };

  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const st = {
    lut: null,
    length: 0,
    front: 0,
    yMid: 0,
    yHalf: 1,
    bbox: [0, 0, 1, 1],
    width: 0,
    height: 0,
    scale: 0,
    size: 0,
    items: [],
    strokes: strokeEls,
    lap: 0,
    manual: 0,
    glide: 0,
    speed: 1,
    drag: null,
    zoomDrag: null,
    seek: null,
    hovered: false,
    hoverIndex: -1,
    suppressUntil: 0,
    introStart: -1,
    introDone: !cfg.intro,
    visible: typeof IntersectionObserver === 'undefined',
    printing: false,
    reduced: !!query?.matches,
    raf: 0,
    last: 0,
    view: 'orbit',
    active: -1,
    zoomIndex: 0,
    frontIndex: 0,
    destroyed: false
  };
  st.speed = st.reduced || cfg.paused ? 0 : 1;

  let announceTimer = 0;

  const isRunning = () => st.visible && !document.hidden && !st.printing && !st.destroyed;

  function syncBackground() {
    if (!aero) return;
    const next = st.view === 'zoom' ? zoomPlacement : restPlacement;
    if (aero.dataset.aeroPlacement !== next) aero.dataset.aeroPlacement = next;
  }

  function caption(index) {
    const safeIndex = mod(index, items.length);
    const item = items[safeIndex];
    if (!item) return;
    st.active = safeIndex;
    titleEl.textContent = translated(item, 'title');
    categoryEl.textContent = translated(item, 'category');
    counterEl.textContent = String(safeIndex + 1).padStart(2, '0');
    const href = item.dataset.url || item.querySelector('a')?.href || '#';
    projectLink.href = href;
    const labelVi = 'M\u1edf d\u1ef1 \u00e1n: ' + (item.dataset.titleVi || '');
    const labelEn = 'Open project: ' + (item.dataset.titleEn || '');
    projectLink.dataset.tAriaVi = labelVi;
    projectLink.dataset.tAriaEn = labelEn;
    projectLink.dataset.tTitleVi = labelVi;
    projectLink.dataset.tTitleEn = labelEn;
    projectLink.setAttribute('aria-label', text(labelVi, labelEn));
    projectLink.setAttribute('title', text(labelVi, labelEn));
    errorEl.hidden = item.dataset.imageError !== 'true';
    root.dataset.activeIndex = String(safeIndex);

    st.items.forEach((it, idx) => {
      const link = it.el.querySelector('a');
      if (!link) return;
      if (idx === safeIndex) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function announce(index) {
    const safeIndex = mod(index, items.length);
    const item = items[safeIndex];
    if (!item) return;
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      liveEl.textContent = translated(item, 'title') + ', ' + (safeIndex + 1) + ' / ' + items.length;
    }, 180);
  }

  function syncZoomContent(index) {
    const safeIndex = mod(index, items.length);
    const item = items[safeIndex];
    if (!item || !zoomBox || !zoomLink || !zoomImage) return;
    st.zoomIndex = safeIndex;
    const href = item.dataset.url || item.querySelector('a')?.href || '#';
    const src = item.dataset.image || item.querySelector('img')?.src || '';
    const openVi = 'M\u1edf d\u1ef1 \u00e1n: ' + (item.dataset.titleVi || '');
    const openEn = 'Open project: ' + (item.dataset.titleEn || '');
    zoomLink.href = href;
    zoomLink.dataset.tAriaVi = openVi;
    zoomLink.dataset.tAriaEn = openEn;
    zoomLink.setAttribute('aria-label', text(openVi, openEn));
    zoomImage.src = src;
    zoomImage.dataset.tAltVi = item.dataset.altVi || '';
    zoomImage.dataset.tAltEn = item.dataset.altEn || '';
    zoomImage.alt = translated(item, 'alt');
    zoomLink.classList.toggle('is-image-error', item.dataset.imageError === 'true');
    caption(safeIndex);
  }

  function interfaceText() {
    root.dataset.view = st.view;
    const isZoom = st.view === 'zoom';
    viewButton.dataset.tAriaVi = isZoom ? 'Xem qu\u1ef9 \u0111\u1ea1o' : 'Ph\u00f3ng \u1ea3nh';
    viewButton.dataset.tAriaEn = isZoom ? 'Show orbit' : 'Zoom in';
    viewButton.dataset.tTitleVi = viewButton.dataset.tAriaVi;
    viewButton.dataset.tTitleEn = viewButton.dataset.tAriaEn;
    const viewLabel = text(viewButton.dataset.tAriaVi, viewButton.dataset.tAriaEn);
    viewButton.setAttribute('aria-label', viewLabel);
    viewButton.setAttribute('title', viewLabel);
    viewSymbol.setAttribute('d', isZoom ? 'M7 10h6' : 'M7 10h6m-3-3v6');
    viewButton.setAttribute('aria-expanded', String(isZoom));

    const playVi = st.reduced ? 'Chuy\u1ec3n \u0111\u1ed9ng \u0111\u00e3 t\u1eaft' : cfg.paused ? 'Ti\u1ebfp t\u1ee5c' : 'T\u1ea1m d\u1eebng';
    const playEn = st.reduced ? 'Motion is off' : cfg.paused ? 'Resume' : 'Pause';
    playButton.dataset.tAriaVi = playVi;
    playButton.dataset.tAriaEn = playEn;
    playButton.dataset.tTitleVi = playVi;
    playButton.dataset.tTitleEn = playEn;
    const playLabel = text(playVi, playEn);
    playButton.setAttribute('aria-label', playLabel);
    playButton.setAttribute('title', playLabel);
    playSymbol.setAttribute('d', !cfg.paused && !st.reduced ? 'M9 5v14M15 5v14' : 'M8 5l11 7-11 7Z');
    playButton.disabled = st.reduced;

    hintEl.textContent = isZoom
      ? text(
          'B\u1ea5m \u1ea3nh \u0111\u1ec3 m\u1edf d\u1ef1 \u00e1n \u00b7 B\u1ea5m ngo\u00e0i ho\u1eb7c Esc \u0111\u1ec3 v\u1ec1 qu\u1ef9 \u0111\u1ea1o',
          'Click card to open project \u00b7 Click outside or Esc to return to orbit'
        )
      : text(
          'K\u00e9o qu\u1ef9 \u0111\u1ea1o \u00b7 B\u1ea5m \u1ea3nh \u0111\u1ec3 ph\u00f3ng g\u1ea7n',
          'Drag the orbit \u00b7 Click an image to zoom in'
        );

    viewport.setAttribute('aria-roledescription', text('qu\u1ef9 \u0111\u1ea1o \u1ea3nh t\u01b0\u01a1ng t\u00e1c', 'interactive image orbit'));
    viewport.setAttribute(
      'aria-label',
      text(
        'D\u00f9ng ph\u00edm tr\u00e1i, ph\u1ea3i \u0111\u1ec3 ch\u1ecdn \u1ea3nh; Enter \u0111\u1ec3 ph\u00f3ng ho\u1eb7c m\u1edf d\u1ef1 \u00e1n; Escape \u0111\u1ec3 v\u1ec1 qu\u1ef9 \u0111\u1ea1o',
        'Use Left and Right to select; Enter to zoom or open the project; Escape to return to orbit'
      )
    );
    liveEl.setAttribute('aria-live', !cfg.paused && !st.reduced && st.view === 'orbit' ? 'off' : 'polite');
  }

  function applyResponsiveGeometry() {
    const w = orbitRoot.clientWidth || viewport.clientWidth || 1040;
    const isNarrow = w < 560;
    const nextRx = isNarrow ? 230 : 340;
    const nextRy = isNarrow ? 78 : 80;
    const nextItemSize = isNarrow ? 108 : 90;
    const changed = cfg.radiusX !== nextRx || cfg.radiusY !== nextRy || cfg.itemSize !== nextItemSize;
    cfg.radiusX = nextRx;
    cfg.radiusY = nextRy;
    cfg.itemSize = nextItemSize;
    orbitRoot.style.setProperty('--orbit-radius', `${((cfg.itemRadius / Math.max(1, cfg.itemSize)) * 100).toFixed(4)}%`);
    orbitRoot.style.setProperty('--orbit-shadow', String(clamp(cfg.shadow, 0, 1)));
    orbitRoot.style.setProperty('--orbit-hover-scale', String(cfg.hoverScale));
    return changed;
  }

  function collect() {
    st.items = items.map(el => ({ el, t: '', o: '', z: '' }));
    st.strokes = [...orbitRoot.querySelectorAll('[data-orbit-stroke]')];
  }

  function build() {
    const center = cfg.baseWidth / 2;
    const d = generateEllipsePath(center, center, cfg.radiusX, cfg.radiusY);
    const rotAttr = `rotate(${cfg.rotation} ${center} ${center})`;
    for (const stroke of st.strokes) {
      stroke.setAttribute('d', d);
      stroke.setAttribute('transform', rotAttr);
    }

    let length = 0;
    try {
      length = orbitPath ? orbitPath.getTotalLength() : 0;
    } catch {
      length = 0;
    }
    if (!orbitPath || !length || !Number.isFinite(length)) {
      st.lut = null;
      return;
    }

    const lut = new Float32Array(SAMPLES * 2);
    const angle = (cfg.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let front = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const point = orbitPath.getPointAtLength((i / SAMPLES) * length);
      const dx = point.x - center;
      const dy = point.y - center;
      const x = center + dx * cos - dy * sin;
      const y = center + dx * sin + dy * cos;
      lut[i * 2] = x;
      lut[i * 2 + 1] = y;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      if (y > lut[front * 2 + 1] + 1e-6) front = i;
    }
    st.lut = lut;
    st.length = length;
    st.front = front / SAMPLES;
    st.yMid = (y0 + y1) / 2;
    st.yHalf = Math.max(1e-3, (y1 - y0) / 2);
    const depth = clamp(cfg.depth, 0, 1);
    const margin = (cfg.itemSize / 2) * (1 + depth * FRONT_GROW) * Math.max(1, cfg.hoverScale) + 2;
    st.bbox = [x0 - margin, y0 - margin, x1 + margin, y1 + margin];
  }

  function applyDash(reveal) {
    const dash = cfg.pathDash > 0 && st.scale ? cfg.pathDash / st.scale : 0;
    for (const stroke of st.strokes) {
      if (reveal < 1 && !dash) {
        stroke.style.strokeDasharray = `${st.length} ${st.length}`;
        stroke.style.strokeDashoffset = String(st.length * (1 - reveal));
        stroke.style.opacity = '';
      } else {
        stroke.style.strokeDasharray = dash ? `${dash} ${dash * 1.6}` : '';
        stroke.style.strokeDashoffset = '';
        stroke.style.opacity = reveal < 1 ? String(reveal) : '';
      }
    }
  }

  function layout() {
    if (applyResponsiveGeometry() || !st.lut) build();
    st.width = orbitRoot.clientWidth;
    st.height = orbitRoot.clientHeight;
    if (!st.lut || !st.width || !st.height) return;
    const [bx0, by0, bx1, by1] = st.bbox;
    const scale = Math.min(st.width / (bx1 - bx0), st.height / (by1 - by0));
    st.scale = scale > 0 && Number.isFinite(scale) ? scale : 0;
    st.size = cfg.itemSize * st.scale;
    for (const it of st.items) {
      it.el.style.width = `${st.size}px`;
      it.el.style.height = `${st.size}px`;
    }
    if (!st.scale) return;
    const vw = st.width / st.scale;
    const vh = st.height / st.scale;
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const vb = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
    for (const svg of svgEls) svg.setAttribute('viewBox', vb);
    if (clipRect) {
      clipRect.setAttribute('x', String(cx - vw));
      clipRect.setAttribute('y', String(st.yMid));
      clipRect.setAttribute('width', String(vw * 2));
      clipRect.setAttribute('height', String(vh * 2));
    }
    for (const stroke of st.strokes) {
      stroke.style.strokeWidth = String(cfg.pathWidth / st.scale);
    }
    const reveal = st.introStart >= 0 ? easeOutQuint(clamp((performance.now() - st.introStart) / 1000 / INTRO_SPREAD, 0, 1)) : 1;
    applyDash(reveal);
  }

  const sample = u => {
    const f = (((u % 1) + 1) % 1) * SAMPLES;
    const i0 = Math.floor(f) % SAMPLES;
    const i1 = (i0 + 1) % SAMPLES;
    const t = f - Math.floor(f);
    const lut = st.lut;
    return [lut[i0 * 2] + (lut[i1 * 2] - lut[i0 * 2]) * t, lut[i0 * 2 + 1] + (lut[i1 * 2 + 1] - lut[i0 * 2 + 1]) * t];
  };

  const heading = u => {
    const a = sample(u - 2 / SAMPLES);
    const b = sample(u + 2 / SAMPLES);
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  };

  const progress = () => {
    const ease = EASINGS[cfg.easing] || EASINGS.linear;
    const whole = Math.floor(st.lap);
    return (whole + ease(st.lap - whole)) * (cfg.direction === 'reverse' ? -1 : 1) + st.manual;
  };

  const offsetOf = (index, count) => {
    if (cfg.fill) return index / Math.max(1, count);
    return (-index * cfg.itemSize * 1.3) / Math.max(1, st.length);
  };

  const write = (it, key, prop, value) => {
    if (it[key] !== value) {
      it[key] = value;
      it.el.style[prop] = value;
    }
  };

  function render(now = performance.now()) {
    if (!st.lut || !st.scale) return;
    const p = progress();
    const count = st.items.length;
    const depth = clamp(cfg.depth, 0, 1);
    const [bx0, by0, bx1, by1] = st.bbox;
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const half = st.size / 2;
    const introRunning = st.introStart >= 0;
    const elapsed = introRunning ? (now - st.introStart) / 1000 : 0;
    const spread = introRunning ? easeOutQuint(clamp(elapsed / INTRO_SPREAD, 0, 1)) : 1;
    const appear = introRunning ? clamp(elapsed / INTRO_FADE, 0, 1) : 1;

    let frontIdx = 0;
    let bestFrontDist = Infinity;

    for (let i = 0; i < count; i += 1) {
      const it = st.items[i];
      let u = p + offsetOf(i, count);
      const dist = Math.abs(wrapSigned(u - st.front));
      if (dist < bestFrontDist) {
        bestFrontDist = dist;
        frontIdx = i;
      }
      if (introRunning) u = st.front + wrapSigned(u - st.front) * spread;
      const [x, y] = sample(u);
      const d = clamp((y - st.yMid) / st.yHalf, -1, 1);
      const w = (d + 1) / 2;
      let scale = 1 + depth * (FRONT_GROW * w - BACK_SHRINK * (1 - w));
      let opacity = 1 - depth * BACK_DIM * (1 - w);
      if (introRunning) {
        scale *= 0.7 + 0.3 * appear;
        opacity *= appear * appear * (3 - 2 * appear);
      }
      const sx = (x - cx) * st.scale + st.width / 2 - half;
      const sy = (y - cy) * st.scale + st.height / 2 - half;
      const rot = cfg.alignToPath ? heading(u) : 0;
      let z = depth > 0 ? (d <= 0 ? 10 + Math.round((d + 1) * 80) : 110 + Math.round(d * 80)) : 1;
      if (i === st.hoverIndex) z += 200;
      write(
        it,
        't',
        'transform',
        `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0px)${rot ? ` rotate(${rot.toFixed(2)}deg)` : ''} scale(${scale.toFixed(4)})`
      );
      write(it, 'o', 'opacity', opacity > 0.999 ? '' : opacity.toFixed(3));
      write(it, 'z', 'zIndex', String(z));
    }

    st.frontIndex = frontIdx;
    if (introRunning) applyDash(spread);

    if (st.view === 'orbit') {
      const displayIdx = st.hoverIndex >= 0 ? st.hoverIndex : frontIdx;
      if (displayIdx !== st.active) caption(displayIdx);
    }
  }

  function frame(now) {
    st.raf = 0;
    if (!isRunning()) {
      st.last = 0;
      return;
    }
    const dt = st.last ? clamp((now - st.last) / 1000, 0, 0.1) : 0;
    st.last = now;
    let busy = false;

    if (st.lut && st.scale && st.introStart === -1 && !st.introDone && st.visible) {
      if (cfg.intro && !st.reduced) {
        st.introStart = now;
      } else {
        st.introDone = true;
      }
      orbitRoot.removeAttribute('data-intro');
    }
    if (st.introStart >= 0) {
      if ((now - st.introStart) / 1000 >= INTRO_SPREAD) {
        st.introStart = -2;
        st.introDone = true;
        applyDash(1);
      } else {
        busy = true;
      }
    }

    const want = cfg.paused || st.reduced || st.view === 'zoom' ? 0 : st.hovered ? clamp(cfg.hoverSpeed, 0, 1) : 1;
    if (st.speed !== want) {
      st.speed += (want - st.speed) * (1 - Math.exp(-dt / 0.35));
      if (Math.abs(st.speed - want) < 0.002) st.speed = want;
      busy = true;
    }
    if (st.speed > 0 && cfg.duration > 0) {
      st.lap += (dt * st.speed) / cfg.duration;
      busy = true;
    }
    if (st.drag?.active) {
      busy = true;
    } else if (st.seek) {
      st.seek.t = Math.min(1, st.seek.t + dt / st.seek.dur);
      const e = st.seek.t < 0.5 ? 4 * st.seek.t ** 3 : 1 - Math.pow(-2 * st.seek.t + 2, 3) / 2;
      st.manual = st.seek.from + st.seek.delta * e;
      if (st.seek.t >= 1) st.seek = null;
      busy = true;
    } else if (st.glide) {
      st.manual += st.glide * dt;
      st.glide *= Math.exp(-dt / 0.7);
      if (Math.abs(st.glide) < 0.0004) st.glide = 0;
      busy = true;
    }

    render(now);
    const whole = Math.floor(st.lap);
    if (whole) st.lap -= whole;
    if (!st.drag && !st.seek) st.manual -= Math.floor(st.manual);
    if (busy && isRunning()) st.raf = requestAnimationFrame(frame);
    else st.last = 0;
  }

  function wake() {
    if (st.raf || !isRunning()) return;
    st.last = 0;
    st.raf = requestAnimationFrame(frame);
  }

  function suspend() {
    if (st.raf) {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
    }
    st.last = 0;
    st.drag = null;
    st.zoomDrag = null;
    orbitRoot.removeAttribute('data-dragging');
    root.classList.remove('is-dragging');
    window.clearTimeout(announceTimer);
  }

  const local = e => {
    const r = orbitRoot.getBoundingClientRect();
    const k = orbitRoot.offsetWidth ? r.width / orbitRoot.offsetWidth || 1 : 1;
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  };

  const dragRate = () => {
    if (!st.lut || !st.scale) return 0;
    const a = sample(st.front - 3 / SAMPLES);
    const b = sample(st.front + 3 / SAMPLES);
    const along = ((b[0] - a[0]) / (6 / SAMPLES)) * st.scale;
    const floor = st.length * st.scale * 0.35;
    return Math.abs(along) < floor ? Math.sign(along || 1) * floor : along;
  };

  const itemIndex = target => {
    const el = target instanceof Element ? target.closest('[data-orbit-item]') : null;
    return el && orbitRoot.contains(el) ? Number(el.getAttribute('data-orbit-item')) : -1;
  };

  function bringToFront(index) {
    if (!st.lut || index < 0) return;
    const u = progress() + offsetOf(index, st.items.length);
    const delta = wrapSigned(st.front - u);
    st.glide = 0;
    if (st.reduced || !isRunning()) {
      st.manual += delta;
      st.manual -= Math.floor(st.manual);
      render(performance.now());
      return;
    }
    st.seek = { from: st.manual, delta, t: 0, dur: 0.45 + Math.abs(delta) * 1.4 };
    wake();
  }

  function setView(view, targetIndex) {
    if (view === 'zoom') {
      const idx = targetIndex !== undefined ? mod(targetIndex, items.length) : st.active >= 0 ? st.active : st.frontIndex;
      st.view = 'zoom';
      syncZoomContent(idx);
      zoomBox?.setAttribute('aria-hidden', 'false');
      if (zoomLink) zoomLink.tabIndex = 0;
      bringToFront(idx);
      syncBackground();
      interfaceText();
      announce(idx);
      return;
    }

    if (st.view === 'orbit') return;
    st.view = 'orbit';
    zoomBox?.setAttribute('aria-hidden', 'true');
    if (zoomLink) zoomLink.tabIndex = -1;
    syncBackground();
    interfaceText();
    wake();
  }

  function imageFailed(index) {
    if (!items[index]) return;
    items[index].dataset.imageError = 'true';
    items[index].classList.add('is-image-error');
    if (st.active === index) errorEl.hidden = false;
    if (st.view === 'zoom' && st.zoomIndex === index && zoomLink) zoomLink.classList.add('is-image-error');
  }

  items.forEach((item, index) => {
    const link = item.querySelector('a');
    if (link) link.tabIndex = 0;
    const image = item.querySelector('img');
    if (image) {
      image.draggable = false;
      image.addEventListener('error', () => imageFailed(index));
      if (image.complete && image.naturalWidth === 0) imageFailed(index);
    }
  });
  if (zoomImage) {
    zoomImage.addEventListener('error', () => {
      if (st.view === 'zoom') imageFailed(st.zoomIndex);
    });
  }

  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'group');
  root.classList.add('is-enhanced');
  root.querySelector('[data-carousel-controls]').hidden = false;

  collect();
  applyResponsiveGeometry();
  build();
  syncBackground();
  interfaceText();
  layout();
  if (st.reduced) orbitRoot.removeAttribute('data-intro');
  caption(0);
  render(performance.now());

  const onEnter = () => {
    st.hovered = true;
    wake();
  };

  const onLeave = () => {
    st.hovered = false;
    st.hoverIndex = -1;
    if (st.lut && st.view === 'orbit') render(performance.now());
    wake();
  };

  const onOver = e => {
    const index = itemIndex(e.target);
    if (index !== st.hoverIndex) {
      st.hoverIndex = index;
      if (st.lut && st.view === 'orbit') render(performance.now());
    }
  };

  const onDown = e => {
    if (st.view !== 'orbit' || !cfg.draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const [x, y] = local(e);
    st.drag = { id: e.pointerId, x, y, active: false, samples: [], rate: dragRate(), anchor: 0, manual: 0 };
  };

  const onMove = e => {
    const d = st.drag;
    if (!d || e.pointerId !== d.id) return;
    const [x, y] = local(e);
    const along = x - d.x;
    if (!d.active) {
      if (Math.abs(along) < DRAG_THRESHOLD) return;
      if (Math.abs(y - d.y) > Math.abs(along)) {
        st.drag = null;
        return;
      }
      d.active = true;
      d.anchor = along;
      d.manual = st.manual;
      st.seek = null;
      st.glide = 0;
      try {
        orbitRoot.setPointerCapture(e.pointerId);
      } catch {}
      orbitRoot.setAttribute('data-dragging', '');
      root.classList.add('is-dragging');
    }
    if (d.rate) st.manual = d.manual + (along - d.anchor) / d.rate;
    const now = performance.now();
    d.samples.push([now, along]);
    while (d.samples.length > 2 && now - d.samples[0][0] > 100) d.samples.shift();
    wake();
  };

  const endDrag = (e, cancelled) => {
    const d = st.drag;
    if (!d || e.pointerId !== d.id) return;
    st.drag = null;
    if (!d.active) return;
    orbitRoot.removeAttribute('data-dragging');
    root.classList.remove('is-dragging');
    try {
      if (orbitRoot.hasPointerCapture?.(e.pointerId)) orbitRoot.releasePointerCapture(e.pointerId);
    } catch {}
    const now = performance.now();
    st.suppressUntil = now + 400;
    const s = d.samples;
    if (!cancelled && s.length > 1 && d.rate) {
      const [t0, a0] = s[0];
      const [t1, a1] = s[s.length - 1];
      if (t1 > t0 && now - t1 < 80) st.glide = clamp((((a1 - a0) / (t1 - t0)) * 1000) / d.rate, -3, 3);
    }
    wake();
  };

  const onUp = e => endDrag(e, false);
  const onCancel = e => endDrag(e, true);

  const onOrbitClick = e => {
    if (performance.now() < st.suppressUntil) {
      e.preventDefault();
      e.stopPropagation();
      st.suppressUntil = 0;
      return;
    }
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const index = itemIndex(e.target);
    if (index < 0) return;
    e.preventDefault();
    setView('zoom', index);
  };

  const onOrbitKey = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const index = itemIndex(e.target);
    if (index < 0) return;
    e.preventDefault();
    setView('zoom', index);
  };

  const onOrbitFocus = e => {
    const index = itemIndex(e.target);
    if (index >= 0 && cfg.clickToFront && e.target instanceof Element && e.target.matches(':focus-visible')) {
      bringToFront(index);
      caption(index);
    }
  };

  orbitRoot.addEventListener('pointerenter', onEnter);
  orbitRoot.addEventListener('pointerleave', onLeave);
  orbitRoot.addEventListener('pointerover', onOver);
  orbitRoot.addEventListener('pointerdown', onDown);
  orbitRoot.addEventListener('pointermove', onMove);
  orbitRoot.addEventListener('pointerup', onUp);
  orbitRoot.addEventListener('pointercancel', onCancel);
  orbitRoot.addEventListener('lostpointercapture', onCancel);
  orbitRoot.addEventListener('click', onOrbitClick);
  orbitRoot.addEventListener('keydown', onOrbitKey);
  orbitRoot.addEventListener('focusin', onOrbitFocus);
  orbitRoot.addEventListener('dragstart', e => e.preventDefault());

  if (zoomBox) {
    zoomBox.addEventListener('pointerdown', e => {
      if (st.view !== 'zoom' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      st.zoomDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    zoomBox.addEventListener('pointerup', e => {
      const zd = st.zoomDrag;
      if (!zd || e.pointerId !== zd.id) return;
      st.zoomDrag = null;
      const dx = e.clientX - zd.x;
      const dy = e.clientY - zd.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        st.suppressUntil = performance.now() + 300;
        const nextIdx = mod(st.zoomIndex + (dx < 0 ? 1 : -1), items.length);
        syncZoomContent(nextIdx);
        bringToFront(nextIdx);
        announce(nextIdx);
      }
    });
    zoomBox.addEventListener('pointercancel', () => {
      st.zoomDrag = null;
    });
    zoomBox.addEventListener('click', e => {
      if (performance.now() < st.suppressUntil) {
        e.preventDefault();
        st.suppressUntil = 0;
        return;
      }
      if (e.target instanceof Element && e.target.closest('[data-carousel-zoom-link]')) return;
      setView('orbit');
    });
    zoomBox.addEventListener('dragstart', e => e.preventDefault());
  }

  prevButton.addEventListener('click', () => {
    const baseIdx = st.view === 'zoom' ? st.zoomIndex : st.active >= 0 ? st.active : st.frontIndex;
    const nextIdx = mod(baseIdx - 1, items.length);
    if (st.view === 'zoom') {
      syncZoomContent(nextIdx);
      bringToFront(nextIdx);
    } else {
      bringToFront(nextIdx);
      caption(nextIdx);
    }
    announce(nextIdx);
  });

  nextButton.addEventListener('click', () => {
    const baseIdx = st.view === 'zoom' ? st.zoomIndex : st.active >= 0 ? st.active : st.frontIndex;
    const nextIdx = mod(baseIdx + 1, items.length);
    if (st.view === 'zoom') {
      syncZoomContent(nextIdx);
      bringToFront(nextIdx);
    } else {
      bringToFront(nextIdx);
      caption(nextIdx);
    }
    announce(nextIdx);
  });

  viewButton.addEventListener('click', () => setView(st.view === 'orbit' ? 'zoom' : 'orbit'));

  playButton.addEventListener('click', () => {
    cfg.paused = !cfg.paused;
    if (cfg.paused) {
      st.speed = 0;
      st.glide = 0;
      st.seek = null;
    } else {
      wake();
    }
    interfaceText();
  });

  root.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowRight') nextButton.click();
    else if (e.key === 'ArrowLeft') prevButton.click();
    else if (e.key === 'Home') {
      if (st.view === 'zoom') {
        syncZoomContent(0);
        bringToFront(0);
      } else {
        bringToFront(0);
        caption(0);
      }
      announce(0);
    } else if (e.key === 'End') {
      const last = items.length - 1;
      if (st.view === 'zoom') {
        syncZoomContent(last);
        bringToFront(last);
      } else {
        bringToFront(last);
        caption(last);
      }
      announce(last);
    } else if (e.key === 'Escape') {
      if (st.view === 'zoom') setView('orbit');
      else return;
    } else if (e.key === 'Enter' && e.target === viewport) {
      if (st.view === 'orbit') setView('zoom', st.active >= 0 ? st.active : st.frontIndex);
      else zoomLink?.click();
    } else if (e.key === ' ' && e.target === viewport && !st.reduced) {
      playButton.click();
    } else {
      return;
    }
    e.preventDefault();
  });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      layout();
      render(performance.now());
      wake();
    }).observe(orbitRoot);
  } else {
    window.addEventListener(
      'resize',
      () => {
        layout();
        render(performance.now());
        wake();
      },
      { passive: true }
    );
  }

  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(
      entries => {
        st.visible = entries[entries.length - 1].isIntersecting;
        if (st.visible) {
          layout();
          render(performance.now());
          wake();
        } else {
          suspend();
        }
      },
      { threshold: 0.05 }
    ).observe(root);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else {
      render(performance.now());
      wake();
    }
  });

  query?.addEventListener?.('change', () => {
    st.reduced = !!query.matches;
    if (st.reduced) {
      orbitRoot.removeAttribute('data-intro');
      st.introStart = -2;
      st.introDone = true;
      st.speed = 0;
    }
    interfaceText();
    render(performance.now());
    wake();
  });

  new MutationObserver(() => {
    if (st.view === 'zoom') syncZoomContent(st.zoomIndex);
    else caption(st.active >= 0 ? st.active : st.frontIndex);
    interfaceText();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });

  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', () => {
    render(performance.now());
    wake();
  });
  window.addEventListener('beforeprint', () => {
    st.printing = true;
    suspend();
  });
  window.addEventListener('afterprint', () => {
    st.printing = false;
    wake();
  });

  wake();
})();
