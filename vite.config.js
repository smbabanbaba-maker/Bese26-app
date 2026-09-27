import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function nonBlockingAppStyles() {
  return {
    name: 'bese26-nonblocking-app-styles',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const stylesheet = /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/;
        return html.replace(stylesheet, (_tag, href) =>
          `<link rel="preload" as="style" crossorigin href="${href}"><link rel="stylesheet" crossorigin href="${href}" media="print" data-bese26-app-css onload="this.media='all';document.dispatchEvent(new Event('bese26:styles-ready'))">`,
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), nonBlockingAppStyles()],
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
});
