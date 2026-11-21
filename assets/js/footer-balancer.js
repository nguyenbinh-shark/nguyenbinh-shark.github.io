/* Single fixed treadmill-running wheel-legged robot + hero launch button:
 * any downward scroll gesture on the hero (button, wheel, PageDown, ArrowDown,
 * Space or swipe) sprints the robot into the light beam, dissolves it, and
 * smoothly snaps down to the next full section without stopping halfway. */
(() => {
  'use strict';
  const stage = document.querySelector('[data-footer-balancer]');
  if (!stage || !window.requestAnimationFrame) return;
  const vehicle = stage.querySelector('[data-balance-vehicle]');
  const body = vehicle?.querySelector('[data-balance-body]');
  if (!vehicle || !body) return;
  const wheels = [...vehicle.querySelectorAll('[data-balance-wheel]')];
  const beltTrack = stage.querySelector('[data-balance-belt-track]');
  const portal = stage.querySelector('[data-balance-portal]');
  const launchBtn = stage.querySelector('[data-balance-launch]');
  const hero = stage.closest('.home-hero');
  const pivot = vehicle.dataset.balancePivot || '84 102';
  const tire = Number(vehicle.dataset.balanceRadius) || 20;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const mobile = window.matchMedia('(pointer: coarse), (max-width: 767px)');
  const BELT_SPEED = -42;
  const BELT_PITCH = 24;
  const SWAY_AMP = 5;
  const SWAY_FREQ = 1.4;
  const LAUNCH_DURATION = .72;
  const DISSOLVE_START = .68;
  const SCROLL_START = .82;
  const SCROLL_DURATION = 650;
  const COOLDOWN_MS = 450;
  const RETURN_DURATION = .35;
  const BLOCKED_SELECTOR = '.site-search, #site-nav .hidden-links, [data-option-wheel], [role="dialog"], input, textarea, select, [contenteditable]';
  const INTERACTIVE_SELECTOR = 'a, button, summary, [role="button"], [role="listbox"], [tabindex]:not(#main):not(#about-me):not(#selected-work):not(#achievements)';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  let geometry;
  let mode = 'idle';
  let elapsed = 0;
  let beltTravel = 0;
  let wheelRad = 0;
  let currentX = 0;
  let launchTime = 0;
  let launchStartX = 0;
  let returnTime = 0;
  let scrollTriggered = false;
  let cooldownUntil = 0;
  let touchStartY = null;
  let touchStartX = null;
  let raf = 0;
  let last = null;
  let lastDraw = 0;
  let scrollRaf = 0;
  let printing = false;
  let visible = !('IntersectionObserver' in window);
  let state = { x: 0, lean: 0, wheel: 0, belt: 0, opacity: 1, scaleX: 1, scaleY: 1, brightness: 1, portal: 0 };

  function moving() {
    return visible && !document.hidden && !printing && !reduced.matches && mode !== 'vanished';
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = null;
  }
  function wake() {
    if (geometry && moving() && !raf) raf = requestAnimationFrame(frame);
  }

  function startReturn() {
    if (!geometry) return;
    mode = 'returning';
    returnTime = 0;
    currentX = geometry.idleX;
    scrollTriggered = false;
    launchBtn?.classList.remove('is-launching');
    wake();
  }

  function maybeReturnOnHero() {
    if (mode !== 'vanished' || scrollRaf) return;
    const heroHeight = hero?.offsetHeight || 600;
    const y = window.scrollY ?? window.pageYOffset ?? 0;
    if (y < heroHeight * .45) startReturn();
  }

  function sectionTop(el) {
    const y = window.scrollY ?? window.pageYOffset ?? 0;
    return Math.max(0, Math.round(el.getBoundingClientRect().top + y));
  }

  function focusTarget(target) {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function smoothScrollTo(endY, targetEl) {
    if (reduced.matches) {
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        focusTarget(targetEl);
      } else {
        window.scrollTo(0, endY);
      }
      launchBtn?.classList.remove('is-launching');
      if (endY === 0 && mode === 'vanished') startReturn();
      return;
    }

    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    }
    const startY = window.scrollY ?? window.pageYOffset ?? 0;
    const startAt = performance.now();
    let entered = false;
    if (targetEl) targetEl.dispatchEvent(new CustomEvent('section:prepare', { bubbles: true }));

    const tick = now => {
      const t = clamp((now - startAt) / SCROLL_DURATION, 0, 1);
      const ease = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, startY + (endY - startY) * ease);
      if (targetEl && !entered && t >= .25) {
        entered = true;
        targetEl.dispatchEvent(new CustomEvent('section:enter', { bubbles: true }));
      }
      if (t < 1) {
        scrollRaf = requestAnimationFrame(tick);
        return;
      }
      scrollRaf = 0;
      cooldownUntil = performance.now() + COOLDOWN_MS;
      if (targetEl) {
        if (!entered) {
          entered = true;
          targetEl.dispatchEvent(new CustomEvent('section:enter', { bubbles: true }));
        }
        focusTarget(targetEl);
      }
      launchBtn?.classList.remove('is-launching');
      if (endY === 0 && mode === 'vanished') startReturn();
    };
    scrollRaf = requestAnimationFrame(tick);
  }

  function smoothScrollNext() {
    const target = document.getElementById('about-me') || hero?.nextElementSibling;
    if (!target) {
      startReturn();
      return;
    }
    smoothScrollTo(sectionTop(target), target);
  }

  function isBlockedTarget(node) {
    const el = node && node.nodeType === 1 ? node : null;
    if (el?.closest?.(BLOCKED_SELECTOR)) return true;
    return Boolean(document.querySelector('.site-search.is-open, #site-nav .hidden-links:not(.hidden)'));
  }

  function isTransitionLocked() {
    return mode === 'launch' || scrollRaf !== 0 || performance.now() < cooldownUntil;
  }

  function trySectionTransition(dir) {
    if (reduced.matches || !hero) return false;
    const about = document.getElementById('about-me') || hero.nextElementSibling;
    if (!about) return false;
    const work = document.getElementById('selected-work');
    const achievements = document.getElementById('achievements');
    const y = window.scrollY ?? window.pageYOffset ?? 0;
    const aboutTop = sectionTop(about);
    const workTop = work ? sectionTop(work) : 0;
    const achievementsTop = achievements ? sectionTop(achievements) : 0;
    const vh = window.innerHeight || 720;
    const aboutFits = (about.offsetHeight || about.getBoundingClientRect().height || vh) <= vh + 32;
    const workFits = work ? (work.offsetHeight || work.getBoundingClientRect().height || vh) <= vh + 32 : false;
    const maxManagedTop = achievements && workFits ? achievementsTop : work && aboutFits ? workTop : aboutTop;

    if (isTransitionLocked()) {
      return y < maxManagedTop + 48;
    }

    if (dir > 0) {
      if (y < aboutTop - 24) {
        launch();
        return true;
      }
      if (y >= aboutTop - 24 && y <= aboutTop + 48 && aboutFits && work) {
        smoothScrollTo(workTop, work);
        return true;
      }
      if (work && y >= workTop - 24 && y <= workTop + 48 && workFits && achievements) {
        smoothScrollTo(achievementsTop, achievements);
        return true;
      }
      return false;
    }

    if (y > 8 && y <= aboutTop + 48) {
      smoothScrollTo(0, hero);
      return true;
    }
    if (work && aboutFits && y >= workTop - 48 && y <= workTop + 48) {
      smoothScrollTo(aboutTop, about);
      return true;
    }
    if (achievements && workFits && y >= achievementsTop - 48 && y <= achievementsTop + 48) {
      smoothScrollTo(workTop, work);
      return true;
    }
    return false;
  }

  function step(dt) {
    if (!geometry) return;
    if (reduced.matches) {
      mode = 'idle';
      currentX = geometry.idleX;
      state = { x: currentX, lean: 0, wheel: wheelRad * 180 / Math.PI, belt: 0, opacity: 1, scaleX: 1, scaleY: 1, brightness: 1, portal: 0 };
      return;
    }

    let lean = 0, opacity = 1, scaleX = 1, scaleY = 1, brightness = 1, portalOpacity = 0;

    if (mode === 'idle') {
      elapsed += dt;
      beltTravel += BELT_SPEED * dt;
      const nextX = geometry.idleX + Math.sin(elapsed * SWAY_FREQ) * SWAY_AMP;
      const dx = nextX - currentX;
      currentX = nextX;
      wheelRad += (dx - BELT_SPEED * dt) / geometry.radius;
      lean = clamp(2.4 + Math.cos(elapsed * SWAY_FREQ) * .9 + Math.sin(elapsed * 3.5) * .55, -10, 10);
    } else if (mode === 'launch') {
      launchTime = Math.min(LAUNCH_DURATION, launchTime + dt);
      const u = launchTime / LAUNCH_DURATION;
      const s = Math.min(1, u / .84);
      const p = s * s * (2.3 - 1.3 * s);
      const nextX = launchStartX + (geometry.targetX - launchStartX) * p;
      const dx = nextX - currentX;
      currentX = nextX;
      beltTravel += BELT_SPEED * dt;
      wheelRad += (dx - BELT_SPEED * dt) / geometry.radius;
      lean = clamp(2.4 + Math.sin(s * Math.PI) * 6.8, -10, 10);

      if (u >= DISSOLVE_START) {
        const v = (u - DISSOLVE_START) / (1 - DISSOLVE_START);
        opacity = Math.max(0, 1 - v * v);
        scaleX = 1 - .55 * v;
        scaleY = 1 + .14 * v;
        brightness = 1 + 1.8 * v;
        portalOpacity = Math.sin(v * Math.PI) * .95;
      }
      if (u >= SCROLL_START && !scrollTriggered) {
        scrollTriggered = true;
        smoothScrollNext();
      }
      if (u >= 1) {
        mode = 'vanished';
        opacity = 0;
        portalOpacity = 0;
      }
    } else if (mode === 'returning') {
      elapsed += dt;
      beltTravel += BELT_SPEED * dt;
      returnTime = Math.min(RETURN_DURATION, returnTime + dt);
      const nextX = geometry.idleX + Math.sin(elapsed * SWAY_FREQ) * SWAY_AMP;
      const dx = nextX - currentX;
      currentX = nextX;
      wheelRad += (dx - BELT_SPEED * dt) / geometry.radius;
      lean = clamp(2.4 + Math.cos(elapsed * SWAY_FREQ) * .9 + Math.sin(elapsed * 3.5) * .55, -10, 10);
      opacity = returnTime / RETURN_DURATION;
      if (returnTime >= RETURN_DURATION) {
        mode = 'idle';
        opacity = 1;
      }
    } else {
      opacity = 0;
    }

    const belt = (((beltTravel % BELT_PITCH) + BELT_PITCH) % BELT_PITCH) - BELT_PITCH;
    state = { x: currentX, lean, wheel: wheelRad * 180 / Math.PI, belt, opacity, scaleX, scaleY, brightness, portal: portalOpacity };
  }

  function draw() {
    if (!geometry) return;
    if (beltTrack) beltTrack.style.transform = `translate3d(${state.belt.toFixed(3)}px,0,0)`;
    vehicle.style.transform = `translate3d(${state.x.toFixed(3)}px,0,0) scale(${state.scaleX.toFixed(3)},${state.scaleY.toFixed(3)})`;
    vehicle.style.opacity = state.opacity.toFixed(3);
    vehicle.style.filter = !mobile.matches && state.brightness > 1.01 ? `brightness(${state.brightness.toFixed(2)})` : '';
    body.setAttribute('transform', `rotate(${state.lean.toFixed(3)} ${pivot})`);
    wheels.forEach(wheel => wheel.setAttribute('transform', `rotate(${state.wheel.toFixed(3)})`));
    if (portal) {
      portal.style.opacity = state.portal.toFixed(3);
      portal.style.transform = `translateX(-50%) scaleX(${(.7 + state.portal * .65).toFixed(3)})`;
    }
  }

  function launch() {
    if (!geometry) return;
    if (reduced.matches) {
      smoothScrollNext();
      return;
    }
    if (mode !== 'idle' && mode !== 'returning') return;
    mode = 'launch';
    launchTime = 0;
    launchStartX = currentX;
    scrollTriggered = false;
    launchBtn?.classList.add('is-launching');
    wake();
  }

  function measure() {
    const stageRect = stage.getBoundingClientRect();
    const width = stageRect.width;
    const size = vehicle.getBoundingClientRect().width;
    if (!width || !size) return;

    const copyRect = hero?.querySelector('.home-hero__copy')?.getBoundingClientRect();
    const anchorLeft = copyRect && copyRect.width
      ? Math.max(16, copyRect.left - stageRect.left)
      : Math.max(width <= 767 ? 16 : 24, (width - 1200) / 2);
    const btnWidth = launchBtn ? (launchBtn.getBoundingClientRect().width || (width <= 767 ? 114 : 136)) : 0;
    const beamX = width * (coarse.matches ? .9 : .82);
    const idleX = clamp(anchorLeft + (btnWidth ? btnWidth + (width <= 767 ? 14 : 24) : 0), 8, Math.max(8, beamX - size * 1.25));
    const targetX = Math.max(idleX + 24, beamX - size * .46);
    const beltLeft = Math.max(anchorLeft, idleX - 20);
    const beltWidth = Math.max(size + 36, beamX + 28 - beltLeft);

    stage.style.setProperty('--balance-anchor-left', `${anchorLeft.toFixed(1)}px`);
    stage.style.setProperty('--balance-belt-left', `${beltLeft.toFixed(1)}px`);
    stage.style.setProperty('--balance-belt-width', `${beltWidth.toFixed(1)}px`);
    stage.style.setProperty('--balance-beam-x', `${beamX.toFixed(1)}px`);
    stage.style.setProperty('--balance-idle-x', `${idleX.toFixed(1)}px`);

    geometry = { width, size, anchorLeft, idleX, beamX, targetX, radius: size * tire / 144 };
    if (mode === 'idle') {
      currentX = reduced.matches ? idleX : idleX + Math.sin(elapsed * SWAY_FREQ) * SWAY_AMP;
      step(0);
    }
    draw();
    stage.classList.add('is-ready');
    wake();
  }

  function frame(now) {
    raf = 0;
    if (!moving()) { stop(); return; }
    if (mobile.matches && mode === 'idle' && lastDraw && now - lastDraw < 48) {
      wake();
      return;
    }
    const dt = last === null ? 0 : clamp((now - last) / 1000, 0, .05);
    last = lastDraw = now;
    step(dt);
    draw();
    wake();
  }

  function refresh() { stop(); measure(); }

  launchBtn?.addEventListener('click', launch);
  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isBlockedTarget(event.target)) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (!isTransitionLocked() && Math.abs(event.deltaY) < 4) return;
    if (trySectionTransition(event.deltaY > 0 ? 1 : -1)) event.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isBlockedTarget(event.target)) return;
    const el = event.target && event.target.nodeType === 1 ? event.target : null;
    const isInteractive = Boolean(el?.closest?.(INTERACTIVE_SELECTOR));
    let dir = 0;
    if (event.key === 'PageDown') dir = 1;
    else if (event.key === 'PageUp') dir = -1;
    else if (!isInteractive && (event.key === 'ArrowDown' || (event.key === ' ' && !event.shiftKey))) dir = 1;
    else if (!isInteractive && (event.key === 'ArrowUp' || (event.key === ' ' && event.shiftKey))) dir = -1;
    if (dir !== 0 && trySectionTransition(dir)) event.preventDefault();
  });

  if (!mobile.matches) {
    window.addEventListener('touchstart', event => {
      if (event.touches.length !== 1 || isBlockedTarget(event.target)) {
        touchStartY = null;
        return;
      }
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    }, { passive: true });

    window.addEventListener('touchmove', event => {
      if (touchStartY === null || event.touches.length !== 1) return;
      if (isTransitionLocked()) {
        const y = window.scrollY ?? window.pageYOffset ?? 0;
        const about = document.getElementById('about-me') || hero?.nextElementSibling;
        const work = document.getElementById('selected-work');
        const achievements = document.getElementById('achievements');
        const aboutTop = about ? sectionTop(about) : 0;
        const workTop = work ? sectionTop(work) : aboutTop;
        const achievementsTop = achievements ? sectionTop(achievements) : workTop;
        if (y < achievementsTop + 48) event.preventDefault();
        return;
      }
      const dy = touchStartY - event.touches[0].clientY;
      const dx = touchStartX - event.touches[0].clientX;
      if (Math.abs(dy) >= 28 && Math.abs(dy) > Math.abs(dx) * 1.4) {
        if (trySectionTransition(dy > 0 ? 1 : -1)) {
          event.preventDefault();
          touchStartY = null;
        }
      }
    }, { passive: false });
  }

  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('scroll', maybeReturnOnHero, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      if (mode === 'vanished' && !scrollRaf) startReturn();
      wake();
    } else {
      stop();
    }
  }).observe(hero || stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else refresh(); });
  reduced.addEventListener?.('change', refresh);
  coarse.addEventListener?.('change', refresh);
  mobile.addEventListener?.('change', refresh);
  window.addEventListener('pagehide', () => {
    stop();
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('beforeprint', () => {
    printing = true;
    stop();
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
  });
  window.addEventListener('afterprint', () => { printing = false; refresh(); });
  measure();
})();
