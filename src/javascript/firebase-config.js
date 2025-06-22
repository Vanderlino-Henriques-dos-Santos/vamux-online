// src/javascript/firebase-config.js
// Este arquivo contém APENAS a configuração do Firebase e exporta a instância da aplicação e seus serviços.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Sua configuração de aplicativo web do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBfp30Se57_oEKCUyuFDz2FDlgfkqpi-E4",
  authDomain: "vamux-ad825.firebaseapp.com",
  databaseURL: "https://vamux-ad825-default-rtdb.firebaseio.com",
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.firebasestorage.app",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};

// Inicializando o Firebase
export const app = initializeApp(firebaseConfig);

// Exportando os serviços para que outros arquivos possam importá-los
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);