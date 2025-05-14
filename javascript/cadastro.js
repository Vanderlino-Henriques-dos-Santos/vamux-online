import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_gHvH6diRTaK0w68xdYfx5fPzNF23YXM",
  authDomain: "vamux-ad825.firebaseapp.com",
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.appspot.com",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.cadastrarUsuario = function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const mensagem = document.getElementById("mensagemCadastro");

  createUserWithEmailAndPassword(auth, email, senha)
    .then(() => {
      mensagem.textContent = "Cadastro realizado com sucesso!";
      mensagem.style.color = "green";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    })
    .catch((error) => {
      mensagem.textContent = "Erro ao cadastrar: " + error.message;
      mensagem.style.color = "red";
    });
};
