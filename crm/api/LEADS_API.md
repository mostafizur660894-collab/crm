# Bimano CRM API — Leads Endpoint Documentation

## Endpoint: `/api/leads.php`

A **standalone, production-ready PHP API** for managing leads with method-based routing.

---

## Features

✅ **No Authentication Required** (for initial testing)  
✅ **Method-Based Routing** — GET / POST / PUT / DELETE  
✅ **Full CRUD Operations** — Create, Read, Update, Delete leads  
✅ **Error Handling** — DB connection, query failures, validation  
✅ **JSON Responses** — Proper HTTP status codes & JSON headers  
✅ **Pagination** — Supports limit/offset for large datasets  
✅ **Search & Filter** — Search by name/phone/email, filter by status  

---

## Base URL

```
http://localhost/api/leads.php
```

Replace `localhost` with your domain name.

---

## Endpoints & Examples

### 1. GET — Fetch All Leads

**Request:**
```bash
curl http://localhost/api/leads.php
```

**Query Parameters:**
- `limit` (optional) — Results per page (default: 50, max: 500)
- `offset` (optional) — Pagination offset (default: 0)
- `search` (optional) — Search by name, phone, or email
- `status` (optional) — Filter by status (new, contacted, qualified, converted, lost)

**Example with pagination & search:**
```bash
curl "http://localhost/api/leads.php?limit=10&offset=0&search=John&status=new"
```

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "company": "Acme Corp",
      "source": "Website",
      "status": "new",
      "notes": "Initial contact",
      "category_id": 2,
      "branch_id": 1,
      "assigned_to": 3,
      "created_by": 1,
      "created_at": "2026-04-07 10:30:00",
      "updated_at": "2026-04-07 10:30:00"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "count": 10
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Database connection failed: Service temporarily unavailable.",
  "error": "Connection refused"
}
```

---

### 2. POST — Create New Lead

**Request:**
```bash
curl -X POST http://localhost/api/leads.php \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "phone": "555-9876",
    "email": "jane@example.com",
    "company": "Tech Solutions",
    "source": "Referral",
    "status": "new",
    "notes": "Referred by client XYZ",
    "category_id": 2,
    "branch_id": 1,
    "assigned_to": 3
  }'
```

**Required Fields:**
- `name` — Lead name
- `phone` — Phone number

**Optional Fields:**
- `email` — Email address
- `company` — Company name
- `source` — Lead source
- `status` — Status (default: "new")
- `notes` — Internal notes
- `category_id` — Category ID
- `branch_id` — Branch ID (default: 1)
- `assigned_to` — User ID to assign to

**Response (Success - HTTP 201):**
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": 152,
    "name": "Jane Smith",
    "phone": "555-9876",
    "email": "jane@example.com",
    "company": "Tech Solutions",
    "source": "Referral",
    "status": "new",
    "notes": "Referred by client XYZ",
    "category_id": 2,
    "branch_id": 1,
    "assigned_to": 3,
    "created_at": "2026-04-07 14:22:15"
  }
}
```

**Response (Error - HTTP 400):**
```json
{
  "success": false,
  "message": "Lead name is required"
}
```

**Response (Duplicate Phone - HTTP 409):**
```json
{
  "success": false,
  "message": "Phone number already exists"
}
```

---

### 3. PUT — Update Lead

**Request (via query parameter):**
```bash
curl -X PUT http://localhost/api/leads.php?id=152 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "contacted",
    "notes": "Customer called back, interested in our service",
    "assigned_to": 5
  }'
```

**Alternative (via body):**
```bash
curl -X PUT http://localhost/api/leads.php \
  -H "Content-Type: application/json" \
  -d '{
    "id": 152,
    "status": "qualified",
    "notes": "Updated notes"
  }'
```

**URL Parameter:**
- `id` — Lead ID to update

**Body (all optional):**
- `name`, `email`, `phone`, `company`, `source`, `status`, `notes`, `category_id`, `branch_id`, `assigned_to`

**Response (Success):**
```json
{
  "success": true,
  "message": "Lead updated successfully",
  "data": {
    "id": 152,
    "name": "Jane Smith",
    "phone": "555-9876",
    "email": "jane@example.com",
    "company": "Tech Solutions",
    "source": "Referral",
    "status": "contacted",
    "notes": "Customer called back, interested in our service",
    "category_id": 2,
    "branch_id": 1,
    "assigned_to": 5,
    "updated_at": "2026-04-07 14:35:42"
  }
}
```

**Response (Not Found - HTTP 404):**
```json
{
  "success": false,
  "message": "Lead ID is required"
}
```

---

### 4. DELETE — Delete Lead

**Request:**
```bash
curl -X DELETE http://localhost/api/leads.php?id=152
```

**Alternative (via body):**
```bash
curl -X DELETE http://localhost/api/leads.php \
  -H "Content-Type: application/json" \
  -d '{"id": 152}'
```

**URL Parameter:**
- `id` — Lead ID to delete

**Response (Success):**
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

**Response (Not Found - HTTP 404):**
```json
{
  "success": false,
  "message": "Lead not found"
}
```

---

## HTTP Status Codes

| Code | Meaning | Possible Response |
|------|---------|-------------------|
| 200 | OK | GET, PUT, DELETE succeeded |
| 201 | Created | POST created new lead |
| 400 | Bad Request | Missing required field, invalid data |
| 404 | Not Found | Lead ID doesn't exist |
| 405 | Method Not Allowed | Invalid HTTP method |
| 409 | Conflict | Duplicate phone number |
| 500 | Server Error | Database/query error |
| 503 | Unavailable | Database connection failed |

---

## Database Setup

### 1. Import Schema

Run this SQL in your database:

```bash
mysql -h localhost -u your_user -p your_database < crm/database/schema.sql
```

Or import manually via phpMyAdmin.

### 2. Verify Table Exists

```sql
DESC `leads`;
```

Expected columns:
- `id` (INT PRIMARY KEY)
- `name`, `email`, `phone`, `company`
- `source`, `status`, `notes`
- `category_id`, `branch_id`, `assigned_to`, `created_by`
- `created_at`, `updated_at` (TIMESTAMP)

---

## Testing Locally

### Using cURL

**Fetch all leads:**
```bash
curl http://localhost/api/leads.php | jq
```

**Create a lead:**
```bash
curl -X POST http://localhost/api/leads.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","phone":"555-0000"}' | jq
```

### Using Postman

1. **Collection Setup:**
   - Method: GET
   - URL: `http://localhost/api/leads.php`
   - Headers: Content-Type: application/json
   - Body (POST/PUT): Raw JSON

2. **Test Requests:**
   - GET all leads
   - POST new lead
   - PUT to update
   - DELETE to remove

### Using JavaScript (Fetch API)

```javascript
// Fetch all leads
fetch('http://localhost/api/leads.php')
  .then(r => r.json())
  .then(data => console.log(data));

// Create lead
fetch('http://localhost/api/leads.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    phone: '555-1234',
    email: 'john@example.com',
    company: 'Acme'
  })
})
  .then(r => r.json())
  .then(data => console.log(data));

// Update lead
fetch('http://localhost/api/leads.php?id=1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'contacted' })
})
  .then(r => r.json())
  .then(data => console.log(data));

// Delete lead
fetch('http://localhost/api/leads.php?id=1', { method: 'DELETE' })
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## Configuration

Edit `/crm/api/leads.php` to change database credentials:

```php
define('DB_HOST', 'localhost');          // Database host
define('DB_PORT', 3306);                 // MySQL port
define('DB_NAME', 'u710294496_crm_db');  // Database name
define('DB_USER', 'u710294496_mostafizur660');  // DB user
define('DB_PASS', 'Rakib@660#');         // DB password
define('DB_CHARSET', 'utf8mb4');         // Charset
```

---

## Production Checklist

- [ ] Update database credentials in `leads.php`
- [ ] Change CORS origin (remove `*` if public)
- [ ] Test all 4 HTTP methods
- [ ] Verify error handling works
- [ ] Check database backups are active
- [ ] Monitor error logs
- [ ] Add authentication (JWT or session) if needed

---

## Troubleshooting

### "Database connection failed"
- Check MySQL is running
- Verify credentials in `leads.php`
- Check database exists: `SHOW DATABASES;`

### "PHP code displays instead of JSON"
- Ensure PHP is enabled on server
- Check file is `.php` not `.txt`
- Verify `Content-Type: application/json` header

### "Duplicate key error"
- A lead with this phone already exists in this branch
- Either update existing or change phone number

### No results returned
- Leads table might be empty
- Create a test lead first
- Check filters (search, status) are correct

---

## Next Steps

1. ✅ Test this `/api/leads.php` endpoint
2. Create similar endpoints for other resources using same pattern
3. Add authentication layer (JWT tokens)
4. Set up proper logging
5. Deploy to production

For questions, check the source code comments in `/crm/api/leads.php`.
