import { carregarGoogleMaps } from './carregar-maps.js';
carregarGoogleMaps();

// --- VERIFICAÇÃO DE LOGIN ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'driver') {
    alert('Você precisa estar logado como Motorista para acessar esta página.');
    localStorage.clear();
    window.location.href = 'login.html';
}
// --- FIM VERIFICAÇÃO LOGIN ---

let mapMotorista;
let directionsServiceMotorista;
let directionsRendererMotorista;
let passageiroMarker;
let destinoMarker;

const statusMotoristaElement = document.getElementById("statusMotorista");
const corridaPendenteDetalhes = document.getElementById("corridaPendenteDetalhes");
const origemCorridaSpan = document.getElementById("origemCorrida");
const destinoCorridaSpan = document.getElementById("destinoCorrida");
const valorCorridaSpan = document.getElementById("valorCorrida");
const passageiroNomeSpan = document.getElementById("passageiroNome");

const btnAceitarCorrida = document.getElementById("btnAceitarCorrida");
const btnRecusarCorrida = document.getElementById("btnRecusarCorrida");
const corridaAtivaDetalhes = document.getElementById("corridaAtivaDetalhes");
const infoCorridaAtivaElement = document.getElementById("infoCorridaAtiva");
const btnChegueiNoPassageiro = document.getElementById("btnChegueiNoPassageiro");
const btnFinalizarCorrida = document.getElementById("btnFinalizarCorrida");
const btnLogout = document.getElementById("btnLogout");

let currentPendingRide = null;

window.initMapMotorista = () => {
    const mapDiv = document.getElementById("mapMotorista");
    if (!mapDiv) return console.error("Elemento mapMotorista não encontrado.");

    directionsServiceMotorista = new google.maps.DirectionsService();
    directionsRendererMotorista = new google.maps.DirectionsRenderer();

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const motoristaLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            mapMotorista = new google.maps.Map(mapDiv, {
                center: motoristaLatLng,
                zoom: 15
            });
            directionsRendererMotorista.setMap(mapMotorista);

            updateMotoristaLocation(motoristaLatLng.lat, motoristaLatLng.lng);
            setInterval(() => {
                updateMotoristaLocation(motoristaLatLng.lat, motoristaLatLng.lng);
            }, 3000);
        },
        (error) => {
            console.warn("Geolocalização falhou:", error.message);
            const fallback = { lat: -23.55052, lng: -46.633309 };
            mapMotorista = new google.maps.Map(mapDiv, { center: fallback, zoom: 12 });
            directionsRendererMotorista.setMap(mapMotorista);
            updateMotoristaLocation(fallback.lat, fallback.lng);
        }
    );

    btnAceitarCorrida?.addEventListener("click", aceitarCorrida);
    btnRecusarCorrida?.addEventListener("click", recusarCorrida);
    btnChegueiNoPassageiro?.addEventListener("click", chegueiNoPassageiro);
    btnFinalizarCorrida?.addEventListener("click", finalizarCorrida);
    btnLogout?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    checkCorridaStatusMotorista();
    setInterval(checkCorridaStatusMotorista, 3000);
};

function updateMotoristaLocation(lat, lng) {
    localStorage.setItem('motoristaLocalizacaoAtual', JSON.stringify({ lat, lng }));
}

async function checkCorridaStatusMotorista() {
    const pendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    const corridaAtiva = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));

    if (corridaAtiva?.status === "aceita" || corridaAtiva?.status === "a_bordo") {
        corridaAtivaDetalhes.style.display = "block";
        corridaPendenteDetalhes.style.display = "none";
        statusMotoristaElement.style.display = "none";

        infoCorridaAtivaElement.innerHTML = corridaAtiva.status === "aceita"
            ? `Dirija-se a: <b>${corridaAtiva.origemPassageiro}</b>`
            : `Indo para: <b>${corridaAtiva.destinoFinal}</b>`;

        btnChegueiNoPassageiro.disabled = corridaAtiva.status !== "aceita";
        btnFinalizarCorrida.disabled = corridaAtiva.status !== "a_bordo";

        if (directionsRendererMotorista) {
            const rota = corridaAtiva.status === "aceita"
                ? corridaAtiva.rotaMotoristaPassageiro
                : corridaAtiva.rotaPassageiroDestino;

            if (rota) directionsRendererMotorista.setDirections(rota);
        }

        return;
    }

    const novaCorrida = pendentes.find(c => c.status === "pendente");
    if (novaCorrida) {
        currentPendingRide = novaCorrida;
        corridaPendenteDetalhes.style.display = "block";
        corridaAtivaDetalhes.style.display = "none";
        statusMotoristaElement.style.display = "none";

        origemCorridaSpan.textContent = novaCorrida.origemPassageiro;
        destinoCorridaSpan.textContent = novaCorrida.destinoFinal;
        valorCorridaSpan.textContent = `R$ ${novaCorrida.valorEstimado}`;
        passageiroNomeSpan.textContent = novaCorrida.passageiroNome;

        if (novaCorrida.rotaPassageiroDestino) {
            directionsRendererMotorista.setDirections(novaCorrida.rotaPassageiroDestino);
        }
    } else {
        statusMotoristaElement.textContent = "Aguardando novas corridas...";
        statusMotoristaElement.style.display = "block";
        corridaPendenteDetalhes.style.display = "none";
        corridaAtivaDetalhes.style.display = "none";
        directionsRendererMotorista.setDirections({ routes: [] });
    }
}

async function aceitarCorrida() {
    if (!currentPendingRide) return;

    const localCorrida = JSON.parse(localStorage.getItem('corridaSolicitada'));
    if (localCorrida?.passageiroId === currentPendingRide.passageiroId && localCorrida.status === "pendente") {
        localCorrida.status = "aceita";
        localCorrida.motoristaId = currentUser.email;
        localCorrida.motoristaNome = currentUser.name;

        const loc = JSON.parse(localStorage.getItem('motoristaLocalizacaoAtual'));
        if (!loc) return alert("Localização não disponível.");

        const rota = await calcularRota(loc, localCorrida.origemPassageiro);
        localCorrida.rotaMotoristaPassageiro = rota;

        localStorage.setItem('corridaSolicitada', JSON.stringify(localCorrida));

        const listaPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
        const filtrada = listaPendentes.filter(c => c.passageiroId !== currentPendingRide.passageiroId);
        localStorage.setItem('corridasPendentes', JSON.stringify(filtrada));

        localStorage.setItem('corridaAceitaMotorista', JSON.stringify(localCorrida));
        checkCorridaStatusMotorista();
    }
}

function recusarCorrida() {
    if (!currentPendingRide) return;

    const lista = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    const novaLista = lista.filter(c => c.passageiroId !== currentPendingRide.passageiroId);
    localStorage.setItem('corridasPendentes', JSON.stringify(novaLista));

    currentPendingRide = null;
    checkCorridaStatusMotorista();
}

function chegueiNoPassageiro() {
    const corrida = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));
    if (corrida?.status === "aceita") {
        corrida.status = "a_bordo";
        localStorage.setItem('corridaAceitaMotorista', JSON.stringify(corrida));

        const passageiro = JSON.parse(localStorage.getItem('corridaSolicitada'));
        if (passageiro?.passageiroId === corrida.passageiroId) {
            passageiro.status = "a_bordo";
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiro));
        }

        checkCorridaStatusMotorista();
    }
}

function finalizarCorrida() {
    const corrida = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));
    if (corrida?.status === "a_bordo") {
        corrida.status = "finalizada";
        localStorage.setItem('corridaFinalizada', JSON.stringify(corrida));
        localStorage.removeItem('corridaAceitaMotorista');
        localStorage.removeItem('corridaSolicitada');
        checkCorridaStatusMotorista();
        alert("Corrida finalizada com sucesso!");
    }
}

function calcularRota(origem, destino) {
    return new Promise((resolve, reject) => {
        const request = {
            origin: new google.maps.LatLng(origem.lat, origem.lng),
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
        };
        directionsServiceMotorista.route(request, (result, status) => {
            if (status === "OK") resolve(result);
            else reject("Erro ao calcular rota: " + status);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof initMapMotorista === "function") {
        initMapMotorista();
    }
});
