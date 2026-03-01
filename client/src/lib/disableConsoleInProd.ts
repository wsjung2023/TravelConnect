// 프로덕션 콘솔 비활성화 — 운영 환경에서 console.log 등을 무력화해 정보 노출을 방지한다.
// Production 환경에서 console.log/info/debug를 완전히 비활성화 (Vite 복원 방지)

if (import.meta.env.PROD) {
  const noop = () => {};
  
  // Object.defineProperty로 덮어쓰기 방지하되, setter로 할당 에러 방지
  (['log', 'info', 'debug'] as const).forEach(method => {
    Object.defineProperty(console, method, {
      get: () => noop,
      set: () => {}, // 할당 시도를 무시 (TypeError 방지)
      configurable: false,
      enumerable: true,
    });
  });
}
