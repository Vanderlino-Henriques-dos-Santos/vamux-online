// 🔄 Firebase
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { firebaseConfig } from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Elementos do formulário
const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const veiculoInput = document.getElementById("veiculo");
const placaInput = document.getElementById("placa");

const passageiroBtn = document.getElementById("btn-passageiro");
const motoristaBtn = document.getElementById("btn-motorista");
const statusBox = document.getElementById("statusCadastro");

// Exibir mensagens visuais
function exibirMensagem(texto, cor = "green") {
  statusBox.innerText = texto;
  statusBox.style.color = cor;
}

// Função principal de cadastro
function cadastrar(tipo) {
  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const senha = senhaInput.value.trim();
  const veiculo = veiculoInput.value.trim();
  const placa = placaInput.value.trim();

  if (!nome || !email || !senha) {
    exibirMensagem("Preencha nome, e-mail e senha!", "red");
    return;
  }

  if (tipo === "motorista" && (!veiculo || !placa)) {
    exibirMensagem("Preencha veículo e placa!", "red");
    return;
  }

  createUserWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      const user = userCredential.user;

      updateProfile(user, {
        displayName: nome,
      });

      const userRef = ref(database, `usuarios/${user.uid}`);
      set(userRef, {
        nome: nome,
        email: email,
        tipo: tipo,
        veiculo: tipo === "motorista" ? veiculo : "",
        placa: tipo === "motorista" ? placa : "",
      });

      exibirMensagem("Cadastro efetuado com sucesso!", "green");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    })
    .catch((error) => {
      exibirMensagem("Erro no cadastro: " + error.message, "red");
    });
}

// Eventos dos botões
passageiroBtn.addEventListener("click", () => cadastrar("passageiro"));
motoristaBtn.addEventListener("click", () => cadastrar("motorista"));
