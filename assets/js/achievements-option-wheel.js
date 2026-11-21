/*
 * Infinite-loop Option Wheel hugging the outer rim of the Astral Shell globe.
 * Adapted from React Bits OptionWheel by David Haz (https://reactbits.dev/c/components/option-wheel).
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 * Rim-concentric polar layout, synchronized detail cards, and Astral Shell random transition triggers are site-specific.
 */
(() => {
  'use strict';

  const sections = [...document.querySelectorAll('[data-achievements-wheel]')];
  if (!sections.length || !window.requestAnimationFrame) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(pointer: coarse), (max-width: 767px)');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mod = (v, n) => ((v % n) + n) % n;

  sections.forEach(section => {
    const wheel = section.querySelector('[data-option-wheel]');
    const shellContainer = section.querySelector('[data-astral-shell]');
    const aeroContainer = section.querySelector('[data-aero-shards]');
    if (!wheel) return;
    const items = [...wheel.querySelectorAll('[data-wheel-item]')];
    const cards = [...section.querySelectorAll('[data-achievement-card]')];
    const prevBtn = section.querySelector('[data-wheel-prev]');
    const nextBtn = section.querySelector('[data-wheel-next]');
    const n = items.length;
    if (n === 0) return;

    const cfg = {
      fontSize: 1.75,
      rowH: 56,
      tilt: 17.5,
      blur: 1.6,
      fade: 0.28,
      minOpacity: 0.05,
      smoothing: 200,
      rimGap: 26,
      cx: 156,
      cy: 220,
      arcR: 172,
      loop: true,
      draggable: true
    };

    let pos = 0;
    let target = 0;
    let selectedIndex = 0;
    let raf = 0;
    let last = 0;
    let wheelTimer = 0;
    let drag = null;
    let dragMoved = false;

    function updateMetrics() {
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const w = wheel.clientWidth || 640;
      const h = wheel.clientHeight || 440;
      const globe = shellContainer?._astralShell?.getGeometry?.();

      if (w < 460) {
        cfg.fontSize = 1.25;
        cfg.tilt = 19;
        cfg.rimGap = 18;
      } else if (w < 580) {
        cfg.fontSize = 1.45;
        cfg.tilt = 18.5;
        cfg.rimGap = 22;
      } else {
        cfg.fontSize = 1.72;
        cfg.tilt = 17.5;
        cfg.rimGap = 26;
      }

      cfg.blur = mobile.matches || w < 768 ? 0 : 1.6;

      if (globe) {
        cfg.cx = globe.cx;
        cfg.cy = globe.cy;
        cfg.arcR = globe.rPx + cfg.rimGap;
      } else {
        const rPx = h * 0.32;
        cfg.cx = w < 640 ? -(rPx - 8) : w * 0.24;
        cfg.cy = h * 0.5;
        cfg.arcR = rPx + cfg.rimGap;
      }

      const tiltRad = (cfg.tilt * Math.PI) / 180;
      cfg.rowH = Math.max(cfg.arcR * tiltRad, cfg.fontSize * 1.35 * remPx, 42);
      wheel.style.setProperty('--ow-font-size', `${cfg.fontSize}rem`);
    }

    function emitAeroWave() {
      if (!aeroContainer || reduced.matches) return;
      const rect = (shellContainer || wheel).getBoundingClientRect();
      const globe = shellContainer?._astralShell?.getGeometry?.();
      const clientX = globe ? rect.left + globe.cx : rect.left + rect.width * 0.12;
      const clientY = globe ? rect.top + globe.cy : rect.top + rect.height * 0.5;
      const startRadiusPx = globe ? globe.rPx * 0.72 : Math.min(rect.height, rect.width) * 0.2;
      const opts = {
        clientX,
        clientY,
        startRadiusPx,
        speed: 2.35,
        width: 0.048,
        gain: 2.5,
        duration: 3.2
      };
      if (aeroContainer._aeroShards?.pulseAtClient) {
        aeroContainer._aeroShards.pulseAtClient(clientX, clientY, opts);
      } else {
        aeroContainer.dispatchEvent(new CustomEvent('aero:pulse', { detail: opts }));
      }
    }

    function syncActiveUI(idx, dir) {
      items.forEach((el, i) => {
        const active = i === idx;
        el.classList.toggle('option-wheel__item--selected', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (items[idx]?.id) {
        wheel.setAttribute('aria-activedescendant', items[idx].id);
      }
      cards.forEach((card, i) => {
        const active = i === idx;
        if (active) {
          card.hidden = false;
          card.classList.add('is-active');
        } else {
          card.classList.remove('is-active');
          card.hidden = true;
        }
      });
      if (dir !== 0) {
        shellContainer?._astralShell?.triggerRandomTransition?.(dir, idx);
        emitAeroWave();
      }
    }

    function layoutWheel(currentPos) {
      const tiltRad = (cfg.tilt * Math.PI) / 180;
      const R = cfg.arcR;
      const cx = cfg.cx;

      for (let i = 0; i < n; i += 1) {
        const el = items[i];
        if (!el) continue;
        let d = i - currentPos;
        if (cfg.loop && n > 1) {
          d = ((d % n) + n) % n;
          if (d > n / 2) d -= n;
        }
        const dist = Math.abs(d);
        const ang = clamp(d * tiltRad, -Math.PI * 0.48, Math.PI * 0.48);

        // Place each option directly along the circular rim of the Astral Shell globe
        const x = cx + R * Math.cos(ang);
        const y = R * Math.sin(ang);
        const rot = (ang * 180) / Math.PI;

        const proximity = Math.max(0, 1 - Math.min(dist, 1));
        const scale = 0.94 + proximity * 0.06;
        el.style.transform = `translate3d(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%), 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
        el.style.opacity = String(Math.max(cfg.minOpacity, 1 - dist * cfg.fade));
        el.style.filter = cfg.blur > 0 && !reduced.matches ? `blur(${(dist * cfg.blur).toFixed(2)}px)` : 'none';
        el.style.setProperty('--ow-p', proximity.toFixed(4));
        el.style.zIndex = String(Math.round(100 - dist * 15));
      }
    }

    function runFrame(now) {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      if (reduced.matches) {
        pos = target;
        layoutWheel(pos);
        last = 0;
        return;
      }

      const tau = Math.max(cfg.smoothing, 1) / 1000;
      const k = 1 - Math.exp(-dt / tau);
      let next = pos + (target - pos) * k;
      const settled = Math.abs(target - next) < 0.001;
      if (settled) next = target;
      pos = next;

      layoutWheel(pos);

      if (!settled) {
        raf = requestAnimationFrame(runFrame);
      } else {
        last = 0;
      }
    }

    function startLoop() {
      if (raf) cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(runFrame);
    }

    function applyTarget(value, snap) {
      let v = value;
      if (!cfg.loop) v = clamp(v, 0, Math.max(n - 1, 0));
      if (snap) v = Math.round(v);
      const delta = v - target;
      target = v;
      if (Math.abs(delta) > 0.01) {
        shellContainer?._astralShell?.nudgeSpin?.(delta);
      }
      const idx = mod(Math.round(v), n);
      if (idx !== selectedIndex) {
        const dir = delta >= 0 ? 1 : -1;
        selectedIndex = idx;
        syncActiveUI(idx, dir);
      }
      startLoop();
    }

    wheel.addEventListener(
      'wheel',
      e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
        const step = clamp(delta / cfg.rowH, -1, 1);
        applyTarget(target + step, false);
        if (wheelTimer) clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(() => applyTarget(target, true), 140);
      },
      { passive: false }
    );

    wheel.addEventListener('pointerdown', e => {
      if (!cfg.draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { y: e.clientY, start: target, id: e.pointerId };
      dragMoved = false;
      wheel.classList.add('option-wheel--dragging');
    });

    wheel.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      if (!dragMoved && Math.abs(dy) > 4) {
        dragMoved = true;
        try {
          wheel.setPointerCapture(drag.id);
        } catch {}
      }
      if (dragMoved) {
        applyTarget(drag.start - dy / cfg.rowH, false);
      }
    });

    const endPointer = e => {
      if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
      const id = drag.id;
      drag = null;
      wheel.classList.remove('option-wheel--dragging');
      try {
        if (wheel.hasPointerCapture?.(id)) wheel.releasePointerCapture(id);
      } catch {}
      if (dragMoved) {
        applyTarget(target, true);
        window.setTimeout(() => {
          dragMoved = false;
        }, 60);
      }
    };

    wheel.addEventListener('pointerup', endPointer);
    wheel.addEventListener('pointercancel', endPointer);
    wheel.addEventListener('lostpointercapture', endPointer);

    items.forEach((el, index) => {
      el.addEventListener('click', e => {
        if (dragMoved) {
          e.preventDefault();
          return;
        }
        let d = index - mod(target, n);
        if (cfg.loop && n > 1) {
          if (d > n / 2) d -= n;
          else if (d < -n / 2) d += n;
        }
        if (Math.abs(d) < 0.05) {
          // Even clicking the already-selected item triggers a gentle constellation pulse and outward wave
          shellContainer?._astralShell?.triggerRandomTransition?.(1, selectedIndex);
          emitAeroWave();
          return;
        }
        applyTarget(target + d, true);
      });
    });

    wheel.addEventListener('keydown', e => {
      let delta = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
      if (delta === null) return;
      e.preventDefault();
      e.stopPropagation();
      applyTarget(Math.round(target) + delta, true);
    });

    prevBtn?.addEventListener('click', () => {
      applyTarget(Math.round(target) - 1, true);
    });
    nextBtn?.addEventListener('click', () => {
      applyTarget(Math.round(target) + 1, true);
    });

    const refresh = () => {
      updateMetrics();
      layoutWheel(pos);
    };

    shellContainer?.addEventListener('astral:resize', refresh);
    if ('ResizeObserver' in window) {
      new ResizeObserver(refresh).observe(wheel);
    }
    window.addEventListener('resize', refresh, { passive: true });
    reduced.addEventListener?.('change', refresh);
    mobile.addEventListener?.('change', refresh);

    section.classList.add('is-enhanced');
    updateMetrics();
    syncActiveUI(selectedIndex, 0);
    layoutWheel(pos);
  });
})();
