const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
] as const;

export const validateEnvironment = () => {
  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    const message = `❌ Missing environment variables:\n${missing.join('\n')}\n\nPlease check your .env file.`;
    console.error(message);
    throw new Error(message);
  }

  console.log('✅ Environment variables validated');
  return true;
};
