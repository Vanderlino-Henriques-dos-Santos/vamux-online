import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { firebaseConfig } from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Exibe mensagem visual
function exibirMensagem(texto, tipo) {
  const msg = document.getElementById("mensagem-status");
  msg.innerHTML = texto;
  msg.style.display = "block";
  msg.style.color = tipo === "erro" ? "red" : "green";
  msg.style.fontWeight = "600";
  msg.style.marginTop = "10px";
}

// Evento de login
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    exibirMensagem("Preencha todos os campos.", "erro");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Salva o UID no localStorage
    localStorage.setItem("uidVamux", user.uid);

    // Busca o tipo do usuário no database
    const userRef = ref(database, `usuarios/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const dados = snapshot.val();
      const tipoUsuario = dados.tipo;

      exibirMensagem("Login realizado com sucesso!", "sucesso");

      setTimeout(() => {
        if (tipoUsuario === "Sou Passageiro") {
          window.location.href = "passageiro.html";
        } else {
          window.location.href = "motorista.html";
        }
      }, 1500);
    } else {
      exibirMensagem("Usuário não encontrado no banco de dados.", "erro");
    }

  } catch (error) {
    let mensagemErro = "Erro ao fazer login.";

    if (error.code === "auth/user-not-found") {
      mensagemErro = "Usuário não encontrado.";
    } else if (error.code === "auth/wrong-password") {
      mensagemErro = "Senha incorreta.";
    } else if (error.code === "auth/invalid-email") {
      mensagemErro = "E-mail inválido.";
    }

    exibirMensagem(mensagemErro, "erro");
  }
});
