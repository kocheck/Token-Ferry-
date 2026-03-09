import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', '../shared/**/*.test.ts'],
    alias: {
      'sketch/dom': './src/__mocks__/sketch-dom.ts',
      'sketch/ui': './src/__mocks__/sketch-ui.ts',
      'sketch/settings': './src/__mocks__/sketch-settings.ts',
      'sketch-module-web-view': './src/__mocks__/sketch-web-view.ts',
      'sketch-module-web-view/remote': './src/__mocks__/sketch-web-view-remote.ts',
    },
  },
});
