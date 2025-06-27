import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  update,
} from "firebase/database";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Pega o nome e placa do motorista do localStorage
const nomeMotorista = localStorage.getItem("nome") || "Motorista";
const placaVeiculo = localStorage.getItem("placa") || "ABC-1234";

// Elementos
const btnOnline = document.getElementById("btn-online");
const mensagem = document.getElementById("mensagem");

let mapa;
let rota;
let direcoesService;
let localMotorista = null;
let corridaAtualId = null;

btnOnline.addEventListener("click", () => {
  mensagem.textContent = "Você está online! Aguardando corridas...";
  mensagem.style.color = "#8000c9";
  escutarCorridas();
});

// Inicializar o mapa
function initMap() {
  mapa = new google.maps.Map(document.getElementById("mapa"), {
    zoom: 15,
    center: { lat: -23.55, lng: -46.63 },
  });

  rota = new google.maps.DirectionsRenderer();
  rota.setMap(mapa);
  direcoesService = new google.maps.DirectionsService();

  rastrearLocalizacao();
}

window.initMap = initMap;

// Carrega o mapa com a chave protegida do .env
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
script.async = true;
document.head.appendChild(script);

// Rastreia localização do motorista
function rastrearLocalizacao() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        localMotorista = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        mapa.setCenter(localMotorista);
        new google.maps.Marker({
          position: localMotorista,
          map: mapa,
          title: "Você",
          icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
      },
      () => {
        mensagem.textContent = "Não foi possível obter sua localização.";
        mensagem.style.color = "red";
      }
    );
  }
}

// Escutar corridas pendentes
function escutarCorridas() {
  const corridasRef = ref(database, "corridas");

  onValue(corridasRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    for (const [id, corrida] of Object.entries(data)) {
      if (corrida.status === "pendente") {
        exibirSolicitacao(corrida, id);
        break;
      }
    }
  });
}

// Exibir corrida para aceitar
function exibirSolicitacao(corrida, id) {
  mensagem.innerHTML = `
    <div style="
      background-color: #8000c9;
      color: white;
      font-weight: 500;
      padding: 6px 10px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 14px;
      text-align: center;
      width: fit-content;
      max-width: 90%;
      margin-left: auto;
      margin-right: auto;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
    ">
      Corrida solicitada por <b>${corrida.passageiro}</b><br>
      De: ${corrida.origem}<br>
      Para: ${corrida.destino}<br>
      Valor: R$ ${corrida.valor}<br>
      <button class="btn" style="margin-top: 10px;" onclick="aceitarCorrida('${id}', '${corrida.origem}')">Aceitar Corrida</button>
    </div>
  `;
}

// Aceitar corrida
window.aceitarCorrida = function (id, origem) {
  const corridaRef = ref(database, `corridas/${id}`);
  update(corridaRef, {
    status: "aceita",
    motorista: nomeMotorista,
    placa: placaVeiculo,
  });

  corridaAtualId = id;
  mensagem.textContent = "Corrida aceita! Rota traçada até o passageiro.";
  mensagem.style.color = "#8000c9";

  traçarRota(origem);
  adicionarBotaoFinalizar();
};

// Traçar rota até o passageiro
function traçarRota(origem) {
  direcoesService.route(
    {
      origin: localMotorista,
      destination: origem,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (res, status) => {
      if (status === "OK") {
        rota.setDirections(res);
      }
    }
  );
}

// Adicionar botão para finalizar
function adicionarBotaoFinalizar() {
  const botao = document.createElement("button");
  botao.textContent = "Finalizar Corrida";
  botao.className = "btn";
  botao.style.marginTop = "15px";
  botao.onclick = finalizarCorrida;

  mensagem.appendChild(botao);
}

// Finalizar corrida
function finalizarCorrida() {
  if (!corridaAtualId) return;
  const corridaRef = ref(database, `corridas/${corridaAtualId}`);

  update(corridaRef, {
    status: "finalizada",
  });

  mensagem.textContent = "Corrida finalizada. Aguardando nova corrida...";
  mensagem.style.color = "green";
  corridaAtualId = null;

  setTimeout(() => {
    mensagem.textContent = "Você está online! Aguardando corridas...";
    mensagem.style.color = "#8000c9";
  }, 4000);
}
