// javascript/cadastro.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Captura o tipo da URL
const urlParams = new URLSearchParams(window.location.search);
const tipo = urlParams.get("tipo");

// Elementos do formulário
const form = document.getElementById("form-cadastro");
const btnPassageiro = document.getElementById("btn-passageiro");
const btnMotorista = document.getElementById("btn-motorista");

// Verifica e mostra o botão correto
if (tipo === "passageiro") {
  btnMotorista.style.display = "none";
} else if (tipo === "motorista") {
  btnPassageiro.style.display = "none";
} else {
  alert("Tipo de usuário inválido. Redirecionando...");
  window.location.href = "index.html";
}

// Cadastro e redirecionamento
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!tipo || !nome || !email || !senha) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      const user = userCredential.user;

      // Salva no Realtime Database
      set(ref(db, `${tipo}s/${user.uid}`), {
        nome: nome,
        email: email,
        tipo: tipo
      });

      alert("Cadastro realizado com sucesso!");

      // Redireciona para a tela correta
      if (tipo === "passageiro") {
        window.location.href = "passageiro.html";
      } else {
        window.location.href = "motorista.html";
      }
    })
    .catch((error) => {
      console.error("Erro ao cadastrar:", error);
      alert("Erro ao cadastrar: " + error.message);
    });
});
