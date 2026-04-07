# Quick Reference: Using the CRM API from JavaScript

## Basic Usage

All API calls use the `CRM.api()` function from `/crm/assets/js/crud.js`.

### Syntax
```javascript
CRM.api(method, path, [body])
```

---

## GET Requests (Fetch Data)

### List with Pagination
```javascript
CRM.api('GET', 'leads?page=1&limit=25').then(function(res) {
    if (res.success) {
        console.log(res.data);           // Array of records
        console.log(res.pagination);     // { page, limit, total }
    } else {
        CRM.toast(res.message, 'error');
    }
});
```

### List with Search
```javascript
var searchTerm = 'john';
CRM.api('GET', 'leads?search=' + encodeURIComponent(searchTerm)).then(function(res) {
    // Returns filtered leads
});
```

### Get Single Record
```javascript
CRM.api('GET', 'users?limit=1').then(function(res) {
    var user = res.data[0];  // Get first result
});
```

### Filter by Status
```javascript
CRM.api('GET', 'leads?status=qualified').then(function(res) {
    // Returns only qualified leads
});
```

### Get All (No Pagination)
```javascript
CRM.api('GET', 'branches').then(function(res) {
    var branches = res.data;  // Array of all branches
});
```

---

## POST Requests (Create Data)

### Simple Create
```javascript
var formData = {
    name: 'John Doe',
    phone: '555-1234',
    email: 'john@example.com'
};

CRM.api('POST', 'leads', formData).then(function(res) {
    if (res.success) {
        CRM.toast('Lead created!');
        // Refresh the list
        loadLeads(1);
    } else {
        CRM.toast(res.message || 'Error', 'error');
    }
});
```

### With Status
```javascript
CRM.api('POST', 'tasks', {
    title: 'Call customer',
    status: 'pending',
    priority: 'high',
    due_date: '2026-04-08'
}).then(function(res) {
    console.log(res.data);  // Created record with ID
});
```

---

## PUT Requests (Update Data)

### Update Single Record
```javascript
CRM.api('PUT', 'leads', {
    id: 123,
    status: 'contacted',
    notes: 'Updated notes here'
}).then(function(res) {
    if (res.success) {
        CRM.toast('Lead updated!');
        loadLeads(currentPage);  // Refresh
    }
});
```

### Update User
```javascript
CRM.api('PUT', 'users', {
    id: 5,
    name: 'New Name',
    role: 'sub_admin',
    branch_id: 2
}).then(function(res) {
    console.log(res.data);  // Updated record
});
```

---

## DELETE Requests (Remove Data)

### Delete by ID
```javascript
CRM.api('DELETE', 'leads', { id: 123 }).then(function(res) {
    if (res.success) {
        CRM.toast('Lead deleted!');
        loadLeads(currentPage);  // Refresh
    } else {
        CRM.toast(res.message, 'error');
    }
});
```

### Or use Query Parameter
```javascript
CRM.api('DELETE', 'categories?id=5', {}).then(function(res) {
    console.log(res.message);
});
```

---

## Real-World Examples

### Load and Display Leads Table
```javascript
function loadLeads() {
    CRM.api('GET', 'leads?limit=25&page=1').then(function(res) {
        if (!res.success) {
            document.getElementById('table').innerHTML = 
                '<p style="color:red;">' + res.message + '</p>';
            return;
        }
        
        // Render table
        CRM.renderTable('table', [
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'status', label: 'Status' }
        ], res.data);
        
        // Show pagination
        CRM.renderPagination('pagination', res.pagination, 'loadLeads');
    });
}
```

### Add New Client Modal
```javascript
function showAddClientModal() {
    var html = CRM.field('Name', 'name', '', 'text', { required: true })
             + CRM.field('Phone', 'phone', '', 'tel', { required: true })
             + CRM.field('Email', 'email', '', 'email');
    
    CRM.openModal('Add Client', html, function(data) {
        CRM.api('POST', 'clients', data).then(function(res) {
            CRM.closeModal();
            if (res.success) {
                CRM.toast('Client created!');
                loadClients();  // Refresh list
            } else {
                CRM.toast(res.message || 'Error', 'error');
            }
        });
    });
}
```

### Assign Task to Employee
```javascript
// First, get list of employees
CRM.api('GET', 'users?role=employee&limit=100').then(function(res) {
    var employees = res.data.map(function(u) {
        return { value: u.id, label: u.name };
    });
    
    // Then update task
    CRM.api('PUT', 'tasks', {
        id: taskId,
        assigned_to: employees[0].value  // Assign to first employee
    }).then(function(res) {
        CRM.toast('Task assigned!');
    });
});
```

### Search with Filters
```javascript
function searchLeads(searchTerm, status) {
    var qs = 'search=' + encodeURIComponent(searchTerm);
    if (status) qs += '&status=' + status;
    
    CRM.api('GET', 'leads?' + qs).then(function(res) {
        CRM.renderTable('table', columns, res.data);
    });
}

// Usage
searchLeads('john', 'qualified');
```

### Check for Errors
```javascript
CRM.api('POST', 'users', formData).then(function(res) {
    // Check success flag
    if (!res.success) {
        // Handle error
        console.error('Error:', res.message);
        CRM.toast(res.message, 'error');
        return;
    }
    
    // Handle success
    console.log('Created user:', res.data);
    CRM.toast('User created!');
});
```

---

## Response Format

### Successful GET
```javascript
{
    success: true,
    data: [{ id: 1, name: '...' }, ...],
    pagination: { page: 1, limit: 25, total: 100 }
}
```

### Successful POST/PUT/DELETE
```javascript
{
    success: true,
    message: 'Record created',
    data: { id: 123, ... }  // The created/updated record
}
```

### Error Response
```javascript
{
    success: false,
    message: 'Unauthorized' or 'Invalid input'
}
```

---

## Error Handling

```javascript
CRM.api('GET', 'leads').then(function(res) {
    // Always check success flag
    if (!res.success) {
        if (res.message.includes('Unauthorized')) {
            // Redirect to login
            window.location = '/crm/login.php';
        } else if (res.message.includes('not found')) {
            // Handle 404
            console.log('Resource not found');
        } else {
            // Generic error
            CRM.toast(res.message, 'error');
        }
        return;
    }
    
    // Proceed with data
    console.log(res.data);
});
```

---

## Common Params

| Param | Usage | Example |
|-------|-------|---------|
| `limit` | Records per page | `?limit=50` |
| `page` | Page number | `?page=2` |
| `search` | Text search | `?search=john` |
| `status` | Filter by status | `?status=pending` |
| `branch_id` | Filter by branch | `?branch_id=2` |
| `assigned_to` | Filter by user | `?assigned_to=5` |
| `id` | Single record | (in body for PUT/DELETE) |

---

## Tips

✅ **Always chain `.then()` for async handling**
```javascript
CRM.api('GET', 'leads').then(function(res) { ... });
```

✅ **Check `res.success` every time**
```javascript
if (!res.success) { /* handle error */ return; }
```

✅ **Use `CRM.toast()` for user feedback**
```javascript
CRM.toast('Success message');
CRM.toast('Error message', 'error');
```

✅ **Use `encodeURIComponent()` for search terms**
```javascript
'?search=' + encodeURIComponent(userInput)
```

❌ **Don't hardcode URLs**
```javascript
// WRONG
fetch('/api/leads.php')

// RIGHT
CRM.api('GET', 'leads')
```

❌ **Don't forget credentials for sessions**
- ✅ Already handled by CRM.api()
- Browser sends session cookie automatically

---

**All APIs use session authentication (no tokens needed)**
