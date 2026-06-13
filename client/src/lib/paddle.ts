// Paddle.js CDN loader + environment-aware initialization.

declare global {
  interface Window {
    Paddle?: any;
  }
}

const PADDLE_CDN = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let initPromise: Promise<any> | null = null;

export function loadPaddle(): Promise<any> {
  if (initPromise) return initPromise;

  initPromise = new Promise<any>((resolve, reject) => {
    const onLoaded = () => {
      initPaddle(window.Paddle).then(() => resolve(window.Paddle)).catch(reject);
    };

    if (window.Paddle) {
      onLoaded();
      return;
    }

    const existing = document.querySelector(`script[src="${PADDLE_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', onLoaded);
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_CDN;
    script.async = true;
    script.onload = onLoaded;
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });

  return initPromise;
}

async function initPaddle(Paddle: any): Promise<void> {
  const res = await fetch('/api/billing/config', { credentials: 'include' });
  const config = res.ok ? await res.json() : {};
  const env: string = config.environment || import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
  const token: string = config.clientToken || '';

  if (env === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }

  Paddle.Initialize({ token });
}
