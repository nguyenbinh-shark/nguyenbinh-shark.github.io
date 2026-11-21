/* Gooey navigation for the existing Jekyll/greedy menu.
 * Liquid transfer motion adapted from React Bits Gooey Nav by David Haz (2026).
 * https://reactbits.dev/components/gooey-nav
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 * SVG rendering and responsive-menu integration are site-specific.
 */
(() => {
  'use strict';
  const nav = document.querySelector('[data-gooey-nav]');
  if (!nav || !document.createElementNS || !window.requestAnimationFrame) return;
  if (window.CSS?.supports && !window.CSS.supports('filter', 'url("#gooey")')) return;
  const lists = [...nav.querySelectorAll('.visible-links, .hidden-links')];
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 767px)');
  const NS = 'http://www.w3.org/2000/svg';
  const PAD = 16;
  const selector = '.masthead__menu-item--lg > a, [data-nav-order] > a';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);
  const bezier = (a, b, c, d, t) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  };
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };
  const label = link => {
    const lang = document.documentElement.dataset.lang === 'en' ? 'en' : 'vi';
    return (link.querySelector('.lang-' + lang)?.textContent || link.textContent).trim();
  };
  let pointerLink = null;
  let refreshFrame = 0;
  let printing = false;

  function createLayer(list, index) {
    const host = document.createElement('div');
    host.className = 'gooey-nav-layer';
    host.setAttribute('aria-hidden', 'true');
    host.hidden = true;
    const svg = svgNode('svg', { class: 'gooey-nav-ink', 'aria-hidden': 'true', focusable: 'false' });
    const defs = svgNode('defs');
    const filterId = 'site-gooey-filter-' + index;
    const clipId = 'site-gooey-clip-' + index;
    const filter = svgNode('filter', { id: filterId, x: '-20%', y: '-50%', width: '140%', height: '200%', 'color-interpolation-filters': 'sRGB' });
    filter.append(svgNode('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 3, result: 'soft' }));
    filter.append(svgNode('feColorMatrix', { in: 'soft', type: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7', result: 'liquid' }));
    filter.append(svgNode('feBlend', { in: 'SourceGraphic', in2: 'liquid' }));
    const clip = svgNode('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
    defs.append(filter, clip);
    const ink = svgNode('g', { filter: `url(#${filterId})`, fill: 'currentColor' });
    const labels = document.createElement('div');
    labels.className = 'gooey-nav-labels';
    labels.style.clipPath = `url("#${clipId}")`;
    svg.append(defs, ink);
    host.append(svg, labels);
    nav.append(host);
    const pair = tag => {
      const visible = svgNode(tag, { transform: 'scale(0)' }), mask = svgNode(tag, { transform: 'scale(0)' });
      ink.append(visible); clip.append(mask);
      return [visible, mask];
    };
    const source = pair('rect'), destination = pair('rect');
    const drops = Array.from({ length: 10 }, () => pair('circle'));
    const state = { host, svg, labels, list, source, destination, drops, boxes: new Map(),
      target: null, from: null, to: null, started: 0, frame: 0, dominant: null };

    const attributes = (nodes, attrs) => nodes.forEach(node => {
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    });
    function stop() { cancelAnimationFrame(state.frame); state.frame = 0; }
    function pill(nodes, box) {
      attributes(nodes, box ? { x: -box.w / 2, y: -box.h / 2, width: box.w, height: box.h, rx: box.h / 2 } : { width: 0, height: 0 });
    }
    function place(nodes, box, amount) {
      if (!box || amount <= 0.002) { attributes(nodes, { transform: 'scale(0)' }); return; }
      const sx = Math.pow(amount, 0.75), sy = 0.42 + 0.58 * Math.sqrt(amount);
      attributes(nodes, { transform: `translate(${box.x},${box.y}) scale(${sx},${sy})` });
    }
    function settle(link) {
      stop();
      state.target = link;
      const box = state.boxes.get(link);
      state.dominant = box || null;
      pill(source, null); place(source, null, 0);
      pill(destination, box); place(destination, box, 1);
      drops.forEach(nodes => attributes(nodes, { transform: 'scale(0)' }));
    }
    function animate(now) {
      state.frame = 0;
      if (document.hidden || printing || preference.matches) { settle(state.target); return; }
      const elapsed = now - state.started;
      const progress = ease(elapsed / 500);
      place(source, state.from, 1 - progress);
      place(destination, state.to, progress);
      state.dominant = progress < 0.5 ? state.from : state.to;
      drops.forEach((nodes, i) => {
        const t = clamp((elapsed - i * 7) / (450 + (i % 3) * 30));
        const travel = t * t * (3 - 2 * t);
        const swing = (i % 2 ? 1 : -1) * (8 + i % 4 * 4);
        const a = state.from, b = state.to;
        const x = bezier(a.x, a.x + (b.x - a.x) * 0.2, a.x + (b.x - a.x) * 0.8, b.x, travel);
        const y = bezier(a.y, a.y + swing, b.y + swing, b.y, travel);
        const size = Math.sin(Math.PI * t);
        attributes(nodes, { transform: `translate(${x},${y}) scale(${Math.max(0, size)})` });
      });
      if (elapsed < 600) state.frame = requestAnimationFrame(animate);
      else settle(state.target);
    }
    function go(link, animated = true) {
      if (link === state.target) return;
      const to = state.boxes.get(link);
      if (!to || !animated || preference.matches || document.hidden || printing || !state.dominant) { settle(link); return; }
      stop();
      state.from = state.dominant;
      state.to = to;
      state.target = link;
      state.started = performance.now();
      pill(source, state.from); pill(destination, to);
      drops.forEach((nodes, i) => attributes(nodes, { cx: 0, cy: 0, r: Math.min(state.from.h, to.h) * (0.15 + i % 4 * 0.025) }));
      state.frame = requestAnimationFrame(animate);
    }
    function measure() {
      stop();
      const box = list.getBoundingClientRect();
      const shown = !list.classList.contains('hidden') && list.getClientRects().length && box.width > 0 && box.height > 0;
      host.hidden = !shown;
      state.boxes.clear();
      labels.replaceChildren();
      if (!shown) { state.target = state.dominant = null; return; }
      const fixed = compact.matches && list.classList.contains('hidden-links');
      const origin = fixed ? { left: 0, top: 0 } : nav.getBoundingClientRect();
      Object.assign(host.style, { position: fixed ? 'fixed' : 'absolute', left: `${box.left - origin.left - PAD}px`, top: `${box.top - origin.top - PAD}px`, width: `${box.width + PAD * 2}px`, height: `${box.height + PAD * 2}px` });
      svg.setAttribute('viewBox', `0 0 ${box.width + PAD * 2} ${box.height + PAD * 2}`);
      for (const link of list.querySelectorAll(selector)) {
        if (!link.getClientRects().length) continue;
        const rect = link.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const extra = list.classList.contains('visible-links') ? 8 : 0;
        state.boxes.set(link, { x: rect.left - box.left + PAD + rect.width / 2, y: rect.top - box.top + PAD + rect.height / 2, w: rect.width + extra * 2, h: rect.height });
        const copy = document.createElement('span');
        copy.className = 'gooey-nav-label';
        copy.textContent = label(link);
        const style = getComputedStyle(link);
        Object.assign(copy.style, { left: `${rect.left - box.left + PAD}px`, top: `${rect.top - box.top + PAD}px`, width: `${rect.width}px`, height: `${rect.height}px`, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, paddingTop: style.paddingTop, paddingRight: style.paddingRight, paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft, textAlign: style.textAlign });
        labels.append(copy);
      }
      settle(null);
    }
    state.measure = measure;
    state.go = go;
    state.settle = () => settle(state.target);
    return state;
  }

  const layers = lists.map(createLayer);
  const eligible = node => node instanceof Element && nav.contains(node) && node.matches(selector) ? node : null;
  const focusedLink = () => eligible(document.activeElement);
  const currentLink = () => nav.querySelector(`${selector.split(',').map(s => s.trim() + '[aria-current]').join(',')}`);
  function target() {
    if (pointerLink && !layers.some(layer => layer.boxes.has(pointerLink))) pointerLink = null;
    const desired = pointerLink || focusedLink() || currentLink();
    for (const layer of layers) layer.go(layer.boxes.has(desired) ? desired : [...layer.boxes.keys()].find(link => link.hasAttribute('aria-current')) || null);
  }
  function refresh() {
    refreshFrame = 0;
    layers.forEach(layer => layer.measure());
    target();
  }
  function requestRefresh() {
    if (document.hidden || printing) return;
    if (!refreshFrame) refreshFrame = requestAnimationFrame(refresh);
  }
  function stopAll() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = 0;
    layers.forEach(layer => layer.settle());
  }
  nav.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    pointerLink = eligible(event.target.closest('a'));
    target();
  });
  nav.addEventListener('pointerleave', () => { pointerLink = null; target(); });
  nav.addEventListener('focusin', event => { pointerLink = null; if (eligible(event.target)) target(); });
  nav.addEventListener('focusout', event => {
    if (!eligible(event.relatedTarget)) { pointerLink = null; requestRefresh(); }
  });
  const observer = new MutationObserver(requestRefresh);
  lists.forEach(list => observer.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] }));
  const toggle = nav.querySelector('.nav-toggle');
  if (toggle) observer.observe(toggle, { attributes: true, attributeFilter: ['class', 'aria-expanded'] });
  new MutationObserver(requestRefresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang', 'data-theme'] });
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(requestRefresh);
    resize.observe(nav);
    lists.forEach(list => resize.observe(list));
  }
  window.addEventListener('resize', requestRefresh, { passive: true });
  nav.querySelector('.hidden-links')?.addEventListener('scroll', requestRefresh, { passive: true });
  preference.addEventListener?.('change', () => { layers.forEach(layer => layer.settle()); requestRefresh(); });
  compact.addEventListener?.('change', requestRefresh);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); else requestRefresh(); });
  window.addEventListener('pagehide', stopAll);
  window.addEventListener('pageshow', requestRefresh);
  window.addEventListener('beforeprint', () => { printing = true; stopAll(); });
  window.addEventListener('afterprint', () => { printing = false; requestRefresh(); });
  if (document.fonts) {
    document.fonts.ready.then(requestRefresh, requestRefresh);
    document.fonts.addEventListener?.('loadingdone', requestRefresh);
  }
  nav.classList.add('gooey-ready');
  refresh();
})();
