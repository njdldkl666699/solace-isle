import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [vue()],
    server: {
      port: Number(env.VITE_FRONTEND_PORT || 5173),
      disableHostCheck: true,
      hot: true, //自动保存
      overlay: {
        warnings: false,
        errors: true,
      },
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_APP_URL,
          ws: false,
          secure: false,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
