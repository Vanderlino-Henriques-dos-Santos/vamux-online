// passageiro.js

function initMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const local = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const mapa = new google.maps.Map(document.getElementById("mapa"), {
        center: local,
        zoom: 15
      });

      new google.maps.Marker({
        position: local,
        map: mapa,
        title: "Sua localização"
      });
    }, () => {
      mostrarStatus("Erro ao obter localização.", "erro");
    });
  } else {
    mostrarStatus("Geolocalização não suportada pelo navegador.", "erro");
  }
}

function mostrarStatus(texto, tipo = "sucesso") {
  const status = document.getElementById("statusCorrida");
  if (status) {
    status.textContent = texto;
    status.className = "status " + tipo;
  }
}

function chamarCorrida() {
  const destino = document.getElementById("destino").value;
  if (!destino) {
    mostrarStatus("Por favor, insira o destino.", "aviso");
    return;
  }

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
            destinoTexto: destino,
            status: "pendente",
            solicitadaEm: new Date().toISOString()
          };

          firebase.database().ref("corridas").push(dadosCorrida)
            .then(() => {
              mostrarStatus("Corrida solicitada com sucesso! Aguarde um motorista.", "sucesso");
              document.getElementById("destino").value = "";
            })
            .catch((error) => {
              mostrarStatus("Erro ao solicitar corrida: " + error.message, "erro");
            });
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

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "login.html";
  }
});
