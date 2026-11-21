/*
 * Tactile 3D Elevated Surface & Animated List / Grid Physics Engine.
 * Adapted from React Bits Animated List by David Haz (https://reactbits.dev/c/components/animated-list).
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 * 2D gliding selection indicator (x, y, w, h) and progressive enhancement for Jekyll static HTML are site-specific.
 */
(() => {
  'use strict';

  if (!window.requestAnimationFrame) return;

  const SPRING =
    'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

  const HIDDEN = {
    pop: {
      above: 'translate3d(0, -12px, 0) scale(0.84)',
      below: 'translate3d(0, 12px, 0) scale(0.84)'
    },
    slide: {
      above: 'translate3d(0, -24px, 0) scale(0.97)',
      below: 'translate3d(0, 24px, 0) scale(0.97)'
    },
    fade: {
      above: 'translate3d(0, -4px, 0)',
      below: 'translate3d(0, 4px, 0)'
    }
  };

  const TARGET_GROUPS = [
    {
      container: '.blog-hub',
      item: '.blog-hub-card',
      lead: '.bh-icon',
      animation: 'pop',
      stagger: 0.05,
      framed: true
    },
    {
      container: '.resource-hub',
      item: '.resource-category-card',
      lead: '.rc-icon',
      animation: 'pop',
      stagger: 0.045,
      framed: true
    },
    {
      container: '.home-process',
      item: '.home-process__step',
      lead: '.home-process__num',
      animation: 'pop',
      stagger: 0.07,
      framed: true
    }
  ];

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsLinear =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('transition-timing-function', 'linear(0, 1)');

  function getSpringTransition() {
    const ease = supportsLinear ? SPRING : 'cubic-bezier(0.34, 1.4, 0.64, 1)';
    return `transform 620ms ${ease}, opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease, box-shadow 220ms ease`;
  }

  function enhanceContainer(container, cfg) {
    if (!container || container.dataset.alEnhanced === 'true') return;
    const items = [...container.querySelectorAll(cfg.item)];
    if (!items.length) return;

    container.dataset.alEnhanced = 'true';
    container.classList.add('al-surface-group');
    if (cfg.framed) {
      container.classList.add('al-surface-group--framed');
      if (!container.querySelector(':scope > .al-frame-rim')) {
        const frameRim = document.createElement('span');
        frameRim.className = 'al-frame-rim';
        frameRim.setAttribute('aria-hidden', 'true');
        container.appendChild(frameRim);
      }
    }

    items.forEach((item, idx) => {
      item.classList.add('al-tile');
      item.dataset.alIndex = String(idx);
      if (cfg.lead) {
        const lead = item.querySelector(cfg.lead);
        if (lead) lead.classList.add('al-well');
      }
      if (!item.querySelector(':scope > .al-tile__rim')) {
        const rim = document.createElement('span');
        rim.className = 'al-tile__rim';
        rim.setAttribute('aria-hidden', 'true');
        item.appendChild(rim);
      }
    });

    const indicator = document.createElement('span');
    indicator.className = 'al-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    const ring = document.createElement('span');
    ring.className = 'al-indicator__ring';
    indicator.appendChild(ring);
    container.appendChild(indicator);

    const motion = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      vx: 0,
      vy: 0,
      vw: 0,
      vh: 0,
      tx: 0,
      ty: 0,
      tw: 0,
      th: 0,
      ready: false
    };

    let activeItem = null;
    let hoveredItem = null;
    let raf = 0;
    let last = 0;
    let entered = false;

    function getPinnedItem() {
      return (
        items.find(
          el =>
            el.getAttribute('aria-current') === 'true' ||
            el.getAttribute('aria-current') === 'page' ||
            el.classList.contains('active') ||
            el.hasAttribute('data-al-pinned')
        ) || null
      );
    }

    function writeIndicator() {
      indicator.style.transform = `translate3d(${motion.x.toFixed(2)}px, ${motion.y.toFixed(2)}px, 0)`;
      indicator.style.width = `${Math.max(0, motion.w).toFixed(2)}px`;
      indicator.style.height = `${Math.max(0, motion.h).toFixed(2)}px`;
    }

    function stepSpring(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const omega = 30;
      const zeta = 0.78;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;

      for (let i = 0; i < steps; i++) {
        motion.vx += (omega * omega * (motion.tx - motion.x) - 2 * zeta * omega * motion.vx) * h;
        motion.vy += (omega * omega * (motion.ty - motion.y) - 2 * zeta * omega * motion.vy) * h;
        motion.vw += (omega * omega * (motion.tw - motion.w) - 2 * zeta * omega * motion.vw) * h;
        motion.vh += (omega * omega * (motion.th - motion.h) - 2 * zeta * omega * motion.vh) * h;

        motion.x += motion.vx * h;
        motion.y += motion.vy * h;
        motion.w += motion.vw * h;
        motion.h += motion.vh * h;
      }

      const moving =
        Math.abs(motion.tx - motion.x) > 0.08 ||
        Math.abs(motion.ty - motion.y) > 0.08 ||
        Math.abs(motion.tw - motion.w) > 0.08 ||
        Math.abs(motion.th - motion.h) > 0.08 ||
        Math.abs(motion.vx) + Math.abs(motion.vy) + Math.abs(motion.vw) + Math.abs(motion.vh) > 0.6;

      if (!moving) {
        motion.x = motion.tx;
        motion.y = motion.ty;
        motion.w = motion.tw;
        motion.h = motion.th;
        motion.vx = motion.vy = motion.vw = motion.vh = 0;
      }

      writeIndicator();
      if (moving) raf = requestAnimationFrame(stepSpring);
    }

    function measureItemBox(target) {
      const cRect = container.getBoundingClientRect();
      const iRect = target.getBoundingClientRect();
      if (!cRect.width || !cRect.height || !iRect.width || !iRect.height) {
        return {
          x: target.offsetLeft,
          y: target.offsetTop,
          w: target.offsetWidth,
          h: target.offsetHeight
        };
      }
      return {
        x: iRect.left - cRect.left + container.scrollLeft,
        y: iRect.top - cRect.top + container.scrollTop,
        w: iRect.width,
        h: iRect.height
      };
    }

    function placeIndicator(target, snap = false) {
      items.forEach(el => {
        if (el === target) el.setAttribute('data-al-selected', '');
        else el.removeAttribute('data-al-selected');
      });
      activeItem = target;

      if (!target || target.hidden || target.offsetParent === null) {
        indicator.style.opacity = '0';
        motion.ready = false;
        return;
      }

      const box = measureItemBox(target);
      if (!box.w || !box.h) {
        indicator.style.opacity = '0';
        motion.ready = false;
        return;
      }

      const computedRadius = getComputedStyle(target).borderRadius;
      if (computedRadius) ring.style.borderRadius = computedRadius;

      motion.tx = box.x;
      motion.ty = box.y;
      motion.tw = box.w;
      motion.th = box.h;
      indicator.style.opacity = '1';

      if (snap || reducedQuery.matches || !motion.ready) {
        motion.x = motion.tx;
        motion.y = motion.ty;
        motion.w = motion.tw;
        motion.h = motion.th;
        motion.vx = motion.vy = motion.vw = motion.vh = 0;
        motion.ready = true;
        writeIndicator();
        return;
      }

      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(stepSpring);
      }
    }

    function applyPose(el, state) {
      el.dataset.alState = state;
      const mode = reducedQuery.matches ? 'none' : cfg.animation;
      const pose = mode !== 'none' && state !== 'in' && HIDDEN[mode] ? HIDDEN[mode][state] : '';
      el.style.transform = pose;
      el.style.opacity = pose ? '0' : '';
    }

    function primeEntrance(direction = 'below') {
      if (reducedQuery.matches) {
        items.forEach(item => {
          item.style.transition = '';
          item.style.transitionDelay = '';
          applyPose(item, 'in');
        });
        return;
      }
      items.forEach(item => {
        item.style.transition = 'none';
        item.style.transitionDelay = '0s';
        applyPose(item, direction);
      });
      void container.offsetHeight;
    }

    function playEntrance() {
      entered = true;
      if (reducedQuery.matches) {
        items.forEach(item => {
          item.style.transition = '';
          item.style.transitionDelay = '';
          applyPose(item, 'in');
        });
        placeIndicator(hoveredItem || getPinnedItem(), true);
        return;
      }

      const transition = getSpringTransition();
      let visibleOrder = 0;
      items.forEach(item => {
        item.style.transition = transition;
        const delay = (visibleOrder++ * cfg.stagger).toFixed(3);
        item.style.transitionDelay = `${delay}s, ${delay}s, 0s, 0s`;
        applyPose(item, 'in');
      });

      const longestMs = Math.round((items.length * cfg.stagger + 0.65) * 1000);
      window.setTimeout(() => {
        items.forEach(item => {
          if (item.dataset.alState === 'in') {
            item.style.transitionDelay = '';
          }
        });
        placeIndicator(hoveredItem || getPinnedItem(), true);
      }, longestMs);
    }

    items.forEach(item => {
      item.addEventListener('pointerenter', e => {
        if (e.pointerType === 'touch') return;
        hoveredItem = item;
        placeIndicator(item, false);
      });
      item.addEventListener('focus', () => {
        hoveredItem = item;
        placeIndicator(item, false);
      });
      item.addEventListener('click', () => {
        if (container.classList.contains('blog-hub') || container.classList.contains('resource-hub')) {
          items.forEach(el => el.removeAttribute('data-al-pinned'));
          item.setAttribute('data-al-pinned', '');
          placeIndicator(item, false);
        }
      });
    });

    container.addEventListener('pointerleave', () => {
      hoveredItem = null;
      placeIndicator(getPinnedItem(), false);
    });

    container.addEventListener('focusout', e => {
      if (!container.contains(e.relatedTarget)) {
        hoveredItem = null;
        placeIndicator(getPinnedItem(), false);
      }
    });

    const attrObserver = new MutationObserver(() => {
      if (!hoveredItem) {
        placeIndicator(getPinnedItem(), false);
      }
    });
    items.forEach(item => {
      attrObserver.observe(item, {
        attributes: true,
        attributeFilter: ['aria-current', 'class']
      });
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        if (activeItem) placeIndicator(activeItem, true);
      });
      ro.observe(container);
    }

    if ('IntersectionObserver' in window && !reducedQuery.matches) {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight || 720;
      const initiallyVisible = rect.top < vh * 0.92 && rect.bottom > 0;
      primeEntrance('below');

      if (initiallyVisible) {
        requestAnimationFrame(() => {
          playEntrance();
          placeIndicator(getPinnedItem(), true);
        });
      } else {
        const io = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting && !entered) {
                playEntrance();
                placeIndicator(getPinnedItem(), true);
              } else if (!entry.isIntersecting && entry.intersectionRatio === 0 && entered) {
                entered = false;
                const b = entry.boundingClientRect;
                primeEntrance(b.top < 0 ? 'above' : 'below');
              }
            });
          },
          { threshold: [0, 0.15], rootMargin: '0px 0px -6% 0px' }
        );
        io.observe(container);
      }
    } else {
      items.forEach(item => applyPose(item, 'in'));
      placeIndicator(getPinnedItem(), true);
    }
  }

  function initAll() {
    TARGET_GROUPS.forEach(cfg => {
      document.querySelectorAll(cfg.container).forEach(container => {
        enhanceContainer(container, cfg);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
