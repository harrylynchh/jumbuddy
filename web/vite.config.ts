import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isStaging = !!process.env.VITE_API_URL?.includes("sethlupo.com");

export default defineConfig({
  plugins: [react()],
  server: {
    port: 10001,
    allowedHosts: [".sethlupo.com"],
    ...(isStaging && {
      hmr: {
        host: "10001.sethlupo.com",
        protocol: "wss",
        clientPort: 443,
      },
    }),
    proxy: {
      "/api": "http://server:10000",
    },
  },
});
