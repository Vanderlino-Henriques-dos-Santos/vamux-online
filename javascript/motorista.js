console.log("🔥 motorista.js carregado");

let map;
let motoristaPosition = { lat: -23.5, lng: -46.6 };
let passageiroMarker = null;
let rota = null;
let corridaKey = null;

// 🔥 Inicializa o mapa
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: motoristaPosition,
    zoom: 15,
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      motoristaPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      map.setCenter(motoristaPosition);

      new google.maps.Marker({
        position: motoristaPosition,
        map: map,
        title: "Você (Motorista)",
        icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      });
    });
  }

  escutarCorridas();
}

// 🔍 Escuta corridas pendentes
function escutarCorridas() {
  const corridasRef = database.ref("corridas").orderByChild("status").equalTo("pendente");

  corridasRef.on("child_added", (snapshot) => {
    const dados = snapshot.val();
    corridaKey = snapshot.key;

    if (dados && dados.passageiro) {
      document.getElementById("status").innerText =
        `🚕 Corrida disponível para destino: ${dados.passageiro.destino}`;

      mostrarPassageiroNoMapa(dados.passageiro);
      desenharRota(motoristaPosition, dados.passageiro);
    }
  });
}

// ✔️ Mostrar passageiro no mapa
function mostrarPassageiroNoMapa(local) {
  if (passageiroMarker) passageiroMarker.setMap(null);

  passageiroMarker = new google.maps.Marker({
    position: { lat: local.lat, lng: local.lng },
    map: map,
    title: "Passageiro",
    icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
  });
}

// 🚗 Desenhar rota até o passageiro
function desenharRota(origem, destinoObj) {
  const destino = `${destinoObj.lat},${destinoObj.lng}`;

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  rota = directionsRenderer;

  directionsService.route(
    {
      origin: origem,
      destination: destino,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      } else {
        console.error("Erro ao calcular a rota: " + status);
      }
    }
  );
}

// ✔️ Botão aceitar corrida
document.getElementById("btnAceitar").addEventListener("click", () => {
  if (!corridaKey) {
    document.getElementById("status").innerText = "❌ Nenhuma corrida para aceitar.";
    return;
  }

  database.ref("corridas/" + corridaKey).update({
    status: "aceita",
    motorista: {
      lat: motoristaPosition.lat,
      lng: motoristaPosition.lng,
    },
  });

  document.getElementById("status").innerText = "🚗 Corrida aceita! A caminho do passageiro!";
});

// ✔️ Botão finalizar corrida
document.getElementById("btnFinalizar").addEventListener("click", () => {
  if (!corridaKey) {
    document.getElementById("status").innerText = "❌ Nenhuma corrida ativa.";
    return;
  }

  database.ref("corridas/" + corridaKey).update({
    status: "finalizada",
  });

  document.getElementById("status").innerText = "✅ Corrida finalizada!";
  if (rota) rota.setMap(null);
  if (passageiroMarker) passageiroMarker.setMap(null);
});
