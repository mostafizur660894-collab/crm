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
        var opts = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            }
        };
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
        var colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
        t.style.cssText = 'padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .3s;background:' + (colors[type] || colors.info);
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
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;border-radius:12px;box-shadow:0 25px 50px rgba(0,0,0,.25);width:100%;max-width:560px;max-height:90vh;overflow-y:auto;';

        var header = '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">'
            + '<h3 style="font-size:1.1rem;font-weight:700;color:#1e293b;">' + escapeHtml(title) + '</h3>'
            + '<button onclick="CRM.closeModal()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:#94a3b8;line-height:1;">&times;</button>'
            + '</div>';

        var body = '<form id="crm-modal-form" style="padding:1.5rem;">'
            + formHtml
            + '<div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e2e8f0;">'
            + '<button type="button" onclick="CRM.closeModal()" style="padding:.55rem 1.2rem;border:1.5px solid #d1d5db;border-radius:7px;background:#fff;color:#374151;font-size:.875rem;font-weight:500;cursor:pointer;">Cancel</button>'
            + '<button type="submit" style="padding:.55rem 1.2rem;border:none;border-radius:7px;background:#1e3a5f;color:#fff;font-size:.875rem;font-weight:600;cursor:pointer;">Save</button>'
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
        openModal('Confirm', '<p style="font-size:.95rem;color:#1e293b;">' + escapeHtml(message) + '</p>', function () {
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
            + '<label style="display:block;font-size:.8rem;font-weight:600;color:#374151;margin-bottom:.3rem;">' + escapeHtml(label) + '</label>';

        if (type === 'select' && opts.options) {
            html += '<select id="field-' + escapeAttr(name) + '" name="' + escapeAttr(name) + '" style="width:100%;padding:.55rem .75rem;border:1.5px solid #d1d5db;border-radius:7px;font-size:.9rem;outline:none;"' + req + '>';
            opts.options.forEach(function (o) {
                var val = typeof o === 'object' ? o.value : o;
                var lbl = typeof o === 'object' ? o.label : o;
                var sel = (String(val) === String(value)) ? ' selected' : '';
                html += '<option value="' + escapeAttr(val) + '"' + sel + '>' + escapeHtml(lbl) + '</option>';
            });
            html += '</select>';
        } else if (type === 'textarea') {
            html += '<textarea id="field-' + escapeAttr(name) + '" name="' + escapeAttr(name) + '" rows="3" style="width:100%;padding:.55rem .75rem;border:1.5px solid #d1d5db;border-radius:7px;font-size:.9rem;outline:none;resize:vertical;"' + req + ph + '>' + escapeHtml(value) + '</textarea>';
        } else {
            html += '<input id="field-' + escapeAttr(name) + '" type="' + type + '" name="' + escapeAttr(name) + '" value="' + escapeAttr(value) + '" style="width:100%;padding:.55rem .75rem;border:1.5px solid #d1d5db;border-radius:7px;font-size:.9rem;outline:none;"' + req + ph + '>';
        }

        html += '</div>';
        return html;
    }

    // ── Table Rendering ──────────────────────────────────────────────────────
    function renderTable(containerId, columns, rows, actions) {
        var el = document.getElementById(containerId);
        if (!el) return;

        if (!rows || rows.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:#94a3b8;"><p>No records found</p></div>';
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
                        var cls = act.danger ? 'color:#ef4444;' : 'color:#3b82f6;';
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

        var html = '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;font-size:.85rem;color:#64748b;">';
        html += '<span>Showing ' + ((page - 1) * limit + 1) + '–' + Math.min(page * limit, total) + ' of ' + total + '</span>';
        html += '<div style="display:flex;gap:.25rem;">';

        for (var i = 1; i <= totalPages && i <= 10; i++) {
            var active = (i === page) ? 'background:#1e3a5f;color:#fff;' : 'background:#f1f5f9;color:#374151;';
            html += '<button onclick="' + onPageChange + '(' + i + ')" style="padding:.35rem .7rem;border:none;border-radius:5px;cursor:pointer;font-size:.8rem;font-weight:500;' + active + '">' + i + '</button>';
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
            + 'style="flex:1;min-width:200px;padding:.55rem .9rem;border:1.5px solid #d1d5db;border-radius:7px;font-size:.9rem;outline:none;">'
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
        priorityBadge: priorityBadge
    };
})();
