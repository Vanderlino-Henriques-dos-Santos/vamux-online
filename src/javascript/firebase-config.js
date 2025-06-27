// src/javascript/firebase-config.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBfp30Se57_oEKCUyuFDz2FDlgfkqpi-E4",
  authDomain: "vamux-ad825.firebaseapp.com",
  databaseURL: "https://vamux-ad825-default-rtdb.firebaseio.com",
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.firebasestorage.app",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};
const app = initializeApp(firebaseConfig);

export { firebaseConfig };

export { app };