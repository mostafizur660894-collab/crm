<?php
/**
 * Logout — Bimano CRM
 *
 * Destroys the session, clears the cookie, and redirects to login.
 * Returns JSON instead of redirecting when called by an XHR/API client.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

configure_session();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Clear all session variables, then invalidate the session
session_unset();

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        [
            'expires'  => time() - 3600,
            'path'     => $params['path']     ?: '/',
            'domain'   => $params['domain']   ?: '',
            'secure'   => $params['secure'],
            'httponly' => true,
            'samesite' => 'Strict',
        ]
    );
}

session_destroy();

// JSON response for API / XHR callers
if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
    exit;
}

redirect(CRM_BASE_PATH . '/login.php?logged_out=1');
