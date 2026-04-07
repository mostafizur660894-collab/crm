<?php
/**
 * Dashboard Header Include — Bimano CRM
 *
 * Outputs <head> + top navbar.
 * Expects: $pageTitle (string), $user (array from current_user())
 */

$basePath  = defined('BASE_URL') ? rtrim(BASE_URL, '/') : (defined('CRM_BASE_PATH') ? CRM_BASE_PATH : '');
$userName  = htmlspecialchars($user['name'] ?? 'User', ENT_QUOTES, 'UTF-8');
$userRole  = htmlspecialchars($user['role'] ?? '',     ENT_QUOTES, 'UTF-8');
$initials  = mb_strtoupper(mb_substr($userName, 0, 1));
$pageTitle = htmlspecialchars($pageTitle ?? 'Dashboard', ENT_QUOTES, 'UTF-8');
$cacheBust = filemtime(__DIR__ . '/../assets/css/dashboard.css') ?: time();
?>
<!DOCTYPE html>
<html lang="en" data-base-path="<?= $basePath ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#0f172a">
    <title><?= $pageTitle ?> — Bimano CRM</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= $basePath ?>/assets/css/dashboard.css?v=<?= $cacheBust ?>">
    <script>
    // Inject JWT for API calls — set once on page load
    (function(){var t=<?= json_encode($_SESSION['jwt'] ?? '', JSON_HEX_TAG | JSON_HEX_AMP) ?>;if(t)sessionStorage.setItem('crm_token',t);})();
    </script>
</head>
<body>

<!-- Mobile Sidebar Overlay -->
<div class="sidebar-overlay"></div>

<!-- Top Navbar -->
<nav class="navbar">
    <div class="navbar-left">
        <button class="menu-toggle" aria-label="Toggle menu">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div>
            <h1><?= $pageTitle ?></h1>
        </div>
    </div>
    <div class="navbar-right">
        <!-- Notification Bell -->
        <div class="notification-bell" id="notif-bell" onclick="CRM.toggleNotifications()">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span class="notif-count" id="notif-count" style="display:none;">0</span>
            <div class="notification-dropdown" id="notif-dropdown">
                <div class="notif-header">
                    <h4>Notifications</h4>
                    <a href="#" onclick="CRM.markAllRead();return false;">Mark all read</a>
                </div>
                <div id="notif-list">
                    <div class="notif-empty">No notifications yet</div>
                </div>
            </div>
        </div>
        <div class="user-info">
            <div class="user-avatar"><?= $initials ?></div>
            <div>
                <div class="user-name"><?= $userName ?></div>
                <div class="user-role"><?= $userRole ?></div>
            </div>
        </div>
        <a href="<?= $basePath ?>/logout.php" class="btn-logout">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4M12 11l3-3-3-3M7 8h8"/></svg>
            Logout
        </a>
    </div>
</nav>
