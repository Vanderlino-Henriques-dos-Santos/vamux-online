import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "../javascript/firebase-config.js";

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let map;
let motoristaId = sessionStorage.getItem("uid");
let corridaPendente = null;
let corridaAtual = null;

function initMap() {
  map = new google.maps.Map(document.getElementById("mapMotorista"), {
    center: { lat: -23.5505, lng: -46.6333 },
    zoom: 14,
  });

  navigator.geolocation.getCurrentPosition((position) => {
    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    map.setCenter(pos);
    new google.maps.Marker({ position: pos, map });
  });
}

window.initMap = initMap;

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById("mensagemInterna");
  el.textContent = texto;
  el.className = `mensagem-interna mensagem-${tipo}`;
  el.style.opacity = "1";
  setTimeout(() => {
    el.style.opacity = "0";
  }, 5000);
}

function atualizarPainelStatus(texto, status) {
  const statusEl = document.getElementById("statusMotorista");
  statusEl.textContent = texto;
  statusEl.className = `info-panel status-${status}`;
}

function escutarCorridasPendentes() {
  const corridasRef = ref(database, "corridas");

  onValue(corridasRef, (snapshot) => {
    const corridas = snapshot.val();
    let encontrada = false;

    for (const id in corridas) {
      const corrida = corridas[id];
      if (corrida.status === "pendente") {
        corridaPendente = { ...corrida, id };
        mostrarCorridaPendente(corridaPendente);
        encontrada = true;
        break;
      }
    }

    if (!encontrada) {
      corridaPendente = null;
      document.getElementById("corridaPendenteDetalhes").style.display = "none";
    }
  });
}

function mostrarCorridaPendente(corrida) {
  document.getElementById("corridaPendenteDetalhes").style.display = "block";
  document.getElementById("origemCorrida").textContent = corrida.origem;
  document.getElementById("destinoCorrida").textContent = corrida.destino;
  document.getElementById("valorCorrida").textContent = corrida.valorEstimado;
  document.getElementById("distanciaCorrida").textContent = corrida.distancia;
  document.getElementById("passageiroNome").textContent = corrida.nomePassageiro;
}

document.getElementById("btnAceitarCorrida").addEventListener("click", () => {
  if (!corridaPendente) return;
  const atualizacoes = {
    status: "aceita",
    motoristaId,
  };
  update(ref(database, `corridas/${corridaPendente.id}`), atualizacoes);
  mostrarMensagem("Corrida aceita com sucesso!", "sucesso");
  atualizarPainelStatus("🟠 Ocupado - Corrida ativa", "ocupado");

  document.getElementById("corridaAtivaDetalhes").style.display = "block";
  document.getElementById("infoCorridaAtiva").innerHTML = `
    Origem: ${corridaPendente.origem}<br>
    Destino: ${corridaPendente.destino}<br>
    Passageiro: ${corridaPendente.nomePassageiro}
  `;
  document.getElementById("corridaPendenteDetalhes").style.display = "none";

  corridaAtual = corridaPendente;
  corridaPendente = null;
});

document.getElementById("btnRecusarCorrida").addEventListener("click", () => {
  document.getElementById("corridaPendenteDetalhes").style.display = "none";
  mostrarMensagem("Corrida recusada.", "info");
});

document.getElementById("btnChegueiNoPassageiro").addEventListener("click", () => {
  document.getElementById("btnChegueiNoPassageiro").disabled = true;
  document.getElementById("btnFinalizarCorrida").disabled = false;
  mostrarMensagem("Você chegou no passageiro!", "info");
});

document.getElementById("btnFinalizarCorrida").addEventListener("click", () => {
  if (!corridaAtual) return;

  update(ref(database, `corridas/${corridaAtual.id}`), {
    status: "finalizada",
  });

  mostrarMensagem("Corrida finalizada!", "sucesso");
  atualizarPainelStatus("🟢 Online - Aguardando corridas...", "online");
  document.getElementById("corridaAtivaDetalhes").style.display = "none";
  document.getElementById("btnChegueiNoPassageiro").disabled = false;
  document.getElementById("btnFinalizarCorrida").disabled = true;
  corridaAtual = null;
});

document.getElementById("btnLogout").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "index.html";
});

window.addEventListener("load", () => {
  initMap();
  escutarCorridasPendentes();
  atualizarPainelStatus("🟢 Online - Aguardando corridas...", "online");
});
