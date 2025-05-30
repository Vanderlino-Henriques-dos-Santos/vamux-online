import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { app } from "./firebase-config.js";

const database = getDatabase(app);

let map;
let directionsService;
let directionsRenderer;
let marcador = null;
let corridaPendenteId = null;

window.initMap = function () {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const center = { lat: -23.55052, lng: -46.633308 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: center,
    });

    directionsRenderer.setMap(map);
};

window.ficarOnline = function () {
    const corridasRef = ref(database, 'corridas');

    onValue(corridasRef, (snapshot) => {
        const dados = snapshot.val();

        if (dados) {
            const lista = Object.entries(dados).find(
                ([id, corrida]) => corrida.status === "pendente"
            );

            if (lista) {
                const [id, corrida] = lista;
                corridaPendenteId = id;

                const info = `
                    📍 Partida: ${corrida.partida}<br>
                    🎯 Destino: ${corrida.destino}<br>
                    🛣️ Distância: ${corrida.distancia_km.toFixed(2)} km<br>
                    💰 Valor: R$ ${corrida.valor}<br><br>
                    <button class="btn" onclick="aceitarCorrida()">Aceitar Corrida</button>
                `;
                document.getElementById('infoCorrida').innerHTML = info;
                exibirMensagemStatus("🚕 Corrida disponível!", "lime");
            } else {
                document.getElementById('infoCorrida').innerHTML = "";
                exibirMensagemStatus("🟡 Nenhuma corrida no momento.", "orange");
            }
        } else {
            document.getElementById('infoCorrida').innerHTML = "";
            exibirMensagemStatus("🟡 Nenhuma corrida no momento.", "orange");
        }
    });
};

window.aceitarCorrida = function () {
    if (!corridaPendenteId) return;

    const corridaRef = ref(database, 'corridas/' + corridaPendenteId);

    update(corridaRef, { status: "aceita" });

    exibirMensagemStatus(`🚗 Corrida aceita! Partindo para buscar passageiro.`);
    calcularRota();

    if (marcador) {
        marcador.setPosition({ lat: -23.55052, lng: -46.633308 });
    } else {
        marcador = new google.maps.Marker({
            position: { lat: -23.55052, lng: -46.633308 },
            map: map,
            icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            title: "Você (Motorista)"
        });
    }
};

function calcularRota() {
    const info = document.getElementById('infoCorrida').innerHTML;
    if (!info.includes("Destino")) return;

    const destinoRegex = /🎯 Destino: (.*?)<br>/;
    const destinoMatch = destinoRegex.exec(info);

    if (destinoMatch) {
        const destino = destinoMatch[1];
        const request = {
            origin: { lat: -23.55052, lng: -46.633308 },
            destination: destino,
            travelMode: google.maps.TravelMode.DRIVING,
        };

        directionsService.route(request, (result, status) => {
            if (status === "OK") {
                directionsRenderer.setDirections(result);
            } else {
                exibirMensagemStatus("❌ Erro ao calcular rota.", "red");
            }
        });
    }
}

window.finalizarCorrida = function () {
    exibirMensagemStatus("🏁 Corrida finalizada.");
    directionsRenderer.set('directions', null);
    if (marcador) {
        marcador.setMap(null);
        marcador = null;
    }
};

function exibirMensagemStatus(texto, cor = "lime") {
    const mensagem = document.getElementById('mensagemStatus');
    if (mensagem) {
        mensagem.innerHTML = texto;
        mensagem.style.color = cor;
    }
}
