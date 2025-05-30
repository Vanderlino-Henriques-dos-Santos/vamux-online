import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { app } from "./firebase-config.js";

const database = getDatabase(app);

let map;
let directionsService;
let directionsRenderer;
let marcadorPassageiro;

window.initMap = function () {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  navigator.geolocation.getCurrentPosition((pos) => {
    const localPassageiro = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };

    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 13,
      center: localPassageiro,
    });

    directionsRenderer.setMap(map);

    marcadorPassageiro = new google.maps.Marker({
      position: localPassageiro,
      map: map,
      icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      title: "Você (Passageiro)",
    });
  });
};

window.calcularCorrida = function () {
  const partida = document.getElementById("partida").value.trim();
  const destino = document.getElementById("destino").value.trim();

  if (!partida || !destino) {
    exibirMensagem("⚠️ Preencha partida e destino!", "orange");
    return;
  }

  const request = {
    origin: partida,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);

      const rota = result.routes[0].legs[0];
      const distanciaKm = rota.distance.value / 1000;
      const valor = (distanciaKm * 2 + 5).toFixed(2);

      document.getElementById("infoCorrida").innerHTML = `
        🛣️ Distância: ${distanciaKm.toFixed(2)} km<br>
        💰 Valor estimado: R$ ${valor}
      `;

      exibirMensagem("✅ Rota calculada com sucesso!", "lime");
    } else {
      exibirMensagem("❌ Erro ao calcular rota: " + status, "red");
    }
  });
};

window.chamarCorrida = function () {
  const partida = document.getElementById("partida").value.trim();
  const destino = document.getElementById("destino").value.trim();

  if (!partida || !destino) {
    exibirMensagem("⚠️ Preencha partida e destino!", "orange");
    return;
  }

  const request = {
    origin: partida,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);

      const rota = result.routes[0].legs[0];
      const distanciaKm = rota.distance.value / 1000;
      const valor = (distanciaKm * 2 + 5).toFixed(2);

      const destinoLat = rota.end_location.lat();
      const destinoLng = rota.end_location.lng();
      const partidaLat = rota.start_location.lat();
      const partidaLng = rota.start_location.lng();

      const novaCorridaRef = push(ref(database, "corridas"));

      set(novaCorridaRef, {
        status: "pendente",
        partida: partida,
        destino: destino,
        partida_lat: partidaLat,
        partida_lng: partidaLng,
        destino_lat: destinoLat,
        destino_lng: destinoLng,
        distancia_km: distanciaKm,
        valor: valor,
      })
        .then(() => {
          exibirMensagem("🚗 Corrida solicitada! Aguardando motorista...", "lime");
        })
        .catch((error) => {
          exibirMensagem("❌ Erro ao chamar corrida: " + error.message, "red");
        });

      document.getElementById("infoCorrida").innerHTML = `
        🛣️ Distância: ${distanciaKm.toFixed(2)} km<br>
        💰 Valor estimado: R$ ${valor}
      `;
    } else {
      exibirMensagem("❌ Erro ao calcular rota: " + status, "red");
    }
  });
};

function exibirMensagem(texto, cor = "lime") {
  const msg = document.getElementById("mensagemStatus");
  if (msg) {
    msg.innerHTML = texto;
    msg.style.color = cor;
  }
}
