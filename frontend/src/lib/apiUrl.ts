/**
 * Get API URL - HTTPS for production, HTTP only for localhost
 */
export function getApiUrl(): string {
  // Check if we're on localhost (development)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    console.log('🔍 API URL Debug:', {
      hostname,
      isLocalhost,
      willUse: isLocalhost ? 'HTTP localhost' : 'HTTPS Railway'
    });

    if (isLocalhost) {
      // Development: use HTTP localhost
      const url = 'http://localhost:8001';
      console.log('✅ Using API URL:', url);
      return url;
    }
  }

  // Production: ALWAYS use HTTPS Railway URL
  const url = 'https://maidar-production-3ee1.up.railway.app';
  console.log('✅ Using API URL:', url);
  return url;
}
