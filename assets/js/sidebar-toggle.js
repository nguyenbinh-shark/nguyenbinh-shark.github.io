/**
 * Nút bật/tắt thu gọn thanh thông tin giới thiệu (Sidebar Toggle)
 */

(function () {
  'use strict';

  function initSidebarToggle() {
    var sidebar = document.querySelector('.sidebar');
    var toggleBtn = document.getElementById('sidebar-toggle-btn');

    if (!sidebar || !toggleBtn) return;

    var icon = toggleBtn.querySelector('i');
    var savedState = localStorage.getItem('sidebar_collapsed');
    var isCollapsed = savedState === 'true';

    function applyState(collapsed) {
      if (collapsed) {
        document.documentElement.classList.add('sidebar-collapsed');
        document.body.classList.add('sidebar-collapsed');
        if (icon) {
          icon.className = 'fa-solid fa-chevron-right';
        }
        toggleBtn.setAttribute('title', 'Mở rộng thanh thông tin');
        toggleBtn.setAttribute('aria-expanded', 'false');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
        document.body.classList.remove('sidebar-collapsed');
        if (icon) {
          icon.className = 'fa-solid fa-chevron-left';
        }
        toggleBtn.setAttribute('title', 'Thu gọn thanh thông tin');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }

      setTimeout(function () {
        window.dispatchEvent(new Event('resize'));
      }, 300);
    }

    function toggleSidebar() {
      var currentlyCollapsed = document.documentElement.classList.contains('sidebar-collapsed');
      var nextState = !currentlyCollapsed;
      localStorage.setItem('sidebar_collapsed', nextState ? 'true' : 'false');
      applyState(nextState);
    }

    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleSidebar();
    });

    // Phím tắt Ctrl+B / Cmd+B
    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebar();
      }
    });

    applyState(isCollapsed);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarToggle);
  } else {
    initSidebarToggle();
  }
})();
