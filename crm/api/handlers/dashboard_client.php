<?php
/**
 * GET /crm/api/dashboard/client
 *
 * config.php already included by router.php
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;

if (!$payload || empty($payload['user_id'])) {
    api_error('Unauthorized — please log in.', 401);
}

$userId = (int) $payload['user_id'];
$conn   = db_connect();

// ── Get user's email ──────────────────────────────────────────────────────────
$stmt = $conn->prepare('SELECT `email` FROM `users` WHERE `id` = ? LIMIT 1');
$clientData  = null;
$followUps   = [];

if ($stmt) {
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $userEmail = $row['email'] ?? null;

    // Find client record linked by email
    if ($userEmail) {
        $stmt2 = @$conn->prepare('SELECT `id`, `name`, `email`, `phone`, `company`, `status` FROM `clients` WHERE `email` = ? LIMIT 1');
        if ($stmt2) {
            $stmt2->bind_param('s', $userEmail);
            $stmt2->execute();
            $clientRow = $stmt2->get_result()->fetch_assoc();
            $stmt2->close();

            if ($clientRow) {
                $clientData = [
                    'name'    => $clientRow['name'],
                    'email'   => $clientRow['email'],
                    'phone'   => $clientRow['phone'],
                    'company' => $clientRow['company'],
                    'status'  => $clientRow['status'],
                ];

                $clientId = (int) $clientRow['id'];
                $stmt3 = @$conn->prepare(
                    "SELECT f.`id`, f.`followup_date`, f.`note`, f.`status`, u.`name` as `assigned_to_name`
                     FROM `follow_ups` f
                     LEFT JOIN `users` u ON f.`assigned_to` = u.`id`
                     WHERE f.`client_id` = ?
                     ORDER BY f.`followup_date` DESC
                     LIMIT 10"
                );
                if ($stmt3) {
                    $stmt3->bind_param('i', $clientId);
                    $stmt3->execute();
                    $res = $stmt3->get_result();
                    while ($r = $res->fetch_assoc()) $followUps[] = $r;
                    $stmt3->close();
                }
            }
        }
    }
}

// ── Notifications ─────────────────────────────────────────────────────────────
$notifications = [];
$stmt4 = @$conn->prepare(
    "SELECT `id`, `title`, `message`, `type`, `is_read`, `created_at`
     FROM `notifications`
     WHERE `user_id` = ? AND `is_read` = 0
     ORDER BY `created_at` DESC
     LIMIT 10"
);
if ($stmt4) {
    $stmt4->bind_param('i', $userId);
    $stmt4->execute();
    $res4 = $stmt4->get_result();
    while ($r = $res4->fetch_assoc()) $notifications[] = $r;
    $stmt4->close();
}

$conn->close();

// ── Response ──────────────────────────────────────────────────────────────────
api_response([
    'success' => true,
    'data'    => [
        'client'        => $clientData,
        'follow_ups'    => $followUps,
        'notifications' => $notifications,
    ],
]);
