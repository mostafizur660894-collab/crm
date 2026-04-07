/**
 * Bimano CRM — CRUD Module
 * Shared JS for all data management pages.
 * Uses JWT from sessionStorage for API calls.
 */

var CRM = (function () {
    'use strict';

    var BASE = document.documentElement.dataset.basePath || '';

    // ── JWT Token Management ─────────────────────────────────────────────────
    function getToken() {
        return sessionStorage.getItem('crm_token') || '';
    }

    function setToken(token) {
        sessionStorage.setItem('crm_token', token);
    }

    // ── API Helper ───────────────────────────────────────────────────────────
    function api(method, path, body) {
        var token = getToken();
        var opts = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        // Only add Authorization header if we have a token
        if (token) {
            opts.headers['Authorization'] = 'Bearer ' + token;
        }
        if (body && method !== 'GET') {
            opts.body = JSON.stringify(body);
        }
        var url = BASE + '/api/' + path;
        return fetch(url, opts).then(function (res) {
            return res.json().then(function (data) {
                data._status = res.status;
                return data;
            });
        });
    }

    // ── Toast Notification ───────────────────────────────────────────────────
    function toast(message, type) {
        type = type || 'success';
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
            document.body.appendChild(container);
        }
        var t = document.createElement('div');
        var colors = { success: '#10b981', error: '#ef4444', info: '#6366f1', warning: '#f59e0b' };
        t.style.cssText = 'padding:12px 20px;border-radius:10px;color:#fff;font-size:14px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.4);transition:opacity .3s;border:1px solid rgba(255,255,255,.08);background:' + (colors[type] || colors.info);
        t.textContent = message;
        container.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 300);
        }, 3000);
    }

    // ── Modal Helper ─────────────────────────────────────────────────────────
    function openModal(title, formHtml, onSubmit) {
        closeModal();
        var overlay = document.createElement('div');
        overlay.id = 'crm-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:#111827;border-radius:14px;box-shadow:0 25px 50px rgba(0,0,0,.5);width:100%;max-width:560px;max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,.08);';

        var header = '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;">'
            + '<h3 style="font-size:1.1rem;font-weight:700;color:#f1f5f9;">' + escapeHtml(title) + '</h3>'
            + '<button onclick="CRM.closeModal()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:#6b7280;line-height:1;">&times;</button>'
            + '</div>';

        var body = '<form id="crm-modal-form" style="padding:1.5rem;">'
            + formHtml
            + '<div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.06);">'
            + '<button type="button" onclick="CRM.closeModal()" style="padding:.55rem 1.2rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1e293b;color:#e5e7eb;font-size:.875rem;font-weight:500;cursor:pointer;">Cancel</button>'
            + '<button type="submit" style="padding:.55rem 1.2rem;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-size:.875rem;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(99,102,241,.25);">Save</button>'
            + '</div></form>';

        modal.innerHTML = header + body;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        var form = document.getElementById('crm-modal-form');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var fd = new FormData(form);
            var data = {};
            fd.forEach(function (val, key) { data[key] = val; });
            onSubmit(data);
        });

        // Focus first input
        var firstInput = form.querySelector('input,select,textarea');
        if (firstInput) setTimeout(function () { firstInput.focus(); }, 100);
    }

    function closeModal() {
        var el = document.getElementById('crm-modal-overlay');
        if (el) el.remove();
    }

    // ── Confirm Dialog ───────────────────────────────────────────────────────
    function confirm(message, onYes) {
        openModal('Confirm', '<p style="font-size:.95rem;color:#e5e7eb;">' + escapeHtml(message) + '</p>', function () {
            closeModal();
            onYes();
        });
    }

    // ── Form Field Builders ──────────────────────────────────────────────────
    function field(label, name, value, type, opts) {
        type = type || 'text';
        value = value || '';
        opts = opts || {};
        var req = opts.required ? ' required' : '';
        var ph = opts.placeholder ? ' placeholder="' + escapeAttr(opts.placeholder) + '"' : '';

        var html = '<div style="margin-bottom:1rem;">'
            + '<label style="display:block;font-size:.8rem;font-weight:600;color:#9ca3af;margin-bottom:.3rem;">' + escapeHtml(label) + '</label>';

        if (type === 'select' && opts.options) {
            html += '<select id="field-' + escapeAttr(name) + '" name="' + escapeAttr(name) + '" style="width:100%;padding:.55rem .75rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.9rem;outline:none;background:#1e293b;color:#e5e7eb;"' + req + '>';
            opts.options.forEach(function (o) {
                var val = typeof o === 'object' ? o.value : o;
                var lbl = typeof o === 'object' ? o.label : o;
                var sel = (String(val) === String(value)) ? ' selected' : '';
                html += '<option value="' + escapeAttr(val) + '"' + sel + '>' + escapeHtml(lbl) + '</option>';
            });
            html += '</select>';
        } else if (type === 'textarea') {
            html += '<textarea id="field-' + escapeAttr(name) + '" name="' + escapeAttr(name) + '" rows="3" style="width:100%;padding:.55rem .75rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.9rem;outline:none;resize:vertical;background:#1e293b;color:#e5e7eb;"' + req + ph + '>' + escapeHtml(value) + '</textarea>';
        } else {
            html += '<input id="field-' + escapeAttr(name) + '" type="' + type + '" name="' + escapeAttr(name) + '" value="' + escapeAttr(value) + '" style="width:100%;padding:.55rem .75rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.9rem;outline:none;background:#1e293b;color:#e5e7eb;"' + req + ph + '>';
        }

        html += '</div>';
        return html;
    }

    // ── Table Rendering ──────────────────────────────────────────────────────
    function renderTable(containerId, columns, rows, actions) {
        var el = document.getElementById(containerId);
        if (!el) return;

        if (!rows || rows.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:#6b7280;"><p>No records found</p></div>';
            return;
        }

        var html = '<table class="data-table"><thead><tr>';
        columns.forEach(function (col) {
            html += '<th>' + escapeHtml(col.label) + '</th>';
        });
        if (actions) html += '<th style="width:120px;">Actions</th>';
        html += '</tr></thead><tbody>';

        rows.forEach(function (row) {
            html += '<tr>';
            columns.forEach(function (col) {
                var val = row[col.key] != null ? String(row[col.key]) : '—';
                if (col.badge) {
                    var badgeClass = (typeof col.badge === 'function') ? col.badge(val) : col.badge;
                    html += '<td><span class="badge ' + badgeClass + '">' + escapeHtml(val) + '</span></td>';
                } else if (col.render) {
                    html += '<td>' + col.render(val, row) + '</td>';
                } else {
                    html += '<td>' + escapeHtml(val) + '</td>';
                }
            });
            if (actions) {
                html += '<td style="white-space:nowrap;">';
                if (typeof actions === 'function') {
                    html += actions(row);
                } else {
                    actions.forEach(function (act) {
                        var cls = act.danger ? 'color:#f87171;' : 'color:#818cf8;';
                        html += '<button onclick="' + escapeAttr(act.handler + '(' + row.id + ')') + '" '
                            + 'style="background:none;border:none;cursor:pointer;font-size:.82rem;font-weight:500;padding:.2rem .5rem;' + cls + '"'
                            + ' title="' + escapeAttr(act.label) + '">'
                            + escapeHtml(act.label) + '</button>';
                    });
                }
                html += '</td>';
            }
            html += '</tr>';
        });
        html += '</tbody></table>';
        el.innerHTML = html;
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    function renderPagination(containerId, pagination, onPageChange) {
        var el = document.getElementById(containerId);
        if (!el || !pagination) return;

        var total = pagination.total || 0;
        var page = pagination.page || 1;
        var limit = pagination.limit || 25;
        var totalPages = Math.ceil(total / limit);
        if (totalPages <= 1) { el.innerHTML = ''; return; }

        var html = '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;font-size:.85rem;color:#9ca3af;">';
        html += '<span>Showing ' + ((page - 1) * limit + 1) + '–' + Math.min(page * limit, total) + ' of ' + total + '</span>';
        html += '<div style="display:flex;gap:.25rem;">';

        for (var i = 1; i <= totalPages && i <= 10; i++) {
            var active = (i === page) ? 'background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;' : 'background:#1e293b;color:#9ca3af;border:1px solid rgba(255,255,255,.06);';
            html += '<button onclick="' + onPageChange + '(' + i + ')" style="padding:.35rem .7rem;border:none;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:500;' + active + '">' + i + '</button>';
        }

        html += '</div></div>';
        el.innerHTML = html;
    }

    // ── Search Bar ───────────────────────────────────────────────────────────
    function renderSearchBar(containerId, placeholder, onSearch) {
        var el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '<div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;">'
            + '<input type="text" id="crm-search-input" placeholder="' + escapeAttr(placeholder || 'Search...') + '" '
            + 'style="flex:1;min-width:200px;padding:.55rem .9rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.9rem;outline:none;background:#1e293b;color:#e5e7eb;">'
            + '</div>';
        var input = document.getElementById('crm-search-input');
        var timer;
        input.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(function () { onSearch(input.value); }, 400);
        });
    }

    // ── Utility ──────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function statusBadge(val) {
        var map = {
            'new': 'badge-info', 'contacted': 'badge-warning', 'qualified': 'badge-purple',
            'proposal': 'badge-info', 'negotiation': 'badge-warning', 'converted': 'badge-success', 'lost': 'badge-danger',
            'active': 'badge-success', 'inactive': 'badge-gray', 'prospect': 'badge-info',
            'pending': 'badge-warning', 'in_progress': 'badge-info', 'completed': 'badge-success', 'cancelled': 'badge-danger',
            'overdue': 'badge-danger'
        };
        return map[val] || 'badge-gray';
    }

    function priorityBadge(val) {
        var map = { 'high': 'badge-danger', 'medium': 'badge-warning', 'low': 'badge-info' };
        return map[val] || 'badge-gray';
    }

    // ── Public API ───────────────────────────────────────────────────────────
    return {
        api: api,
        getToken: getToken,
        setToken: setToken,
        toast: toast,
        openModal: openModal,
        closeModal: closeModal,
        confirm: confirm,
        field: field,
        renderTable: renderTable,
        renderPagination: renderPagination,
        renderSearchBar: renderSearchBar,
        escapeHtml: escapeHtml,
        statusBadge: statusBadge,
        priorityBadge: priorityBadge,

        // ── Enhanced: Notification Dropdown ──────────────────────────────────
        toggleNotifications: function () {
            var dd = document.getElementById('notif-dropdown');
            if (dd) dd.classList.toggle('open');
        },

        closeNotifications: function () {
            var dd = document.getElementById('notif-dropdown');
            if (dd) dd.classList.remove('open');
        },

        loadNotifications: function () {
            api('GET', 'notifications?limit=10').then(function (res) {
                var list = document.getElementById('notif-list');
                var countEl = document.getElementById('notif-count');
                if (!list) return;

                var items = (res.data || res.notifications || []);
                var unread = items.filter(function (n) { return !n.is_read; }).length;

                if (countEl) {
                    if (unread > 0) {
                        countEl.textContent = unread > 9 ? '9+' : unread;
                        countEl.style.display = 'flex';
                    } else {
                        countEl.style.display = 'none';
                    }
                }

                if (items.length === 0) {
                    list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
                    return;
                }

                var iconMap = {
                    'lead': 'blue', 'client': 'green', 'task': 'orange',
                    'followup': 'purple', 'system': 'red'
                };

                var html = '';
                items.forEach(function (n) {
                    var iconColor = iconMap[n.module || n.type || 'system'] || 'blue';
                    var unreadCls = n.is_read ? '' : ' unread';
                    html += '<div class="notif-item' + unreadCls + '" data-id="' + (n.id || '') + '">'
                        + '<div class="notif-icon ' + iconColor + '">'
                        + '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>'
                        + '</div>'
                        + '<div class="notif-content">'
                        + '<p>' + escapeHtml(n.message || n.title || 'Notification') + '</p>'
                        + '<div class="notif-time">' + escapeHtml(n.created_at || n.time || '') + '</div>'
                        + '</div></div>';
                });
                list.innerHTML = html;
            }).catch(function () {
                // API not available — silently ignore
            });
        },

        markAllRead: function () {
            api('POST', 'notifications/read-all').then(function () {
                var countEl = document.getElementById('notif-count');
                if (countEl) countEl.style.display = 'none';
                document.querySelectorAll('.notif-item.unread').forEach(function (el) {
                    el.classList.remove('unread');
                });
            }).catch(function () {});
        },

        // ── Enhanced: Filter Bar with Search ─────────────────────────────────
        renderFilterBar: function (containerId, filters, onFilter) {
            var el = document.getElementById(containerId);
            if (!el) return;

            var html = '<div class="filter-bar">';

            // Search input
            html += '<input type="text" id="crm-filter-search" placeholder="Search..." '
                + 'style="flex:1;min-width:200px;padding:.55rem .9rem;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.9rem;outline:none;background:#1e293b;color:#e5e7eb;">';

            // Dropdown filters
            filters.forEach(function (f) {
                html += '<div class="filter-group">'
                    + '<label>' + escapeHtml(f.label) + '</label>'
                    + '<select class="filter-select" id="filter-' + escapeAttr(f.key) + '">';
                f.options.forEach(function (o) {
                    var val = typeof o === 'object' ? o.value : o;
                    var lbl = typeof o === 'object' ? o.label : o;
                    html += '<option value="' + escapeAttr(val) + '">' + escapeHtml(lbl) + '</option>';
                });
                html += '</select></div>';
            });

            html += '</div>';
            el.innerHTML = html;

            // Bind events
            var searchInput = document.getElementById('crm-filter-search');
            var timer;
            function fireFilter() {
                var vals = { search: searchInput ? searchInput.value : '' };
                filters.forEach(function (f) {
                    var sel = document.getElementById('filter-' + f.key);
                    if (sel) vals[f.key] = sel.value;
                });
                onFilter(vals);
            }

            if (searchInput) {
                searchInput.addEventListener('input', function () {
                    clearTimeout(timer);
                    timer = setTimeout(fireFilter, 400);
                });
            }

            filters.forEach(function (f) {
                var sel = document.getElementById('filter-' + f.key);
                if (sel) sel.addEventListener('change', fireFilter);
            });
        },

        // ── Enhanced: Action Buttons with icons ──────────────────────────────
        actionBtn: function (label, type, onclick) {
            var icons = {
                edit: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
                delete: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
                convert: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
                view: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
                note: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
                toggle: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>'
            };
            return '<button class="action-btn ' + escapeAttr(type) + '" onclick="' + escapeAttr(onclick) + '" title="' + escapeAttr(label) + '">'
                + (icons[type] || '') + ' ' + escapeHtml(label) + '</button>';
        },

        // ── Enhanced: Status Toggle ──────────────────────────────────────────
        renderStatusToggle: function (currentStatus, onclick) {
            var labels = {
                pending: 'Pending', in_progress: 'In Progress',
                completed: 'Completed', cancelled: 'Cancelled'
            };
            return '<button class="status-toggle ' + escapeAttr(currentStatus) + '" onclick="' + escapeAttr(onclick) + '">'
                + '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg> '
                + escapeHtml(labels[currentStatus] || currentStatus) + '</button>';
        },

        // ── Enhanced: Render Detail Panel ────────────────────────────────────
        renderDetailPanel: function (containerId, items) {
            var el = document.getElementById(containerId);
            if (!el) return;
            var html = '<div class="detail-panel">';
            items.forEach(function (item) {
                var cls = item.fullWidth ? ' full-width' : '';
                html += '<div class="detail-item' + cls + '">'
                    + '<label>' + escapeHtml(item.label) + '</label>'
                    + '<div class="detail-value">' + (item.html || escapeHtml(item.value || '—')) + '</div>'
                    + '</div>';
            });
            html += '</div>';
            el.innerHTML = html;
        }
    };
})();
