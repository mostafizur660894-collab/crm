<?php
/**
 * /crm/api/branches
 * GET    → list all branches
 * POST   → create branch
 * PUT    → update branch  (id in query: ?id=)
 * DELETE → delete branch  (id in query: ?id=)
 */

$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;
if (!$payload) api_error('Unauthorized.', 401);

$conn   = db_connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// ── GET ───────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $res = $conn->query("SELECT * FROM `branches` ORDER BY `name` ASC");
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $conn->close();
    api_response(['success' => true, 'data' => $rows]);
}

// ── Require admin for mutations ───────────────────────────────────────────────
if (!in_array($payload['role'] ?? '', ['admin', 'sub_admin'], true)) {
    $conn->close(); api_error('Forbidden.', 403);
}

$raw  = (string) file_get_contents('php://input');
$body = json_decode($raw, true) ?? [];

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $name  = trim((string) ($body['name'] ?? ''));
    if ($name === '') { $conn->close(); api_error('Branch name is required.', 400); }
    $stmt = $conn->prepare('INSERT INTO `branches` (`name`,`address`,`city`,`state`,`phone`,`email`,`is_active`) VALUES (?,?,?,?,?,?,1)');
    $addr  = $body['address'] ?? null;
    $city  = $body['city'] ?? null;
    $state = $body['state'] ?? null;
    $phone = $body['phone'] ?? null;
    $email = $body['email'] ?? null;
    $stmt->bind_param('ssssss', $name, $addr, $city, $state, $phone, $email);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Branch created.', 'data' => ['id' => $id]], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Branch id required.', 400); }
    $name  = trim((string) ($body['name'] ?? ''));
    if ($name === '') { $conn->close(); api_error('Branch name is required.', 400); }
    $addr  = $body['address'] ?? null;
    $city  = $body['city'] ?? null;
    $state = $body['state'] ?? null;
    $phone = $body['phone'] ?? null;
    $email = $body['email'] ?? null;
    $active = isset($body['is_active']) ? (int) $body['is_active'] : 1;
    $stmt = $conn->prepare('UPDATE `branches` SET `name`=?,`address`=?,`city`=?,`state`=?,`phone`=?,`email`=?,`is_active`=? WHERE `id`=?');
    $stmt->bind_param('ssssssii', $name, $addr, $city, $state, $phone, $email, $active, $id);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Branch updated.']);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Branch id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `branches` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Branch deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
