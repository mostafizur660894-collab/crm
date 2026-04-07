<?php
/**
 * Dashboard Sidebar Include — Bimano CRM
 *
 * Outputs role-based sidebar navigation.
 * Expects: $user (array), $activePage (string)
 */

$basePath   = defined('BASE_URL') ? rtrim(BASE_URL, '/') : (defined('CRM_BASE_PATH') ? CRM_BASE_PATH : '');
$activeRole = $user['role'] ?? '';
$activePage = $activePage ?? 'dashboard';

// SVG icon helpers (inline, no external deps)
$icons = [
    'dashboard' => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>',
    'leads'     => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    'clients'   => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>',
    'tasks'     => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>',
    'followups' => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
    'users'     => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v-1"/></svg>',
    'branches'  => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m0 0h14M5 21H3m16 0h2M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1"/></svg>',
    'categories'=> '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>',
    'leaderboard'=> '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
    'sheets'    => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    'profile'   => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
    'notifications'=> '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>',
    'points'    => '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>',
];

// Build nav items based on role
$navItems = [];

if ($activeRole === 'admin' || $activeRole === 'sub_admin') {
    $navItems = [
        ['section' => 'Main'],
        ['key' => 'dashboard',   'label' => 'Dashboard',    'href' => $basePath . '/admin/dashboard.php',    'icon' => $icons['dashboard']],
        ['section' => 'Manage'],
        ['key' => 'leads',       'label' => 'Leads',        'href' => $basePath . '/admin/leads.php',        'icon' => $icons['leads']],
        ['key' => 'clients',     'label' => 'Clients',      'href' => $basePath . '/admin/clients.php',      'icon' => $icons['clients']],
        ['key' => 'tasks',       'label' => 'Tasks',        'href' => $basePath . '/admin/tasks.php',        'icon' => $icons['tasks']],
        ['key' => 'followups',   'label' => 'Follow-ups',   'href' => $basePath . '/admin/followups.php',    'icon' => $icons['followups']],
        ['section' => 'Organization'],
        ['key' => 'users',       'label' => 'Employees',    'href' => $basePath . '/admin/users.php',        'icon' => $icons['users']],
        ['key' => 'branches',    'label' => 'Branches',     'href' => $basePath . '/admin/branches.php',     'icon' => $icons['branches']],
        ['key' => 'categories',  'label' => 'Categories',   'href' => $basePath . '/admin/categories.php',   'icon' => $icons['categories']],
        ['section' => 'Analytics'],
        ['key' => 'leaderboard', 'label' => 'Leaderboard',  'href' => $basePath . '/admin/leaderboard.php',  'icon' => $icons['leaderboard']],
        ['key' => 'sheets',      'label' => 'Sheets',       'href' => $basePath . '/admin/sheets.php',       'icon' => $icons['sheets']],
    ];
} elseif ($activeRole === 'employee') {
    $navItems = [
        ['section' => 'Main'],
        ['key' => 'dashboard',   'label' => 'Dashboard',    'href' => $basePath . '/employee/dashboard.php',    'icon' => $icons['dashboard']],
        ['section' => 'My Work'],
        ['key' => 'leads',       'label' => 'My Leads',     'href' => $basePath . '/employee/leads.php',        'icon' => $icons['leads']],
        ['key' => 'clients',     'label' => 'My Clients',   'href' => $basePath . '/employee/clients.php',      'icon' => $icons['clients']],
        ['key' => 'tasks',       'label' => 'My Tasks',     'href' => $basePath . '/employee/tasks.php',        'icon' => $icons['tasks']],
        ['key' => 'followups',   'label' => 'Follow-ups',   'href' => $basePath . '/employee/followups.php',    'icon' => $icons['followups']],
        ['section' => 'Performance'],
        ['key' => 'leaderboard', 'label' => 'Leaderboard',  'href' => $basePath . '/employee/leaderboard.php',  'icon' => $icons['leaderboard']],
        ['key' => 'points',      'label' => 'My Points',    'href' => $basePath . '/employee/points.php',       'icon' => $icons['points']],
    ];
} elseif ($activeRole === 'client') {
    $navItems = [
        ['section' => 'Main'],
        ['key' => 'dashboard',     'label' => 'Dashboard',      'href' => $basePath . '/client/dashboard.php',      'icon' => $icons['dashboard']],
        ['section' => 'My Account'],
        ['key' => 'followups',     'label' => 'Follow-ups',     'href' => $basePath . '/client/followups.php',      'icon' => $icons['followups']],
        ['key' => 'notifications', 'label' => 'Notifications',  'href' => $basePath . '/client/notifications.php',  'icon' => $icons['notifications']],
    ];
}
?>

<!-- Sidebar -->
<aside class="sidebar">
    <div class="sidebar-brand">
        <div class="brand-icon">B</div>
        <div>
            <h2>Bimano CRM</h2>
            <small><?= htmlspecialchars(ucfirst($activeRole), ENT_QUOTES, 'UTF-8') ?> Panel</small>
        </div>
    </div>
    <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        <?php foreach ($navItems as $item): ?>
            <?php if (isset($item['section'])): ?>
                <div class="nav-section"><?= htmlspecialchars($item['section'], ENT_QUOTES, 'UTF-8') ?></div>
            <?php else: ?>
                <a href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>"
                   class="nav-link<?= ($activePage === $item['key']) ? ' active' : '' ?>"
                   <?= ($activePage === $item['key']) ? 'aria-current="page"' : '' ?>>
                    <?= $item['icon'] ?>
                    <span><?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?></span>
                </a>
            <?php endif; ?>
        <?php endforeach; ?>
    </nav>
    <div class="sidebar-footer">
        &copy; <?= date('Y') ?> Bimano Financial Services
    </div>
</aside>
