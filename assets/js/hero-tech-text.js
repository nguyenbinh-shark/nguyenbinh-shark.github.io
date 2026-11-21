/*
 * Tech Text for the Jekyll hero: native, multiline adaptation of React Bits.
 * Dashed glyph sprites and selection treatment adapted from David Haz (2026).
 * Source: https://reactbits.dev/text-animations/tech-text
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 */
(() => {
  'use strict';

  const heading = document.querySelector('[data-tech-heading]');
  if (!heading || !window.requestAnimationFrame) return;
  if (window.matchMedia('(pointer: coarse), (max-width: 767px)').matches) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const PAD = 24;
  const approach = (value, target, dt) => value + (target - value) * (1 - Math.exp(-dt / 0.09));
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const split = text => segmenter ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text.normalize('NFC'));
  const lines = [];
  let raf = 0;
  let last = 0;
  let dirty = true;
  let visible = !('IntersectionObserver' in window);
  let ready = !document.fonts;
  let failed = false;
  let introStart = null;
  let introDone = false;

  try {
    for (const element of heading.querySelectorAll('.tech-text__line')) {
      const fallback = element.querySelector('.tech-text__fallback');
      const text = fallback.textContent.normalize('NFC');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      canvas.className = 'tech-text__canvas';
      canvas.setAttribute('aria-hidden', 'true');
      const baseline = document.createElement('span');
      baseline.className = 'tech-text__baseline';
      baseline.setAttribute('aria-hidden', 'true');
      fallback.append(baseline);
      element.append(canvas);
      lines.push({ element, fallback, baseline, text, canvas, context, glyphs: [], pointer: null, touchUntil: 0 });
    }
  } catch (_) {
    heading.querySelectorAll('.tech-text__canvas, .tech-text__baseline').forEach(node => node.remove());
    return;
  }

  const restore = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    lines.forEach(line => line.element.classList.remove('is-tech-text'));
  };
  const wake = () => {
    if (raf || failed || !ready || !visible || document.hidden || motion.matches) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const refresh = () => {
    dirty = true;
    wake();
  };
  const configureFont = (context, style, size) => {
    context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    if ('letterSpacing' in context) context.letterSpacing = `${parseFloat(style.letterSpacing) || 0}px`;
    if ('wordSpacing' in context) {
      const ws = parseFloat(style.wordSpacing);
      context.wordSpacing = Number.isFinite(ws) ? `${ws}px` : '0px';
    }
  };
  const textWidth = (context, text, spacing, wordSpacing = 0) => context.measureText(text).width +
    ('letterSpacing' in context ? 0 : Math.max(0, split(text).length - 1) * spacing) +
    ('wordSpacing' in context ? 0 : (text.match(/ /g)?.length || 0) * wordSpacing);

  const sprite = (line, glyph, outlined, style, size, ink, scale) => {
    const image = document.createElement('canvas');
    const left = Math.floor(glyph.x - glyph.metrics.actualBoundingBoxLeft - 4);
    const top = Math.floor(line.y - glyph.metrics.actualBoundingBoxAscent - 4);
    image.width = Math.max(1, Math.ceil((glyph.metrics.actualBoundingBoxLeft + glyph.metrics.actualBoundingBoxRight + 8) * scale));
    image.height = Math.max(1, Math.ceil((glyph.metrics.actualBoundingBoxAscent + glyph.metrics.actualBoundingBoxDescent + 8) * scale));
    const c = image.getContext('2d');
    if (!c) throw new Error('Glyph canvas unavailable');
    c.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
    configureFont(c, style, size);
    c.fillStyle = ink;
    if (outlined) {
      c.strokeStyle = ink;
      c.lineWidth = 1.6;
      c.lineJoin = 'round';
      c.setLineDash([2.5, 1.8]);
      c.strokeText(glyph.char, glyph.x, line.y);
      c.globalCompositeOperation = 'destination-out';
      c.fillText(glyph.char, glyph.x, line.y);
    } else c.fillText(glyph.char, glyph.x, line.y);
    return { image, left, top };
  };

  const layout = () => {
    const style = getComputedStyle(heading);
    const desired = parseFloat(style.fontSize);
    const available = heading.clientWidth;
    if (!available) return;
    const spacing = parseFloat(style.letterSpacing) || 0;
    const rawWordSpacing = parseFloat(style.wordSpacing);
    const wordSpacing = Number.isFinite(rawWordSpacing) ? rawWordSpacing : 0;
    let fitted = desired;
    for (const line of lines) {
      if (!line.element.getClientRects().length) continue;
      configureFont(line.context, style, desired);
      fitted = Math.min(fitted, desired * (available - 6) / Math.max(1, textWidth(line.context, line.text, spacing, wordSpacing)));
    }
    const value = `${Math.floor(fitted * 100) / 100}px`;
    if (heading.style.getPropertyValue('--tech-text-size') !== value) heading.style.setProperty('--tech-text-size', value);
    for (const line of lines) {
      line.active = !!line.element.getClientRects().length;
      if (!line.active) {
        line.element.classList.remove('is-tech-text');
        continue;
      }
      const rect = line.element.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(line.element).fontSize);
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const c = line.context;
      line.width = rect.width + PAD * 2;
      line.height = rect.height + PAD * 2;
      line.canvas.width = Math.ceil(line.width * scale);
      line.canvas.height = Math.ceil(line.height * scale);
      line.scale = scale;
      line.y = line.baseline.getBoundingClientRect().top - rect.top + PAD;
      line.ink = style.getPropertyValue('--design-ink').trim() || style.color;
      line.accent = style.getPropertyValue('--design-accent').trim() || line.ink;
      configureFont(c, style, size);
      let prefix = '';
      line.glyphs = split(line.text).map(char => {
        const x = PAD + (prefix ? textWidth(c, prefix, spacing, wordSpacing) + ('letterSpacing' in c ? 0 : spacing) : 0);
        prefix += char;
        const metrics = c.measureText(char);
        const glyph = { char, x, metrics, amount: 0 };
        if (char.trim()) {
          glyph.fill = sprite(line, glyph, false, style, size, line.ink, scale);
          glyph.outline = sprite(line, glyph, true, style, size, line.ink, scale);
        }
        return glyph;
      }).filter(glyph => glyph.fill);
    }
    dirty = false;
  };

  const draw = (line, now, dt, sweep) => {
    const c = line.context;
    let focus = -1;
    let distance = Infinity;
    const pointer = line.pointer && (line.touchUntil === 0 || now < line.touchUntil) ? line.pointer : null;
    const point = pointer || (sweep === null ? null : { x: PAD + sweep * (line.width - PAD * 2), y: line.y - 12 });
    if (point) line.glyphs.forEach((glyph, index) => {
      const m = glyph.metrics;
      const left = glyph.x - m.actualBoundingBoxLeft;
      const right = glyph.x + m.actualBoundingBoxRight;
      const delta = Math.max(left - point.x, 0, point.x - right);
      if (delta < distance && point.y >= line.y - m.actualBoundingBoxAscent - 18 && point.y <= line.y + m.actualBoundingBoxDescent + 18) {
        distance = delta;
        focus = delta < 18 ? index : -1;
      }
    });
    c.setTransform(line.scale, 0, 0, line.scale, 0, 0);
    c.clearRect(0, 0, line.width, line.height);
    let settling = false;
    line.glyphs.forEach((glyph, index) => {
      const target = index === focus ? 1 : 0;
      glyph.amount = approach(glyph.amount, target, dt);
      if (Math.abs(glyph.amount - target) < 0.003) glyph.amount = target;
      else settling = true;
      for (const [image, alpha] of [[glyph.fill, 1 - glyph.amount], [glyph.outline, glyph.amount]]) {
        if (!alpha) continue;
        c.globalAlpha = alpha;
        c.drawImage(image.image, image.left, image.top, image.image.width / line.scale, image.image.height / line.scale);
      }
      if (glyph.amount > 0.01) {
        const m = glyph.metrics;
        const x = glyph.x - m.actualBoundingBoxLeft - 4;
        const y = line.y - m.actualBoundingBoxAscent - 4;
        const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight + 8;
        const height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 8;
        c.globalAlpha = glyph.amount * 0.65;
        c.strokeStyle = c.fillStyle = line.accent;
        c.lineWidth = 0.75;
        c.strokeRect(x, y, width, height);
        for (const [cx, cy] of [[x, y], [x + width, y], [x, y + height], [x + width, y + height]]) c.fillRect(cx - 1.5, cy - 1.5, 3, 3);
        c.font = '9px ui-monospace, monospace';
        c.fillText(`${glyph.char} ${Math.round(width - 8)} \u00d7 ${Math.round(height - 8)}`, Math.max(PAD, x), Math.max(10, y - 6));
      }
    });
    c.globalAlpha = 1;
    // Hide the semantic fallback only after the entire line has drawn successfully.
    line.element.classList.add('is-tech-text');
    return settling || (line.touchUntil > now && !!pointer);
  };

  function tick(now) {
    raf = 0;
    if (motion.matches || !visible || document.hidden || failed) return;
    try {
      if (dirty) layout();
      if (introStart === null) introStart = now;
      const progress = (now - introStart) / 1800;
      if (progress >= 1) introDone = true;
      const sweep = introDone ? null : Math.min(1, progress);
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      let moving = !introDone;
      for (const line of lines) if (line.active) moving = draw(line, now, dt, sweep) || moving;
      if (moving) raf = requestAnimationFrame(tick);
    } catch (_) {
      failed = true;
      restore();
    }
  }

  lines.forEach(line => {
    const point = event => {
      const rect = line.element.getBoundingClientRect();
      line.pointer = { x: event.clientX - rect.left + PAD, y: event.clientY - rect.top + PAD };
      line.touchUntil = event.pointerType === 'touch' ? performance.now() + 900 : 0;
      introDone = true;
      wake();
    };
    line.element.addEventListener('pointermove', point, { passive: true });
    line.element.addEventListener('pointerdown', point, { passive: true });
    const leave = () => { line.pointer = null; line.touchUntil = 0; wake(); };
    line.element.addEventListener('pointerleave', leave, { passive: true });
    line.element.addEventListener('pointercancel', leave, { passive: true });
    line.canvas.addEventListener('contextlost', () => { failed = true; restore(); });
    line.canvas.addEventListener('contextrestored', () => { failed = false; refresh(); });
  });
  const hostSection = heading.closest('section') || heading;
  const onHeadingReplay = () => {
    if (motion.matches) return;
    introStart = null;
    introDone = false;
    refresh();
  };
  hostSection.addEventListener('section:prepare', onHeadingReplay);
  hostSection.addEventListener('section:enter', onHeadingReplay);
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(heading);
  window.addEventListener('resize', refresh, { passive: true });
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-lang', 'class'] });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { cancelAnimationFrame(raf); raf = 0; }
    else refresh();
  }).observe(heading);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else refresh();
  });
  const motionChanged = () => { restore(); lines.forEach(line => { line.pointer = null; }); introDone = true; refresh(); };
  motion.addEventListener?.('change', motionChanged);
  window.addEventListener('pagehide', restore);
  window.addEventListener('pageshow', refresh);
  if (document.fonts) {
    document.fonts.ready.then(() => { ready = true; refresh(); }, () => { ready = true; refresh(); });
    document.fonts.addEventListener?.('loadingdone', refresh);
  }
  refresh();
})();
