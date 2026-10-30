/* Enhance published articles without changing their text or heading IDs. */
(function () {
  'use strict';
  const reader = document.querySelector('[data-reader]');
  if (!reader) return;
  const content = reader.querySelector('.page__content');
  const toc = reader.querySelector('.reader-toc');
  const list = toc.querySelector('.reader-toc__list');
  const labels = new WeakMap();
  const copyButtons = [];
  const desktop = window.matchMedia('(min-width: 1180px)');
  let observer;
  const isEnglish = () => document.documentElement.dataset.lang === 'en';

  content.querySelectorAll('h2,h3').forEach(heading => {
    labels.set(heading, heading.textContent.replace(/\s+/g, ' ').trim());
  });

  function buildToc() {
    if (observer) observer.disconnect();
    list.replaceChildren();
    const headings = [...content.querySelectorAll('h2[id],h3[id]')].filter(heading => heading.getClientRects().length && !/^(mục lục|table of contents)$/i.test(labels.get(heading)));
    toc.hidden = headings.length < 3;
    reader.classList.toggle('has-reader-toc', !toc.hidden);
    if (toc.hidden) return;
    headings.forEach(heading => {
      const item = document.createElement('li');
      if (heading.tagName === 'H3') item.className = 'reader-toc__sub';
      const link = document.createElement('a');
      link.href = '#' + encodeURIComponent(heading.id);
      link.textContent = labels.get(heading) || heading.textContent;
      link.addEventListener('click', () => { if (!desktop.matches) toc.open = false; });
      item.append(link);
      list.append(item);
    });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.isIntersecting);
        if (!entry) return;
        list.querySelectorAll('a').forEach(link => {
          if (decodeURIComponent(link.hash.slice(1)) === entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }, { rootMargin: '-90px 0px -65% 0px' });
      headings.forEach(heading => observer.observe(heading));
    }
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch (_) { /* Try the selection fallback. */ }
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }

  content.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code || /language-(mermaid|plotly)/.test(code.className) || pre.closest('[hidden],.hidden')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-tools';
    pre.before(wrapper);
    wrapper.append(pre);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.setAttribute('aria-live', 'polite');
    button.textContent = isEnglish() ? 'Copy code' : 'Sao chép code';
    button.addEventListener('click', async () => {
      try {
        await writeClipboard(code.textContent);
        button.textContent = isEnglish() ? 'Copied' : 'Đã sao chép';
      } catch (_) {
        button.textContent = isEnglish() ? 'Select code to copy' : 'Chọn code để sao chép';
      }
      button.focus({ preventScroll: true });
      window.setTimeout(() => { button.textContent = isEnglish() ? 'Copy code' : 'Sao chép code'; }, 2000);
    });
    wrapper.prepend(button);
    copyButtons.push(button);
  });

  toc.open = desktop.matches;
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !reader.contains(link) || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const href = link.getAttribute('href');
    if (!href.startsWith('#') || href.length === 1) return;
    let id;
    try { id = decodeURIComponent(href.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (toc.contains(link) && !desktop.matches) toc.open = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    const url = new URL(location.href);
    url.hash = id;
    history.pushState(null, '', url);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, true);
  desktop.addEventListener('change', () => { toc.open = desktop.matches; });
  buildToc();
  new MutationObserver(() => {
    buildToc();
    copyButtons.forEach(button => { button.textContent = isEnglish() ? 'Copy code' : 'Sao chép code'; });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
})();
