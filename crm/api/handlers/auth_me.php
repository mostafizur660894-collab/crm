<?php
/**
 * GET /crm/api/auth/me
 *
 * Requires: Authorization: Bearer <JWT>
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": { id, uuid, name, email, role, role_id, ... }
 *   }
 *
 * config.php is already included by router.php
 */

// ── Extract & verify token ────────────────────────────────────────────────────
$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;

if (!$payload || empty($payload['user_id'])) {
    api_error('Unauthorized — please log in.', 401);
}

$userId = (int) $payload['user_id'];

// ── DB lookup ─────────────────────────────────────────────────────────────────
$conn = db_connect();

$stmt = $conn->prepare(
    'SELECT id, name, email, role, created_at, last_login FROM users WHERE id = ? LIMIT 1'
);
if (!$stmt) {
    $conn->close();
    api_error('Server error.', 500);
}
$stmt->bind_param('i', $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if (!$user) {
    api_error('User not found.', 404);
}

// ── Build response ────────────────────────────────────────────────────────────
$roleId  = role_to_id($user['role']);
$isSuper = ($user['role'] === 'admin');
$uuid    = 'usr-' . str_pad((string) $user['id'], 8, '0', STR_PAD_LEFT);

api_response([
    'success' => true,
    'data'    => [
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
        'is_active'    => true,
        'last_login'   => $user['last_login'],
        'created_at'   => $user['created_at'],
        'phone'        => null,
    ],
]);
