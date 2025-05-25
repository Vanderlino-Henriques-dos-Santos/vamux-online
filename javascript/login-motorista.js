console.log("🔥 login-motorista.js carregado");

import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const auth = getAuth(app);

const mensagem = document.getElementById("mensagemLogin");

document.getElementById("btnEntrar").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    mensagem.textContent = "⚠️ Preencha todos os campos.";
    return;
  }

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => {
      window.location.href = "motorista.html";
    })
    .catch((error) => {
      mensagem.textContent = "Erro: " + error.message;
    });
});
