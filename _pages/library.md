---
title: "Library"
permalink: /library/
layout: single
---

{% assign all = site.library | sort: "date" | reverse %}

{% if all.size == 0 %}
<p><em>Chưa có mục nào. Hãy thêm file vào <code>_library/</code>.</em></p>
{% endif %}

<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:0 0 1rem 0">
<input id="lib-search" type="search" placeholder="Tìm theo tiêu đề...">
  {% for t in site.data.library_types %}
    {% assign has = all | where: "type", t.key | size %}
    {% if has > 0 %}
      <a href="#{{ t.key | slugify }}" class="chip">{{ t.icon }} {{ t.label }}</a>
    {% endif %}
  {% endfor %}
  {% assign others = all | where_exp: "i","i.type == nil" | size %}
  {% if others > 0 %}<a href="#other" class="chip">📦 Other</a>{% endif %}
</div>

<style>
  .chip{ padding:.35rem .6rem; border:1px solid var(--mm-muted-border,#374151);
         border-radius:999px; text-decoration:none; opacity:.9 }
  .card{ text-decoration:none; color:inherit; border-radius:12px; overflow:hidden;
         box-shadow:0 6px 16px rgba(0,0,0,.12); background:var(--card-bg,#1f2937) }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px }
  .badge{ display:inline-block; font-size:.75rem; opacity:.8; padding:.15rem .5rem;
          border:1px solid var(--mm-muted-border,#374151); border-radius:999px; }
  .tags{ display:flex; flex-wrap:wrap; gap:.25rem; margin-top:.25rem }
</style>

{% for t in site.data.library_types %}
  {% assign group = all | where: "type", t.key %}
  {% if group.size > 0 %}
  <h2 id="{{ t.key | slugify }}" style="margin-top:2rem">{{ t.icon }} {{ t.label }}</h2>
  <div class="grid" data-group="{{ t.key }}">
    {% for m in group %}
      <a class="card lib-item" href="{{ m.url | relative_url }}" data-title="{{ m.title | downcase }} {% if m.tags %}{{ m.tags | join: ' ' | downcase }}{% endif %}">
        {% if m.cover %}<img src="{{ m.cover | relative_url }}" alt="{{ m.title }}" style="width:100%;aspect-ratio:16/10;object-fit:cover">{% endif %}
        <div style="padding:10px 12px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
            <h3 style="margin:.2rem 0 .3rem 0;font-size:1rem">{{ m.title }}</h3>
            <span class="badge">{{ t.label }}</span>
          </div>
          {% if m.date %}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.25rem">
              <span style="font-size:.85rem;opacity:.75">{{ m.date | date: "%Y-%m-%d" }}</span>
              {% if m.ownership %}
                <span class="badge {% if m.ownership == 'original' %}badge-success{% else %}badge-info{% endif %}">
                  {% if m.ownership == 'original' %}Tự tạo{% else %}Sưu tầm{% endif %}
                </span>
              {% endif %}
            </div>
          {% endif %}
          {% if m.tags %}
            <div class="tags">
              {% for tag in m.tags %}
                <span class="badge">{{ tag }}</span>
              {% endfor %}
            </div>
          {% endif %}
        </div>
      </a>
    {% endfor %}
  </div>
  {% endif %}
{% endfor %}

{% assign group_other = all | where_exp: "i","i.type == nil" %}
{% if group_other.size > 0 %}
  <h2 id="other" style="margin-top:2rem">📦 Other</h2>
  <div class="grid">
    {% for m in group_other %}
      <a class="card lib-item" href="{{ m.url | relative_url }}" data-title="{{ m.title | downcase }} {% if m.tags %}{{ m.tags | join: ' ' | downcase }}{% endif %}">
        {% if m.cover %}<img src="{{ m.cover | relative_url }}" alt="{{ m.title }}" style="width:100%;aspect-ratio:16/10;object-fit:cover">{% endif %}
        <div style="padding:10px 12px">
          <h3 style="margin:.2rem 0 .3rem 0;font-size:1rem">{{ m.title }}</h3>
          {% if m.date %}<p style="margin:0;opacity:.75;font-size:.9rem">{{ m.date | date: "%Y-%m-%d" }}</p>{% endif %}
        </div>
      </a>
    {% endfor %}
  </div>
{% endif %}

<script>
  const q = document.getElementById('lib-search');
  if (q){
    q.addEventListener('input', e=>{
      const v = e.target.value.trim().toLowerCase();
      for (const el of document.querySelectorAll('.lib-item')){
        const hit = el.getAttribute('data-title')?.includes(v);
        el.style.display = (v==="" || hit) ? '' : 'none';
      }
    });
  }
</script>
