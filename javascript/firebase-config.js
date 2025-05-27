import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configuração do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBfp30Se57_oEKCUyuFDz2FDlgfkqpi-E4",
  authDomain: "vamux-ad825.firebaseapp.com",
  databaseURL: "https://vamux-ad825-default-rtdb.firebaseio.com",
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.appspot.com",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};

const app = initializeApp(firebaseConfig);

export default app;
