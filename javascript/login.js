// javascript/login.js
import app from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Pega o formulário e a área de mensagens
const loginForm = document.getElementById('loginForm');
const mensagemErro = document.getElementById('mensagemErro');

// Inicializa a autenticação
const auth = getAuth(app);

// Quando o formulário for enviado
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  // Faz login com Firebase
  signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Login bem-sucedido:", user.email);

      // Redireciona com base no email (temporário)
      if (email.includes("motorista")) {
        window.location.href = "motorista.html";
      } else {
        window.location.href = "passageiro.html";
      }
    })
    .catch((error) => {
      console.error("Erro ao logar:", error);
      mensagemErro.textContent = "Email ou senha inválidos. Tente novamente.";
      mensagemErro.style.color = "red";
    });
});
