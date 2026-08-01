import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const usePolling = env.VITE_USE_POLLING === "true";

  return {
    plugins: [react()],
    server: {
      port: 5174,
      host: "0.0.0.0",
      hmr: {
        clientPort: 5174
      },
      watch: {
        usePolling,
        interval: usePolling ? 300 : undefined
      },
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:4000",
          changeOrigin: true
        }
      }
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/tests/setup.ts",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      exclude: ["src/tests/e2e/**"]
    }
  };
});
