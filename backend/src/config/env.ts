function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  PORT: parseInt(getEnv('PORT', '4000')),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  DATABASE_URL: getEnv('DATABASE_URL', 'postgresql://aiphy_user:aiphy_password@localhost:5432/aiphy_db'),
  REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),
  JWT_ACCESS_SECRET: getEnv('JWT_ACCESS_SECRET', 'dev-access-secret'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  JWT_ACCESS_EXPIRY: getEnv('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: getEnv('JWT_REFRESH_EXPIRY', '7d'),
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_REDIRECT_URI: getEnv('GOOGLE_REDIRECT_URI', 'http://localhost:4000/api/auth/google/callback'),
  GITHUB_CLIENT_ID: getEnv('GITHUB_CLIENT_ID', ''),
  GITHUB_CLIENT_SECRET: getEnv('GITHUB_CLIENT_SECRET', ''),
  GITHUB_REDIRECT_URI: getEnv('GITHUB_REDIRECT_URI', 'http://localhost:4000/api/auth/github/callback'),
  LLM_BASE_URL: getEnv('LLM_BASE_URL', 'https://api.openai.com/v1'),
  LLM_API_KEY: getEnv('LLM_API_KEY', ''),
  LLM_MODEL: getEnv('LLM_MODEL', 'gpt-4o'),
  SMTP_HOST: getEnv('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: parseInt(getEnv('SMTP_PORT', '587')),
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASS: getEnv('SMTP_PASS', ''),
  SMTP_FROM: getEnv('SMTP_FROM', 'AIphy <noreply@aiphy.ug.ac.id>'),
  XENDIT_SECRET_KEY: getEnv('XENDIT_SECRET_KEY', ''),
  XENDIT_WEBHOOK_TOKEN: getEnv('XENDIT_WEBHOOK_TOKEN', ''),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),
} as const;
