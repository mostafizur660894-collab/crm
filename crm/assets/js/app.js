/**
 * Bimano CRM — App Bootstrap
 * Lightweight runtime helpers shared by all pages.
 */

(function () {
    'use strict';

    // Basic global error logging (non-blocking).
    window.addEventListener('error', function (e) {
        if (!e || !e.message) return;
        // Keep this console-only to avoid any backend changes.
        console.error('[CRM Error]', e.message);
    });

    window.addEventListener('unhandledrejection', function (e) {
        var msg = (e && e.reason && e.reason.message) ? e.reason.message : 'Unhandled promise rejection';
        console.error('[CRM Promise Error]', msg);
    });
})();
