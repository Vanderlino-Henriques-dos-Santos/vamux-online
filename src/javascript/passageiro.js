// 🔄 Firebase
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  onValue,
  get,
} from "firebase/database";
import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";
import { firebaseConfig } from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Variáveis globais
let map, directionsService, directionsRenderer;
let distanciaKmGlobal = 0;
let origemGlobal = "", destinoGlobal = "";
let nomePassageiro = "Passageiro";
let uidPassageiro = null;

// Iniciar mapa
function initMap() {
  map = new google.maps.Map(document.getElementById("mapa"), {
    center: { lat: -23.55052, lng: -46.633308 },
    zoom: 12,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
}
window.initMap = initMap;

// Carrega Google Maps
const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
script.defer = true;
document.head.appendChild(script);

// DOM
document.addEventListener("DOMContentLoaded", () => {
  const calcularBtn = document.getElementById("calcularBtn");
  const chamarCorridaBtn = document.getElementById("chamarCorridaBtn");
  const origemInput = document.getElementById("origem");
  const destinoInput = document.getElementById("destino");
  const estimativaBox = document.getElementById("estimativa");
  const statusBox = document.getElementById("status-corrida");

  chamarCorridaBtn.style.display = "none";

  // Usuário autenticado
  onAuthStateChanged(auth, (user) => {
    if (user) {
      nomePassageiro = user.displayName || "Passageiro";
      uidPassageiro = user.uid;
      escutarCorridasAceitas(); // Inicia escuta assim que loga
    }
  });

  // Calcular estimativa
  calcularBtn.addEventListener("click", () => {
    const origem = origemInput.value.trim();
    const destino = destinoInput.value.trim();

    if (!origem || !destino) {
      estimativaBox.innerText = "Preencha origem e destino!";
      estimativaBox.style.color = "red";
      return;
    }

    origemGlobal = origem;
    destinoGlobal = destino;

    const request = {
      origin: origem,
      destination: destino,
      travelMode: "DRIVING",
    };

    directionsService.route(request, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);

        const distanciaText = result.routes[0].legs[0].distance.text;
        const distanciaKm = parseFloat(distanciaText.replace(",", "."));
        distanciaKmGlobal = distanciaKm;

        const precoEstimado = (distanciaKm * 2.5).toFixed(2);

        estimativaBox.innerText = `Distância: ${distanciaKm.toFixed(
          2
        )} km | Valor estimado: R$ ${precoEstimado}`;
        estimativaBox.style.color = "green";

        chamarCorridaBtn.style.display = "inline-block";
      } else {
        estimativaBox.innerText = "Erro ao calcular rota.";
        estimativaBox.style.color = "red";
      }
    });
  });

  // Chamar corrida
  chamarCorridaBtn.addEventListener("click", () => {
    if (!origemGlobal || !destinoGlobal || !distanciaKmGlobal) {
      statusBox.innerText = "Calcule a estimativa antes de chamar.";
      statusBox.style.color = "red";
      return;
    }

    const novaCorrida = {
      origem: origemGlobal,
      destino: destinoGlobal,
      distancia: distanciaKmGlobal,
      valor: (distanciaKmGlobal * 2.5).toFixed(2),
      status: "pendente",
      passageiro: nomePassageiro,
      passageiroUid: uidPassageiro,
      timestamp: Date.now(),
    };

    const corridasRef = ref(database, "corridas");

    push(corridasRef, novaCorrida)
      .then(() => {
        statusBox.innerText = "🚕 Corrida solicitada! Aguardando motorista...";
        statusBox.style.color = "green";
        chamarCorridaBtn.style.display = "none";
      })
      .catch((error) => {
        console.error("Erro ao solicitar corrida:", error);
        statusBox.innerText = "Erro ao solicitar corrida.";
        statusBox.style.color = "red";
      });
  });

  // Escuta corridas aceitas
  function escutarCorridasAceitas() {
    const corridasRef = ref(database, "corridas");

    onValue(corridasRef, (snapshot) => {
      const corridas = snapshot.val();
      if (!corridas) return;

      Object.entries(corridas).forEach(async ([id, corrida]) => {
        if (corrida.passageiroUid === uidPassageiro && corrida.status === "aceita") {
          // Busca dados do motorista
          const motoristaRef = ref(database, `usuarios/${corrida.motoristaUid}`);
          const motoristaSnap = await get(motoristaRef);
          const motorista = motoristaSnap.val();

          statusBox.innerText = `🚗 Corrida aceita!\nMotorista: ${motorista.nome}\nVeículo: ${motorista.veiculo} (${motorista.placa})\nRota: ${corrida.origem} → ${corrida.destino}`;
          statusBox.style.color = "blue";
        }
      });
    });
  }
});
