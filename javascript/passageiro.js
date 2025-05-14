import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_gHvH6diRTaK0w68xdYfx5fPzNF23YXM",
  authDomain: "vamux-ad825.firebaseapp.com",
  projectId: "vamux-ad825",
  storageBucket: "vamux-ad825.appspot.com",
  messagingSenderId: "750098504653",
  appId: "1:750098504653:web:f84e3e8fb869442f474284"
};

const app = initializeApp(firebaseConfig);

let pos = null;
let map;

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
    pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    map = new google.maps.Map(document.getElementById("mapa"), {
      center: pos,
      zoom: 15
    });

    new google.maps.Marker({
      position: pos,
      map: map,
      title: "Você (Passageiro)"
    });
  });
}

window.chamarCorrida = function () {
  const destino = document.getElementById('destino').value.trim();
  const mensagem = document.getElementById('mensagem');

  if (!destino || !pos) {
    mensagem.textContent = "Informe o destino e aguarde o mapa carregar.";
    mensagem.style.color = "red";
    return;
  }

  const db = getDatabase(app);
  const corridasRef = ref(db, "corridas");

  const novaCorrida = {
    passageiro: "Passageiro VAMUX",
    origem: `Lat: ${pos.lat}, Lng: ${pos.lng}`,
    destino: destino,
    status: "pendente",
    coordenadas: {
      origem: { lat: pos.lat, lng: pos.lng },
      destino: null
    }
  };

  push(corridasRef, novaCorrida)
    .then(() => {
      mensagem.textContent = "Corrida chamada com sucesso!";
      mensagem.style.color = "green";
    })
    .catch((error) => {
      mensagem.textContent = "Erro ao chamar corrida.";
      mensagem.style.color = "red";
      console.error("Erro Firebase:", error);
    });
};

window.sair = function () {
  window.location.href = "login.html";
};
