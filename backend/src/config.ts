export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://mermaid:mermaid_secret@db:5432/mermaid_studio',
  jwtSecret:
    process.env.JWT_SECRET || 'mermaid-studio-pro-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || 'admin@mermaid.local').trim().toLowerCase(),
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || 'Admin123456!',
  superAdminName: (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim(),
};
