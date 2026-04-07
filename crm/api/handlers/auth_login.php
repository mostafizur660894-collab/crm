<?php
/**
 * POST /crm/api/auth/login
 *
 * Request (JSON):  { "email": "...", "password": "..." }
 * Response:
 *   {
 *     "success": true,
 *     "message": "Login successful",
 *     "data": {
 *       "token": "<JWT>",
 *       "user": { id, uuid, name, email, role, role_id, is_super, ... }
 *     }
 *   }
 *
 * config.php is already included by router.php
 */

// ── Parse body ────────────────────────────────────────────────────────────────
$raw  = (string) file_get_contents('php://input');
$body = json_decode($raw, true);

// Also accept form-urlencoded
$email    = trim((string) ($body['email']    ?? $_POST['email']    ?? ''));
$password =       (string) ($body['password'] ?? $_POST['password'] ?? '');

// ── Validate ──────────────────────────────────────────────────────────────────
if ($email === '' || $password === '') {
    api_error('Email and password are required.', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    api_error('Invalid email format.', 400);
}

if (strlen($password) > 1024) {
    api_error('Invalid credentials.', 401);
}

// ── DB lookup ─────────────────────────────────────────────────────────────────
$conn = db_connect();

$stmt = $conn->prepare(
    'SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1'
);
if (!$stmt) {
    $conn->close();
    api_error('Server error.', 500);
}
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

// ── Verify password (timing-safe path) ───────────────────────────────────────
$dummy = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
$hash  = $user ? $user['password'] : $dummy;

if (!$user || !password_verify($password, $hash)) {
    $conn->close();
    api_error('Invalid email or password.', 401);
}

// ── Update last_login ─────────────────────────────────────────────────────────
$upd = $conn->prepare('UPDATE users SET last_login = NOW() WHERE id = ?');
if ($upd) {
    $upd->bind_param('i', $user['id']);
    $upd->execute();
    $upd->close();
}
$conn->close();

// ── Build user payload (matches Node.js response shape exactly) ───────────────
$roleId  = role_to_id($user['role']);
$isSuper = ($user['role'] === 'admin');
$uuid    = 'usr-' . str_pad((string) $user['id'], 8, '0', STR_PAD_LEFT);

$userData = [
    'id'           => (int) $user['id'],
    'uuid'         => $uuid,
    'name'         => $user['name'],
    'email'        => $user['email'],
    'role'         => $user['role'],
    'role_id'      => $roleId,
    'branch_id'    => null,
    'is_super'     => $isSuper,
    'branch_access'=> [],
    'permissions'  => [],
];

// ── Sign JWT ──────────────────────────────────────────────────────────────────
$token = jwt_encode([
    'user_id'      => (int) $user['id'],
    'uuid'         => $uuid,
    'role_id'      => $roleId,
    'role'         => $user['role'],
    'branch_id'    => null,
    'branch_access'=> [],
]);

// ── Respond ───────────────────────────────────────────────────────────────────
api_response([
    'success' => true,
    'message' => 'Login successful',
    'data'    => [
        'token' => $token,
        'user'  => $userData,
    ],
]);
