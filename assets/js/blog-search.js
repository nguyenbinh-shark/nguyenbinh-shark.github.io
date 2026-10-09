/* ------------------------------------------------------------------
 * blog-search.js - Tim kiem & loc bai viet cho trang /year-archive/
 *
 * LUU Y QUAN TRONG: file nay phai nam rieng, KHONG duoc dat inline trong
 * trang .html. Layout `_layouts/compress.html` (jekyll-compress-html) go
 * bo toan bo xuong dong cua trang, ke ca ben trong the <script>. Khi do
 * moi comment dang `//` se "nuot" phan con lai cua script -> syntax error
 * -> o tim kiem va cac chip tag chet hoan toan.
 * ------------------------------------------------------------------ */
function initBlogSearch() {
  const searchInput = document.getElementById('blog-search');
  const searchClear = document.getElementById('blog-search-clear');
  const countEl = document.getElementById('blog-search-count');
  const noResults = document.getElementById('no-results-msg');
  const filterStatus = document.getElementById('blog-filter-status');
  const filterStatusText = document.getElementById('bfs-text');
  const resetFilterBtn = document.getElementById('bfs-reset-btn');

  const articles = document.querySelectorAll('.blog-article-card');
  const seriesContainer = document.getElementById('series-container');
  const seriesDivider = document.getElementById('series-divider');
  const filterChips = document.querySelectorAll('.filter-chip');
  const hubCards = document.querySelectorAll('.blog-hub-card');
  const tagButtons = document.querySelectorAll('.bac-tag');

  function removeVietnameseTones(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[-_]/g, ' ');
  }

  // Index từng bài viết để tìm kiếm cực nhanh và chính xác
  const articleData = Array.from(articles).map(el => {
    const searchStr = (el.getAttribute('data-search') || el.textContent || '').toLowerCase();
    const tags = (el.getAttribute('data-tags') || '').toLowerCase();
    const domains = (el.getAttribute('data-domains') || '').toLowerCase();
    const combined = searchStr + ' ' + tags + ' ' + domains;
    return {
      el: el,
      tags: tags,
      domains: domains,
      rawText: combined,
      normText: removeVietnameseTones(combined)
    };
  });

  // Bản đồ từ khóa lĩnh vực tương ứng các chip/hub
  const DOMAIN_MAP = {
    'control': ['control', 'pid', 'dieu khien', 'simscape'],
    'signal': ['signal', 'kalman', 'ekf', 'ahrs', 'imu', 'uoc luong', 'tin hieu'],
    'signal-processing': ['signal', 'kalman', 'ekf', 'ahrs', 'imu', 'uoc luong', 'tin hieu'],
    'robotics': ['robot', '5bar', 'kinematics', 'dong hoc'],
    'embedded': ['embedded', 'stm32', 'micro-ros', 'microros', 'ros2', 'esp32', 'nhung', 'freertos'],
    'kalman': ['kalman', 'ekf', 'ahrs'],
    'kalman-ekf': ['kalman', 'ekf', 'ahrs'],
    'pid': ['pid'],
    'esp32': ['esp32'],
    'kinematics': ['kinematics', 'dong hoc'],
    '5bar': ['5bar', 'five-bar', '5 khau'],
    'five-bar': ['5bar', 'five-bar', '5 khau'],
    'micro-ros': ['micro-ros', 'microros'],
    'microros': ['micro-ros', 'microros']
  };

  function articleMatches(item, cleanQ, normQ) {
    if (!cleanQ) return true;

    // 1. Phím tắt danh mục từ hub hoặc chip
    if (DOMAIN_MAP[cleanQ]) {
      return DOMAIN_MAP[cleanQ].some(k => item.normText.includes(k) || item.rawText.includes(k));
    }

    // 2. Tìm kiếm nhiều từ (AND query)
    const tokens = normQ.split(/[\s,]+/).filter(Boolean);
    if (tokens.length > 1) {
      // Khớp cụm từ chính xác trước
      if (item.normText.includes(normQ) || item.rawText.includes(cleanQ)) {
        return true;
      }
      // Xử lý các cụm từ lĩnh vực thông dụng (ví dụ: "signal processing", "control systems", "embedded systems")
      if (normQ === 'signal processing' || normQ === 'xu ly tin hieu') {
        return DOMAIN_MAP['signal'].some(k => item.normText.includes(k));
      }
      if (normQ === 'control systems' || normQ === 'dieu khien tu dong' || normQ === 'he thong dieu khien') {
        return DOMAIN_MAP['control'].some(k => item.normText.includes(k));
      }
      if (normQ === 'embedded systems' || normQ === 'he thong nhung') {
        return DOMAIN_MAP['embedded'].some(k => item.normText.includes(k));
      }
      if (normQ === 'robotics kinematics' || normQ === 'robot hoc dong hoc') {
        return DOMAIN_MAP['robotics'].some(k => item.normText.includes(k));
      }
      // Mọi token đều phải xuất hiện trong bài viết
      return tokens.every(token => {
        const t = token.replace(/^#+/, '');
        return item.normText.includes(t) || item.rawText.includes(t);
      });
    }

    // 3. Tìm kiếm từ đơn (cả có dấu và không dấu)
    return item.normText.includes(normQ) || item.rawText.includes(cleanQ);
  }

  // Cập nhật số bài hiển thị trên 4 thẻ Category Hub
  function updateHubCounts() {
    document.querySelectorAll('.bh-count[data-count-for]').forEach(el => {
      const key = el.getAttribute('data-count-for');
      const n = articleData.filter(it => articleMatches(it, key, removeVietnameseTones(key))).length;
      el.textContent = '(' + n + ')';
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Hàm lọc chính
  function filter(query, shouldScrollToResults) {
    const rawQ = (query || '').trim();
    const cleanQ = rawQ.replace(/^#+/, '').trim().toLowerCase();
    const normQ = removeVietnameseTones(cleanQ);
    let visibleArticles = 0;

    // Lọc danh sách bài viết
    articleData.forEach(item => {
      const match = articleMatches(item, cleanQ, normQ);
      item.el.style.display = match ? '' : 'none';
      if (match) visibleArticles++;
    });

    // Khi có từ khóa tìm kiếm / bộ lọc:
    // Tự động ẩn khối chuyên đề lớn (Featured Series) để kết quả bài viết hiển thị ngay dưới thanh tìm kiếm,
    // hoạt động trực quan và tức thì y hệt trang Resources!
    if (seriesContainer) {
      seriesContainer.style.display = cleanQ ? 'none' : '';
    }
    if (seriesDivider) {
      seriesDivider.style.display = cleanQ ? 'none' : '';
    }

    // Cập nhật số đếm bài viết
    if (countEl) {
      countEl.innerHTML = visibleArticles + ' <span class="lang-vi">bài viết</span><span class="lang-en">posts</span>';
    }

    // Hiển thị thông báo khi không có kết quả
    if (noResults) {
      noResults.style.display = (visibleArticles === 0) ? 'block' : 'none';
    }

    // Nút xóa tìm kiếm (&times;)
    if (searchClear) {
      searchClear.style.display = rawQ ? 'block' : 'none';
    }

    // Cập nhật thanh trạng thái bộ lọc đang kích hoạt
    if (filterStatus && filterStatusText) {
      if (cleanQ) {
        filterStatus.style.display = 'flex';
        const displayLabel = escapeHtml(rawQ.startsWith('#') ? rawQ : ('#' + rawQ));
        // Phát cả hai ngôn ngữ rồi để CSS ẩn bản không dùng, nhờ vậy dòng này
        // đổi theo nút VI/EN mà không cần vẽ lại kết quả lọc.
        filterStatusText.innerHTML =
          '<span class="lang-vi">Đang lọc: <strong>"' + displayLabel + '"</strong> (' + visibleArticles + ' bài viết)</span>' +
          '<span class="lang-en">Filtered by: <strong>"' + displayLabel + '"</strong> (' + visibleArticles + ' posts)</span>';
      } else {
        filterStatus.style.display = 'none';
      }
    }

    // Đồng bộ trạng thái active của các chip tag
    filterChips.forEach(chip => {
      const tag = (chip.getAttribute('data-tag') || '').toLowerCase();
      if (!cleanQ && tag === 'all') {
        chip.classList.add('active');
      } else if (tag !== 'all' && (cleanQ === tag || (tag === 'kalman' && cleanQ === 'kalman-ekf') || (tag === 'signal' && cleanQ === 'signal-processing'))) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Cuộn mượt đến danh sách kết quả khi người dùng bấm thẻ Hub hoặc tag
    if (shouldScrollToResults) {
      const target = document.getElementById('all-posts') || document.querySelector('.blog-search-bar');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Lắng nghe sự kiện tìm kiếm trên ô input (tức thì như Resources)
  if (searchInput) {
    ['input', 'keyup', 'change', 'search'].forEach(evt => {
      searchInput.addEventListener(evt, e => filter(e.target.value, false));
    });
  }

  // Nút xóa tìm kiếm (&times;)
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      filter('', false);
    });
  }

  // Nút xóa bộ lọc ở thanh trạng thái
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      filter('', false);
    });
  }

  // Sự kiện bấm các chip tag ở thanh tìm kiếm (có hỗ trợ click lại để hủy chọn)
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = (chip.getAttribute('data-tag') || '').toLowerCase();
      if (tag === 'all') {
        if (searchInput) searchInput.value = '';
        filter('', false);
      } else {
        const currentClean = (searchInput ? searchInput.value : '').toLowerCase().replace(/^#+/, '').trim();
        if (currentClean === tag) {
          // Click lần 2 vào chip đang active -> Bỏ chọn
          if (searchInput) searchInput.value = '';
          filter('', false);
        } else {
          if (searchInput) searchInput.value = '#' + tag;
          filter(tag, false);
        }
      }
    });
  });

  // Sự kiện bấm các thẻ Category Hub ở đầu trang
  hubCards.forEach(card => {
    card.addEventListener('click', e => {
      e.preventDefault();
      const filterTag = card.getAttribute('data-filter');
      if (filterTag === 'all') {
        if (searchInput) searchInput.value = '';
        filter('', true);
      } else if (filterTag) {
        if (searchInput) searchInput.value = '#' + filterTag;
        filter(filterTag, true);
      }
    });
  });

  // Sự kiện bấm tag trên từng thẻ bài viết (có hỗ trợ toggle click lại để hủy chọn)
  tagButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const tag = (btn.getAttribute('data-tag') || btn.textContent.replace(/^#/, '')).trim().toLowerCase();
      const currentClean = (searchInput ? searchInput.value : '').toLowerCase().replace(/^#+/, '').trim();
      if (currentClean === tag) {
        if (searchInput) searchInput.value = '';
        filter('', false);
      } else {
        if (searchInput) searchInput.value = '#' + tag;
        filter(tag, true);
      }
    });
  });

  // Hàm toàn cục hỗ trợ (nếu có nơi khác gọi)
  window.filterByTag = function (tag) {
    if (searchInput) {
      const clean = (tag || '').replace(/^#+/, '');
      searchInput.value = '#' + clean;
      filter(clean, true);
    }
  };

  // Đọc query param từ URL nếu có (ví dụ: /year-archive/?q=kalman hoặc ?tag=embedded)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQ = urlParams.get('q') || urlParams.get('tag');
    if (urlQ && searchInput) {
      searchInput.value = urlQ.startsWith('#') ? urlQ : ('#' + urlQ);
    }
  } catch (e) {}

  // Cập nhật số đếm ban đầu và chạy lọc
  updateHubCounts();
  filter(searchInput ? searchInput.value : '', false);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogSearch);
} else {
  initBlogSearch();
}
