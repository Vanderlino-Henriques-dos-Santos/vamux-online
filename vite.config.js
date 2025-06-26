import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // raiz do projeto
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        cadastro: './cadastro.html',
        login: './login.html',
        passageiro: './passageiro.html',
        motorista: './motorista.html',
      }
    }
  }
});
