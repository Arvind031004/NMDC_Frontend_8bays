import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

const detectorProxy = {
  target: "http://127.0.0.1:8001",
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/system/performance": detectorProxy,
      "/system/engagements": detectorProxy,
      "/system/engagement-events": detectorProxy,
      "^/camera-admin/poe-assignments(?:/|$)": {...detectorProxy, changeOrigin: false},
      "^/camera-admin(?:/|$)": detectorProxy,
      "^/camera(?:/|$)": {...detectorProxy, changeOrigin: false},
      "/status": detectorProxy,
      "/health": detectorProxy,
      "/stream": detectorProxy,
      "/snapshot.jpg": detectorProxy,
      "/api": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
      },
    },
  },
});
