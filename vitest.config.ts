// Vitest 설정 — 단위 테스트만 (Node 환경, tests/unit 폴더)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
