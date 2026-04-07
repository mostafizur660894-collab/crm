<?php
/**
 * Bimano CRM — config.php
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HOSTINGER SETUP — edit the three lines marked ★ below      ║
 * ║  Then visit:  https://yourdomain.com/crm/setup.php?token=   ║
 * ║               bimano-setup-2024                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Required: PHP 8.0+  (set in hPanel → PHP Configuration)
 */

// ── Production error handling (hide errors from browser) ─────────────────────
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// ══════════════════════════════════════════════════════════════════════════════
// Database — Hostinger (bimanofinancials.com)
// ══════════════════════════════════════════════════════════════════════════════
define('DB_HOST', 'localhost');                    // always localhost on Hostinger
define('DB_PORT', 3306);
define('DB_NAME', 'u710294496_crm_db');           // Hostinger database name
define('DB_USER', 'u710294496_mostafizur660');    // Hostinger database user
define('DB_PASS', 'Rakib@660#');                  // Hostinger database password
define('DB_CHARSET', 'utf8mb4');

// ══════════════════════════════════════════════════════════════════════════════
// Deployment path
// Site root  → bimanofinancials.com/crm/  → CRM_BASE_PATH = '/crm'
// ══════════════════════════════════════════════════════════════════════════════
define('CRM_BASE_PATH', '');       // subdomain root: crm.bimanofinancials.com
define('BASE_URL', '/');            // absolute URL prefix for all links and asset paths

// ── MySQLi connection ─────────────────────────────────────────────────────────
function db_connect(): mysqli
{
    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

    if ($conn->connect_errno) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        // Never expose the real error message in production output
        echo json_encode(['success' => false, 'message' => 'Service temporarily unavailable.']);
        exit;
    }

    $conn->set_charset(DB_CHARSET);
    return $conn;
}

// ── Session hardening ─────────────────────────────────────────────────────────
function configure_session(): void
{
    ini_set('session.cookie_httponly',  '1');
    ini_set('session.cookie_samesite',  'Strict');
    ini_set('session.use_strict_mode',  '1');
    ini_set('session.gc_maxlifetime',   '7200');

    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        ini_set('session.cookie_secure', '1');
    }
}

// ── Safe redirect ─────────────────────────────────────────────────────────────
function redirect(string $path): void
{
    $safe = str_replace(["\r", "\n"], '', $path);
    header('Location: ' . $safe, true, 302);
    exit;
}

// ── JWT — pure PHP HS256 implementation (no external library) ─────────────────
// Secret used to sign tokens. Keep this private — never expose in responses.
define('JWT_SECRET', 'Bn!maN0F!nT@x#2024$S3cr3tK3yChangeM3Pl3ase');
define('JWT_TTL',    86400 * 7); // 7 days in seconds

function _b64url_enc(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function _b64url_dec(string $data): string
{
    $padded = str_pad(strtr($data, '-_', '+/'), strlen($data) + (4 - strlen($data) % 4) % 4, '=');
    return base64_decode($padded);
}

function jwt_encode(array $payload): string
{
    $header = _b64url_enc('{"typ":"JWT","alg":"HS256"}');
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_TTL;
    $body = _b64url_enc((string) json_encode($payload, JSON_UNESCAPED_UNICODE));
    $sig  = _b64url_enc(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

function jwt_decode(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$h, $b, $sig] = $parts;

    $expected = _b64url_enc(hash_hmac('sha256', "$h.$b", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;

    $payload = json_decode((string) _b64url_dec($b), true);
    if (!is_array($payload)) return null;
    if (($payload['exp'] ?? 0) < time()) return null;

    return $payload;
}

// ── CORS headers for API responses ───────────────────────────────────────────
function api_cors(): void
{
    // For Hostinger (same domain), these are mostly for local dev convenience
    if (!headers_sent()) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ── Standard API JSON output ──────────────────────────────────────────────────
function api_response(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_error(string $message, int $status = 400): void
{
    api_response(['success' => false, 'message' => $message], $status);
}

// ── Extract Bearer token from Authorization header ────────────────────────────
function bearer_token(): ?string
{
    $auth = $_SERVER['HTTP_AUTHORIZATION']
         ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
         ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        return $m[1];
    }
    return null;
}

// ── Role helpers ──────────────────────────────────────────────────────────────
function role_to_id(string $role): int
{
    return match ($role) {
        'admin'     => 1,
        'sub_admin' => 2,
        'employee'  => 3,
        'client'    => 4,
        default     => 3,
    };
}

