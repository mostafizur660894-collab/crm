<?php
/**
 * Debug/Test API Tool
 * File: /crm/api/test.php
 * 
 * Access: http://localhost/crm/api/test.php
 * Shows if session is active and tests each API
 */

session_start();

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Bimano CRM - API Test</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #eee; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        .section { background: #2a2a2a; padding: 15px; margin: 10px 0; border-left: 3px solid #0066ff; }
        .ok { color: #00ff00; }
        .error { color: #ff6666; }
        .warn { color: #ffaa00; }
        .test-btn { background: #0066ff; color: white; padding: 8px 15px; margin: 5px; cursor: pointer; border: none; border-radius: 3px; }
        .test-btn:hover { background: #0044cc; }
        .response { background: #1a1a1a; padding: 10px; margin-top: 10px; border: 1px solid #444; max-height: 300px; overflow-y: auto; }
        h2 { color: #0066ff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Bimano CRM API Test Suite</h1>
        
        <div class="section">
            <h2>Session Status</h2>
            <p><strong>User ID:</strong> <span class="<?= !empty($_SESSION['user_id']) ? 'ok' : 'error' ?>">
                <?= !empty($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET ❌' ?>
            </span></p>
            <p><strong>Role:</strong> <span class="<?= !empty($_SESSION['role']) ? 'ok' : 'warn' ?>">
                <?= !empty($_SESSION['role']) ? $_SESSION['role'] : 'Not set' ?>
            </span></p>
            <p><strong>Session ID:</strong> <code><?= session_id() ?></code></p>
            
            <?php if (empty($_SESSION['user_id'])): ?>
                <p class="error">⚠️ Not logged in! Login first at <a href="/crm/login.php">/crm/login.php</a></p>
            <?php else: ?>
                <p class="ok">✅ Session active - API calls should work</p>
            <?php endif; ?>
        </div>

        <div class="section">
            <h2>Test API Endpoints</h2>
            <p>Click buttons to test each API:</p>
            
            <button class="test-btn" onclick="testAPI('GET', 'leads?limit=5')">Test Leads GET</button>
            <button class="test-btn" onclick="testAPI('GET', 'clients?limit=5')">Test Clients GET</button>
            <button class="test-btn" onclick="testAPI('GET', 'tasks?limit=5')">Test Tasks GET</button>
            <button class="test-btn" onclick="testAPI('GET', 'branches?limit=5')">Test Branches GET</button>
            <button class="test-btn" onclick="testAPI('GET', 'categories?limit=5')">Test Categories GET</button>
            <button class="test-btn" onclick="testAPI('GET', 'followups?limit=5')">Test Follow-ups GET</button>
            
            <div id="result" class="response" style="display:none;"></div>
        </div>

        <div class="section">
            <h2>File Existence Check</h2>
            <?php
            $apis = ['leads', 'clients', 'tasks', 'branches', 'categories', 'followups'];
            foreach ($apis as $api) {
                $file = __DIR__ . '/' . $api . '.php';
                $exists = file_exists($file);
                $status = $exists ? '<span class="ok">✅ EXISTS</span>' : '<span class="error">❌ NOT FOUND</span>';
                echo "<p><code>/api/{$api}.php</code> - {$status}</p>";
            }
            ?>
        </div>

        <div class="section">
            <h2>Network Test</h2>
            <p>Check browser DevTools → Network tab while testing to see:</p>
            <ul>
                <li>Request headers (Cookie: PHPSESSID should be present)</li>
                <li>Response status (200 = success, 401 = unauthorized)</li>
                <li>Response body (should be JSON)</li>
            </ul>
        </div>
    </div>

    <script>
        function testAPI(method, path) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Loading...</p>';
            resultDiv.style.display = 'block';

            // Build correct URL with .php in the right place
            const pathParts = path.split('?');
            const endpoint = pathParts[0];
            const query = pathParts.length > 1 ? '?' + pathParts[1] : '';
            const url = '/api/' + endpoint + '.php' + query;

            console.log('Testing:', method, url);

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
            .then(res => {
                console.log('Response status:', res.status);
                return res.json().then(data => ({status: res.status, data: data}));
            })
            .then(result => {
                const status = result.status === 200 ? '<span class="ok">✅ 200 OK</span>' : 
                              result.status === 401 ? '<span class="error">❌ 401 Unauthorized</span>' :
                              result.status === 404 ? '<span class="error">❌ 404 Not Found</span>' :
                              '<span class="warn">⚠️ ' + result.status + '</span>';
                
                resultDiv.innerHTML = `
                    <h3>${method} /api/${endpoint}.php${query}</h3>
                    <p>Status: ${status}</p>
                    <h4>Response:</h4>
                    <pre>${JSON.stringify(result.data, null, 2)}</pre>
                `;
            })
            .catch(err => {
                resultDiv.innerHTML = '<h3>Network Error</h3><pre>' + err.message + '</pre>';
            });
        }
    </script>
</body>
</html>
