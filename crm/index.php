<?php
/**
 * Entry Point — Bimano CRM
 * Falls back to serving index.html if the React SPA file exists,
 * otherwise shows a maintenance page.
 */

// PHP version gate
if (PHP_MAJOR_VERSION < 8) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Bimano CRM requires PHP 8.0+. Current: ' . PHP_VERSION;
    exit(1);
}

require_once __DIR__ . '/config.php';

configure_session();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!empty($_SESSION['user_id']) && !empty($_SESSION['role'])) {
    $dashboards = [
        'admin'    => CRM_BASE_PATH . '/admin/dashboard.php',
        'employee' => CRM_BASE_PATH . '/employee/dashboard.php',
        'client'   => CRM_BASE_PATH . '/client/dashboard.php',
    ];
    redirect($dashboards[$_SESSION['role']] ?? CRM_BASE_PATH . '/login.php');
}

redirect(CRM_BASE_PATH . '/login.php');
