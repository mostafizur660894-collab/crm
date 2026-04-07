<?php
/**
 * Dashboard Header Include — Bimano CRM
 *
 * Outputs <head> + top navbar.
 * Expects: $pageTitle (string), $user (array from current_user())
 */

$basePath  = defined('CRM_BASE_PATH') ? CRM_BASE_PATH : '';
$userName  = htmlspecialchars($user['name'] ?? 'User', ENT_QUOTES, 'UTF-8');
$userRole  = htmlspecialchars($user['role'] ?? '',     ENT_QUOTES, 'UTF-8');
$initials  = mb_strtoupper(mb_substr($userName, 0, 1));
$pageTitle = htmlspecialchars($pageTitle ?? 'Dashboard', ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?> — Bimano CRM</title>
    <link rel="stylesheet" href="<?= $basePath ?>/assets/css/dashboard.css">
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
