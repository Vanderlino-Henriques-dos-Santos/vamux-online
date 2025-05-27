import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update, remove, off } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const database = getDatabase(app);
const auth = getAuth(app);

let map;
let marcadorMotorista = null;
let marcadorPassageiro = null;
let directionsService;
let directionsRenderer;
let corridaAtual = null; // Objeto para armazenar a corrida que o motorista está atendendo
let motoristaUid = null;
let localizacaoInterval = null; // Para o setInterval de simulação de localização
let corridasListener = null; // Para guardar a referência do listener de corridas

// Monitora o estado de autenticação do Firebase para obter o UID do motorista
onAuthStateChanged(auth, (user) => {
    if (user) {
        motoristaUid = user.uid;
        console.log("Motorista logado:", motoristaUid);
        if (typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function') {
            initDriverMap();
        } else {
            console.warn("⚠️ Google Maps API não totalmente carregada no momento do login. initDriverMap será chamada via callback.");
        }
    } else {
        window.location.href = "login.html?tipo=motorista";
    }
});

/**
 * Inicializa o mapa do Google Maps para a interface do motorista.
 */
export function initDriverMap() {
    if (map) {
        console.log("Mapa do motorista já inicializado. Pulando.");
        return;
    }

    // Verifica se a API do Google Maps está realmente pronta
    if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.Map === 'undefined') {
        console.error("❌ Google Maps API não está pronta para inicializar o mapa do motorista.");
        exibirMensagemStatus("❌ Erro: Mapa não carregado. Verifique sua conexão e a chave da API.", "red");
        return;
    }

    console.log("📍 initDriverMap (Motorista) executada para configurar o mapa!");

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const center = { lat: -23.55052, lng: -46.633308 }; // Centro inicial (São Paulo)
    const mapDiv = document.getElementById("map");

    if (!mapDiv) {
        console.error("❌ Div #map não encontrada no HTML do motorista!");
        exibirMensagemStatus("❌ Erro interno: Elemento do mapa não encontrado.", "red");
        return;
    }

    try {
        map = new google.maps.Map(mapDiv, {
            zoom: 13,
            center: center,
            mapTypeId: 'roadmap'
        });
        directionsRenderer.setMap(map);
        console.log("✅ Mapa do motorista inicializado com sucesso!");

        // Atualiza a localização inicial do motorista no Firebase ao carregar o mapa
        // Usamos uma localização simulada aqui. Em produção, seria a real.
        if (motoristaUid && !marcadorMotorista) { // Garante que só chame uma vez na inicialização
             atualizarLocalizacaoMotoristaNoFirebase(center);
        }

        // Esconde o botão "Cheguei no Local" ao iniciar
        document.getElementById('btnChegouPartida').style.display = 'none';

    } catch (error) {
        console.error("❌ ERRO ao criar o objeto Map do Google Maps para o motorista:", error);
        exibirMensagemStatus("❌ Erro ao inicializar o mapa.", "red");
    }
}

/**
 * Coloca o motorista online, começa a atualizar sua localização e a buscar corridas.
 */
window.ficarOnline = function () {
    if (!motoristaUid) {
        exibirMensagemStatus("❌ Erro: Motorista não logado. Faça login novamente.", "red");
        return;
    }
    if (!map) {
         exibirMensagemStatus("⚠️ O mapa ainda não carregou completamente. Tente novamente em instantes.", "orange");
         return;
    }

    exibirMensagemStatus("🟢 Você está online. Buscando corridas...", "lime");

    // Limpa qualquer intervalo de localização anterior para evitar duplicação
    if (localizacaoInterval) {
        clearInterval(localizacaoInterval);
    }
    // Remove o listener de corridas anterior para evitar duplicação
    if (corridasListener) {
        off(corridasListener);
    }

    // --- Parte da localização do motorista ---
    // Em um aplicativo real, você usaria navigator.geolocation.watchPosition
    // Aqui, mantemos a simulação de movimento.
    localizacaoInterval = setInterval(() => {
        const currentCenter = map.getCenter();
        const newLat = currentCenter.lat() + (Math.random() - 0.5) * 0.0005;
        const newLng = currentCenter.lng() + (Math.random() - 0.5) * 0.0005;
        const simulatedPos = { lat: newLat, lng: newLng };
        atualizarLocalizacaoMotoristaNoFirebase(simulatedPos);
    }, 5000); // Atualiza a cada 5 segundos

    // --- Parte de busca de corridas ---
    const corridasRef = ref(database, 'corridas');

    // Anexa o listener e guarda a referência para poder desativá-lo
    corridasListener = onValue(corridasRef, (snapshot) => {
        const dados = snapshot.val();
        let corridaPendenteEncontrada = false;

        if (dados) {
            // Iterar sobre todas as corridas para encontrar uma pendente
            for (const id in dados) {
                const corrida = dados[id];
                // Verifica se a corrida está pendente e se ainda não estamos em uma corrida
                if (corrida.status === "pendente" && corridaAtual === null) {
                    console.log(`✅ Corrida pendente encontrada: ${id}`);
                    aceitarCorrida(id, corrida);
                    corridaPendenteEncontrada = true;
                    break; // Aceita a primeira pendente encontrada e sai do loop
                }
            }
            if (!corridaPendenteEncontrada && corridaAtual === null) {
                exibirMensagemStatus("🟡 Nenhuma corrida pendente no momento.", "orange");
                // Limpar rota e marcadores se não há corrida ativa ou pendente
                directionsRenderer.set('directions', null);
                if (marcadorPassageiro) {
                    marcadorPassageiro.setMap(null);
                    marcadorPassageiro = null;
                }
            }
        } else if (corridaAtual === null) { // Se não há dados de corridas e nenhuma corrida ativa
            exibirMensagemStatus("🟡 Nenhuma corrida no momento.", "orange");
            directionsRenderer.set('directions', null);
            if (marcadorPassageiro) {
                marcadorPassageiro.setMap(null);
                marcadorPassageiro = null;
            }
        }
    });

    // Garante que os botões estejam no estado correto ao ficar online
    document.getElementById('btnChegouPartida').style.display = 'none';
    document.getElementById('finalizarCorrida').style.display = 'block'; // Ou como você quer que ele apareça
};

/**
 * Atualiza a localização do motorista no Firebase e no mapa.
 * @param {object} pos - Objeto com lat e lng da localização.
 */
function atualizarLocalizacaoMotoristaNoFirebase(pos) {
    if (motoristaUid) {
        update(ref(database, `motoristasOnline/${motoristaUid}`), {
            latitude: pos.lat,
            longitude: pos.lng,
            timestamp: new Date().toISOString()
        });

        if (marcadorMotorista) {
            marcadorMotorista.setPosition(pos);
        } else {
            marcadorMotorista = new google.maps.Marker({
                position: pos,
                map: map,
                icon: "http://maps.gstatic.com/mapfiles/ms/icons/car.png",
                title: "Você (Motorista)"
            });
        }
        // Centraliza o mapa no motorista apenas se não houver rota ativa
        // ou se a rota estiver focada na busca do passageiro (status "aceita").
        if (!corridaAtual || corridaAtual.status === "aceita") {
            map.setCenter(pos);
        }
    }
}

/**
 * Aceita uma corrida pendente, atualiza seu status no Firebase e traça a rota até o passageiro.
 * @param {string} id - ID da corrida.
 * @param {object} corrida - Dados da corrida.
 */
function aceitarCorrida(id, corrida) {
    if (corridaAtual) {
        console.log("Já existe uma corrida em andamento, não aceitando nova.");
        return;
    }

    corridaAtual = { id, ...corrida }; // Armazena os dados da corrida aceita

    const corridaRef = ref(database, `corridas/${id}`);
    update(corridaRef, { status: "aceita", motoristaUid: motoristaUid })
        .then(() => {
            exibirMensagemStatus(`🚗 Corrida aceita! Partindo para buscar passageiro em: ${corrida.partida}`);
            document.getElementById('infoCorrida').innerHTML = `Partida: ${corrida.partida}<br>Destino: ${corrida.destino}<br>Valor: R$ ${corrida.valor.toFixed(2)}`;

            // Traça a rota da localização atual do motorista até o ponto de partida do passageiro
            trazarRota(marcadorMotorista.getPosition(), corrida.partida, "BUSCANDO_PASSAGEIRO");

            // Exibe o botão "Cheguei no Local"
            document.getElementById('btnChegouPartida').style.display = 'block';
            document.getElementById('finalizarCorrida').style.display = 'none'; // Esconde finalizar por enquanto

        })
        .catch(error => {
            console.error("Erro ao aceitar corrida:", error);
            exibirMensagemStatus("❌ Erro ao aceitar corrida.", "red");
            corridaAtual = null; // Reseta se falhar
        });
}

/**
 * Função para o motorista indicar que chegou ao local de partida do passageiro.
 */
window.chegouNoLocalDePartida = function() {
    if (!corridaAtual || corridaAtual.status !== "aceita") {
        exibirMensagemStatus("❌ Nenhuma corrida ativa ou no status correto para indicar chegada.", "red");
        return;
    }

    const corridaRef = ref(database, `corridas/${corridaAtual.id}`);
    update(corridaRef, { status: "passageiro_embarcado" }) // Altera o status da corrida
        .then(() => {
            exibirMensagemStatus(`✅ Passageiro embarcado! Traçando rota para o destino final.`);
            
            // Traça a rota do local atual do motorista (onde o passageiro embarcou) até o destino final
            // Usamos a localização atual do marcador do motorista, pois ele pode ter se movido.
            trazarRota(marcadorMotorista.getPosition(), corridaAtual.destino, "LEVANDO_PASSAGEIRO");
            
            // Esconde o botão "Cheguei no Local" e exibe "Finalizar Corrida"
            document.getElementById('btnChegouPartida').style.display = 'none';
            document.getElementById('finalizarCorrida').style.display = 'block';

            // Opcional: Remover o marcador do passageiro do mapa do motorista, ou mudar seu ícone.
            if (marcadorPassageiro) {
                marcadorPassageiro.setMap(null);
                marcadorPassageiro = null;
            }
        })
        .catch(error => {
            console.error("Erro ao marcar passageiro como embarcado:", error);
            exibirMensagemStatus("❌ Erro ao marcar passageiro como embarcado.", "red");
        });
};


/**
 * Traça e exibe a rota no mapa.
 * @param {object|string} origem - LatLng object ou string de endereço da origem.
 * @param {object|string} destino - LatLng object ou string de endereço do destino.
 * @param {string} etapa - Indica a etapa da corrida ("BUSCANDO_PASSAGEIRO", "LEVANDO_PASSAGEIRO").
 */
function trazarRota(origem, destino, etapa) {
    const request = {
        origin: origem,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result);

            if (etapa === "BUSCANDO_PASSAGEIRO") {
                exibirMensagemStatus(`🚗 Rota traçada até o passageiro. Chegue em: ${corridaAtual.partida}`);
                // Adiciona o marcador do passageiro no ponto de partida
                // O Geocoding aqui é para ter certeza de que o endereço do Firebase vira LatLng
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
                                title: "Local de Embarque do Passageiro"
                            });
                        }
                    } else {
                        console.error("Erro ao geocodificar endereço do passageiro:", geoStatus);
                    }
                });
                // Ajusta o zoom para mostrar a rota completa
                map.fitBounds(result.routes[0].bounds);

            } else if (etapa === "LEVANDO_PASSAGEIRO") {
                 exibirMensagemStatus(`🏁 Rota traçada para o destino final. Levando passageiro para: ${corridaAtual.destino}`);
                 // Ajusta o zoom para mostrar a rota completa
                 map.fitBounds(result.routes[0].bounds);
            }

        } else {
            exibirMensagemStatus("❌ Erro ao traçar rota: " + status, "red");
            console.error(`Erro Directions Service na etapa ${etapa}:`, status);
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

    // Adiciona uma verificação extra para garantir que a corrida está no status correto antes de finalizar
    if (corridaAtual.status !== "passageiro_embarcado") {
        console.warn("Corrida não está no status 'passageiro_embarcado'. Não pode ser finalizada ainda.");
        exibirMensagemStatus("⚠️ Corrida não está pronta para ser finalizada (passageiro não embarcado?).", "orange");
        return;
    }

    const corridaRef = ref(database, `corridas/${corridaAtual.id}`);
    update(corridaRef, { status: "finalizada", horaChegada: new Date().toISOString() })
        .then(() => {
            directionsRenderer.set('directions', null); // Limpa a rota do mapa
            if (marcadorMotorista) {
                // Se o motorista não vai mais se mover/ficar online, pode remover o marcador
                marcadorMotorista.setMap(null);
                marcadorMotorista = null;
            }
            if (marcadorPassageiro) {
                marcadorPassageiro.setMap(null);
                marcadorPassageiro = null;
            }

            corridaAtual = null; // Reseta a corrida atual para null
            
            // Limpa o intervalo de simulação de localização
            if (localizacaoInterval) {
                clearInterval(localizacaoInterval);
                localizacaoInterval = null; // Zera a variável do intervalo
            }
            // Remove o motorista da lista de motoristasOnline no Firebase
            remove(ref(database, `motoristasOnline/${motoristaUid}`))
                .then(() => console.log("Motorista removido da lista online."))
                .catch(error => console.error("Erro ao remover motorista de online:", error));

            // Desativa o listener de corridas
            if (corridasListener) {
                off(corridasListener);
                corridasListener = null; // Zera a variável do listener
            }

            exibirMensagemStatus("✅ Corrida finalizada com sucesso! Você está offline agora.", "lime");
            document.getElementById('infoCorrida').innerHTML = ''; // Limpa as informações da corrida

            // Esconde ambos os botões após finalizar
            document.getElementById('btnChegouPartida').style.display = 'none';
            document.getElementById('finalizarCorrida').style.display = 'none';
            // O botão "Ficar Online" deve ser visível para que o motorista possa iniciar um novo ciclo
            document.getElementById('ficarOnline').style.display = 'block'; // Assumindo que o botão ficar online tem ID "ficarOnline" ou é o primeiro botão
        })
        .catch(error => {
            console.error("Erro ao finalizar corrida:", error);
            exibirMensagemStatus("❌ Erro ao finalizar corrida.", "red");
        });
}

/**
 * Exibe mensagens de status na interface do motorista.
 * @param {string} texto - A mensagem a ser exibida.
 * @param {string} cor - A cor do texto (ex: "lime", "red", "orange").
 */
function exibirMensagemStatus(texto, cor = "lime") {
    const mensagem = document.getElementById('mensagemStatus');
    if (mensagem) {
        mensagem.innerHTML = texto;
        mensagem.style.color = cor;
    }
}