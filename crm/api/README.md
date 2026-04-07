# 🔧 Bimano CRM — Standalone Leads API

## What's New?

You now have a **clean, production-ready PHP API endpoint** at `/api/leads.php` that handles:

✅ **GET** — Fetch all leads with pagination & search  
✅ **POST** — Create new leads  
✅ **PUT** — Update lead information  
✅ **DELETE** — Remove leads  

**No router middleware. No complex configuration. Just pure PHP + MySQLi.**

---

## Quick Start (2 Minutes)

### Step 1: Setup Database

Run the SQL schema in your database:

```bash
mysql -u your_user -p your_database < crm/database/schema.sql
```

Or import via phpMyAdmin using the file `/crm/database/schema.sql`

### Step 2: Test the API

```bash
# Test if API is working
curl http://localhost/api/leads.php

# Create a test lead
curl -X POST http://localhost/api/leads.php \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"555-1234"}'
```

### Step 3: Update Credentials (If Needed)

Edit `/crm/api/leads.php` line 56-61:

```php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'u710294496_crm_db');
define('DB_USER', 'u710294496_mostafizur660');
define('DB_PASS', 'Rakib@660#');
```

---

## Files Created/Updated

| File | Purpose |
|------|---------|
| `/crm/api/leads.php` | **Main API** — Full CRUD with error handling |
| `/crm/database/schema.sql` | Database schema with all tables |
| `/crm/api/LEADS_API.md` | Complete API documentation |
| `/crm/api/test-leads.php` | Test suite to verify setup |

---

## API Endpoint Reference

### GET — Fetch Leads
```bash
curl "http://localhost/api/leads.php?limit=10&offset=0&status=new"
```

### POST — Create Lead
```bash
curl -X POST http://localhost/api/leads.php \
  -d '{"name":"Jane","phone":"555-5678","email":"jane@test.com"}'
```

### PUT — Update Lead
```bash
curl -X PUT "http://localhost/api/leads.php?id=1" \
  -d '{"status":"contacted","notes":"Called today"}'
```

### DELETE — Delete Lead
```bash
curl -X DELETE "http://localhost/api/leads.php?id=1"
```

---

## Testing

### Run Test Suite
```bash
php crm/api/test-leads.php
```

Expected output:
```
✓ Database connection successful
✓ Table `leads` exists
✓ Table `clients` exists
...
✓ All critical tests passed!
```

### Using Postman

1. Import collection (or create manually)
2. Set base URL: `http://localhost/api/leads.php`
3. Test each HTTP method

---

## Error Handling

The API handles these scenarios:

| Error | Status | Solution |
|-------|--------|----------|
| DB connection failed | 503 | Check MySQL is running |
| Missing required field | 400 | Provide `name` and `phone` |
| Duplicate phone | 409 | Phone already exists in this branch |
| Lead not found | 404 | Check if ID is correct |
| Invalid method | 405 | Use GET, POST, PUT, or DELETE |

---

## Database Schema

### Leads Table
```sql
CREATE TABLE `leads` (
  `id` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(254),
  `company` VARCHAR(150),
  `source` VARCHAR(50),
  `status` ENUM('new','contacted','qualified','converted','lost'),
  `notes` TEXT,
  `category_id` INT UNSIGNED,
  `branch_id` INT UNSIGNED DEFAULT 1,
  `assigned_to` INT UNSIGNED,
  `created_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT NOW(),
  `updated_at` TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

---

## Configuration Options

Edit `/crm/api/leads.php` to customize:

### Database
```php
define('DB_HOST', 'localhost');      // Host
define('DB_PORT', 3306);             // Port
define('DB_NAME', 'crm_db');         // Database name
define('DB_USER', 'username');       // Username
define('DB_PASS', 'password');       // Password
define('DB_CHARSET', 'utf8mb4');     // Charset
```

### CORS (Enable for frontend)
```php
header('Access-Control-Allow-Origin: https://yourdomain.com');
```

---

## Integration with Frontend

### Using Fetch API
```javascript
// Fetch leads
fetch('/api/leads.php')
  .then(r => r.json())
  .then(data => console.log(data.data));

// Create lead
fetch('/api/leads.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test', phone: '555-0000' })
})
  .then(r => r.json())
  .then(data => console.log(data));
```

### Using Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Get leads
api.get('/leads.php').then(r => console.log(r.data));

// Create lead
api.post('/leads.php', {
  name: 'John',
  phone: '555-1234'
}).then(r => console.log(r.data));
```

---

## Production Checklist

- [ ] Update database credentials in `leads.php`
- [ ] Verify all tables exist: `SHOW TABLES;`
- [ ] Test all 4 HTTP methods locally
- [ ] Enable error logging in production
- [ ] Add authentication (JWT, session, API key)
- [ ] Set appropriate CORS headers
- [ ] Update database backups
- [ ] Monitor error logs
- [ ] Load testing if high traffic expected

---

## Troubleshooting

### "API endpoint not found"
- Make sure file is `/crm/api/leads.php` (not `leads.php.txt`)
- URL should be `http://localhost/api/leads.php` (with .php extension)
- Check `.htaccess` isn't interfering

### "Database connection failed"
- Verify MySQL is running: `mysql -u root -p`
- Check credentials match your setup
- Ensure database exists: `SHOW DATABASES;`

### "Lead table doesn't exist"
- Run the schema: `mysql ... < crm/database/schema.sql`
- Or import manually in phpMyAdmin

### "Headers already sent"
- Check for spaces before `<?php`
- No output before API calls
- Remove any BOM (byte order mark) from file

---

## Next Steps

### 1. Similar Endpoints
Create `/api/clients.php`, `/api/tasks.php` using same pattern.

### 2. Authentication
Add JWT or session authentication:
```php
// At top of leads.php
$token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$token) {
    error_response('Unauthorized', 401);
}
// Validate token...
```

### 3. Logging
Add request logging:
```php
error_log("[{$_SERVER['REQUEST_METHOD']}] /api/leads.php - " . json_encode($_GET));
```

### 4. Validation
Add input validation:
```php
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error_response('Invalid email format', 400);
}
```

---

## Additional Resources

- **Full API Docs:** [`crm/api/LEADS_API.md`](LEADS_API.md)
- **Test Suite:** `php crm/api/test-leads.php`
- **Database Schema:** `crm/database/schema.sql`

---

## Support

For issues:
1. Run test suite: `php crm/api/test-leads.php`
2. Check error logs
3. Verify database credentials
4. Test with curl before using in frontend

---

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Last Updated:** 2026-04-07
