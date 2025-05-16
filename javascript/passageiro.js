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
    });
  } else {
    alert("Geolocalização não suportada.");
  }
}

function chamarCorrida() {
  navigator.geolocation.getCurrentPosition((position) => {
    const dadosCorrida = {
      status: "pendente",
      passageiro: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
    };

    const novaCorrida = database.ref("corridas").push();
    novaCorrida.set(dadosCorrida)
      .then(() => {
        document.getElementById("statusCorrida").innerText = "🚖 Corrida solicitada! Aguarde um motorista.";
        document.getElementById("statusCorrida").style.color = "#0a0";
        escutarStatusCorrida(novaCorrida.key);
      })
      .catch((error) => {
        alert("Erro ao solicitar corrida: " + error.message);
      });
  });
}

function escutarStatusCorrida(idCorrida) {
  database.ref("corridas/" + idCorrida + "/status").on("value", (snapshot) => {
    if (snapshot.val() === "aceita") {
      document.getElementById("statusCorrida").innerText = "✅ Corrida aceita! Motorista a caminho.";
    }
  });
}

window.initMap = initMap;
