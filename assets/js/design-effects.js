/* Progressive enhancement: the page stays readable without JS or observers. */
(function () {
  'use strict';
  const showcaseStages = [
    document.querySelector('.home-hero'),
    document.getElementById('about-me'),
    document.getElementById('selected-work'),
    document.getElementById('achievements')
  ].filter(Boolean);
  const sections = [...document.querySelectorAll('[data-reveal]')].filter(
    section => !section.closest('.home-hero, #about-me, .home-work-stage, #achievements')
  );
  const taglines = [...document.querySelectorAll('[data-word-reveal]')];
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sectionObserver;
  let wordObserver;
  let stageObserver;

  function primeStage(stage) {
    if (!stage) return;
    stage.classList.add('stage-anim-ready', 'is-stage-primed');
    stage.classList.remove('is-stage-entered');
  }

  function enterStage(stage, fromEvent = false) {
    if (!stage) return;
    const now = performance.now();
    const isPrimed = stage.classList.contains('is-stage-primed');
    if (!isPrimed && now - (stage._lastStageEnter || 0) < 800) return;
    if (isPrimed) void stage.offsetWidth;
    stage.classList.add('stage-anim-ready', 'is-stage-entered');
    stage.classList.remove('is-stage-primed');
    stage._lastStageEnter = now;
    if (!fromEvent) stage.dispatchEvent(new CustomEvent('section:enter', { bubbles: true }));
  }

  function showEverything() {
    sectionObserver?.disconnect();
    wordObserver?.disconnect();
    stageObserver?.disconnect();
    showcaseStages.forEach(stage => {
      stage.classList.remove('is-stage-primed');
      stage.classList.add('is-stage-entered');
    });
    sections.forEach(section => section.classList.add('is-revealed'));
    document.querySelectorAll('.word-reveal__word').forEach(word => word.classList.add('is-revealed'));
  }

  showcaseStages.forEach(stage => {
    stage.addEventListener('section:prepare', () => {
      if (!preference.matches) primeStage(stage);
    });
    stage.addEventListener('section:enter', () => {
      if (!preference.matches) enterStage(stage, true);
    });
  });

  if (!preference.matches && 'IntersectionObserver' in window) {
    try {
      const vh = window.innerHeight || 720;
      stageObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const stage = entry.target;
          if (!entry.isIntersecting && entry.intersectionRatio === 0) {
            primeStage(stage);
            stage.dispatchEvent(new CustomEvent('section:prepare', { bubbles: true }));
          } else if (entry.isIntersecting && entry.intersectionRatio >= .2 && stage.classList.contains('is-stage-primed')) {
            enterStage(stage, false);
          }
        });
      }, { threshold: [0, .2] });

      showcaseStages.forEach(stage => {
        const rect = stage.getBoundingClientRect();
        const inView = rect.top < vh * .85 && rect.bottom > vh * .15;
        stage.classList.add('stage-anim-ready');
        if (inView) stage.classList.add('is-stage-entered');
        else stage.classList.add('is-stage-primed');
        stageObserver.observe(stage);
      });

      sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          sectionObserver.unobserve(entry.target);
        });
      }, { threshold: .08 });
      sections.forEach(section => {
        sectionObserver.observe(section);
        section.classList.add('reveal-ready');
      });

      wordObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          wordObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -15% 0px', threshold: .5 });

      taglines.forEach(tagline => {
        const walker = document.createTreeWalker(tagline, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        let index = 0;
        nodes.forEach(node => {
          const fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(token => {
            if (!token || /^\s+$/.test(token)) {
              fragment.append(document.createTextNode(token));
              return;
            }
            const word = document.createElement('span');
            word.className = 'word-reveal__word';
            word.textContent = token;
            word.style.transitionDelay = Math.min(index++ * 40, 600) + 'ms';
            fragment.append(word);
          });
          node.replaceWith(fragment);
        });
        tagline.querySelectorAll('.word-reveal__word').forEach(word => wordObserver.observe(word));
      });
    } catch (_) {
      showEverything();
    }
  }

  if (preference.addEventListener) preference.addEventListener('change', () => {
    if (preference.matches) showEverything();
  });
  window.addEventListener('beforeprint', showEverything);

  // A keyboard user can focus a section before its intersection callback runs.
  document.addEventListener('focusin', event => {
    const stage = event.target.closest?.('.stage-anim-ready.is-stage-primed');
    if (stage) enterStage(stage, false);
    const section = event.target.closest?.('[data-reveal]');
    if (section) section.classList.add('is-revealed');
  });

  document.addEventListener('click', event => {
    const link = event.target.closest?.('.home a[href^="#"]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const isStage = showcaseStages.includes(target);
    if (isStage && !preference.matches) target.dispatchEvent(new CustomEvent('section:prepare', { bubbles: true }));
    target.scrollIntoView({ behavior: preference.matches ? 'auto' : 'smooth', block: 'start' });
    if (isStage && !preference.matches) window.setTimeout(() => enterStage(target, false), 220);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.pushState(null, '', link.hash);
  }, true);
  // Automatically load the ReactBits Animated List 3D tactile cards & gliding ring engine across all pages.
  if (!document.querySelector('script[src*="animated-tactile-cards.js"]')) {
    const tactileScript = document.createElement('script');
    tactileScript.src = '/assets/js/animated-tactile-cards.js?v=2';
    tactileScript.defer = true;
    document.head.appendChild(tactileScript);
  }
})();
