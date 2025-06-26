import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { auth, database } from "./firebase-config.js";

// Elementos
const loginForm = document.getElementById("loginForm");
const mensagemLogin = document.getElementById("mensagemLogin");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    mensagemLogin.textContent = "Preencha todos os campos.";
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const userId = userCredential.user.uid;

    // Busca tipo de usuário
    const snapshot = await get(ref(database, `usuarios/${userId}`));
    const usuario = snapshot.val();

    if (!usuario || !usuario.tipo) {
      mensagemLogin.textContent = "Tipo de usuário não encontrado.";
      return;
    }

    mensagemLogin.textContent = "Login realizado! Redirecionando...";

    setTimeout(() => {
      if (usuario.tipo === "passageiro") {
        window.location.href = "/passageiro.html";
      } else if (usuario.tipo === "motorista") {
        window.location.href = "/motorista.html";
      } else {
        mensagemLogin.textContent = "Tipo de usuário inválido.";
      }
    }, 1500);
  } catch (error) {
    console.error("Erro no login:", error);
    mensagemLogin.textContent = "Erro no login: " + error.message;
  }
});
