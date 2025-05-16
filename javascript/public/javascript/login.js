import app from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Pega elementos da tela
const loginForm = document.getElementById('loginForm');
const mensagemErro = document.getElementById('mensagemErro');

// Inicializa o Firebase Auth
const auth = getAuth(app);

// Captura o tipo da URL: ?tipo=passageiro ou ?tipo=motorista
const params = new URLSearchParams(window.location.search);
const tipo = params.get("tipo"); // pode ser "passageiro" ou "motorista"

// Garante que o tipo é válido
if (!tipo || (tipo !== "passageiro" && tipo !== "motorista")) {
  mensagemErro.textContent = "Tipo de usuário inválido. Volte e selecione Passageiro ou Motorista.";
  mensagemErro.style.color = "red";
}

// Evento de login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Login ok:", user.email);

      if (tipo === "motorista") {
        window.location.href = "motorista.html";
      } else {
        window.location.href = "passageiro.html";
      }
    })
    .catch((error) => {
      console.error("Erro no login:", error);
      mensagemErro.textContent = "Email ou senha inválidos. Tente novamente.";
      mensagemErro.style.color = "red";
    });
});
