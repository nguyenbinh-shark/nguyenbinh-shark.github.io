/**
 * Chuyển đổi ngôn ngữ hiển thị (Tiếng Việt ↔ English)
 *
 * CÁCH DÙNG TRONG NỘI DUNG
 *   Khối:  <div class="lang-vi" markdown="1"> … </div>
 *          <div class="lang-en" markdown="1"> … </div>
 *   Nội dòng: <span class="lang-vi">…</span><span class="lang-en">…</span>
 *   Xem thêm: huong-dan/14-chuyen-doi-ngon-ngu.md
 *
 * FILE NÀY KHÔNG ẨN/HIỆN NỘI DUNG.
 *   Việc đó do CSS đảm nhiệm (assets/css/custom.css), dựa trên thuộc tính
 *   `data-lang` trên thẻ <html>. Nhờ vậy:
 *     • Phần tử được JS chèn sau khi tải trang cũng tự động đúng ngôn ngữ
 *       (ví dụ dòng đếm kết quả tìm kiếm ở _pages/year-archive.html).
 *     • Không ghi đè thuộc tính display gốc của phần tử.
 *
 * `data-lang` đã được gán TRƯỚC khi trang được vẽ bởi script inline trong
 * _includes/head/custom.html, nên không có hiện tượng nháy hai ngôn ngữ.
 *
 * NHỮNG CHỖ CSS KHÔNG VỚI TỚI ĐƯỢC thì file này lo, vì không thể đặt hai thẻ
 * <span> bên trong một thuộc tính:
 *   • title           → data-t-title-vi / data-t-title-en
 *   • aria-label      → data-t-aria-vi  / data-t-aria-en
 *   • placeholder     → data-t-ph-vi    / data-t-ph-en
 *   • <title> của tab → <meta name="page-title-vi|en"> (xem _includes/seo.html)
 * Giá trị tĩnh viết sẵn trong HTML là bản tiếng Việt, để trình duyệt tắt JS
 * vẫn đọc được.
 *
 * LƯU Ý: STORAGE_KEY và DEFAULT_LANG phải khớp với script trong head.
 */
(function () {
  'use strict';

  var STORAGE_KEY  = 'site-lang';
  var DEFAULT_LANG = 'vi';

  function getLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'vi' || saved === 'en') { return saved; }
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  /* Các thuộc tính chỉ chứa văn bản thuần nên không dùng được .lang-vi /
     .lang-en. Mỗi dòng: [thuộc tính nguồn cho vi, cho en, thuộc tính đích]. */
  var ATTR_MAP = [
    ['data-t-title-vi', 'data-t-title-en', 'title'],
    ['data-t-aria-vi',  'data-t-aria-en',  'aria-label'],
    ['data-t-ph-vi',    'data-t-ph-en',    'placeholder']
  ];

  /* Áp bản dịch cho thuộc tính và cho <title> của tài liệu.
     Thiếu bản của ngôn ngữ đang chọn thì dùng bản còn lại. */
  function applyTranslatedAttrs(lang) {
    var i, j, nodes, el, value;

    for (i = 0; i < ATTR_MAP.length; i++) {
      var viAttr = ATTR_MAP[i][0];
      var enAttr = ATTR_MAP[i][1];
      var target = ATTR_MAP[i][2];
      var wanted = (lang === 'vi') ? viAttr : enAttr;
      var other  = (lang === 'vi') ? enAttr : viAttr;

      nodes = document.querySelectorAll('[' + viAttr + '],[' + enAttr + ']');
      for (j = 0; j < nodes.length; j++) {
        el = nodes[j];
        value = el.getAttribute(wanted);
        if (value === null) { value = el.getAttribute(other); }
        if (value !== null) { el.setAttribute(target, value); }
      }
    }

    var meta = document.querySelector('meta[name="page-title-' + lang + '"]');
    if (meta && meta.content) { document.title = meta.content; }
  }

  /* Đồng bộ nhãn và trạng thái trợ năng của nút chuyển ngôn ngữ. */
  function updateToggleBtn(lang) {
    var btn = document.getElementById('lang-toggle-btn');
    if (!btn) { return; }
    var isVi = (lang === 'vi');

    // Nhãn hiển thị = ngôn ngữ ĐANG xem.
    btn.textContent = isVi ? 'VI' : 'EN';

    // Nhãn trợ năng mô tả HÀNH ĐỘNG sẽ xảy ra khi bấm.
    var label = isVi
      ? 'Đang hiển thị Tiếng Việt. Chuyển sang English.'
      : 'Showing English. Switch to Tiếng Việt.';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', isVi ? 'false' : 'true');
  }

  function setLang(lang) {
    saveLang(lang);
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.lang = lang;
    updateToggleBtn(lang);
    applyTranslatedAttrs(lang);
  }

  function init() {
    // Script trong head đã gán data-lang; ở đây chỉ đồng bộ phần JS phải lo.
    updateToggleBtn(getLang());
    applyTranslatedAttrs(getLang());

    var btn = document.getElementById('lang-toggle-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        setLang(getLang() === 'vi' ? 'en' : 'vi');
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          this.click();
        }
      });
    }

    // Hỗ trợ phím Space cho nút chuyển đổi giao diện sáng/tối
    var themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          this.click();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
