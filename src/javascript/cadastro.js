import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { auth, database } from "./firebase-config.js";

// Elementos do DOM
const cadastroForm = document.getElementById("cadastroForm");
const mensagemCadastro = document.getElementById("mensagemCadastro");

// Ação no envio do formulário
cadastroForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const tipoUsuario = document.getElementById("tipoUsuario").value;

  if (!nome || !email || !senha || !tipoUsuario) {
    mensagemCadastro.textContent = "⚠️ Preencha todos os campos.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const userId = userCredential.user.uid;

    // Salvar dados no Realtime Database
    await set(ref(database, `usuarios/${userId}`), {
      nome,
      email,
      tipo: tipoUsuario
    });

    mensagemCadastro.textContent = "✅ Cadastro realizado com sucesso! Redirecionando...";
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 2000);
  } catch (error) {
    console.error("Erro no cadastro:", error);
    mensagemCadastro.textContent = "❌ Erro ao cadastrar: " + error.message;
  }
});
