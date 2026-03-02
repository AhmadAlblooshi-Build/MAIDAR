/**
 * Get API URL with HTTPS enforcement for production
 */
export function getApiUrl(): string {
  // If we're in browser and not on localhost, use production HTTPS URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://maidar-production-3ee1.up.railway.app';
  }

  // Otherwise use environment variable or localhost
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  // Force HTTPS for Railway URLs
  if (url.includes('railway.app') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}
