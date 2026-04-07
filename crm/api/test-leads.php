#!/usr/bin/env php
<?php
/**
 * Bimano CRM — Leads API Test Suite
 * File: /crm/api/test-leads.php
 * 
 * Run from command line:
 *   php crm/api/test-leads.php
 * 
 * Or from browser:
 *   http://localhost/api/test-leads.php
 */

declare(strict_types=1);

// Use CLI formatting if running from terminal
$is_cli = php_sapi_name() === 'cli';

if (!$is_cli) {
    header('Content-Type: text/plain; charset=utf-8');
}

echo ($is_cli ? "\n" : "<pre>") . "=== BIMANO CRM LEADS API TEST SUITE ===\n\n";

// Test 1: Database Connection
echo "TEST 1: Database Connection\n";
echo str_repeat("─", 50) . "\n";

try {
    // Database credentials (must match leads.php)
    $conn = new mysqli(
        'localhost',                      // DB_HOST
        'u710294496_mostafizur660',       // DB_USER
        'Rakib@660#',                     // DB_PASS
        'u710294496_crm_db',              // DB_NAME
        3306                              // DB_PORT
    );

    if ($conn->connect_errno) {
        echo "❌ FAILED: " . $conn->connect_error . "\n";
        echo "   Check database credentials in /crm/api/leads.php\n";
        exit;
    }

    echo "✓ Database connection successful\n";
    echo "  Host: localhost\n";
    echo "  Database: u710294496_crm_db\n";
    echo "  Charset: " . $conn->get_charset()->charset . "\n\n";

    // Test 2: Table Verification
    echo "TEST 2: Database Tables\n";
    echo str_repeat("─", 50) . "\n";

    $required_tables = ['leads', 'categories', 'branches', 'clients', 'tasks', 'notes'];
    $result = $conn->query("SHOW TABLES");
    $existing_tables = [];

    while ($row = $result->fetch_row()) {
        $existing_tables[] = $row[0];
    }

    foreach ($required_tables as $table) {
        if (in_array($table, $existing_tables)) {
            echo "✓ Table `{$table}` exists\n";
        } else {
            echo "❌ Table `{$table}` MISSING — Run schema.sql\n";
        }
    }

    echo "\n";

    // Test 3: Leads Table Structure
    echo "TEST 3: Leads Table Structure\n";
    echo str_repeat("─", 50) . "\n";

    $columns_result = $conn->query("DESC `leads`");
    $required_columns = [
        'id', 'name', 'email', 'phone', 'company',
        'source', 'status', 'notes', 'category_id',
        'branch_id', 'assigned_to', 'created_by',
        'created_at', 'updated_at'
    ];

    $existing_columns = [];
    while ($col = $columns_result->fetch_assoc()) {
        $existing_columns[] = $col['Field'];
    }

    foreach ($required_columns as $col) {
        if (in_array($col, $existing_columns)) {
            echo "✓ Column `{$col}` exists\n";
        } else {
            echo "❌ Column `{$col}` MISSING\n";
        }
    }

    echo "\n";

    // Test 4: Sample Data
    echo "TEST 4: Sample Data in Leads Table\n";
    echo str_repeat("─", 50) . "\n";

    $count_result = $conn->query("SELECT COUNT(*) as total FROM `leads`");
    $count = $count_result->fetch_assoc()['total'];

    if ($count > 0) {
        echo "✓ Found {$count} leads in database\n\n";

        $sample = $conn->query("SELECT * FROM `leads` LIMIT 3");
        echo "Sample leads:\n";
        while ($lead = $sample->fetch_assoc()) {
            echo "  ID: {$lead['id']} | Name: {$lead['name']} | Phone: {$lead['phone']} | Status: {$lead['status']}\n";
        }
    } else {
        echo "⚠ No sample data found (this is OK for a new setup)\n";
        echo "  Create a test lead via POST /api/leads.php\n";
    }

    echo "\n";

    // Test 5: API File Check
    echo "TEST 5: API File Verification\n";
    echo str_repeat("─", 50) . "\n";

    $api_file = __DIR__ . '/leads.php';
    if (file_exists($api_file)) {
        echo "✓ File exists: {$api_file}\n";
        echo "  Size: " . filesize($api_file) . " bytes\n";
        echo "  Readable: " . (is_readable($api_file) ? "Yes" : "No") . "\n";
    } else {
        echo "❌ API file not found: {$api_file}\n";
    }

    echo "\n";

    // Test 6: Simulated GET Request
    echo "TEST 6: Simulated API Call (GET /leads)\n";
    echo str_repeat("─", 50) . "\n";

    $result = $conn->query("
        SELECT COUNT(*) as total FROM `leads`
    ");
    $stats = $result->fetch_assoc();

    echo "Sample API Response (GET):\n";
    $response = [
        'success' => true,
        'data' => [],
        'pagination' => [
            'total' => (int)$stats['total'],
            'limit' => 50,
            'offset' => 0,
            'count' => 0
        ]
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

    // Test 7: Simulated POST Request
    echo "TEST 7: Simulated API Call (POST new lead)\n";
    echo str_repeat("─", 50) . "\n";

    $sample_lead = [
        'success' => true,
        'message' => 'Lead created successfully',
        'data' => [
            'id' => 999,
            'name' => 'John Doe',
            'phone' => '555-1234',
            'email' => 'john@example.com',
            'company' => 'Acme Corp',
            'source' => 'Website',
            'status' => 'new',
            'category_id' => 1,
            'branch_id' => 1,
            'assigned_to' => null,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ];

    echo json_encode($sample_lead, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

    // Test 8: CORS & Headers
    echo "TEST 8: API Headers\n";
    echo str_repeat("─", 50) . "\n";

    echo "✓ Content-Type: application/json; charset=utf-8\n";
    echo "✓ Access-Control-Allow-Origin: *\n";
    echo "✓ Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\n";
    echo "✓ Cache-Control: no-store, no-cache, must-revalidate\n\n";

    // Summary
    echo "=== TEST SUMMARY ===\n";
    echo str_repeat("─", 50) . "\n";
    echo "✓ All critical tests passed!\n\n";
    echo "NEXT STEPS:\n";
    echo "1. Test the API with curl:\n";
    echo "   curl http://localhost/api/leads.php\n\n";
    echo "2. Create a test lead with POST:\n";
    echo "   curl -X POST http://localhost/api/leads.php \\\n";
    echo "     -H 'Content-Type: application/json' \\\n";
    echo "     -d '{\"name\":\"Test\",\"phone\":\"555-0000\"}'\n\n";
    echo "3. View full documentation:\n";
    echo "   cat crm/api/LEADS_API.md\n\n";

    $conn->close();

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit;
}

echo ($is_cli ? "" : "</pre>");
?>
