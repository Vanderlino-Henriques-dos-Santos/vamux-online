let mapaGlobal;

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
        title: "Você está aqui"
      });

      mostrarStatus("Localização carregada com sucesso.");
    }, () => {
      mostrarStatus("Não foi possível acessar sua localização.", "erro");
    });
  } else {
    mostrarStatus("Geolocalização não é suportada pelo seu navegador.", "erro");
  }
}

function mostrarStatus(mensagem, tipo = "sucesso") {
  const status = document.getElementById("statusCorrida");
  if (status) {
    status.textContent = mensagem;
    status.className = "status " + tipo;
  }
}

function chamarCorrida() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const local = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          const dadosCorrida = {
            idPassageiro: user.uid,
            passageiro: local,
            status: "pendente",
            solicitadaEm: new Date().toISOString()
          };

          firebase.database().ref("corridas").push(dadosCorrida)
            .then(() => {
              mostrarStatus("Corrida solicitada com sucesso! Aguarde um motorista.");
            })
            .catch((error) => {
              mostrarStatus("Erro ao solicitar corrida: " + error.message, "erro");
            });
        } else {
          mostrarStatus("Usuário não autenticado. Faça login novamente.", "erro");
        }
      });
    });
  } else {
    mostrarStatus("Geolocalização não suportada.", "erro");
  }
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

// Verifica se usuário está autenticado
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "login.html";
  }
});
