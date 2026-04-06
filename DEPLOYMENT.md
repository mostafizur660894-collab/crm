# Bimano CRM — Production Deployment Guide (Hostinger)

## Prerequisites
- Hostinger VPS or Node.js hosting plan
- MySQL database (Hostinger provides this)
- Node.js 18+ installed on server
- PM2 installed globally: `npm install -g pm2`

---

## Step 1: Prepare the Server

```bash
# SSH into your Hostinger server
ssh user@your-server-ip

# Create project directory
mkdir -p /home/user/bimano-crm
cd /home/user/bimano-crm
```

---

## Step 2: Upload Files

Upload the entire project (excluding node_modules, .env, dist, logs) to the server via SFTP/SCP or Git.

```bash
# Option A: Git clone (if using a repo)
git clone https://your-repo-url.git .

# Option B: SCP from local machine
scp -r backend/ frontend/ ecosystem.config.js user@your-server-ip:/home/user/bimano-crm/
```

---

## Step 3: Configure Backend Environment

```bash
cd backend
cp .env.example .env
nano .env
```

**Set these values in `backend/.env`:**

```env
NODE_ENV=production
PORT=5000

# Database (get from Hostinger MySQL panel)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_strong_password
DB_NAME=bimano_crm

# IMPORTANT: Generate a strong secret (run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=paste_generated_secret_here
JWT_EXPIRES_IN=7d

# Frontend URL (your domain)
CORS_ORIGIN=https://yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Google Sheets (optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

---

## Step 4: Install Dependencies & Migrate

```bash
# Backend
cd /home/user/bimano-crm/backend
npm install --production

# Run database migration
npm run migrate
```

---

## Step 5: Build Frontend

```bash
cd /home/user/bimano-crm/frontend
npm install
npm run build
```

This creates the `dist/` folder with optimized static files.

---

## Step 6: Serve Frontend from Backend (Recommended)

Add static file serving to your backend. Create or edit the server to serve frontend files. 

**Option A: Use Nginx (recommended)**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    root /home/user/bimano-crm/frontend/dist;
    index index.html;

    # API proxy to Node.js backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Option B: Serve from Express (simpler, no Nginx needed)**

Add this to `backend/src/server.js` BEFORE the 404 handler:
```js
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

---

## Step 7: Start with PM2

```bash
cd /home/user/bimano-crm

# Start in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 process list (auto-restart on reboot)
pm2 save
pm2 startup
```

### Useful PM2 Commands
```bash
pm2 status                # Check app status
pm2 logs bimano-crm       # View logs
pm2 restart bimano-crm    # Restart app
pm2 stop bimano-crm       # Stop app
pm2 monit                 # Monitor CPU/memory
```

---

## Step 8: SSL Certificate (HTTPS)

If using Nginx:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Step 9: Create Admin User

```bash
cd /home/user/bimano-crm/backend
npm run seed:admin
```

---

## Updating the Application

```bash
cd /home/user/bimano-crm

# Pull latest code
git pull origin main

# Backend
cd backend
npm install --production

# Frontend
cd ../frontend
npm install
npm run build

# Restart backend
pm2 restart bimano-crm
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `FATAL: Missing required env vars` | Check `backend/.env` has JWT_SECRET, DB_PASSWORD, DB_HOST |
| `MySQL connection failed` | Verify DB credentials and that MySQL is running |
| 502 Bad Gateway (Nginx) | Check `pm2 status` — app may have crashed |
| CORS errors in browser | Ensure `CORS_ORIGIN` in `.env` matches your frontend URL exactly |
| Login redirect loop | Clear browser localStorage and try again |
| Rate limit errors | Increase `RATE_LIMIT_MAX` in `.env` or adjust window |

---

## Security Checklist

- [ ] JWT_SECRET is a strong random string (64+ chars)
- [ ] DB_PASSWORD is not 'root' or empty
- [ ] NODE_ENV=production is set
- [ ] CORS_ORIGIN is set to your actual domain (not localhost)
- [ ] SSL/HTTPS is enabled
- [ ] Firewall blocks direct access to port 5000 (only allow through Nginx)
- [ ] MySQL port (3306) is not exposed publicly
