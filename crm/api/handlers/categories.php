<?php
/**
 * /crm/api/categories
 * GET / POST / PUT / DELETE
 */

$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;
if (!$payload) api_error('Unauthorized.', 401);

$conn   = db_connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $res  = $conn->query("SELECT * FROM `categories` ORDER BY `name` ASC");
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $conn->close();
    api_response(['success' => true, 'data' => $rows]);
}

if (!in_array($payload['role'] ?? '', ['admin', 'sub_admin'], true)) {
    $conn->close(); api_error('Forbidden.', 403);
}

$raw  = (string) file_get_contents('php://input');
$body = json_decode($raw, true) ?? [];

if ($method === 'POST') {
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') { $conn->close(); api_error('Category name is required.', 400); }
    $desc = $body['description'] ?? null;
    $stmt = $conn->prepare('INSERT INTO `categories` (`name`,`description`) VALUES (?,?)');
    $stmt->bind_param('ss', $name, $desc);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Category created.', 'data' => ['id' => $id]], 201);
}

if ($method === 'PUT') {
    $id   = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    $name = trim((string) ($body['name'] ?? ''));
    if (!$id || $name === '') { $conn->close(); api_error('id and name required.', 400); }
    $desc   = $body['description'] ?? null;
    $active = isset($body['is_active']) ? (int) $body['is_active'] : 1;
    $stmt   = $conn->prepare('UPDATE `categories` SET `name`=?,`description`=?,`is_active`=? WHERE `id`=?');
    $stmt->bind_param('ssii', $name, $desc, $active, $id);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Category updated.']);
}

if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `categories` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Category deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
