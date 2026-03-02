/**
 * Get API URL - HTTPS for production, HTTP only for localhost
 */
export function getApiUrl(): string {
  // Check if we're on localhost (development)
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Development: use HTTP localhost
      return 'http://localhost:8001';
    }
  }

  // Production: ALWAYS use HTTPS Railway URL
  return 'https://maidar-production-3ee1.up.railway.app';
}
