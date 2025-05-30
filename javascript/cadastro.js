// javascript/cadastro.js

import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { app } from "./firebase-config.js"; // Certifique-se que firebase-config.js exporta 'app'

console.log("🥳 Arquivo cadastro.js carregado!"); // Adicione esta linha

const auth = getAuth(app);
const form = document.querySelector("form");
const mensagemCadastro = document.getElementById("mensagemCadastro");

if (form) { // Adicione esta verificação
  console.log("✅ Formulário encontrado."); // Adicione esta linha
  form.addEventListener("submit", (e) => {
    e.preventDefault(); // Evita o recarregamento da página
    console.log("🔥 Evento de submit disparado!"); // Adicione esta linha

    const email = form.email.value.trim();
    const senha = form.senha.value.trim();

    if (!email || !senha) {
      mensagemCadastro.textContent = "Por favor, preencha todos os campos.";
      mensagemCadastro.style.color = "orange";
      console.log("⚠️ Campos vazios."); // Adicione esta linha
      return;
    }

    // Tentar criar o usuário no Firebase
    createUserWithEmailAndPassword(auth, email, senha)
      .then((userCredential) => {
        // Usuário criado com sucesso
        const user = userCredential.user;
        mensagemCadastro.textContent = "🎉 Cadastro realizado com sucesso!";
        mensagemCadastro.style.color = "lime";
        console.log("✅ Usuário cadastrado:", user.email); // Adicione esta linha
        
        // Redireciona dependendo do tipo (se você estiver passando tipo na URL, como no login)
        // Isso pode não ser necessário aqui se o cadastro não diferencia o tipo no momento.
        const params = new URLSearchParams(window.location.search);
        const tipo = params.get("tipo");
        setTimeout(() => {
          if (tipo === "passageiro") {
            window.location.href = "passageiro.html";
          } else if (tipo === "motorista") {
           window.location.href = "motorista.html"; // Para ir direto para a área do motorista 
          } else {
            window.location.href = "login.html"; // Padrão
          }
        }, 1500);
      })
      .catch((error) => {
        // Ocorreu um erro no cadastro
        mensagemCadastro.textContent = `❌ Erro ao cadastrar: ${error.message}`;
        mensagemCadastro.style.color = "red";
        console.error("❌ Erro de cadastro Firebase:", error); // Adicione esta linha
      });
  });
} else {
  console.log("❌ Formulário NÃO encontrado! Verifique o HTML."); // Adicione esta linha
}