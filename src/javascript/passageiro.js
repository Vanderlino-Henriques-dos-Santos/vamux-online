import app from "./firebase-config.js";
import {
  getDatabase,
  ref,
  push,
  onValue
} from "firebase/database";

let origemCoords = null;
let destinoCoords = null;
let map;
let marcadorMotorista;
let rotaAtiva;
let corridaId;

function carregarGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

window.initMap = function () {
  const origemInput = document.getElementById("origem");
  const destinoInput = document.getElementById("destino");

  map = new google.maps.Map(document.getElementById("mapa"), {
    center: { lat: -23.55052, lng: -46.633308 },
    zoom: 13,
  });

  const autocompleteOrigem = new google.maps.places.Autocomplete(origemInput);
  const autocompleteDestino = new google.maps.places.Autocomplete(destinoInput);

  autocompleteOrigem.addListener("place_changed", () => {
    const place = autocompleteOrigem.getPlace();
    origemCoords = place.geometry.location;
  });

  autocompleteDestino.addListener("place_changed", () => {
    const place = autocompleteDestino.getPlace();
    destinoCoords = place.geometry.location;
  });

  document.getElementById("calcular").addEventListener("click", () => {
    calcularRota();
  });

  document.getElementById("solicitar").addEventListener("click", () => {
    solicitarCorrida();
  });
};

function calcularRota() {
  if (!origemCoords || !destinoCoords) {
    alert("Preencha os dois endereços.");
    return;
  }

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  const request = {
    origin: origemCoords,
    destination: destinoCoords,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);

      const distancia = result.routes[0].legs[0].distance.text;
      const duracao = result.routes[0].legs[0].duration.text;
      const valor = calcularValor(distancia);

      document.getElementById("info").innerText = `Distância: ${distancia} | Estimativa: R$ ${valor}`;

      // Armazena os dados
      window.dadosCorrida = {
        origem: document.getElementById("origem").value,
        destino: document.getElementById("destino").value,
        distancia,
        duracao,
        preco: valor,
        origemLat: origemCoords.lat(),
        origemLng: origemCoords.lng(),
        destinoLat: destinoCoords.lat(),
        destinoLng: destinoCoords.lng()
      };
    } else {
      alert("Erro ao calcular rota.");
    }
  });
}

function calcularValor(distanciaTexto) {
  const km = parseFloat(distanciaTexto.replace(",", "."));
  const valorBase = 5.0;
  const valorPorKm = 2.4;
  return (valorBase + km * valorPorKm).toFixed(2);
}

function solicitarCorrida() {
  if (!window.dadosCorrida) {
    alert("Calcule a estimativa antes.");
    return;
  }

  const db = getDatabase(app);
  const corridasRef = ref(db, "corridas");

  const novaCorrida = {
    ...window.dadosCorrida,
    status: "pendente",
  };

  const novaRef = push(corridasRef, novaCorrida);

  corridaId = novaRef.key;

  onValue(ref(db, `corridas/${corridaId}`), (snapshot) => {
    const dados = snapshot.val();
    if (!dados) return;

    if (dados.status === "aceita") {
      document.getElementById("status").innerText =
        "Corrida aceita! O motorista está a caminho.";

      mostrarMotorista(dados.motoristaLat, dados.motoristaLng, dados.origemLat, dados.origemLng);
    }
  });

  document.getElementById("status").innerText =
    "Corrida solicitada! Aguardando motorista...";
}

function mostrarMotorista(motoristaLat, motoristaLng, origemLat, origemLng) {
  const posMotorista = new google.maps.LatLng(motoristaLat, motoristaLng);
  const destino = new google.maps.LatLng(origemLat, origemLng);

  if (marcadorMotorista) {
    marcadorMotorista.setPosition(posMotorista);
  } else {
    marcadorMotorista = new google.maps.Marker({
      position: posMotorista,
      map: map,
      icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      title: "Motorista",
    });
  }

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();

  if (rotaAtiva) rotaAtiva.setMap(null);

  directionsRenderer.setMap(map);
  rotaAtiva = directionsRenderer;

  directionsService.route(
    {
      origin: posMotorista,
      destination: destino,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      }
    }
  );
}

carregarGoogleMaps();
