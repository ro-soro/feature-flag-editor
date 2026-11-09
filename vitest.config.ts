import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Vitest reads this file instead of vite.config.ts. The TanStack Start plugin
// there loads a second copy of React for component tests ("Invalid hook
// call"), and tests need only React and the `#/` path alias.
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] }), viteReact()],
})
