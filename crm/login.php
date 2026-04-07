<?php
/**
 * Login — Bimano CRM
 *
 * GET  /crm/login.php          → renders HTML login form
 * POST /crm/login.php          → form-submit: validates then redirects to dashboard
 * POST /crm/login.php (JSON)   → API mode: returns JSON {"success":bool,"role":string}
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// ── Determine if caller expects JSON ─────────────────────────────────────────

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isJsonApi   = str_contains($contentType, 'application/json')
            || str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function form_error(string $message, string $email = ''): void
{
    // Redirect back with a URL-encoded error; the GET handler renders it.
    $params = http_build_query(['error' => $message, 'email' => $email]);
    redirect(CRM_BASE_PATH . '/login.php?' . $params);
}

// ── GET → render login form ───────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // If already logged in, send the user to their dashboard.
    configure_session();
    session_start();

    if (!empty($_SESSION['user_id']) && !empty($_SESSION['role'])) {
        $roleMap = [
            'admin'    => CRM_BASE_PATH . '/admin/dashboard.php',
            'employee' => CRM_BASE_PATH . '/employee/dashboard.php',
            'client'   => CRM_BASE_PATH . '/client/dashboard.php',
        ];
        redirect($roleMap[$_SESSION['role']] ?? CRM_BASE_PATH . '/login.php');
    }

    session_write_close(); // don't hold session open during HTML render

    $errorMsg    = htmlspecialchars($_GET['error']      ?? '', ENT_QUOTES, 'UTF-8');
    $savedEmail  = htmlspecialchars($_GET['email']      ?? '', ENT_QUOTES, 'UTF-8');
    $loggedOut   = isset($_GET['logged_out']);
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login — Bimano CRM</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
        }
        .card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 25px 50px rgba(0,0,0,.35);
            padding: 2.5rem 2rem;
            width: 100%;
            max-width: 400px;
        }
        .logo {
            text-align: center;
            margin-bottom: 1.75rem;
        }
        .logo h1 {
            font-size: 1.6rem;
            font-weight: 700;
            color: #1e3a5f;
            letter-spacing: -.5px;
        }
        .logo p { color: #64748b; font-size: .875rem; margin-top: .25rem; }
        label { display: block; font-size: .875rem; font-weight: 600; color: #374151; margin-bottom: .35rem; }
        input[type=email], input[type=password] {
            width: 100%; padding: .65rem .9rem;
            border: 1.5px solid #d1d5db;
            border-radius: 7px;
            font-size: .95rem;
            outline: none;
            transition: border-color .2s;
            margin-bottom: 1.1rem;
        }
        input[type=email]:focus, input[type=password]:focus {
            border-color: #1e3a5f;
            box-shadow: 0 0 0 3px rgba(30,58,95,.12);
        }
        button[type=submit] {
            width: 100%;
            padding: .75rem;
            background: #1e3a5f;
            color: #fff;
            font-size: 1rem;
            font-weight: 600;
            border: none;
            border-radius: 7px;
            cursor: pointer;
            transition: background .2s;
        }
        button[type=submit]:hover { background: #15294a; }
        .error {
            background: #fee2e2; color: #991b1b;
            border: 1px solid #fca5a5;
            border-radius: 7px;
            padding: .65rem .9rem;
            font-size: .875rem;
            margin-bottom: 1.1rem;
        }
        .hint {
            margin-top: 1.25rem;
            padding: 1rem;
            background: #f8fafc;
            border-radius: 7px;
            font-size: .78rem;
            color: #64748b;
            line-height: 1.6;
        }
        .hint strong { color: #374151; }
    </style>
</head>
<body>
<div class="card">
    <div class="logo">
        <h1>Bimano CRM</h1>
        <p>Sign in to your account</p>
    </div>

    <?php if ($loggedOut && $errorMsg === ''): ?>
        <div class="error" style="background:#dcfce7;color:#166534;border-color:#86efac;">
            You have been logged out successfully.
        </div>
    <?php elseif ($errorMsg !== ''): ?>
        <div class="error"><?= $errorMsg ?></div>
    <?php endif; ?>

    <form method="POST" action="<?= htmlspecialchars(CRM_BASE_PATH . '/login.php', ENT_QUOTES, 'UTF-8') ?>">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email"
               value="<?= $savedEmail ?>"
               required autocomplete="email" autofocus>

        <label for="password">Password</label>
        <input type="password" id="password" name="password"
               required autocomplete="current-password">

        <button type="submit">Sign In</button>
    </form>

    <div class="hint">
        <strong>Admin login:</strong><br>
        mostafizur660894@gmail.com &rarr; Rakib@9101#
    </div>
</div>
</body>
</html>
    <?php
    exit;
}

// ── POST only beyond this point ───────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if ($isJsonApi) {
        http_response_code(405);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        exit;
    }
    redirect(CRM_BASE_PATH . '/login.php');
}

// ── Parse input ───────────────────────────────────────────────────────────────

if ($isJsonApi && str_contains($contentType, 'application/json')) {
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body)) {
        json_response(['success' => false, 'message' => 'Invalid JSON body.'], 400);
    }
    $email    = trim((string) ($body['email']    ?? ''));
    $password =       (string) ($body['password'] ?? '');
} else {
    $email    = trim((string) ($_POST['email']    ?? ''));
    $password =       (string) ($_POST['password'] ?? '');
}

// ── Validation ────────────────────────────────────────────────────────────────

if ($email === '' || $password === '') {
    $isJsonApi
        ? json_response(['success' => false, 'message' => 'Email and password are required.'], 400)
        : form_error('Email and password are required.', $email);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $isJsonApi
        ? json_response(['success' => false, 'message' => 'Invalid email format.'], 400)
        : form_error('Invalid email format.', $email);
}

// Prevent DoS: bcrypt on very long strings is expensive
if (strlen($password) > 1024) {
    $isJsonApi
        ? json_response(['success' => false, 'message' => 'Invalid credentials.'], 401)
        : form_error('Invalid credentials.', $email);
}

// ── Database lookup (prepared statement — no SQL injection) ───────────────────

$conn = db_connect();

$stmt = $conn->prepare('SELECT id, name, password, role FROM users WHERE email = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    $isJsonApi
        ? json_response(['success' => false, 'message' => 'Server error.'], 500)
        : form_error('A server error occurred. Please try again.');
}

$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

// ── Verify password (constant-time path to prevent user enumeration) ───────────

// Even when $user is null we call password_verify() with a dummy hash so the
// response time does not leak whether the account exists.
$dummyHash  = '$2y$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
$storedHash = $user ? $user['password'] : $dummyHash;
$valid      = password_verify($password, $storedHash);

if (!$user || !$valid) {
    $isJsonApi
        ? json_response(['success' => false, 'message' => 'Invalid credentials.'], 401)
        : form_error('Invalid email or password.', $email);
}

// ── Start / restore session ───────────────────────────────────────────────────

configure_session();
session_start();
session_regenerate_id(true); // prevent session fixation

$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['name']    = $user['name'];
$_SESSION['role']    = $user['role'];

// Generate JWT for API calls from dashboard pages
$_SESSION['jwt'] = jwt_encode([
    'user_id'      => (int) $user['id'],
    'uuid'         => 'usr-' . str_pad((string) $user['id'], 8, '0', STR_PAD_LEFT),
    'role_id'      => role_to_id($user['role']),
    'role'         => $user['role'],
    'branch_id'    => null,
    'branch_access'=> [],
]);

// ── Respond ───────────────────────────────────────────────────────────────────

if ($isJsonApi) {
    json_response(['success' => true, 'role' => $user['role']]);
}

// Form submit → redirect to the correct role dashboard
$dashboards = [
    'admin'    => CRM_BASE_PATH . '/admin/dashboard.php',
    'employee' => CRM_BASE_PATH . '/employee/dashboard.php',
    'client'   => CRM_BASE_PATH . '/client/dashboard.php',
];

redirect($dashboards[$user['role']] ?? CRM_BASE_PATH . '/login.php');
