// Arquivo: public/javascript/passageiro.js

let map;
let passageiroPosition = { lat: 0, lng: 0 };
let corridaRefCriada = null;
let motoristaMarker = null;

function initMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      passageiroPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map = new google.maps.Map(document.getElementById("map"), {
        center: passageiroPosition,
        zoom: 15,
      });

      new google.maps.Marker({
        position: passageiroPosition,
        map: map,
        title: "Você está aqui",
      });

    }, () => {
      document.getElementById("status").innerHTML = "❌ Não foi possível acessar sua localização.";
    });
  } else {
    document.getElementById("status").innerHTML = "❌ Geolocalização não suportada no seu navegador.";
  }
}

document.getElementById("chamarCorrida").addEventListener("click", () => {
  const destino = document.getElementById("destino").value.trim();

  if (destino === "") {
    document.getElementById("status").innerHTML = "❗ Digite o destino antes de chamar a corrida.";
    return;
  }

  const corrida = {
    status: "pendente",
    destino: destino,
    passageiro: {
      latitude: passageiroPosition.lat,
      longitude: passageiroPosition.lng
    },
    motorista: null
  };

  database.ref("corridas").push(corrida)
    .then((ref) => {
      document.getElementById("status").innerHTML = "✅ Corrida solicitada! Aguarde um motorista.";
      corridaRefCriada = ref;
      escutarStatusCorrida(ref);
    })
    .catch((error) => {
      console.error("Erro ao solicitar corrida:", error);
      document.getElementById("status").innerHTML = "❌ Erro ao solicitar corrida. Tente novamente.";
    });
});

function escutarStatusCorrida(ref) {
  ref.on("value", (snapshot) => {
    const dados = snapshot.val();
    if (!dados) return;

    if (dados.status === "aceita" && dados.motorista) {
      document.getElementById("status").innerHTML = "🚗 Corrida aceita! Motorista a caminho.";

      const pos = {
        lat: dados.motorista.latitude,
        lng: dados.motorista.longitude
      };

      if (motoristaMarker) motoristaMarker.setMap(null);

      motoristaMarker = new google.maps.Marker({
        position: pos,
        map: map,
        icon: {
          url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
          scaledSize: new google.maps.Size(40, 40)
        },
        title: "Motorista"
      });

      map.setCenter(pos);
    }

    if (dados.status === "finalizada") {
      document.getElementById("status").innerHTML = "🏁 Corrida finalizada. Obrigado por usar o VAMUX!";
      if (motoristaMarker) motoristaMarker.setMap(null);
    }
  });
}
