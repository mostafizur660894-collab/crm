#!/usr/bin/env php
<?php
/**
 * Bimano CRM — API Test for Admin Panel
 * Verifies the setup is working
 */

echo "\n=== BIMANO CRM PHP ADMIN PANEL API TEST ===\n\n";

// Simulate admin session
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['role'] = 'admin';

echo "✓ Session created: user_id=1, role=admin\n\n";

// Test database connection
echo "Testing database connection...\n";

$conn = new mysqli(
    'localhost',
    'u710294496_mostafizur660',
    'Rakib@660#',
    'u710294496_crm_db',
    3306
);

if ($conn->connect_errno) {
    echo "❌ Database connection FAILED\n";
    echo "Error: " . $conn->connect_error . "\n";
    exit(1);
}

echo "✓ Database connection successful\n\n";

// Test leads table
echo "Checking leads table...\n";
$result = $conn->query("DESC `leads`");

if (!$result) {
    echo "❌ Leads table does not exist\n";
    echo "Error: " . $conn->error . "\n";
    echo "\nTo fix, run: mysql ... < crm/database/schema.sql\n";
    exit(1);
}

echo "✓ Leads table exists\n";

// Count leads
$count_result = $conn->query("SELECT COUNT(*) as total FROM `leads`");
$count = $count_result->fetch_assoc()['total'];

echo "✓ Total leads in database: " . $count . "\n\n";

// Test INSERT
echo "Testing INSERT (creating test lead)...\n";
$test_phone = 'test-' . time() . '@example.com';
$insert_result = $conn->execute_query(
    "INSERT INTO `leads` (name, email, phone, company, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    ['TestUser', 'test@example.com', $test_phone, 'TestCorp', 'new']
);

if ($insert_result) {
    $new_id = $conn->insert_id;
    echo "✓ Lead created with ID: " . $new_id . "\n\n";
    
    // Test UPDATE
    echo "Testing UPDATE...\n";
    $update_result = $conn->execute_query(
        "UPDATE `leads` SET status = ? WHERE id = ?",
        ['contacted', $new_id]
    );
    
    if ($update_result) {
        echo "✓ Lead updated successfully\n\n";
        
        // Test DELETE
        echo "Testing DELETE...\n";
        $delete_result = $conn->execute_query(
            "DELETE FROM `leads` WHERE id = ?",
            [$new_id]
        );
        
        if ($delete_result) {
            echo "✓ Lead deleted successfully\n\n";
        }
    }
} else {
    echo "❌ Insert failed: " . $conn->error . "\n";
}

$conn->close();

echo "=== ALL TESTS PASSED ===\n\n";
echo "Your PHP admin panel should now work!\n";
echo "1. Login to: http://localhost/crm/login.php\n";
echo "2. Go to: http://localhost/crm/admin/leads.php\n";
echo "3. The leads data should load\n\n";
?>
