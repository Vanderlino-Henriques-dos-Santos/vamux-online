let map;
let motoristaPosition = { lat: 0, lng: 0 };
let corridaRefAtual = null;
let directionsService;
let directionsRenderer;

function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      motoristaPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map = new google.maps.Map(document.getElementById("map"), {
        center: motoristaPosition,
        zoom: 15,
      });

      directionsRenderer.setMap(map);

      new google.maps.Marker({
        position: motoristaPosition,
        map: map,
        title: "Motorista",
      });

    }, () => {
      document.getElementById("status").innerHTML = "❌ Não foi possível obter sua localização.";
    });
  } else {
    document.getElementById("status").innerHTML = "❌ Geolocalização não suportada.";
  }
}

document.getElementById("ficar-online").addEventListener("click", () => {
  escutarCorridasPendentes();
  document.getElementById("status").innerHTML = "🟢 Você está online. Aguardando corridas...";
});

function escutarCorridasPendentes() {
  database.ref("corridas").orderByChild("status").equalTo("pendente")
    .on("child_added", (snapshot) => {
      const dados = snapshot.val();
      corridaRefAtual = snapshot.ref;

      const info = `
        <strong>Corrida Pendente</strong><br>
        Destino: ${dados.destino}<br>
        Passageiro: lat ${dados.passageiro.latitude}, lng ${dados.passageiro.longitude}
      `;

      document.getElementById("corrida-info").innerHTML = info;

      document.getElementById("aceitar").disabled = false;
      document.getElementById("recusar").disabled = false;
      document.getElementById("status").innerHTML = "📥 Nova corrida pendente recebida.";
    });
}

document.getElementById("aceitar").addEventListener("click", () => {
  if (corridaRefAtual) {
    corridaRefAtual.update({
      status: "aceita",
      motorista: {
        latitude: motoristaPosition.lat,
        longitude: motoristaPosition.lng
      }
    }).then(() => {
      document.getElementById("status").innerHTML = "✅ Corrida aceita! Rota traçada.";
      document.getElementById("aceitar").disabled = true;
      document.getElementById("recusar").disabled = true;
      document.getElementById("finalizar").disabled = false;

      corridaRefAtual.once("value", (snapshot) => {
        const dados = snapshot.val();
        const passageiroPos = {
          lat: dados.passageiro.latitude,
          lng: dados.passageiro.longitude
        };
        calcularRota(motoristaPosition, passageiroPos);
      });
    });
  }
});

document.getElementById("recusar").addEventListener("click", () => {
  document.getElementById("corrida-info").innerHTML = "Corrida recusada. Aguardando outra...";
  document.getElementById("status").innerHTML = "⚠️ Corrida recusada.";
  document.getElementById("aceitar").disabled = true;
  document.getElementById("recusar").disabled = true;
  document.getElementById("finalizar").disabled = true;
  corridaRefAtual = null;
});

document.getElementById("finalizar").addEventListener("click", () => {
  if (corridaRefAtual) {
    corridaRefAtual.update({ status: "finalizada" }).then(() => {
      document.getElementById("status").innerHTML = "🏁 Corrida finalizada com sucesso.";
      document.getElementById("corrida-info").innerHTML = "";
      document.getElementById("finalizar").disabled = true;
    });
  }
});

function calcularRota(origem, destino) {
  const request = {
    origin: origem,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING
  };

  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
    } else {
      document.getElementById("status").innerHTML = "❌ Não foi possível calcular a rota.";
    }
  });
}