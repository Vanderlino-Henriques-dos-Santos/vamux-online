import app from "./firebase-config.js";
import {
  getDatabase,
  ref,
  onValue,
  update
} from "firebase/database";

let map;
let markerMotorista;
let rotaTraçada = null;

function carregarGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("mapa"), {
    zoom: 14,
    center: { lat: -23.55052, lng: -46.633308 },
  });

  document.getElementById("mensagem").innerText = "🔄 Aguardando sua localização...";

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!markerMotorista) {
          markerMotorista = new google.maps.Marker({
            position: pos,
            map: map,
            title: "Você (Motorista)",
            icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          });
          document.getElementById("mensagem").innerText = "🟢 Localizado. Aguardando corridas...";
        } else {
          markerMotorista.setPosition(pos);
        }

        map.setCenter(pos);
      },
      () => {
        alert("Erro ao obter localização do motorista.");
      }
    );
  } else {
    alert("Geolocalização não suportada.");
  }

  escutarCorridasPendentes();
};

function escutarCorridasPendentes() {
  const db = getDatabase(app);
  const corridasRef = ref(db, "corridas");

  onValue(corridasRef, (snapshot) => {
    const dados = snapshot.val();
    if (!dados) return;

    let encontrou = false;

    Object.entries(dados).forEach(([id, corrida]) => {
      if (corrida.status === "pendente") {
        encontrou = true;
        exibirMensagemAceitar(corrida, id);
      }
    });

    if (!encontrou) {
      document.getElementById("mensagem").innerHTML =
        "<p>⏳ Nenhuma corrida pendente no momento.</p>";
    }
  });
}

function exibirMensagemAceitar(corrida, idCorrida) {
  const mensagemDiv = document.getElementById("mensagem");

  mensagemDiv.innerHTML = `
    <p><strong>Corrida pendente!</strong></p>
    <p><strong>Origem:</strong> ${corrida.origem}</p>
    <p><strong>Destino:</strong> ${corrida.destino}</p>
    <p><strong>Distância:</strong> ${corrida.distancia}</p>
    <p><strong>Valor:</strong> R$ ${corrida.preco}</p>
    <button id="aceitarCorrida">✅ Aceitar Corrida</button>
  `;

  document
    .getElementById("aceitarCorrida")
    .addEventListener("click", () => {
      aceitarCorrida(idCorrida, corrida);
    });
}

function aceitarCorrida(idCorrida, corrida) {
  if (!markerMotorista) {
    alert("Aguarde sua localização ser carregada no mapa antes de aceitar.");
    return;
  }

  const db = getDatabase(app);
  const atualizaStatus = {
    status: "aceita",
    motoristaLat: markerMotorista.getPosition().lat(),
    motoristaLng: markerMotorista.getPosition().lng(),
  };

  update(ref(db, `corridas/${idCorrida}`), atualizaStatus)
    .then(() => {
      document.getElementById("mensagem").innerHTML =
        "<p class='gradient-text'>Corrida aceita! Rota traçada até o passageiro.</p>";
      desenharRotaAtePassageiro(corrida);
    })
    .catch((error) => {
      console.error("Erro ao aceitar corrida:", error);
    });
}

function desenharRotaAtePassageiro(corrida) {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();

  if (rotaTraçada) {
    rotaTraçada.setMap(null);
  }

  directionsRenderer.setMap(map);
  rotaTraçada = directionsRenderer;

  const origem = new google.maps.LatLng(
    markerMotorista.getPosition().lat(),
    markerMotorista.getPosition().lng()
  );

  const destino = new google.maps.LatLng(
    corrida.origemLat,
    corrida.origemLng
  );

  const request = {
    origin: origem,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (resultado, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(resultado);
    } else {
      alert("Falha ao traçar rota até o passageiro.");
    }
  });
}

carregarGoogleMaps();

document.getElementById("finalizarCorrida").addEventListener("click", () => {
  if (!corridaIdAtual) {
    alert("Nenhuma corrida ativa para finalizar.");
    return;
  }

  const db = getDatabase(app);
  update(ref(db, `corridas/${corridaIdAtual}`), {
    status: "finalizada"
  }).then(() => {
    document.getElementById("mensagem").innerHTML =
      "<p class='gradient-text'>Corrida finalizada com sucesso!</p>";
    document.getElementById("finalizarCorrida").style.display = "none";
  }).catch((error) => {
    alert("Erro ao finalizar corrida: " + error);
  });
});


