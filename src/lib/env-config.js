export const getBackendTarget = () => {
    const IS_PROD = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const DEFAULT_PROD_URL = 'https://finquest-api-prod-marcos-123.deno.dev';
    const VITE_URL = import.meta.env.VITE_BASE44_BACKEND_URL;

    // If VITE_URL is explicitly a production cloud URL, use it.
    if (VITE_URL && VITE_URL.includes('deno.dev')) {
        return VITE_URL;
    }

    // If we are on vercel.app, we MUST use production URL regardless of local .env
    if (IS_PROD) {
        return DEFAULT_PROD_URL;
    }

    // Fallback to VITE_URL (which might be localhost) or the hardcoded localhost
    return VITE_URL || 'http://localhost:5174';
};
