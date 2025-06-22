// src/javascript/main.js
// Este arquivo é para imports de estilos e outros módulos principais do JS que não são o ponto de entrada direto do HTML.

import '/css/style.css'; // Importa o CSS global, o caminho absoluto '/' é a partir da pasta 'public'
import './passageiro.js'; // Importa o módulo passageiro.js (assumindo que está na mesma pasta)

// IMPORTAÇÃO CORRETA DA CONFIGURAÇÃO DO FIREBASE (com 'f' minúsculo no nome do arquivo)
import { app, auth, database, storage } from './firebase-config.js';

// Adicione aqui qualquer outro código JavaScript que seja parte do seu 'main'
// Por exemplo, lógica de inicialização de componentes, listeners de eventos, etc.
console.log("main.js carregado e Firebase importado.");

// Exemplo de como usar os serviços do Firebase (se for usado diretamente em main.js)
// if (auth) {
//   console.log("Firebase Auth está disponível em main.js para uso.");
// }