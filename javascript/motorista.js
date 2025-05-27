import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const database = getDatabase(app);
const auth = getAuth(app);

// DECLARE ESTAS VARIÁVEIS NO TOPO DO SEU ARQUIVO JS
let map; // Objeto do mapa do Google Maps
let marcadorMotorista = null; // Marcador para a posição do motorista
let marcadorPassageiro = null; // Marcador para a posição do passageiro
let directionsService; // Serviço para calcular rotas
let directionsRenderer; // Serviço para exibir rotas no mapa
let corridaAtual = null; // Armazena os detalhes da corrida em andamento
let motoristaUid = null; // UID do motorista logado
let localizacaoInterval = null; // ID do intervalo para atualizar a localização

// Monitora o estado de autenticação do Firebase para obter o UID do motorista
onAuthStateChanged(auth, (user) => {
    if (user) {
        motoristaUid = user.uid;
        console.log("Motorista logado:", motoristaUid);
        // Tenta inicializar o mapa se a API do Google Maps já estiver pronta
        // (Isso lida com casos onde o script do Google Maps carrega antes do DOMContentLoaded)
        if (typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function') {
            initDriverMap();
        }
    } else {
        // Se não estiver logado, redireciona para a página de login
        window.location.href = "login.html?tipo=motorista";
    }
});

/**
 * Inicializa o mapa do Google Maps para a interface do motorista.
 * Esta função é chamada pela função global initMap() no HTML,
 * garantindo que a API do Google Maps esteja totalmente carregada.
 */
export function initDriverMap() {
    // Evita reinicializar o mapa se ele já estiver pronto
    if (map) {
        console.log("Mapa do motorista já inicializado. Pulando.");
        return;
    }

    // Verifica se a API do Google Maps está realmente carregada antes de tentar usá-la
    if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.Map === 'undefined') {
        console.error("❌ Google Maps API não está pronta para inicializar o mapa do motorista.");
        return;
    }

    console.log("📍 initDriverMap (Motorista) executada para configurar o mapa!");

    // Inicializa os serviços de rota
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    // Posição inicial do mapa (centro de São Paulo)
    const center = { lat: -23.55052, lng: -46.633308 };
    const mapDiv = document.getElementById("map"); // Obtém o elemento div do mapa

    // Verifica se o div do mapa existe no HTML
    if (!mapDiv) {
        console.error("❌ Div #map não encontrada no HTML do motorista!");
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
        console.log("✅ Mapa do motorista inicializado com sucesso!");

        // Se houver um motorista logado, atualiza a localização inicial dele no Firebase e no mapa
        if (motoristaUid) {
            atualizarLocalizacaoMotoristaNoFirebase(center); // Simula a localização inicial
        }
    } catch (error) {
        console.error("❌ ERRO ao criar o objeto Map do Google Maps para o motorista:", error);
    }
}

/**
 * Coloca o motorista online, começa a atualizar sua localização e a buscar corridas.
 */
window.ficarOnline = function () {
    if (!motoristaUid) {
        exibirMensagemStatus("❌ Erro: Motorista não logado.", "red");
        return;
    }
    if (!map) {
         exibirMensagemStatus("⚠️ O mapa ainda não carregou completamente. Tente novamente em instantes.", "orange");
         return;
    }

    exibirMensagemStatus("🟢 Você está online. Buscando corridas...", "lime");

    // Limpa qualquer listener anterior para evitar duplicação de intervalos
    if (localizacaoInterval) {
        clearInterval(localizacaoInterval);
    }

    // Simula a atualização da localização do motorista a cada 5 segundos.
    // Em um aplicativo real, você usaria navigator.geolocation.watchPosition para obter a localização real.
    localizacaoInterval = setInterval(() => {
        // Simula um pequeno movimento para mostrar que o mapa atualiza
        const currentCenter = map.getCenter();
        const newLat = currentCenter.lat() + (Math.random() - 0.5) * 0.001;
        const newLng = currentCenter.lng() + (Math.random() - 0.5) * 0.001;
        const simulatedPos = { lat: newLat, lng: newLng };
        atualizarLocalizacaoMotoristaNoFirebase(simulatedPos);
    }, 5000); // Atualiza a cada 5 segundos

    const corridasRef = ref(database, 'corridas');

    // Monitora novas corridas pendentes no Firebase
    onValue(corridasRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            // Procura por uma corrida com status "pendente"
            const lista = Object.entries(dados).find(
                ([id, corrida]) => corrida.status === "pendente"
            );

            // Se encontrar uma corrida pendente e não houver corrida em andamento
            if (lista && corridaAtual === null) {
                const [id, corrida] = lista;
                aceitarCorrida(id, corrida); // Aceita a corrida encontrada
            } else if (!lista && corridaAtual === null) {
                exibirMensagemStatus("🟡 Nenhuma corrida no momento.", "orange");
            }
        } else if (corridaAtual === null) {
            exibirMensagemStatus("🟡 Nenhuma corrida no momento.", "orange");
        }
    });
};

/**
 * Atualiza a localização do motorista no Firebase e no mapa.
 * @param {object} pos - Objeto com lat e lng da localização.
 */
function atualizarLocalizacaoMotoristaNoFirebase(pos) {
    if (motoristaUid) {
        // Atualiza a localização no Firebase
        update(ref(database, `motoristasOnline/${motoristaUid}`), {
            latitude: pos.lat,
            longitude: pos.lng,
            timestamp: new Date().toISOString()
        });

        // Atualiza ou cria o marcador do motorista no mapa
        if (marcadorMotorista) {
            marcadorMotorista.setPosition(pos);
        } else {
            marcadorMotorista = new google.maps.Marker({
                position: pos,
                map: map,
                icon: "http://maps.gstatic.com/mapfiles/ms/icons/car.png", // Ícone de carro
                title: "Você (Motorista)"
            });
        }
        map.setCenter(pos); // Centraliza o mapa na localização do motorista
    }
}

/**
 * Aceita uma corrida pendente, atualiza seu status no Firebase e traça a rota até o passageiro.
 * @param {string} id - ID da corrida.
 * @param {object} corrida - Dados da corrida.
 */
function aceitarCorrida(id, corrida) {
    if (corridaAtual) {
        console.log("Já existe uma corrida em andamento.");
        return;
    }

    corridaAtual = { id, ...corrida }; // Armazena a corrida aceita

    const corridaRef = ref(database, `corridas/${id}`);
    update(corridaRef, { status: "aceita", motoristaUid: motoristaUid }) // Atualiza status e motorista UID
        .then(() => {
            exibirMensagemStatus(`🚗 Corrida aceita! Partindo para buscar passageiro.`);
            calcularRotaMotorista(corrida.partida); // Traça a rota até o passageiro
        })
        .catch(error => {
            console.error("Erro ao aceitar corrida:", error);
            exibirMensagemStatus("❌ Erro ao aceitar corrida.", "red");
            corridaAtual = null; // Reseta se houver erro
        });
}

/**
 * Calcula e exibe a rota para o motorista no mapa.
 * @param {string} destino - Endereço de destino (inicialmente, o endereço do passageiro).
 */
function calcularRotaMotorista(destino) {
    // Pega a localização atual do motorista (marcador) para usar como origem
    let origemMotorista = marcadorMotorista ? marcadorMotorista.getPosition() : { lat: -23.55052, lng: -46.633308 }; // Padrão se não houver marcador

    const request = {
        origin: origemMotorista,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING, // Modo de viagem: carro
    };

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result); // Exibe a rota no mapa
            document.getElementById('infoCorrida').innerHTML = `🚗 Rota traçada até o passageiro.`;

            // Opcional: Adicionar marcador do passageiro no mapa
            if (corridaAtual && corridaAtual.partida) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ 'address': corridaAtual.partida }, (results, geoStatus) => {
                    if (geoStatus == 'OK' && results[0]) {
                        if (marcadorPassageiro) {
                            marcadorPassageiro.setPosition(results[0].geometry.location);
                        } else {
                            marcadorPassageiro = new google.maps.Marker({
                                position: results[0].geometry.location,
                                map: map,
                                icon: "http://maps.gstatic.com/mapfiles/ms/icons/man.png", // Ícone de pessoa
                                title: "Passageiro"
                            });
                        }
                    }
                });
            }

        } else {
            exibirMensagemStatus("❌ Erro ao traçar rota: " + status, "red");
            console.error("Erro Directions Service:", status);
        }
    });
}

/**
 * Finaliza a corrida atual, limpa o mapa e remove o motorista da lista de online.
 */
window.finalizarCorrida = function () {
    if (!corridaAtual) {
        exibirMensagemStatus("❌ Nenhuma corrida para finalizar.", "red");
        return;
    }

    const corridaRef = ref(database, `corridas/${corridaAtual.id}`);
    update(corridaRef, { status: "finalizada", horaChegada: new Date().toISOString() })
        .then(() => {
            directionsRenderer.set('directions', null); // Limpa a rota do mapa
            // Remove os marcadores do mapa
            if (marcadorMotorista) {
                marcadorMotorista.setMap(null);
                marcadorMotorista = null;
            }
            if (marcadorPassageiro) {
                marcadorPassageiro.setMap(null);
                marcadorPassageiro = null;
            }

            corridaAtual = null; // Reseta a corrida atual
            // Para de atualizar a localização e remove o motorista da lista de online
            if (localizacaoInterval) {
                clearInterval(localizacaoInterval);
                remove(ref(database, `motoristasOnline/${motoristaUid}`));
            }

            exibirMensagemStatus("✅ Corrida finalizada com sucesso!", "lime");
            document.getElementById('infoCorrida').innerHTML = ''; // Limpa as informações da corrida
        })
        .catch(error => {
            console.error("Erro ao finalizar corrida:", error);
            exibirMensagemStatus("❌ Erro ao finalizar corrida.", "red");
        });
}

/**
 * Exibe mensagens de status na interface do motorista.
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