import crypto from 'crypto';

/**
 * Generate a secure random share token (12 characters, URL-safe)
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 12;
  let token = '';

  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    token += chars[randomBytes[i] % chars.length];
  }

  return token;
}

/**
 * Build the full public share URL
 */
export function getShareUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/share/${token}`;
}
