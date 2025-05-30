import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);
const params = new URLSearchParams(window.location.search);
const tipo = params.get("tipo");

const mensagem = document.getElementById("mensagemLogin");
const form = document.querySelector("form");

if (!tipo || (tipo !== "passageiro" && tipo !== "motorista")) {
  mensagem.textContent = "Tipo de usuário inválido. Acesse via página inicial.";
  mensagem.style.color = "red";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const senha = form.senha.value.trim();

  if (!email || !senha) {
    mensagem.textContent = "Preencha todos os campos.";
    mensagem.style.color = "orange";
    return;
  }

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => {
      mensagem.textContent = "✅ Login realizado com sucesso!";
      mensagem.style.color = "lime";

      setTimeout(() => {
        if (tipo === "passageiro") {
          window.location.href = "passageiro.html";
        } else if (tipo === "motorista") {
          window.location.href = "motorista.html";
        }
      }, 1500);
    })
    .catch((error) => {
      mensagem.textContent = `Erro: ${error.message}`;
      mensagem.style.color = "red";
    });
});
