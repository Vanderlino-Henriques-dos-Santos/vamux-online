const firebaseConfig = {
  apiKey: "SUA_CHAVE_API",
  authDomain: "vamux-ad825.firebaseapp.com",
  databaseURL: "https://vamux-ad825-default-rtdb.firebaseio.com", // ESSENCIAL
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.appspot.com",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};

// Inicializar o Firebase
firebase.initializeApp(firebaseConfig);

// Criar referência ao banco de dados
const database = firebase.database();
