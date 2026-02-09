export const getBackendTarget = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const IS_PROD = hostname.includes('vercel.app') || hostname.includes('finquestgame.vercel.app');
    const DEFAULT_PROD_URL = 'https://finquestgame-vwy2n6v632xe.finquestgame.deno.net';
    const VITE_URL = import.meta.env.VITE_BASE44_BACKEND_URL;

    let target = 'http://localhost:5174';

    if (IS_PROD) {
        target = DEFAULT_PROD_URL;
    } else if (VITE_URL && VITE_URL.includes('deno.dev')) {
        target = VITE_URL;
    } else if (VITE_URL) {
        target = VITE_URL;
    }

    if (typeof window !== 'undefined') {
        console.log(`[EnvConfig] Host: ${hostname} | Prod: ${IS_PROD} | Target: ${target}`);
    }

    return target;
};
