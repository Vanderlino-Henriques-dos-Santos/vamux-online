import app from "./firebase-config.js";
import { getDatabase, ref, push, set, onValue, off } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const database = getDatabase(app);
const auth = getAuth(app);

// DECLARE ESTAS VARIÁVEIS NO TOPO DO SEU ARQUIVO JS
let map; // Objeto do mapa do Google Maps
let directionsService; // Serviço para calcular rotas
let directionsRenderer; // Serviço para exibir rotas no mapa
let distanciaKm = 0; // Distância da corrida em km
let valorCorrida = 0; // Valor estimado da corrida
let marcadorMotorista = null; // Marcador para a posição do motorista
let idCorridaAtual = null; // ID da corrida atual
let passageiroUid = null; // UID do passageiro logado
let corridaListener = null; // Listener para monitorar o status da corrida

// Monitora o estado de autenticação do Firebase para obter o UID do passageiro
onAuthStateChanged(auth, (user) => {
    if (user) {
        passageiroUid = user.uid;
        console.log("Passageiro logado:", passageiroUid);
        // Tenta inicializar o mapa se a API do Google Maps já estiver pronta
        if (typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function') {
            initPassengerMap();
        }
    } else {
        // Se não estiver logado, redireciona para a página de login
        window.location.href = "login.html?tipo=passageiro";
    }
});

/**
 * Inicializa o mapa do Google Maps para a interface do passageiro.
 * Esta função é chamada pela função global initMap() no HTML,
 * garantindo que a API do Google Maps esteja totalmente carregada.
 */
export function initPassengerMap() {
    // Evita reinicializar o mapa se ele já estiver pronto
    if (map) {
        console.log("Mapa do passageiro já inicializado. Pulando.");
        return;
    }

    // Verifica se a API do Google Maps está realmente carregada antes de tentar usá-la
    if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.Map === 'undefined') {
        console.error("❌ Google Maps API não está pronta para inicializar o mapa do passageiro.");
        return;
    }

    console.log("📍 initPassengerMap (Passageiro) executada para configurar o mapa!");

    // Inicializa os serviços de rota
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    // Posição inicial do mapa (centro de São Paulo)
    const center = { lat: -23.55052, lng: -46.633308 };
    const mapDiv = document.getElementById("map"); // Obtém o elemento div do mapa

    // Verifica se o div do mapa existe no HTML
    if (!mapDiv) {
        console.error("❌ Div #map não encontrada no HTML do passageiro!");
        return;
    }

    try {
        // Cria o objeto do mapa
        map = new google.maps.Map(mapDiv, {
            zoom: 13,
            center: center,
            mapTypeId: 'roadmap' // Define o tipo de mapa como ruas
        });
        directionsRenderer.setMap(map); // Associa o renderizador de rotas ao mapa
        console.log("✅ Mapa do passageiro inicializado com sucesso!");
    } catch (error) {
        console.error("❌ ERRO ao criar o objeto Map do Google Maps para o passageiro:", error);
    }
}

/**
 * Calcula e exibe a rota entre o local de partida e destino inseridos pelo passageiro.
 */
window.calcularRota = function () {
    if (!map) {
         exibirMensagemStatus("⚠️ O mapa ainda não carregou completamente. Tente novamente em instantes.", "orange");
         return;
    }
    const partida = document.getElementById('partida').value.trim();
    const destino = document.getElementById('destino').value.trim();

    if (!partida || !destino) {
        exibirMensagemStatus("⚠️ Preencha partida e destino!", "orange");
        return;
    }

    const request = {
        origin: partida,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING, // Modo de viagem: carro
    };

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result); // Exibe a rota no mapa

            const rota = result.routes[0].legs[0];
            distanciaKm = rota.distance.value / 1000; // Distância em KM

            // Fórmula de cálculo de valor: Bandeirada (5) + Preço por Km (2)
            valorCorrida = 5 + (distanciaKm * 2);

            document.getElementById('infoCorrida').innerHTML =
                `🛣️ Distância: ${distanciaKm.toFixed(2)} km <br>💰 Valor estimado: R$ ${valorCorrida.toFixed(2)}`;
            exibirMensagemStatus("✅ Rota calculada com sucesso!", "lime");

            map.setCenter(rota.start_location); // Centraliza o mapa na origem da rota


        } else {
            exibirMensagemStatus("❌ Erro ao calcular rota: " + status, "red");
            console.error("Erro ao calcular rota:", status);
        }
    });
};

/**
 * Solicita uma nova corrida ao Firebase, criando um novo registro.
 */
window.chamarCorrida = function () {
    if (!passageiroUid) {
        exibirMensagemStatus("❌ Erro: Passageiro não logado.", "red");
        return;
    }
    if (!map) {
         exibirMensagemStatus("⚠️ O mapa ainda não carregou completamente. Tente novamente em instantes.", "orange");
         return;
    }

    if (distanciaKm === 0 || valorCorrida === 0) {
        exibirMensagemStatus("⚠️ Calcule a rota antes de chamar a corrida!", "orange");
        return;
    }

    const partida = document.getElementById('partida').value.trim();
    const destino = document.getElementById('destino').value.trim();

    const corridasRef = ref(database, 'corridas');
    const novaCorrida = push(corridasRef); // Cria um novo nó com um ID único

    idCorridaAtual = novaCorrida.key; // Armazena o ID da corrida para acompanhamento

    set(novaCorrida, {
        status: "pendente",
        passageiroUid: passageiroUid, // ID do passageiro logado
        partida: partida,
        destino: destino,
        distancia_km: distanciaKm,
        valor: valorCorrida,
        motoristaUid: null, // Será preenchido quando um motorista aceitar
        timestampSolicitacao: new Date().toISOString()
    })
        .then(() => {
            exibirMensagemStatus("🚗 Corrida solicitada! Aguardando motorista...", "lime");
            acompanharCorridaEParadeiroMotorista(idCorridaAtual); // Começa a monitorar a corrida
        })
        .catch((error) => {
            console.error("❌ Erro ao chamar corrida:", error);
            exibirMensagemStatus("❌ Erro ao chamar corrida: " + error.message, "red");
        });
};

/**
 * Acompanha o status da corrida em tempo real e, se aceita, o paradeiro do motorista.
 * @param {string} corridaId - ID da corrida a ser monitorada.
 */
function acompanharCorridaEParadeiroMotorista(corridaId) {
    // Remove listener anterior se houver para evitar duplicação
    if (corridaListener) {
        off(corridaListener);
    }

    corridaListener = onValue(ref(database, 'corridas/' + corridaId), (snapshot) => {
        const corrida = snapshot.val();

        if (corrida) {
            if (corrida.status === "aceita" && corrida.motoristaUid) {
                exibirMensagemStatus("✅ Motorista encontrado! A caminho...", "lime");
                acompanharLocalizacaoMotorista(corrida.motoristaUid); // Começa a monitorar a localização do motorista
            } else if (corrida.status === "finalizada") {
                exibirMensagemStatus("🏁 Corrida finalizada! Obrigado por usar VAMUX.", "lime");
                // Limpa o mapa e marcadores após a finalização
                directionsRenderer.set('directions', null);
                if (marcadorMotorista) {
                    marcadorMotorista.setMap(null);
                    marcadorMotorista = null;
                }
                off(corridaListener); // Para de monitorar a corrida
                idCorridaAtual = null; // Reseta o ID da corrida
                document.getElementById('infoCorrida').innerHTML = ''; // Limpa informações da corrida
            }
        } else {
            exibirMensagemStatus("ℹ️ Corrida não encontrada ou cancelada.", "orange");
            off(corridaListener); // Para de monitorar se a corrida sumir
            idCorridaAtual = null;
        }
    });
}

/**
 * Acompanha a localização do motorista em tempo real no mapa.
 * @param {string} motoristaUid - UID do motorista.
 */
function acompanharLocalizacaoMotorista(motoristaUid) {
    const localizacaoRef = ref(database, 'motoristasOnline/' + motoristaUid);

    onValue(localizacaoRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados && dados.latitude && dados.longitude) {
            const pos = { lat: dados.latitude, lng: dados.longitude };

            if (marcadorMotorista) {
                marcadorMotorista.setPosition(pos); // Atualiza a posição do marcador existente
            } else {
                // Cria um novo marcador para o motorista
                marcadorMotorista = new google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: "http://maps.gstatic.com/mapfiles/ms/icons/car.png", // Ícone de carro
                    title: "Motorista VAMUX"
                });
            }
            // Opcional: Centralizar o mapa no motorista, mas pode ser desorientador para o passageiro
            // map.setCenter(pos);
        } else {
            // Se o motorista sair do ar ou parar de enviar localização, remove o marcador
            if (marcadorMotorista) {
                marcadorMotorista.setMap(null);
                marcadorMotorista = null;
            }
            // Não exibe mensagem de erro aqui, pois a corrida ainda pode estar "aceita" aguardando o motorista iniciar a rota
        }
    });
}

/**
 * Exibe mensagens de status na interface do passageiro.
 * @param {string} texto - A mensagem a ser exibida.
 * @param {string} cor - A cor do texto (padrão: "lime").
 */
function exibirMensagemStatus(texto, cor = "lime") {
    const mensagem = document.getElementById('mensagemStatus');
    if (mensagem) {
        mensagem.innerHTML = texto;
        mensagem.style.color = cor;
    }
}