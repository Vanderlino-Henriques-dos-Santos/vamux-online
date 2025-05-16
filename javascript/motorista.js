function initMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const local = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const mapa = new google.maps.Map(document.getElementById('mapa'), {
        center: local,
        zoom: 15
      });

      new google.maps.Marker({
        position: local,
        map: mapa,
        title: "Sua posição"
      });

      enviarLocalizacao(local.lat, local.lng);
    });
  } else {
    mostrarStatus("Geolocalização não suportada pelo navegador.", "erro");
  }
}

function enviarLocalizacao(lat, lng) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      const motoristaId = user.uid;
      const dados = {
        latitude: lat,
        longitude: lng,
        online: true,
        atualizadoEm: new Date().toISOString()
      };

      database.ref("motoristas/" + motoristaId).set(dados)
        .then(() => {
          console.log("📍 Localização enviada!");
        })
        .catch((error) => {
          mostrarStatus("Erro ao enviar localização: " + error.message, "erro");
        });
    }
  });
}

function mostrarStatus(texto, tipo = "sucesso") {
  const status = document.getElementById("statusMotorista");
  if (status) {
    status.textContent = texto;
    status.style.color = tipo === "erro" ? "red" : tipo === "aviso" ? "orange" : "green";
  }
}

function ficarOnline() {
  mostrarStatus("Você está online!");
  initMap();
  carregarCorridasPendentes();
  const botao = document.getElementById("botaoOnline");
  if (botao) botao.disabled = true;
}

function carregarCorridasPendentes() {
  const lista = document.getElementById("corridasPendentes");
  if (!lista) return;

  database.ref("corridas").on("value", (snapshot) => {
    lista.innerHTML = "";
    const corridas = snapshot.val();

    if (corridas) {
      Object.keys(corridas).forEach((id) => {
        const corrida = corridas[id];
        if (corrida.status === "pendente") {
          const div = document.createElement("div");
          div.innerHTML = `
            <p>📍 Corrida disponível</p>
            <p>Latitude: ${corrida.passageiro.latitude}</p>
            <p>Longitude: ${corrida.passageiro.longitude}</p>
            <button class="botao-vamux" onclick="aceitarCorrida('${id}')">Aceitar Corrida</button>
            <hr>
          `;
          lista.appendChild(div);
        }
      });
    } else {
      mostrarStatus("Nenhuma corrida disponível no momento.", "aviso");
    }
  });
}

function aceitarCorrida(idCorrida) {
  database.ref("corridas/" + idCorrida).update({
    status: "aceita"
  }).then(() => {
    mostrarStatus("Corrida aceita com sucesso! Vá até o passageiro.");
  }).catch((error) => {
    mostrarStatus("Erro ao aceitar corrida: " + error.message, "erro");
  });
}

function finalizarCorrida() {
  mostrarStatus("Corrida finalizada!");
}

function sair() {
  auth.signOut().then(() => {
    window.location.href = "login.html?tipo=motorista";
  });
}

window.initMap = initMap;
window.ficarOnline = ficarOnline;
window.finalizarCorrida = finalizarCorrida;
window.sair = sair;
