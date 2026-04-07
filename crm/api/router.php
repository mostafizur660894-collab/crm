<?php
/**
 * PHP API Router — Bimano CRM
 *
 * Handles all requests to /crm/api/*
 * Loaded by the .htaccess RewriteRule for ^api/(.*)$
 *
 * PHP 8.0+
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

// Apply CORS headers & handle preflight OPTIONS immediately
api_cors();

// ── Extract path after /api/ ──────────────────────────────────────────────────
// REQUEST_URI example: /crm/api/auth/login
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
$apiPos = strpos($uri, '/api/');
$path   = ($apiPos !== false)
    ? trim(substr($uri, $apiPos + 5), '/')
    : '';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// ── Expose path to handlers ───────────────────────────────────────────────────
$_api_subpath = $path;

// ── Route table: exact matches first ─────────────────────────────────────────
$routes = [
    // Auth
    'POST:auth/login'           => 'auth_login.php',
    'GET:auth/me'               => 'auth_me.php',
    'POST:auth/logout'          => 'auth_logout.php',
    // Dashboards
    'GET:dashboard/admin'       => 'dashboard_admin.php',
    'GET:dashboard/sub-admin'   => 'dashboard_admin.php',
    'GET:dashboard/employee'    => 'dashboard_employee.php',
    'GET:dashboard/client'      => 'dashboard_client.php',
    // Resources — all methods on same handler
    'GET:branches'    => 'branches.php', 'POST:branches'   => 'branches.php',
    'PUT:branches'    => 'branches.php', 'DELETE:branches' => 'branches.php',
    'GET:categories'  => 'categories.php', 'POST:categories'  => 'categories.php',
    'PUT:categories'  => 'categories.php', 'DELETE:categories'=> 'categories.php',
    'GET:users/roles' => 'users.php',
    'GET:users'       => 'users.php', 'POST:users'   => 'users.php',
    'PUT:users'       => 'users.php', 'DELETE:users' => 'users.php',
    'GET:leads'       => 'leads.php', 'POST:leads'   => 'leads.php',
    'PUT:leads'       => 'leads.php', 'DELETE:leads' => 'leads.php',
    'GET:clients'     => 'clients.php', 'POST:clients'   => 'clients.php',
    'PUT:clients'     => 'clients.php', 'DELETE:clients' => 'clients.php',
    'GET:tasks'       => 'tasks.php', 'POST:tasks'   => 'tasks.php',
    'PUT:tasks'       => 'tasks.php', 'DELETE:tasks' => 'tasks.php',
    'GET:followups'   => 'followups.php', 'POST:followups'   => 'followups.php',
    'PUT:followups'   => 'followups.php', 'DELETE:followups' => 'followups.php',
    'GET:notes'       => 'notes.php', 'POST:notes'   => 'notes.php',
    'PUT:notes'       => 'notes.php', 'DELETE:notes' => 'notes.php',
    'GET:leaderboard'           => 'leaderboard.php',
    'GET:leaderboard/analytics' => 'leaderboard.php',
    'GET:leaderboard/branches'  => 'leaderboard.php',
    'GET:sheets'      => 'sheets.php', 'POST:sheets'   => 'sheets.php',
    'DELETE:sheets'   => 'sheets.php',
];

$key     = "$method:$path";
$handler = null;

// Exact match
if (isset($routes[$key])) {
    $handler = __DIR__ . '/handlers/' . $routes[$key];
}

// Pattern matches: /leads/:id/convert, /tasks/:id, /users/:id, /clients/:id, etc.
if (!$handler) {
    if ($method === 'POST' && preg_match('#^leads/\d+/convert$#', $path)) {
        $handler = __DIR__ . '/handlers/leads.php';
    } elseif (preg_match('#^(leads|clients|tasks|followups|notes|branches|categories|users|sheets)/\d+(/.+)?$#', $path, $m)) {
        $handler = __DIR__ . '/handlers/' . $m[1] . '.php';
    } elseif (preg_match('#^sheets/\d+/live$#', $path)) {
        $handler = __DIR__ . '/handlers/sheets.php';
    } elseif (preg_match('#^(put|delete):(\w+)/\d+$#i', "$method:$path", $m)) {
        $f = strtolower($m[2]) . '.php';
        $h = __DIR__ . '/handlers/' . $f;
        if (file_exists($h)) $handler = $h;
    }
}

if ($handler && file_exists($handler)) {
    require $handler;
} else {
    api_error("API endpoint not found: $method /$path", 404);
}
