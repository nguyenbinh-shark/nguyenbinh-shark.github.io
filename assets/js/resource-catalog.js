(function () {
  'use strict';
  const catalog = document.querySelector('[data-resource-catalog]');
  if (!catalog) return;
  const input = catalog.querySelector('#lib-search');
  const status = catalog.querySelector('.resource-status');
  const reset = catalog.querySelector('.resource-reset');
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const resources = [...catalog.querySelectorAll('[data-resource]')].map(element => ({ element, type: element.dataset.resourceType, text: normalize(element.dataset.resourceSearch) }));
  let type = catalog.dataset.defaultType || '';
  let topic = '';

  function readUrl() {
    const params = new URLSearchParams(location.search);
    const requestedType = params.get('type');
    type = requestedType === 'all' ? '' : (requestedType || catalog.dataset.defaultType || '');
    topic = params.get('topic') || '';
    input.value = params.get('q') || '';
  }

  function filter(updateUrl) {
    const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    const topicTerms = topic === 'robotics' ? ['robot', '5bar', 'mecanum', 'vehicle'] : [topic];
    let count = 0;
    resources.forEach(resource => {
      const match = (!type || type === resource.type) && (!topic || topicTerms.some(term => resource.text.includes(term))) && terms.every(term => resource.text.includes(term));
      resource.element.hidden = !match;
      if (match) count++;
    });
    catalog.querySelectorAll('[data-resource-filter]').forEach(link => {
      if (link.dataset.resourceFilter === type) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    catalog.querySelectorAll('[data-resource-topic]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.resourceTopic === topic)));
    status.textContent = document.documentElement.dataset.lang === 'en' ? count + ' resources' : count + ' tài nguyên';
    catalog.querySelector('.resource-empty').hidden = count > 0;
    reset.hidden = !type && !topic && !input.value;
    if (updateUrl) {
      const url = new URL(location.href);
      for (const [key, value] of [['type', type || (catalog.dataset.defaultType ? 'all' : '')], ['topic', topic], ['q', input.value.trim()]]) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url);
    }
  }

  input.addEventListener('input', () => filter(true));
  catalog.querySelectorAll('[data-resource-filter]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    type = link.dataset.resourceFilter;
    filter(true);
  }));
  catalog.querySelectorAll('[data-resource-topic]').forEach(button => button.addEventListener('click', () => { topic = button.dataset.resourceTopic; filter(true); }));
  reset.addEventListener('click', () => { type = ''; topic = ''; input.value = ''; filter(true); input.focus(); });
  window.addEventListener('popstate', () => { readUrl(); filter(false); });
  new MutationObserver(() => filter(false)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  readUrl();
  filter(false);
})();
