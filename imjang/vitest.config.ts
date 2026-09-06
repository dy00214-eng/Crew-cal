import { defineConfig } from 'vitest/config';

// 순수 로직(파서·포맷·체크리스트·실거래가 응답 처리)만 테스트한다.
// DOM 이 필요한 화면 코드는 여기서 다루지 않는다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
