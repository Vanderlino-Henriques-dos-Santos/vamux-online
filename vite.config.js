// vite.config.js
export default {
  root: 'public', // Define a pasta 'public' como a raiz do projeto
  server: {
    watch: {
      usePolling: true,
    },
  },
  build: {
    // Adiciona esta seção para configurar o Rollup (usado pelo Vite para o build)
    rollupOptions: {
      input: {
        main: 'public/index.html', // Define public/index.html como o ponto de entrada principal do build
      },
    },
  },
};