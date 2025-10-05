import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default ({ mode }: { mode: string }) => {
    process.env = {
        ...process.env,
        ...loadEnv(mode, path.resolve(process.cwd(), '.env')), // For monorepo package
        ...loadEnv(mode, path.resolve(process.cwd(), '../.env')) // For monorepo root
    }

    return defineConfig({
        plugins: [react()],

        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
                $frontend: path.resolve(__dirname, './src'),
                $api: path.resolve(__dirname, '../api/src'),
                $scraper: path.resolve(__dirname, '../scraper/src')
            }
        },

        server: {
            port: parseInt(process.env.VITE_CLIENT_PORT ?? '45173'),

            proxy: {
                '/api': {
                    target: process.env.VITE_API_URL ?? 'http://localhost:40080',
                    changeOrigin: true,
                    secure: process.env.VITE_API_URL?.startsWith('https://') ?? false
                }
            }
        }
    })
}
