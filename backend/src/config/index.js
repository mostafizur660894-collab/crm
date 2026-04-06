require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Validate critical env vars in production
if (nodeEnv === 'production') {
  const required = ['JWT_SECRET', 'DB_PASSWORD', 'DB_HOST'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set. Using insecure default for development only.');
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bimano_crm',
    waitForConnections: true,
    connectionLimit: nodeEnv === 'production' ? 20 : 10,
    queueLimit: 0,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  google: {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
};
