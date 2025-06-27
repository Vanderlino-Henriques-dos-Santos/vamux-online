import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set
} from "firebase/database";

import { firebaseConfig } from './firebase-config.js';

// Inicializa Firebase localmente neste módulo
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Exibe mensagens
function exibirMensagem(texto, tipo) {
  const mensagemDiv = document.getElementById("mensagem-status");
  mensagemDiv.innerText = texto;
  mensagemDiv.style.display = "block";
  mensagemDiv.style.color = tipo === "erro" ? "red" : "green";
  mensagemDiv.style.backgroundColor = "transparent";
  mensagemDiv.style.fontSize = "14px";
}

// Evento de cadastro
document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const tipoUsuario = document.getElementById("tipoUsuario").value;

  if (!nome || !email || !senha || !tipoUsuario || tipoUsuario === "Selecione") {
    exibirMensagem("Preencha todos os campos.", "erro");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    await set(ref(database, `usuarios/${user.uid}`), {
      nome,
      email,
      tipo: tipoUsuario
    });

    exibirMensagem("Cadastro efetuado com sucesso!", "sucesso");

   setTimeout(() => {
  window.location.href = "login.html";
}, 2000);


  } catch (error) {
    let mensagemErro = "Erro ao cadastrar. Tente novamente.";

    if (error.code === "auth/email-already-in-use") {
      mensagemErro = "Este e-mail já está em uso.";
    } else if (error.code === "auth/invalid-email") {
      mensagemErro = "E-mail inválido.";
    } else if (error.code === "auth/weak-password") {
      mensagemErro = "A senha deve ter pelo menos 6 caracteres.";
    }

    exibirMensagem(mensagemErro, "erro");
  }
});
