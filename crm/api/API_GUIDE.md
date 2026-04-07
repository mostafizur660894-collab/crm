# Bimano CRM — PHP Session-Based API Complete Guide

## Overview

All API endpoints use **PHP session authentication**. No JWT or complex setup needed.

```php
// Every API starts with:
session_start();
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}
```

---

## API Endpoints

### 1. Leads API — `/api/leads.php`

**GET:** Fetch all leads
```bash
curl -b cookies.txt "http://localhost/api/leads.php?page=1&limit=25&search=John&status=new"
```

**POST:** Create lead
```bash
curl -b cookies.txt -X POST http://localhost/api/leads.php \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "555-1234",
    "email": "john@example.com",
    "company": "Acme",
    "status": "new"
  }'
```

**PUT:** Update lead
```bash
curl -b cookies.txt -X PUT "http://localhost/api/leads.php?id=5" \
  -H "Content-Type: application/json" \
  -d '{"status": "contacted", "notes": "Called"}'
```

**DELETE:** Delete lead
```bash
curl -b cookies.txt -X DELETE "http://localhost/api/leads.php?id=5"
```

---

### 2. Clients API — `/api/clients.php`

Same pattern as leads.php

```bash
# GET
curl -b cookies.txt "http://localhost/api/clients.php?page=1"

# POST
curl -b cookies.txt -X POST http://localhost/api/clients.php \
  -d '{"name":"ClientName","phone":"555-5678"}'

# PUT
curl -b cookies.txt -X PUT "http://localhost/api/clients.php?id=3" \
  -d '{"status":"inactive"}'

# DELETE
curl -b cookies.txt -X DELETE "http://localhost/api/clients.php?id=3"
```

---

### 3. Tasks API — `/api/tasks.php`

```bash
curl -b cookies.txt "http://localhost/api/tasks.php?page=1"
curl -b cookies.txt -X POST http://localhost/api/tasks.php \
  -d '{"title":"Task","status":"pending","priority":"high"}'
```

---

### 4. Branches API — `/api/branches.php`

```bash
curl -b cookies.txt "http://localhost/api/branches.php?page=1"
curl -b cookies.txt -X POST http://localhost/api/branches.php \
  -d '{"name":"Branch Name","location":"City"}'
```

---

### 5. Categories API — `/api/categories.php`

```bash
curl -b cookies.txt "http://localhost/api/categories.php?page=1"
curl -b cookies.txt -X POST http://localhost/api/categories.php \
  -d '{"name":"Category","description":"Desc"}'
```

---

### 6. Follow-ups API — `/api/followups.php`

```bash
curl -b cookies.txt "http://localhost/api/followups.php?page=1"
curl -b cookies.txt -X POST http://localhost/api/followups.php \
  -d '{"subject":"Follow up","scheduled_at":"2026-04-08 10:00:00"}'
```

---

## Frontend JavaScript Example

### Using the CRM.api() Function (Recommended)

The CRUD.js already has the correct setup with `credentials: 'include'`:

```javascript
// Load leads
CRM.api('GET', 'leads?page=1&limit=25&search=John').then(function(res) {
    if (res.success) {
        console.log(res.data);  // Array of leads
        console.log(res.pagination);  // {page, limit, total}
    } else {
        console.error(res.message);  // Error message
    }
});

// Create lead
CRM.api('POST', 'leads', {
    name: 'Jane Doe',
    phone: '555-9876',
    email: 'jane@example.com',
    company: 'TechCorp'
}).then(function(res) {
    if (res.success) {
        console.log('Lead created:', res.data);
    }
});

// Update lead
CRM.api('PUT', 'leads?id=5', {
    status: 'qualified',
    notes: 'Good prospect'
}).then(function(res) {
    if (res.success) {
        console.log('Lead updated');
    }
});

// Delete lead
CRM.api('DELETE', 'leads?id=5').then(function(res) {
    if (res.success) {
        console.log('Lead deleted');
    }
});
```

### Using Fetch Directly (Raw)

If you need to use fetch directly:

```javascript
// With credentials to include session cookies
fetch('/api/leads.php?page=1', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include'  // IMPORTANT: Send cookies
})
.then(r => r.json())
.then(data => {
    console.log(data.data);  // Leads array
});

// Creating
fetch('/api/leads.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
        name: 'John',
        phone: '555-1234'
    })
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## Response Format

All APIs return JSON:

**Success Response:**
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 25,
        "total": 150,
        "pages": 6
    }
}
```

**Error Response:**
```json
{
    "success": false,
    "message": "Unauthorized"
}
```

**Single Record:**
```json
{
    "success": true,
    "message": "Lead created",
    "data": {
        "id": 5,
        "name": "John",
        "phone": "555-1234",
        ...
    }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - GET, PUT, DELETE success |
| 201 | Created - POST success |
| 400 | Bad Request - Missing fields |
| 401 | Unauthorized - Not logged in |
| 404 | Not Found - Record doesn't exist |
| 405 | Method Not Allowed - Wrong HTTP method |
| 500 | Server Error |

---

## Session Authentication

**How it works:**

1. User logs in via `/crm/login.php`
2. PHP creates `$_SESSION['user_id']`
3. Browser sends session cookie with every request
4. API checks `if (empty($_SESSION['user_id']))` at start
5. If not set → return 401 Unauthorized

**Key Points:**
- Session cookie is automatic (browsers send it)
- Frontend must use `credentials: 'include'` in fetch/axios
- No JWT tokens needed
- Works across all APIs

---

## Debugging

### Enable Error Logging

In any API file, add at top:

```php
ini_set('display_errors', '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);
```

### Check Session

```php
session_start();
var_dump($_SESSION);  // Shows all session data
```

### Test API Directly (Browser)

```
http://localhost/api/leads.php
```

If you get `{"success": false, "message": "Unauthorized"}` → not logged in
If you get data → working!

### Check Network

In browser DevTools:
1. Open Network tab
2. Make API call
3. Check request headers:
   - `Content-Type: application/json`
   - `Cookie: PHPSESSID=...` (should be present)
4. Check response:
   - 200, 201, 400, 401, 404, etc.
   - JSON response

---

## Common Issues & Fixes

### "Unauthorized" Error

**Problem:** `{"success": false, "message": "Unauthorized"}`

**Causes:**
1. Not logged in → Login first
2. Session cookie not sent → Add `credentials: 'include'`
3. Session expired → Login again

**Fix:**
```javascript
// WRONG - no credentials
fetch('/api/leads.php')

// CORRECT - with credentials
fetch('/api/leads.php', {
    credentials: 'include'
})
```

### "Method not allowed" Error

**Problem:** `{"success": false, "message": "Method not allowed"}`

**Cause:** Wrong HTTP method (GET vs POST, etc.)

**Fix:**
```javascript
// WRONG - trying to create with GET
CRM.api('GET', 'leads', {name: 'John'})

// CORRECT - use POST for create
CRM.api('POST', 'leads', {name: 'John'})
```

### "ID required" Error

**Problem:** Update/delete fails with "ID required"

**Fix:**
```javascript
// WRONG - ID in body
CRM.api('PUT', 'leads', {id: 5, status: 'new'})

// CORRECT - ID in URL
CRM.api('PUT', 'leads?id=5', {status: 'new'})
```

### "Network error"

**Problem:** Request fails silently

**Fix:**
1. Check API file exists: `/crm/api/leads.php`
2. Check syntax: `php -l /crm/api/leads.php`
3. Check database connection
4. Check logs: `tail -f /var/log/php-errors.log`

---

## Testing All APIs (Quick Checklist)

Run this after logging in:

```bash
# 1. Test Leads
curl -b cookies.txt http://localhost/api/leads.php
# Should see leads data

# 2. Test Clients
curl -b cookies.txt http://localhost/api/clients.php
# Should see clients data

# 3. Test Tasks
curl -b cookies.txt http://localhost/api/tasks.php
# Should see tasks data

# 4. Test Branches
curl -b cookies.txt http://localhost/api/branches.php
# Should see branches data

# 5. Test Categories
curl -b cookies.txt http://localhost/api/categories.php
# Should see categories data

# 6. Test Follow-ups
curl -b cookies.txt http://localhost/api/followups.php
# Should see follow-ups data
```

All should return `{"success": true, "data": [...]}` format.

---

## API Implementation Summary

| Resource | Endpoint | Auth | CRUD | Status |
|----------|----------|------|------|--------|
| Leads | `/api/leads.php` | Session | ✅ | Ready |
| Clients | `/api/clients.php` | Session | ✅ | Ready |
| Tasks | `/api/tasks.php` | Session | ✅ | Ready |
| Branches | `/api/branches.php` | Session | ✅ | Ready |
| Categories | `/api/categories.php` | Session | ✅ | Ready |
| Follow-ups | `/api/followups.php` | Session | ✅ | Ready |

**Database:** Uses existing tables (no migration needed)  
**Authentication:** PHP sessions (auto with login)  
**Frontend:** Updated CRUD.js with credentials support

---

## Quick Copy-Paste: Add to Your Code

### In your admin pages (e.g., leads.php):

```javascript
// Load data on page load
loadLeads();

function loadLeads(page) {
    page = page || 1;
    var qs = 'page=' + page + '&limit=25';
    
    // This now works with session auth
    CRM.api('GET', 'leads?' + qs).then(function(res) {
        if (!res.success) {
            CRM.toast(res.message || 'Error', 'error');
            return;
        }
        // Render res.data
    });
}
```

This should **just work** now! 🎉

---

## Support

If APIs don't work:

1. **Check login:** Verify you're logged in at `/crm/login.php`
2. **Check logs:** `cat /var/log/php-errors.log`
3. **Check database:** `mysql ... > SHOW TABLES;`
4. **Test curl:** `curl -b cookies.txt http://localhost/api/leads.php`

All APIs use the same pattern, so if one works, they all should.
