// 🔄 Firebase
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  equalTo,
  onChildAdded,
  get,
  update,
  off,
  limitToLast
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

// Elementos do HTML
const statusCorrida = document.getElementById("statusCorrida");
const aceitarBtn = document.getElementById("aceitarCorridaBtn");
const finalizarBtn = document.getElementById("finalizarCorridaBtn");
const mapaElemento = document.getElementById("mapa");

// Variáveis do mapa e controle
let map, directionsService, directionsRenderer;
let corridaIdAtual = null;
let nomeMotorista = "Motorista";

// Inicia o mapa com Google Maps
function initMap() {
  map = new google.maps.Map(mapaElemento, {
    center: { lat: -23.55052, lng: -46.633308 },
    zoom: 12,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  escutarCorridasPendentes(); // Ativa escuta quando mapa estiver pronto
}
window.initMap = initMap;

// Carrega script do Google Maps dinamicamente
const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
script.defer = true;
document.head.appendChild(script);

// Define nome do motorista autenticado
onAuthStateChanged(auth, (user) => {
  if (user) {
    nomeMotorista = user.displayName || "Motorista";
  }
});

// ✅ NOVO BLOCO: escuta a última corrida pendente e disponível
function escutarCorridasPendentes() {
  const refCorridasPendentes = query(
    ref(database, "corridas"),
    orderByChild("status"),
    equalTo("pendente"),
    limitToLast(1) // Garante que apenas a mais recente seja escutada
  );

  onChildAdded(refCorridasPendentes, (snapshot) => {
    const id = snapshot.key;
    const corrida = snapshot.val();

    // Ignora corridas que já foram aceitas
    if (corrida.motorista || corrida.status !== "pendente") return;

    // Atualiza variáveis e interface
    corridaIdAtual = id;

    statusCorrida.innerText = `Passageiro: ${corrida.passageiro} | Rota: ${corrida.origem} → ${corrida.destino}`;
    statusCorrida.style.color = "green";
    aceitarBtn.style.display = "inline-block";

    mostrarRota(corrida.origem, corrida.destino);
  });
}

// Traça a rota no mapa usando Google Directions API
function mostrarRota(origem, destino) {
  const request = {
    origin: origem,
    destination: destino,
    travelMode: "DRIVING",
  };

  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
    } else {
      console.error("Erro ao traçar rota:", status);
    }
  });
}

// Quando motorista clica em "Aceitar Corrida"
aceitarBtn.addEventListener("click", async () => {
  if (!corridaIdAtual) return;

  const user = auth.currentUser;
  const corridaRef = ref(database, `corridas/${corridaIdAtual}`);
  const snapshot = await get(corridaRef);

  if (!snapshot.exists() || snapshot.val().status !== "pendente") {
    statusCorrida.innerText = "Corrida já foi atribuída.";
    statusCorrida.style.color = "orange";
    aceitarBtn.style.display = "none";
    return;
  }

  // Atualiza corrida no banco com dados do motorista
  await update(corridaRef, {
    status: "aceita",
    motorista: nomeMotorista,
    motoristaUid: user.uid,
  });

  // Desativa escuta temporariamente
  off(ref(database, "corridas"));

  const corrida = snapshot.val();
  statusCorrida.innerText = `Corrida aceita! Passageiro: ${corrida.passageiro} | Rota: ${corrida.origem} → ${corrida.destino}`;
  statusCorrida.style.color = "#8000c9";
  aceitarBtn.style.display = "none";
  finalizarBtn.style.display = "inline-block";
});

// Quando motorista finaliza a corrida
finalizarBtn.addEventListener("click", async () => {
  if (!corridaIdAtual) return;

  const corridaRef = ref(database, `corridas/${corridaIdAtual}`);
  await update(corridaRef, {
    status: "finalizada",
  });

  // Limpa estado da corrida
  statusCorrida.innerText = "Corrida finalizada. Aguardando nova solicitação...";
  statusCorrida.style.color = "blue";
  finalizarBtn.style.display = "none";
  aceitarBtn.style.display = "none";
  corridaIdAtual = null;

  directionsRenderer.set("directions", null); // limpa mapa

  escutarCorridasPendentes(); // reativa escuta para novas corridas
});
