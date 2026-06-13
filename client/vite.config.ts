import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  // Load environment variables from the root directory
  const rootEnv = loadEnv(mode, path.resolve(__dirname, "../"), "")
  const port = rootEnv.PORT || 5000
  const serverUrl = `http://127.0.0.1:${port}`

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    envDir: path.resolve(__dirname, "../"), // point envDir to the root directory
    server: {
      host: true,
      proxy: {
        '/api': serverUrl,
        '/uploads': serverUrl,
      }
    }
  }
})
