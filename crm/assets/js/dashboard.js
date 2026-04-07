/**
 * Bimano CRM — Dashboard JavaScript
 * Sidebar toggle, mobile menu, and utility helpers.
 */

(function () {
    'use strict';

    // ── Sidebar toggle (mobile) ──────────────────────────────────────────────
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.querySelector('.sidebar-overlay');
    const menuBtn  = document.querySelector('.menu-toggle');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    if (menuBtn)  menuBtn.addEventListener('click', openSidebar);
    if (overlay)  overlay.addEventListener('click', closeSidebar);

    // Close sidebar on ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSidebar();
    });

    // ── Active sidebar link ──────────────────────────────────────────────────
    var currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(function (link) {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // ── Time-ago helper (formats activity timestamps) ────────────────────────
    document.querySelectorAll('[data-time]').forEach(function (el) {
        var ts = el.getAttribute('data-time');
        if (!ts) return;
        var d = new Date(ts);
        var now = new Date();
        var diffMs = now - d;
        var diffMin = Math.floor(diffMs / 60000);
        var diffHr  = Math.floor(diffMs / 3600000);
        var diffDay = Math.floor(diffMs / 86400000);

        var text;
        if (diffMin < 1) text = 'Just now';
        else if (diffMin < 60) text = diffMin + 'm ago';
        else if (diffHr < 24) text = diffHr + 'h ago';
        else if (diffDay < 7) text = diffDay + 'd ago';
        else text = d.toLocaleDateString();

        el.textContent = text;
    });

})();
