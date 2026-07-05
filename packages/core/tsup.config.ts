import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'domain/index': 'src/domain/index.ts',
    'db/index': 'src/db/index.ts',
    'services/index': 'src/services/index.ts',
    'http/index': 'src/http/index.ts',
    'queue/index': 'src/queue/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['esm'],
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
})
