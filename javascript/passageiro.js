console.log("🔥 passageiro.js carregado");

let map;
let passageiroPosition = { lat: -23.5, lng: -46.6 };
let motoristaMarker = null;
let rota = null;
let corridaKey = null;
let valorCorrida = 0;
let distanciaKm = 0;

// 🔥 Inicializa o mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: passageiroPosition,
        zoom: 15,
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            passageiroPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            map.setCenter(passageiroPosition);

            new google.maps.Marker({
                position: passageiroPosition,
                map: map,
                title: "Você está aqui",
            });
        });
    }
}

// 🔥 Botão Calcular Valor
document.getElementById("calcularValor").addEventListener("click", () => {
    const destino = document.getElementById("destino").value;

    if (!destino) {
        document.getElementById("status").innerText = "⚠️ Digite um destino válido.";
        return;
    }

    calcularValorCorrida(destino).then((valor) => {
        valorCorrida = valor;
        document.getElementById("status").innerText =
            `📍 Distância: ${distanciaKm} km | 💰 Valor estimado: R$ ${valorCorrida}`;
    });
});

// 🚕 Botão Chamar Corrida
document.getElementById("chamarCorrida").addEventListener("click", () => {
    const destino = document.getElementById("destino").value;

    if (!destino) {
        document.getElementById("status").innerText = "⚠️ Digite um destino válido.";
        return;
    }

    if (valorCorrida === 0 || valorCorrida === undefined || valorCorrida === null) {
        document.getElementById("status").innerText =
            "⚠️ Calcule o valor antes de chamar a corrida.";
        return;
    }

    const novaCorrida = {
        status: "pendente",
        passageiro: {
            lat: passageiroPosition.lat,
            lng: passageiroPosition.lng,
            destino: destino
        },
        valor: valorCorrida,
        distancia: distanciaKm, // 🔥 Salvando distância no Firebase
        motorista: null
    };

    const corridaRef = database.ref("corridas").push(novaCorrida);
    corridaKey = corridaRef.key;

    document.getElementById("status").innerText =
        "🚕 Corrida solicitada! Aguardando motorista...";

    escutarCorrida(corridaKey);
});

// 🔄 Escutar o status da corrida
function escutarCorrida(chaveCorrida) {
    const corridaMonitorada = database.ref("corridas/" + chaveCorrida);

    corridaMonitorada.on("value", (snapshot) => {
        const dados = snapshot.val();

        if (!dados) return;

        if (dados.status === "em andamento" && dados.motorista) {
            document.getElementById("status").innerText = "🚗 Motorista a caminho...";

            atualizarMotoristaNoMapa(dados.motorista);
            desenharRota(passageiroPosition, dados.passageiro.destino);
        }

        if (dados.status === "finalizada") {
            document.getElementById("status").innerText = "✅ Corrida finalizada!";
            if (rota) rota.setMap(null);
            if (motoristaMarker) motoristaMarker.setMap(null);
        }
    });
}

// 📍 Atualizar motorista no mapa
function atualizarMotoristaNoMapa(local) {
    if (motoristaMarker) motoristaMarker.setMap(null);

    motoristaMarker = new google.maps.Marker({
        position: { lat: local.lat, lng: local.lng },
        map: map,
        title: "Motorista",
        icon: "https://maps.google.com/mapfiles/ms/icons/cabs.png"
    });
}

// 🚗 Desenhar rota no mapa
function desenharRota(origem, destinoTexto) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    rota = directionsRenderer;

    directionsService.route(
        {
            origin: origem,
            destination: destinoTexto,
            travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
            if (status === "OK") {
                directionsRenderer.setDirections(result);
            } else {
                console.error("Erro ao calcular a rota: " + status);
            }
        }
    );
}

// 💰 Calcular valor da corrida
function calcularValorCorrida(destino) {
    return new Promise((resolve, reject) => {
        const service = new google.maps.DistanceMatrixService();

        service.getDistanceMatrix(
            {
                origins: [passageiroPosition],
                destinations: [destino],
                travelMode: 'DRIVING',
            },
            (response, status) => {
                if (status !== 'OK') {
                    console.error('Erro ao calcular distância:', status);
                    reject(0);
                    return;
                }

                const distanciaTexto = response.rows[0].elements[0].distance.text;
                distanciaKm = parseFloat(distanciaTexto.replace(",", "."));

                const valorPorKm = 2.5;
                const taxaFixa = 5;

                const valor = (distanciaKm * valorPorKm) + taxaFixa;
                const valorFinal = parseFloat(valor).toFixed(2);

                resolve(valorFinal);
            }
        );
    });
}
