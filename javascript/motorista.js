// javascript/motorista.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_gHvH6diRTaK0w68xdYfx5fPzNF23YXM",
  authDomain: "vamux-ad825.firebaseapp.com",
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.appspot.com",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};

const app = initializeApp(firebaseConfig);

let map;
let motoristaPos = null;
let rotaPolyline = null;
let idCorridaAtual = null;

window.addEventListener("load", () => {
  const check = setInterval(() => {
    if (typeof google !== "undefined" && google.maps) {
      initMap();
      clearInterval(check);
    }
  }, 100);
});

function initMap() {
  navigator.geolocation.getCurrentPosition((position) => {
    motoristaPos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    map = new google.maps.Map(document.getElementById("mapa"), {
      center: motoristaPos,
      zoom: 14
    });

    new google.maps.Marker({
      position: motoristaPos,
      map: map,
      title: "Você (Motorista)"
    });
  });
}

window.ficarOnline = function () {
  const db = getDatabase(app);
  const corridasRef = ref(db, "corridas");

  onValue(corridasRef, (snapshot) => {
    const container = document.getElementById("corridasPendentes");
    container.innerHTML = "<h3 class='gradient-text'>Corridas Pendentes</h3>";

    const dados = snapshot.val();
    for (let id in dados) {
      if (dados[id].status === "pendente") {
        const div = document.createElement("div");
        div.classList.add("card-corrida");
        div.innerHTML = `
          <p><strong>Passageiro:</strong> ${dados[id].passageiro}</p>
          <p><strong>Origem:</strong> ${dados[id].origem}</p>
          <p><strong>Destino:</strong> ${dados[id].destino}</p>
          <button class="botao-vamux" onclick="aceitarCorrida('${id}', ${dados[id].coordenadas.origem.lat}, ${dados[id].coordenadas.origem.lng})">Aceitar Corrida</button>
        `;
        container.appendChild(div);
      }
    }
  });
};

window.aceitarCorrida = function (id, lat, lng) {
  const db = getDatabase(app);
  const corridaRef = ref(db, `corridas/${id}`);

  update(corridaRef, {
    status: "aceita",
    motorista: "Motorista VAMUX"
  }).then(() => {
    alert("Corrida aceita!");
    idCorridaAtual = id;

    if (rotaPolyline) {
      rotaPolyline.setMap(null);
    }

    const destino = { lat, lng };
    rotaPolyline = new google.maps.Polyline({
      path: [motoristaPos, destino],
      geodesic: true,
      strokeColor: "#00ffd5",
      strokeOpacity: 1.0,
      strokeWeight: 4
    });

    rotaPolyline.setMap(map);
    map.setCenter(destino);
  });
};

window.finalizarCorrida = function () {
  if (!idCorridaAtual) {
    alert("Nenhuma corrida em andamento.");
    return;
  }

  const db = getDatabase(app);
  const corridaRef = ref(db, `corridas/${idCorridaAtual}`);

  update(corridaRef, {
    status: "finalizada"
  }).then(() => {
    alert("Corrida finalizada com sucesso!");
    idCorridaAtual = null;

    if (rotaPolyline) {
      rotaPolyline.setMap(null);
      rotaPolyline = null;
    }

    document.getElementById("corridasPendentes").innerHTML = "<p class='gradient-text'>Nenhuma corrida ativa.</p>";
  }).catch((error) => {
    console.error("Erro ao finalizar corrida:", error);
    alert("Erro ao finalizar a corrida.");
  });
};

window.sair = function () {
  window.location.href = "login.html";
};
