// javascript/motorista.js
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

function mostrarMensagemInterna(texto) {
    const div = document.getElementById('mensagemInterna');
    if (div) {
        div.textContent = texto;
        div.style.display = 'block';
        setTimeout(() => {
            div.style.display = 'none';
        }, 4000);
    }
}
// ======================= INÍCIO: Exporta função global para o callback da API =======================
window.initMapMotorista = function () {
    const mapDivMotorista = document.getElementById("mapMotorista");

    if (!mapDivMotorista) {
        console.error("❌ Elemento 'mapMotorista' não encontrado.");
        return;
    }

    directionsServiceMotorista = new google.maps.DirectionsService();
    directionsRendererMotorista = new google.maps.DirectionsRenderer();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const motoristaLatLng = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                mapMotorista = new google.maps.Map(mapDivMotorista, {
                    center: motoristaLatLng,
                    zoom: 15,
                });

                new google.maps.Marker({
                    position: motoristaLatLng,
                    map: mapMotorista,
                    title: "Você está aqui",
                });

                directionsRendererMotorista.setMap(mapMotorista);
                console.log("✅ Mapa motorista inicializado com localização atual.");

                updateMotoristaLocation(motoristaLatLng.lat, motoristaLatLng.lng);
                setInterval(() => {
                    updateMotoristaLocation(motoristaLatLng.lat, motoristaLatLng.lng);
                }, 3000);
            },
            (error) => {
                console.warn("⚠️ Falha ao obter localização. Usando padrão. Erro:", error.message);
                const defaultLatLng = { lat: -23.55052, lng: -46.633309 }; // São Paulo
                mapMotorista = new google.maps.Map(mapDivMotorista, {
                    center: defaultLatLng,
                    zoom: 12,
                });
                directionsRendererMotorista.setMap(mapMotorista);
                updateMotoristaLocation(defaultLatLng.lat, defaultLatLng.lng);
            }
        );
    } else {
        console.warn("⚠️ Navegador não suporta geolocalização. Usando padrão.");
        const defaultLatLng = { lat: -23.55052, lng: -46.633309 };
        mapMotorista = new google.maps.Map(mapDivMotorista, {
            center: defaultLatLng,
            zoom: 12,
        });
        directionsRendererMotorista.setMap(mapMotorista);
        updateMotoristaLocation(defaultLatLng.lat, defaultLatLng.lng);
    }

    // Botões
    if (btnAceitarCorrida) btnAceitarCorrida.addEventListener("click", aceitarCorrida);
    if (btnRecusarCorrida) btnRecusarCorrida.addEventListener("click", recusarCorrida);
    if (btnChegueiNoPassageiro) btnChegueiNoPassageiro.addEventListener("click", chegueiNoPassageiro);
    if (btnFinalizarCorrida) btnFinalizarCorrida.addEventListener("click", finalizarCorrida);
    if (btnLogout) btnLogout.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    checkCorridaStatusMotorista();
    setInterval(checkCorridaStatusMotorista, 3000);
};
// ======================= FIM: initMapMotorista =======================
// ======================= INÍCIO: updateMotoristaLocation =======================
function updateMotoristaLocation(lat, lng) {
    const motoristaLocalizacaoAtual = { lat: lat, lng: lng };
    localStorage.setItem('motoristaLocalizacaoAtual', JSON.stringify(motoristaLocalizacaoAtual));
}
// ======================= FIM: updateMotoristaLocation =======================


// ======================= INÍCIO: aceitarCorrida =======================
async function aceitarCorrida() {
    console.log("-> Motorista clicou em Aceitar Corrida!");
    if (!currentPendingRide) {
        console.error("   Nenhuma corrida pendente selecionada.");
        return;
    }

    let passageiroCorrida = JSON.parse(localStorage.getItem('corridaSolicitada'));

    if (passageiroCorrida && passageiroCorrida.passageiroId === currentPendingRide.passageiroId && passageiroCorrida.status === "pendente") {
        passageiroCorrida.status = "aceita";
        passageiroCorrida.motoristaId = currentUser.email;
        passageiroCorrida.motoristaNome = currentUser.name;

        try {
            const motoristaLocalizacaoAtual = JSON.parse(localStorage.getItem('motoristaLocalizacaoAtual'));
            if (!motoristaLocalizacaoAtual) {
                alert("Sua localização não está disponível.");
                return;
            }

            const request = {
                origin: new google.maps.LatLng(motoristaLocalizacaoAtual.lat, motoristaLocalizacaoAtual.lng),
                destination: passageiroCorrida.origemPassageiro,
                travelMode: google.maps.TravelMode.DRIVING,
            };

            const response = await new Promise((resolve, reject) => {
                directionsServiceMotorista.route(request, (result, status) => {
                    if (status === "OK") resolve(result);
                    else reject(new Error(`Erro: ${status}`));
                });
            });

            passageiroCorrida.rotaMotoristaPassageiro = response;
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida));
            console.log("✅ Corrida atualizada para 'aceita' com rota salva.");
        } catch (error) {
            console.error("❌ Erro ao calcular rota:", error);
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida));
        }
    } else {
        alert("Corrida indisponível.");
        checkCorridaStatusMotorista();
        return;
    }

    let corridasPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    corridasPendentes = corridasPendentes.filter(c => !(c.passageiroId === currentPendingRide.passageiroId && c.status === "pendente"));
    localStorage.setItem('corridasPendentes', JSON.stringify(corridasPendentes));

    localStorage.setItem('corridaAceitaMotorista', JSON.stringify(passageiroCorrida));
    checkCorridaStatusMotorista();
    alert(`Corrida de ${currentPendingRide.origemPassageiro} para ${currentPendingRide.destinoFinal} aceita!`);
}
// ======================= FIM: aceitarCorrida =======================


// ======================= INÍCIO: recusarCorrida =======================
function recusarCorrida() {
    console.log("-> Motorista clicou em Recusar Corrida.");
    if (!currentPendingRide) return;

    let corridasPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    corridasPendentes = corridasPendentes.filter(c => 
        !(c.passageiroId === currentPendingRide.passageiroId &&
          c.origemPassageiro === currentPendingRide.origemPassageiro &&
          c.destinoFinal === currentPendingRide.destinoFinal &&
          c.status === "pendente")
    );
    localStorage.setItem('corridasPendentes', JSON.stringify(corridasPendentes));
    currentPendingRide = null;
    checkCorridaStatusMotorista();
    alert("Corrida recusada.");
}
// ======================= FIM: recusarCorrida =======================


// ======================= INÍCIO: chegueiNoPassageiro =======================
async function chegueiNoPassageiro() {
    console.log("-> Motorista clicou em Cheguei no Passageiro.");
    let corridaAtiva = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));

    if (corridaAtiva && corridaAtiva.status === "aceita") {
        corridaAtiva.status = "a_bordo";
        localStorage.setItem('corridaAceitaMotorista', JSON.stringify(corridaAtiva));

        let passageiroCorrida = JSON.parse(localStorage.getItem('corridaSolicitada'));
        if (passageiroCorrida && passageiroCorrida.passageiroId === corridaAtiva.passageiroId) {
            passageiroCorrida.status = "a_bordo";
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida));
        }

        checkCorridaStatusMotorista();
        alert("Passageiro a bordo! Indo para o destino.");
    }
}
// ======================= FIM: chegueiNoPassageiro =======================
// ======================= INÍCIO: finalizarCorrida =======================
function finalizarCorrida() {
    console.log("-> Motorista clicou em Finalizar Corrida.");
    let corridaAtiva = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));

    if (corridaAtiva && corridaAtiva.status === "a_bordo") {
        corridaAtiva.status = "finalizada";
        localStorage.setItem('corridaFinalizada', JSON.stringify(corridaAtiva));
        localStorage.removeItem('corridaAceitaMotorista');
        localStorage.removeItem('corridaSolicitada');

        checkCorridaStatusMotorista();

        alert("Corrida finalizada com sucesso!");
    } else {
        alert("Não há corrida ativa para finalizar.");
    }
}
// ======================= FIM: finalizarCorrida =======================


// ======================= INÍCIO: exibirRotaParaPassageiro =======================
async function exibirRotaParaPassageiro(origem, destino) {
    if (!mapMotorista) {
        console.error("❌ Mapa do motorista não está disponível.");
        return;
    }

    const request = {
        origin: origem,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
    };

    try {
        const result = await new Promise((resolve, reject) => {
            directionsServiceMotorista.route(request, (res, status) => {
                if (status === "OK") resolve(res);
                else reject(`Erro ao exibir rota: ${status}`);
            });
        });

        directionsRendererMotorista.setDirections(result);
        directionsRendererMotorista.setMap(mapMotorista);
        console.log("✅ Rota exibida com sucesso.");
    } catch (erro) {
        console.error("❌ Falha ao renderizar rota:", erro);
    }
}
// ======================= FIM: exibirRotaParaPassageiro =======================
// ======================= INÍCIO: EVENT LISTENERS =======================
if (btnAceitarCorrida) btnAceitarCorrida.addEventListener("click", aceitarCorrida);
if (btnRecusarCorrida) btnRecusarCorrida.addEventListener("click", recusarCorrida);
if (btnChegueiNoPassageiro) btnChegueiNoPassageiro.addEventListener("click", chegueiNoPassageiro);
if (btnFinalizarCorrida) btnFinalizarCorrida.addEventListener("click", finalizarCorrida);

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}
// ======================= FIM: EVENT LISTENERS =======================


// ======================= INÍCIO: Inicialização Automática =======================
document.addEventListener("DOMContentLoaded", () => {
    if (typeof initMapMotorista === "function") {
        initMapMotorista();
    } else {
        console.warn("⚠️ Função initMapMotorista não encontrada no escopo global.");
    }
});
// ======================= FIM: Inicialização Automática =======================
