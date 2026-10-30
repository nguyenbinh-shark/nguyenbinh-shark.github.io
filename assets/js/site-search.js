/* A shared full-content index is fetched only when search is used. */
(function () {
  'use strict';
  const panels = [...document.querySelectorAll('[data-site-search]')];
  if (!panels.length) return;
  const normalize = value => (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const language = () => document.documentElement.dataset.lang === 'en' ? 'en' : 'vi';
  const decoder = document.createElement('textarea');
  const decode = value => { decoder.innerHTML = value || ''; return decoder.value; };
  const kindLabels = { blog: ['Bài viết', 'Article'], portfolio: ['Dự án', 'Project'], publications: ['Bài báo', 'Publication'], library: ['Tài nguyên', 'Resource'], page: ['Trang', 'Page'] };
  let indexPromise;

  function loadIndex(url) {
    if (!indexPromise) {
      indexPromise = fetch(url).then(response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
      }).then(documents => documents.map(document => {
        const item = { ...document };
        for (const key of ['title', 'title_en', 'description', 'description_en', 'body']) item[key] = decode(item[key]);
        item.normalTitle = normalize(item.title + ' ' + item.title_en);
        item.normalDescription = normalize(item.description + ' ' + item.description_en);
        item.normalTags = normalize(item.tags);
        item.normalBody = normalize(item.body);
        item.allText = item.normalTitle + ' ' + item.normalDescription + ' ' + item.normalTags + ' ' + item.normalBody;
        return item;
      })).catch(error => { indexPromise = null; throw error; });
    }
    return indexPromise;
  }

  function find(documents, query) {
    const normalized = normalize(query.trim());
    const terms = [...new Set(normalized.split(/[\s,]+/).filter(Boolean))];
    if (!terms.length) return [];
    return documents.filter(item => terms.every(term => item.allText.includes(term))).map(item => {
      let score = item.normalTitle.includes(normalized) ? 60 : 0;
      for (const term of terms) {
        if (item.normalTitle.includes(term)) score += 15;
        if (item.normalTags.includes(term)) score += 8;
        if (item.normalDescription.includes(term)) score += 5;
      }
      return { item, score, terms };
    }).sort((a, b) => b.score - a.score || String(b.item.date).localeCompare(String(a.item.date)));
  }

  function snippet(item, terms) {
    const found = terms.map(term => item.normalBody.indexOf(term)).filter(index => index >= 0);
    if (!found.length) return language() === 'en' ? item.description_en : item.description;
    const phrase = item.normalBody.indexOf(terms.join(' '));
    const start = Math.max(0, (phrase >= 0 ? phrase : Math.min(...found)) - 65);
    return (start ? '…' : '') + item.body.slice(start, start + 230) + (start + 230 < item.body.length ? '…' : '');
  }

  function highlight(element, text, terms) {
    const normalized = normalize(text);
    let position = 0;
    while (position < text.length) {
      const hits = terms.map(term => ({ index: normalized.indexOf(term, position), length: term.length })).filter(hit => hit.index >= 0).sort((a, b) => a.index - b.index || b.length - a.length);
      if (!hits.length) { element.append(document.createTextNode(text.slice(position))); break; }
      const hit = hits[0];
      element.append(document.createTextNode(text.slice(position, hit.index)));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(hit.index, hit.index + hit.length);
      element.append(mark);
      position = hit.index + hit.length;
    }
  }

  panels.forEach(panel => {
    const input = panel.querySelector('input[name="q"]');
    const form = panel.querySelector('form');
    const status = panel.querySelector('.site-search-status');
    const results = panel.querySelector('.site-search-results');
    const retry = panel.querySelector('.site-search-retry');
    const allLink = panel.querySelector('.site-search-all');
    const isPage = panel.dataset.searchMode === 'page';
    let ticket = 0;
    let timer;

    function updateUrl(query) {
      if (isPage) {
        const url = new URL(location.href);
        if (query) url.searchParams.set('q', query);
        else url.searchParams.delete('q');
        history.replaceState(null, '', url);
      }
      if (allLink) {
        const url = new URL(allLink.href);
        if (query) url.searchParams.set('q', query);
        else url.searchParams.delete('q');
        allLink.href = url;
      }
    }

    async function search() {
      window.clearTimeout(timer);
      const current = ++ticket;
      const query = input.value.trim();
      updateUrl(query);
      retry.hidden = true;
      if (!query) {
        results.replaceChildren();
        results.setAttribute('aria-busy', 'false');
        status.textContent = language() === 'en' ? "Enter a keyword to search the site's content." : 'Nhập từ khóa để tìm kiếm trong nội dung website.';
        return;
      }
      status.textContent = language() === 'en' ? 'Searching…' : 'Đang tìm kiếm…';
      results.setAttribute('aria-busy', 'true');
      try {
        const documents = await loadIndex(panel.dataset.indexUrl);
        if (current !== ticket) return;
        const matches = find(documents, query);
        const shown = isPage ? matches : matches.slice(0, 6);
        results.replaceChildren();
        for (const match of shown) {
          const row = document.createElement('li');
          row.className = 'site-search-result';
          const kind = document.createElement('span');
          kind.className = 'site-search-result__kind';
          kind.textContent = (kindLabels[match.item.kind] || kindLabels.page)[language() === 'en' ? 1 : 0];
          const link = document.createElement('a');
          link.href = match.item.url;
          link.textContent = language() === 'en' ? match.item.title_en : match.item.title;
          const excerpt = document.createElement('p');
          highlight(excerpt, snippet(match.item, match.terms), match.terms);
          row.append(kind, link, excerpt);
          results.append(row);
        }
        status.textContent = matches.length
          ? (language() === 'en' ? matches.length + ' results' : matches.length + ' kết quả')
          : (language() === 'en' ? 'No results. Try a shorter query or another term.' : 'Không có kết quả. Thử từ khóa ngắn hơn hoặc từ khác.');
        results.setAttribute('aria-busy', 'false');
      } catch (_) {
        if (current !== ticket) return;
        status.textContent = language() === 'en' ? 'Could not load search. Please try again.' : 'Chưa tải được tìm kiếm. Vui lòng thử lại.';
        results.replaceChildren();
        results.setAttribute('aria-busy', 'false');
        retry.hidden = false;
      }
    }

    form.addEventListener('submit', event => { event.preventDefault(); search(); });
    input.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(search, 150); });
    retry.addEventListener('click', search);
    panel.querySelectorAll('[data-search-example]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.searchExample; search(); input.focus(); }));
    new MutationObserver(() => { if (isPage || panel.open) search(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
    if (isPage) {
      input.value = new URLSearchParams(location.search).get('q') || '';
      search();
      window.addEventListener('popstate', () => { input.value = new URLSearchParams(location.search).get('q') || ''; search(); });
    } else {
      const open = () => {
        if (typeof panel.showModal !== 'function') return false;
        if (!panel.open) panel.showModal();
        input.focus();
        search();
        return true;
      };
      panel.querySelector('.site-search-close').addEventListener('click', () => panel.close());
      panel.addEventListener('click', event => {
        const rect = panel.getBoundingClientRect();
        if (event.target === panel && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) panel.close();
      });
      const trigger = document.getElementById('site-search-link');
      if (trigger) trigger.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (open()) event.preventDefault();
      });
      document.addEventListener('keydown', event => {
        if (panel.open && event.key === 'Escape') {
          event.preventDefault();
          panel.close();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          if (open()) event.preventDefault();
        }
      });
    }
  });
})();
