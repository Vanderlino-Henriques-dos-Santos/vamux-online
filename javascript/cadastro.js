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

const params = new URLSearchParams(window.location.search);
const tipo = params.get("tipo");
const mensagem = document.getElementById("mensagemCadastro");

if (!tipo || (tipo !== "passageiro" && tipo !== "motorista")) {
  mensagem.textContent = "Tipo de usuário inválido. Acesse via página inicial.";
  mensagem.style.color = "red";
  throw new Error("Tipo inválido");
}

window.cadastrarUsuario = function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    mensagem.textContent = "Preencha todos os campos corretamente.";
    mensagem.style.color = "red";
    return;
  }

  createUserWithEmailAndPassword(auth, email, senha)
    .then(() => {
      mensagem.textContent = "Cadastro realizado com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = `login.html?tipo=${tipo}`;
      }, 1500);
    })
    .catch((error) => {
      console.error("Erro ao cadastrar:", error);
      mensagem.textContent = "Erro ao cadastrar: " + (error.message || "Tente novamente.");
      mensagem.style.color = "red";
    });
};