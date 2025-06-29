// 🔄 Firebase
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  get,
} from "firebase/database";
import { firebaseConfig } from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Elementos da interface
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const statusLogin = document.getElementById("statusLogin");

// Função para exibir mensagens visuais
function exibirMensagem(texto, cor = "green") {
  statusLogin.innerText = texto;
  statusLogin.style.color = cor;
}

// Evento de login
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const senha = senhaInput.value.trim();

  if (!email || !senha) {
    exibirMensagem("Preencha todos os campos!", "red");
    return;
  }

  signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      const user = userCredential.user;
      const userRef = ref(database, `usuarios/${user.uid}`);

      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const dados = snapshot.val();
            exibirMensagem("Login efetuado com sucesso!", "green");

            setTimeout(() => {
              if (dados.tipo === "motorista") {
                window.location.href = "motorista.html";
              } else {
                window.location.href = "passageiro.html";
              }
            }, 2000);
          } else {
            exibirMensagem("Usuário não encontrado na base de dados.", "red");
          }
        })
        .catch(() => {
          exibirMensagem("Erro ao acessar dados do usuário.", "red");
        });
    })
    .catch((error) => {
      exibirMensagem("Erro no login: " + error.message, "red");
    });
});
