---
title: "Library"
permalink: /library/
layout: single
---

{% assign items = site.library | sort: 'date' | reverse %}
{% if items.size == 0 %}
<p><em>Chưa có mục nào. Hãy thêm file vào <code>_library/</code>.</em></p>
{% endif %}

<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
{% for m in items %}
  <a href="{{ m.url | relative_url }}" style="text-decoration:none;color:inherit;border-radius:12px;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,.12);background:var(--card-bg,#1f2937)">
    {% if m.cover %}<img src="{{ m.cover | relative_url }}" alt="{{ m.title }}" style="width:100%;aspect-ratio:16/10;object-fit:cover">{% endif %}
    <div style="padding:10px 12px">
      <h3 style="margin:.2rem 0 .3rem 0;font-size:1rem">{{ m.title }}</h3>
      {% if m.date %}<p style="margin:0;opacity:.75;font-size:.9rem">{{ m.date | date: "%Y-%m-%d" }}</p>{% endif %}
    </div>
  </a>
{% endfor %}
</div>

