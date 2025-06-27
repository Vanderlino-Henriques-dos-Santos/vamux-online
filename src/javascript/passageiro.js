import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, update } from "firebase/database";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Pega o nome do passageiro do localStorage
const passageiroNome = localStorage.getItem("nome") || "Passageiro";

// Elementos
const origemInput = document.getElementById("origem");
const destinoInput = document.getElementById("destino");
const btnEstimar = document.getElementById("btn-estimar");
const btnChamar = document.getElementById("btn-chamar");
const estimativaDiv = document.getElementById("estimativa");
const statusCorrida = document.getElementById("status-corrida");
const infoMotorista = document.getElementById("info-motorista");

let rotaTraçada = null;
let coordenadas = {
  origem: null,
  destino: null,
};

// Função de inicialização do mapa
function initMap() {
  const mapa = new google.maps.Map(document.getElementById("mapa"), {
    zoom: 13,
    center: { lat: -23.55, lng: -46.63 },
  });

  rotaTraçada = new google.maps.DirectionsRenderer();
  rotaTraçada.setMap(mapa);
}

window.initMap = initMap;

// Carregar script do Google Maps com chave protegida via .env
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
script.async = true;
document.head.appendChild(script);

// Estimar distância e valor
btnEstimar.addEventListener("click", () => {
  const origem = origemInput.value;
  const destino = destinoInput.value;

  if (!origem || !destino) {
    estimativaDiv.textContent = "Preencha origem e destino.";
    estimativaDiv.style.color = "red";
    return;
  }

  const service = new google.maps.DirectionsService();
  service.route(
    {
      origin: origem,
      destination: destino,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (response, status) => {
      if (status === "OK") {
        rotaTraçada.setDirections(response);
        const distanciaKm =
          response.routes[0].legs[0].distance.value / 1000; // metros p/ km
        const valorEstimado = (distanciaKm * 3.5).toFixed(2);

        coordenadas.origem = origem;
        coordenadas.destino = destino;
        coordenadas.distanciaKm = distanciaKm;
        coordenadas.valor = valorEstimado;

        estimativaDiv.innerHTML = `Distância: <b>${distanciaKm.toFixed(
          2
        )} km</b> | Valor estimado: <b>R$ ${valorEstimado}</b>`;
        estimativaDiv.style.color = "green";
        btnChamar.style.display = "inline-block";
      } else {
        estimativaDiv.textContent = "Erro ao calcular rota.";
        estimativaDiv.style.color = "red";
      }
    }
  );
});

// Enviar corrida para o Firebase
btnChamar.addEventListener("click", () => {
  const corridasRef = ref(database, "corridas");

  const novaCorrida = {
    passageiro: passageiroNome,
    origem: coordenadas.origem,
    destino: coordenadas.destino,
    distancia: coordenadas.distanciaKm,
    valor: coordenadas.valor,
    status: "pendente",
    motorista: "",
    placa: "",
  };

  push(corridasRef, novaCorrida);
  statusCorrida.textContent = "Corrida solicitada! Aguardando motorista...";
  statusCorrida.style.color = "#8000c9";
  btnChamar.style.display = "none";
  estimativaDiv.style.display = "none";

  monitorarCorrida();
});

// Monitorar se motorista aceitou
function monitorarCorrida() {
  const corridasRef = ref(database, "corridas");

  onValue(corridasRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    Object.entries(data).forEach(([id, corrida]) => {
      if (
        corrida.passageiro === passageiroNome &&
        (corrida.status === "aceita" || corrida.status === "finalizada")
      ) {
        statusCorrida.textContent =
          corrida.status === "aceita"
            ? "Corrida aceita! Motorista a caminho."
            : "Corrida finalizada com sucesso!";
        statusCorrida.style.color =
          corrida.status === "aceita" ? "#8000c9" : "green";

        if (corrida.motorista) {
          infoMotorista.innerHTML = `Motorista: <b>${corrida.motorista}</b> | Placa: <b>${corrida.placa}</b>`;
        }

        if (corrida.status === "finalizada") {
          setTimeout(() => {
            location.reload();
          }, 4000);
        }
      }
    });
  });
}
