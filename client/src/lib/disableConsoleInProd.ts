// client/src/lib/disableConsoleInProd.ts
if (import.meta.env.PROD) {
  (['log','info','debug'] as const).forEach(k => {
    (console as any)[k] = () => {};
  });
}
