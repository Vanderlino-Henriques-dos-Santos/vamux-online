// motorista.js

let mapaGlobal = null;

function initMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const local = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      mapaGlobal = new google.maps.Map(document.getElementById("mapa"), {
        center: local,
        zoom: 15
      });

      new google.maps.Marker({
        position: local,
        map: mapaGlobal,
        title: "Sua posição"
      });

      enviarLocalizacao(local.lat, local.lng);
    }, () => {
      mostrarStatus("Não foi possível acessar sua localização.", "erro");
    });
  } else {
    mostrarStatus("Geolocalização não suportada pelo navegador.", "erro");
  }
}

function mostrarStatus(texto, tipo = "sucesso") {
  const status = document.getElementById("statusMotorista");
  if (status) {
    status.textContent = texto;
    status.className = "status " + tipo;
  }
}

function enviarLocalizacao(lat, lng) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      const motoristaId = user.uid;
      const dados = {
        latitude: lat,
        longitude: lng,
        online: true,
        atualizadoEm: new Date().toISOString()
      };

      firebase.database().ref("motoristas/" + motoristaId).set(dados)
        .then(() => {
          console.log("Localização enviada!");
        })
        .catch((error) => {
          mostrarStatus("Erro ao enviar localização: " + error.message, "erro");
        });
    }
  });
}

function ficarOnline() {
  mostrarStatus("Você está online!");
  initMap();
  carregarCorridasPendentes();
  document.getElementById('botaoOnline').disabled = true;
}

function carregarCorridasPendentes() {
  const lista = document.getElementById("corridasPendentes");
  if (!lista) return;

  firebase.database().ref("corridas").on("value", (snapshot) => {
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
            <button onclick="aceitarCorrida('${id}')">Aceitar Corrida</button>
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
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) return;

    const motoristaId = user.uid;

    firebase.database().ref("corridas/" + idCorrida).once("value")
      .then((snapshot) => {
        const corrida = snapshot.val();

        if (!corrida || !corrida.passageiro) {
          mostrarStatus("Dados da corrida inválidos.", "erro");
          return;
        }

        const destino = new google.maps.LatLng(corrida.passageiro.latitude, corrida.passageiro.longitude);

        navigator.geolocation.getCurrentPosition((pos) => {
          const origem = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);

          firebase.database().ref("corridas/" + idCorrida).update({
            status: "em andamento",
            motoristaId: motoristaId
          });

          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer();
          directionsRenderer.setMap(mapaGlobal);

          const request = {
            origin: origem,
            destination: destino,
            travelMode: google.maps.TravelMode.DRIVING
          };

          directionsService.route(request, (result, status) => {
            if (status === "OK") {
              directionsRenderer.setDirections(result);
              mostrarStatus("Rota traçada até o passageiro!");
            } else {
              mostrarStatus("Erro ao traçar rota: " + status, "erro");
            }
          });
        });
      });
  });
}

function finalizarCorrida() {
  firebase.database().ref("corridas").once("value").then((snapshot) => {
    const corridas = snapshot.val();
    const user = firebase.auth().currentUser;
    if (!user) return;

    for (const id in corridas) {
      const corrida = corridas[id];
      if (corrida.motoristaId === user.uid && corrida.status === "em andamento") {
        firebase.database().ref("corridas/" + id).update({
          status: "finalizada",
          finalizadaEm: new Date().toISOString()
        }).then(() => {
          mostrarStatus("Corrida finalizada com sucesso!");
        }).catch((error) => {
          mostrarStatus("Erro ao finalizar: " + error.message, "erro");
        });
        break;
      }
    }
  });
}

function logout() {
  firebase.auth().signOut()
    .then(() => {
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Erro ao sair:", error);
    });
}

// Verifica se o usuário está logado
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "login.html";
  }
});
