<?php
/**
 * Session Guard — auth.php
 * Bimano CRM
 *
 * Include at the top of every protected page:
 *
 *   require_once __DIR__ . '/../auth.php';   // from a sub-folder
 *   require_role('admin');                    // optional role check
 *
 * Exposed API:
 *   require_auth()       — redirect to login if not authenticated
 *   require_role(string) — redirect/403 if the session role doesn't match
 *   current_user()       — ['id' => int, 'name' => string, 'role' => string]
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

configure_session();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ensure the visitor has an active, authenticated session.
 * Destroys invalid sessions and redirects to login.
 */
function require_auth(): void
{
    if (
        empty($_SESSION['user_id']) ||
        !is_int($_SESSION['user_id']) ||
        empty($_SESSION['role'])
    ) {
        session_unset();
        session_destroy();
        redirect(CRM_BASE_PATH . '/login.php');
    }
}

/**
 * Ensure the visitor's role matches $role.
 * Call after require_auth() — or it will call it internally.
 *
 * Non-matching visitors are redirected to their own dashboard (browser) or
 * receive HTTP 403 JSON (API / XHR clients).
 */
/**
 * @param string|string[] $role  One role name or an array of allowed role names.
 */
function require_role(string|array $role): void
{
    require_auth();

    $allowed = is_array($role) ? $role : [$role];
    if (in_array($_SESSION['role'], $allowed, true)) {
        return;
    }

    // Return JSON 403 for API callers
    $acceptsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

    if ($acceptsJson) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Forbidden.']);
        exit;
    }

    // Browser: send to the correct dashboard for their actual role
    $dashboards = [
        'admin'    => CRM_BASE_PATH . '/admin/dashboard.php',
        'employee' => CRM_BASE_PATH . '/employee/dashboard.php',
        'client'   => CRM_BASE_PATH . '/client/dashboard.php',
    ];

    redirect($dashboards[$_SESSION['role']] ?? CRM_BASE_PATH . '/login.php');
}

/**
 * Return the current user's session data.
 *
 * @return array{id: int, name: string, role: string}
 */
function current_user(): array
{
    return [
        'id'   => (int)    ($_SESSION['user_id'] ?? 0),
        'name' => (string) ($_SESSION['name']    ?? ''),
        'role' => (string) ($_SESSION['role']    ?? ''),
    ];
}
