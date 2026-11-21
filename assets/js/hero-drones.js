/* Four small white aircraft roam the hero's empty areas independently.
 * Perspective comes from heading, banking and depth, independent of the laser. */
(() => {
  'use strict';
  const scene = document.querySelector('[data-hero-drones]');
  const hero = scene?.closest('.home-hero');
  const copy = hero?.querySelector('.home-hero__copy');
  if (!scene || !hero || !copy || !window.requestAnimationFrame) return;
  if (window.matchMedia('(pointer: coarse), (max-width: 767px)').matches) return;
  let frontContext;
  try { frontContext = scene.getContext('2d'); } catch (_) { return; }
  if (!frontContext) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const CYCLE = 28;
  let geometry, raf = 0, last = null, elapsed = 0;
  let visible = !('IntersectionObserver' in window), printing = false;

  // A closed cubic B-spline has continuous curvature at every join.
  // Arc-length lookup keeps spacing and speed steady through the bends.
  function rawRoute(phase, index = 0) {
    const track = geometry.tracks[index];
    const knots = track.knots;
    const u = ((phase % 1) + 1) % 1 * knots.length;
    const segment = Math.floor(u), t = u - segment;
    const p = [-1, 0, 1, 2].map(offset => knots[(segment + offset + knots.length) % knots.length]);
    const position = [0, 1].map(axis => {
      const [a, b0, c, d] = p.map(point => point[axis]);
      return (Math.pow(1 - t, 3) * a + (3 * t ** 3 - 6 * t * t + 4) * b0 + (-3 * t ** 3 + 3 * t * t + 3 * t + 1) * c + t ** 3 * d) / 6;
    });
    return [track.left + position[0] * track.span, track.top + position[1] * track.flightHeight, Math.sin(phase * Math.PI * 2 + .3 + index * 1.7) * .6];
  }
  function buildTrack() {
    geometry.tracks.forEach((track, index) => {
      const points = Array.from({ length: 513 }, (_, i) => rawRoute(i / 512, index));
      let distance = 0;
      track.table = points.map((p, i) => {
        if (i) distance += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
        return { phase: i / 512, distance };
      });
      track.table.forEach(point => { point.distance /= distance || 1; });
    });
  }
  function route(time, index = 0) {
    const distance = ((time / geometry.tracks[index].period % 1) + 1) % 1;
    const track = geometry.tracks[index].table;
    let lo = 0, hi = track.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (track[mid].distance < distance) lo = mid; else hi = mid;
    }
    const t = (distance - track[lo].distance) / (track[hi].distance - track[lo].distance || 1);
    return rawRoute(mix(track[lo].phase, track[hi].phase, t), index);
  }

  function pose(index, time) {
    const clock = time + [0, 9.4, 17.2, 25.7][index];
    const p = route(clock, index), next = route(clock + .06, index);
    const scale = 1 / (1 - p[2] * .32);
    const { unit } = geometry.tracks[index];
    const before = route(clock - .06, index);
    // Invert the fixed oblique camera to align the actual 3D fuselage with
    // screen velocity. Aircraft now yaw in space, rather than rotate a sprite.
    const heading = (a, b) => Math.atan2(b[0] - a[0], -(b[1] - a[1]) / .52);
    const yaw = heading(before, next);
    const ahead = route(clock + .24, index), behind = route(clock - .24, index);
    const nextYaw = heading(next, ahead);
    const previousYaw = heading(behind, before);
    const turn = Math.atan2(Math.sin(nextYaw - previousYaw), Math.cos(nextYaw - previousYaw));
    return {
      x: p[0], y: p[1],
      z: p[2], scale: unit * scale, yaw,
      bank: Math.tanh(turn * .7) * .48,
      pitch: (next[2] - before[2]) * 1.5, index
    };
  }

  function project(point, aircraft) {
    let [x, y, z] = point;
    // Bank, pitch and yaw in world space; project through a fixed camera.
    const cb = Math.cos(aircraft.bank), sb = Math.sin(aircraft.bank);
    [x, y] = [x * cb - y * sb, x * sb + y * cb];
    const cp = Math.cos(aircraft.pitch), sp = Math.sin(aircraft.pitch);
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    const cy = Math.cos(aircraft.yaw), sy = Math.sin(aircraft.yaw);
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const depth = z * .854 + y * .52;
    const perspective = 1 / (1 - depth * .085);
    return [aircraft.x + x * aircraft.scale * perspective, aircraft.y + (y * .854 - z * .52) * aircraft.scale * perspective, depth];
  }

  function line(context, points, color, width = 1) {
    context.beginPath();
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.strokeStyle = color; context.lineWidth = width; context.stroke();
  }
  function face(context, points, color, outline) {
    context.beginPath();
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath(); context.fillStyle = color; context.fill();
    if (outline) { context.strokeStyle = outline; context.lineWidth = .65; context.stroke(); }
  }
  function aircraft(context, state) {
    const P = point => project(point, state);
    const light = geometry.ink || '#ffffff';
    const tone = geometry.isDark ? 1 : 0.72;
    context.save();
    context.globalAlpha = .9 * tone;
    context.lineJoin = 'round'; context.lineCap = 'round';
    if (state.index === 0) {
      // Long straight wings, a tapered fuselage, tailplane and rear propeller.
      // Monochrome finish adapts via geometry.ink and tone.
      context.globalAlpha = .68 * tone;
      face(context, [[-1.7, 0, -.12], [-1.66, 0, .13], [-.2, -.02, .36], [.2, -.02, .36], [1.66, 0, .13], [1.7, 0, -.12]].map(P), light);
      face(context, [[-.66, -.02, -1.18], [-.55, -.02, -.91], [0, -.02, -.80], [.55, -.02, -.91], [.66, -.02, -1.18]].map(P), light);
      const nose = [0, -.04, 1.55];
      const tl = [-.20, -.24, .8], tr = [.20, -.24, .8], bl = [-.20, .10, .8], br = [.20, .10, .8];
      const tailL = [-.07, -.13, -1.32], tailR = [.07, -.13, -1.32], lowL = [-.07, .07, -1.32], lowR = [.07, .07, -1.32];
      [
        { points: [tl, tr, tailR, tailL], shade: .96 },
        { points: [tl, tailL, lowL, bl], shade: .55 },
        { points: [tr, br, lowR, tailR], shade: .7 },
        { points: [bl, lowL, lowR, br], shade: .4 },
        { points: [nose, tl, tr], shade: .9 },
        { points: [nose, tr, br], shade: .7 },
        { points: [nose, bl, tl], shade: .55 }
      ].map(surface => ({ ...surface, projected: surface.points.map(P) }))
        .sort((a, b) => a.projected.reduce((sum, p) => sum + p[2], 0) / a.projected.length - b.projected.reduce((sum, p) => sum + p[2], 0) / b.projected.length)
        .forEach(surface => { context.globalAlpha = surface.shade * tone; face(context, surface.projected, light); });
      context.globalAlpha = .9 * tone;
      face(context, [[0, -.52, -1.24], [0, -.08, -1.35], [0, -.08, -.72]].map(P), light);
      const propeller = reduced.matches ? .8 : elapsed * 24;
      line(context, [-1, 1].map(sign => P([Math.cos(propeller) * .34 * sign, Math.sin(propeller) * .34 * sign - .08, -1.40])), light, .9);
    } else {
      const hubs = [[-.78, 0, -.62], [.78, 0, -.62], [-.78, 0, .62], [.78, 0, .62]];
      hubs.sort((a, b) => P(a)[1] - P(b)[1]);
      hubs.forEach(hub => {
        line(context, [P([0, 0, 0]), P(hub)], light, 1.1);
        const ring = Array.from({ length: 25 }, (_, i) => {
          const a = i / 24 * Math.PI * 2;
          return P([hub[0] + Math.cos(a) * .42, -.06, hub[2] + Math.sin(a) * .42]);
        });
        context.globalAlpha = .4 * tone;
        line(context, ring, light, .8);
        context.globalAlpha = .9 * tone;
        const rotation = reduced.matches ? .6 : elapsed * 32 + hub[0];
        line(context, [-1, 1].map(sign => P([hub[0] + Math.cos(rotation) * .34 * sign, -.07, hub[2] + Math.sin(rotation) * .34 * sign])), light, .9);
      });
      const a = [-.27, -.23, -.4], b = [.27, -.23, -.4], c = [.3, -.23, .38], d = [-.3, -.23, .38];
      face(context, [a, b, c, d].map(P), light);
      context.globalAlpha = .55 * tone;
      face(context, [b, [.27, .16, -.4], [.3, .16, .38], c].map(P), light);
      context.globalAlpha = .7 * tone;
      face(context, [c, [.3, .08, .38], [-.3, .08, .38], d].map(P), light);
    }
    context.restore();
  }

  function draw() {
    if (!geometry) return;
    const { width, height, ratio } = geometry;
    frontContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    frontContext.clearRect(0, 0, width, height);
    const states = [0, 1, 2, 3].map(index => pose(index, elapsed));
    states.sort((a, b) => a.z - b.z).forEach(state => aircraft(frontContext, state));
  }
  function moving() { return visible && !document.hidden && !printing && !reduced.matches; }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = null; }
  function wake() { if (geometry && moving() && !raf) raf = requestAnimationFrame(frame); }
  function measure() {
    const bounds = hero.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const text = copy.getBoundingClientRect();
    const compact = bounds.width <= 1023;
    hero.classList.toggle('has-compact-drones', compact);
    const track = hero.querySelector('[data-footer-balancer]');
    const trackRect = track?.getBoundingClientRect();
    const trackReserve = trackRect && trackRect.height ? Math.max(0, bounds.bottom - trackRect.top) : 0;
    const above = { left: 24, top: 8, span: bounds.width - 48, flightHeight: text.top - bounds.top - 32 };
    const below = { left: 24, top: text.bottom - bounds.top + 24, span: bounds.width - 48, flightHeight: bounds.bottom - text.bottom - 40 - trackReserve };
    const right = { left: text.right - bounds.left + 32, top: 16, span: bounds.width - (text.right - bounds.left) - 56, flightHeight: bounds.height - 40 - trackReserve };
    const zones = compact ? [{ left: 16, top: 8, span: bounds.width - 32, flightHeight: 80 }] : [right, above, below].filter(zone => zone.span >= 100 && zone.flightHeight >= 36);
    if (!zones.length) { scene.classList.remove('is-ready'); geometry = null; stop(); return; }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const isDark = document.documentElement.dataset.theme === 'dark';
    const ink = isDark ? '#ffffff' : (getComputedStyle(hero).getPropertyValue('--design-ink').trim() || '#111111');
    geometry = { width: bounds.width, height: bounds.height, ratio, isDark, ink,
      tracks: [0, 1, 2, 3].map(index => {
        const zone = zones[index % zones.length];
        const r = Math.min(.18, zone.flightHeight * .35 / zone.span);
        const flip = index % 2 ? p => [1 - p[0], p[1]] : p => p;
        return { ...zone, period: CYCLE * [1, 1.27, 1.53, .91][index],
          unit: Math.min(compact ? 9 : 14, zone.flightHeight * .10, zone.span * .08),
          knots: [[.12 + r, .22], [.88 - r, .16], [.88, .30], [.84, .72], [.70, .80], [.25, .74], [.12, .62], [.16, .30]].map(flip) };
      }) };
    buildTrack();
    scene.width = Math.ceil(bounds.width * ratio); scene.height = Math.ceil(bounds.height * ratio);
    scene.dataset.mode = compact ? 'compact' : 'free';
    scene.classList.add('is-ready');
    draw(); wake();
  }
  function frame(now) {
    raf = 0;
    if (!moving()) { stop(); return; }
    elapsed += last === null ? 0 : Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    draw(); wake();
  }
  function refresh() { stop(); measure(); }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(hero); observer.observe(copy);
  }
  if ('MutationObserver' in window) new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-lang'] });
  window.addEventListener('resize', refresh, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else stop();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else refresh(); });
  reduced.addEventListener?.('change', refresh);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('beforeprint', () => { printing = true; stop(); });
  window.addEventListener('afterprint', () => { printing = false; refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh, refresh);
  measure();
})();
