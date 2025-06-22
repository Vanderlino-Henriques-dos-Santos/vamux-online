import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'public', // Define a pasta 'public' como a raiz do projeto
  server: {
    watch: {
      usePolling: true, // Útil para alguns ambientes de desenvolvimento
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'public/index.html', // Define public/index.html como o ponto de entrada principal do build
      },
    },
    // Outras opções de build podem ser adicionadas aqui
  },
});