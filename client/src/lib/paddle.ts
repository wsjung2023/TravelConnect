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

  initPromise = new Promise((resolve, reject) => {
    if (window.Paddle) {
      initPaddle(window.Paddle);
      return resolve(window.Paddle);
    }

    const existing = document.querySelector(`script[src="${PADDLE_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        initPaddle(window.Paddle);
        resolve(window.Paddle);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_CDN;
    script.async = true;
    script.onload = () => {
      initPaddle(window.Paddle);
      resolve(window.Paddle);
    };
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });

  return initPromise;
}

function initPaddle(Paddle: any): void {
  const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
  const token = env === 'sandbox'
    ? import.meta.env.VITE_PADDLE_SANDBOX_CLIENT_TOKEN
    : import.meta.env.VITE_PADDLE_LIVE_CLIENT_TOKEN;

  if (env === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }

  Paddle.Initialize({ token });
}
