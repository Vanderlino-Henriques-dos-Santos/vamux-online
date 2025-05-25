// ✅ firebase-config.js - Firebase VAMUX SEM module

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

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// 🔥 Instâncias Globais
const database = firebase.database();
const auth = firebase.auth();
