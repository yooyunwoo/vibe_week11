import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // 테스트마다 쓸 가짜 localStorage를 준비한다
    setupFiles: ["./test/setup.ts"],
    include: ["app/**/*.test.ts"],
  },
});
