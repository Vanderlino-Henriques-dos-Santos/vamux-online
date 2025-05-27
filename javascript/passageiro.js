import app from "./firebase-config.js";
import { getDatabase, ref, push, set, onValue, off, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const database = getDatabase(app);
const auth = getAuth(app);

// Variáveis globais para o mapa e serviços
let map;
let directionsService;
let directionsRenderer;
let distanciaKm = 0;
let valorCorrida = 0;
let marcadorMotorista = null;
let idCorridaAtual = null; // Armazena o ID da corrida atual do passageiro
let passageiroUid = null;
let corridaListener = null; // Listener para a corrida específica do passageiro
let motoristaLocationListener = null; // Listener para a localização do motorista

// Variáveis para os objetos Autocomplete
let autocompletePartida;
let autocompleteDestino;

// Monitora o estado de autenticação para obter o UID do passageiro
onAuthStateChanged(auth, (user) => {
    if (user) {
        passageiroUid = user.uid;
        console.log("Passageiro logado:", passageiroUid);
        if (typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function') {
            initPassengerMap();
        } else {
            console.warn("⚠️ Google Maps API não totalmente carregada no momento do login. initPassengerMap será chamada via callback.");
        }
    } else {
        window.location.href = "login.html?tipo=passageiro";
    }
});

/**
 * Inicializa o mapa do Google Maps e o Autocomplete para a interface do passageiro.
 */
export function initPassengerMap() {
    if (map) {
        console.log("Mapa do passageiro já inicializado. Pulando.");
        return;
    }

    // Verifica se a API do Google Maps e a biblioteca Places estão prontas
    if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.Map === 'undefined') {
        console.error("❌ Google Maps API não está pronta para inicializar o mapa do passageiro.");
        exibirMensagemStatus("❌ Erro: Mapa não carregado. Verifique sua conexão e a chave da API.", "red");
        return;
    }
    if (typeof google.maps.places === 'undefined') {
        console.error("❌ A biblioteca 'places' do Google Maps não foi carregada. Verifique o script no HTML.");
        exibirMensagemStatus("❌ Erro: Biblioteca de endereços não carregada. Recarregue a página.", "red");
        return;
    }

    console.log("📍 initPassengerMap (Passageiro) executada para configurar o mapa e autocomplete!");

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const center = { lat: -23.55052, lng: -46.633308 }; // Centro inicial (São Paulo)
    const mapDiv = document.getElementById("map");

    if (!mapDiv) {
        console.error("❌ Div #map não encontrada no HTML do passageiro!");
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
        console.log("✅ Mapa do passageiro inicializado com sucesso!");

        // --- INICIALIZAÇÃO DO AUTOCOMPLETE ---
        const inputPartida = document.getElementById('partida');
        const inputDestino = document.getElementById('destino');

        if (inputPartida) {
            autocompletePartida = new google.maps.places.Autocomplete(inputPartida, {
                types: ['address'], // Sugere apenas endereços
                componentRestrictions: { 'country': ['br'] } // Restringe as sugestões ao Brasil
            });
            autocompletePartida.addListener('place_changed', () => {
                const place = autocompletePartida.getPlace();
                if (!place.geometry) {
                    console.warn("Autocomplete de Partida: Sem detalhes de geometria para o input: '" + place.name + "'");
                    exibirMensagemStatus("⚠️ Endereço de partida não reconhecido completamente. Tente novamente.", "orange");
                } else {
                    console.log("Partida selecionada:", place.name, place.formatted_address);
                    exibirMensagemStatus(""); // Limpa mensagem de status
                }
            });
        } else {
            console.warn("⚠️ Input 'partida' não encontrado para Autocomplete.");
        }

        if (inputDestino) {
            autocompleteDestino = new google.maps.places.Autocomplete(inputDestino, {
                types: ['address'],
                componentRestrictions: { 'country': ['br'] }
            });
            autocompleteDestino.addListener('place_changed', () => {
                const place = autocompleteDestino.getPlace();
                if (!place.geometry) {
                    console.warn("Autocomplete de Destino: Sem detalhes de geometria para o input: '" + place.name + "'");
                    exibirMensagemStatus("⚠️ Endereço de destino não reconhecido completamente. Tente novamente.", "orange");
                } else {
                    console.log("Destino selecionado:", place.name, place.formatted_address);
                    exibirMensagemStatus(""); // Limpa mensagem de status
                }
            });
        } else {
            console.warn("⚠️ Input 'destino' não encontrado para Autocomplete.");
        }
        console.log("✅ Autocomplete para partida e destino inicializado com sucesso!");

    } catch (error) {
        console.error("❌ ERRO ao criar o objeto Map do Google Maps para o passageiro:", error);
        exibirMensagemStatus("❌ Erro ao inicializar o mapa.", "red");
    }
}

/**
 * Calcula e exibe a rota entre partida e destino, estimando distância e valor.
 */
window.calcularCorrida = function () {
    const partida = document.getElementById('partida').value;
    const destino = document.getElementById('destino').value;

    if (!partida || !destino) {
        exibirMensagemStatus("Preencha os campos de partida e destino.", "orange");
        return;
    }

    const request = {
        origin: partida,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result);
            distanciaKm = (result.routes[0].legs[0].distance.value / 1000).toFixed(2);
            valorCorrida = (distanciaKm * 2.00).toFixed(2); // Exemplo: R$2,00 por km
            document.getElementById('infoCorrida').innerHTML = `🛣️ Distância: ${distanciaKm} km 💰 Valor estimado: R$ ${valorCorrida}`;
            exibirMensagemStatus("✅ Rota calculada com sucesso! Agora você pode chamar a corrida.", "lime");
        } else {
            console.error("Erro ao calcular rota:", status);
            exibirMensagemStatus("❌ Erro ao calcular rota. Verifique os endereços.", "red");
            document.getElementById('infoCorrida').innerHTML = "";
            directionsRenderer.set('directions', null); // Limpa rota anterior em caso de erro
        }
    });
};

/**
 * Chama uma corrida, enviando os dados para o Firebase.
 */
window.chamarCorrida = function () {
    if (!passageiroUid) {
        exibirMensagemStatus("❌ Erro: Passageiro não logado. Faça login novamente.", "red");
        return;
    }
    if (distanciaKm === 0) {
        exibirMensagemStatus("Calcule a corrida primeiro.", "orange");
        return;
    }
    if (idCorridaAtual) {
        exibirMensagemStatus("Você já tem uma corrida em andamento. Aguarde a finalização.", "orange");
        return;
    }

    const partida = document.getElementById('partida').value;
    const destino = document.getElementById('destino').value;

    if (!partida || !destino) {
        exibirMensagemStatus("Preencha os campos de partida e destino.", "orange");
        return;
    }

    const novaCorridaRef = push(ref(database, 'corridas')); // Gera um novo ID único
    idCorridaAtual = novaCorridaRef.key; // Armazena o ID da corrida atual

    set(novaCorridaRef, {
        passageiroUid: passageiroUid,
        motoristaUid: "", // Motorista ainda não definido
        partida: partida,
        destino: destino,
        distancia: parseFloat(distanciaKm),
        valor: parseFloat(valorCorrida),
        status: "pendente", // Status inicial da corrida
        horaChamada: new Date().toISOString()
    })
    .then(() => {
        exibirMensagemStatus("🚗 Corrida solicitada! Aguardando motorista...", "lime");
        document.getElementById('infoCorrida').innerHTML = `Partida: ${partida}<br>Destino: ${destino}<br>Valor: R$ ${valorCorrida}`;
        acompanharCorridaEParadeiroMotorista(idCorridaAtual); // Começa a monitorar a corrida
    })
    .catch(error => {
        console.error("Erro ao chamar corrida:", error);
        exibirMensagemStatus("❌ Erro ao solicitar corrida.", "red");
        idCorridaAtual = null; // Limpa o ID da corrida se a solicitação falhar
    });
};

/**
 * Acompanha o status da corrida em tempo real e, se aceita, o paradeiro do motorista.
 * @param {string} corridaId - ID da corrida a ser monitorada.
 */
function acompanharCorridaEParadeiroMotorista(corridaId) {
    if (corridaListener) {
        off(corridaListener); // Garante que apenas um listener de corrida esteja ativo por vez
    }

    corridaListener = onValue(ref(database, 'corridas/' + corridaId), (snapshot) => {
        const corrida = snapshot.val();

        if (corrida) {
            console.log("Status da corrida (Passageiro):", corrida.status, "Motorista UID:", corrida.motoristaUid);
            idCorridaAtual = corridaId; // Garante que o ID da corrida atual esteja sempre correto

            if (corrida.status === "aceita" && corrida.motoristaUid) {
                exibirMensagemStatus("✅ Motorista encontrado! A caminho do seu local de partida...", "lime");
                acompanharLocalizacaoMotorista(corrida.motoristaUid);
            } else if (corrida.status === "passageiro_embarcado") {
                exibirMensagemStatus("✔️ Você embarcou! Rota para o destino final traçada.", "lime");
                // Limpa rota anterior se houver (a rota do motorista te buscando)
                directionsRenderer.set('directions', null);
                // Traça a rota final, do local de partida do passageiro até o destino final.
                // A origem aqui é o local de partida, pois o passageiro já embarcou ali.
                trazarRotaPassageiro(corrida.partida, corrida.destino);
                if (marcadorMotorista) { // Remove o marcador do motorista, ele já está com você
                    marcadorMotorista.setMap(null);
                    marcadorMotorista = null;
                }
            } else if (corrida.status === "finalizada") {
                exibirMensagemStatus("🏁 Corrida finalizada! Obrigado por usar VAMUX.", "lime");
                // Limpa o mapa e marcadores após a finalização
                directionsRenderer.set('directions', null);
                if (marcadorMotorista) {
                    marcadorMotorista.setMap(null);
                    marcadorMotorista = null;
                }
                // Desativa todos os listeners relacionados a essa corrida
                if (corridaListener) { off(corridaListener); }
                if (motoristaLocationListener) { off(motoristaLocationListener); } // Desativa o listener da localização do motorista

                idCorridaAtual = null; // Reseta a corrida atual
                document.getElementById('infoCorrida').innerHTML = ''; // Limpa as informações da corrida

                // Reseta os campos de input
                document.getElementById('partida').value = '';
                document.getElementById('destino').value = '';

            } else if (corrida.status === "cancelada") {
                exibirMensagemStatus("❌ Corrida cancelada pelo motorista ou sistema.", "red");
                 if (corridaListener) { off(corridaListener); }
                 if (motoristaLocationListener) { off(motoristaLocationListener); }
                 directionsRenderer.set('directions', null);
                 if (marcadorMotorista) {
                     marcadorMotorista.setMap(null);
                     marcadorMotorista = null;
                 }
                 idCorridaAtual = null;
                 document.getElementById('infoCorrida').innerHTML = '';
                 document.getElementById('partida').value = '';
                 document.getElementById('destino').value = '';
            }
        } else {
            exibirMensagemStatus("ℹ️ Corrida não encontrada ou foi cancelada/finalizada fora de sincronia.", "orange");
            if (corridaListener) { off(corridaListener); }
            if (motoristaLocationListener) { off(motoristaLocationListener); }
            directionsRenderer.set('directions', null);
            if (marcadorMotorista) {
                marcadorMotorista.setMap(null);
                marcadorMotorista = null;
            }
            idCorridaAtual = null;
            document.getElementById('infoCorrida').innerHTML = '';
            document.getElementById('partida').value = '';
            document.getElementById('destino').value = '';
        }
    });
}

/**
 * Acompanha a localização do motorista em tempo real no mapa do passageiro.
 * @param {string} motoristaUid - UID do motorista.
 */
function acompanharLocalizacaoMotorista(motoristaUid) {
    // Garante que apenas um listener de localização do motorista esteja ativo por vez
    if (motoristaLocationListener) {
        off(motoristaLocationListener);
    }

    const localizacaoRef = ref(database, 'motoristasOnline/' + motoristaUid);

    motoristaLocationListener = onValue(localizacaoRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados && dados.latitude && dados.longitude) {
            const pos = { lat: dados.latitude, lng: dados.longitude };

            if (marcadorMotorista) {
                marcadorMotorista.setPosition(pos);
            } else {
                marcadorMotorista = new google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: "http://maps.gstatic.com/mapfiles/ms/icons/car.png",
                    title: "Motorista VAMUX"
                });
            }
            // Centraliza o mapa no motorista enquanto ele está a caminho do passageiro
            if (corridaAtual && corridaAtual.status === "aceita") {
                map.setCenter(pos);
                map.setZoom(15); // Zoom mais próximo para acompanhar a aproximação
            }
        } else {
            // Se o motorista sumir da lista online, removemos o marcador.
            // Isso pode acontecer se ele finalizar corrida ou ficar offline.
            if (marcadorMotorista) {
                marcadorMotorista.setMap(null);
                marcadorMotorista = null;
            }
            console.log("Motorista offline ou localização não disponível.");
        }
    });
}

/**
 * Traça e exibe a rota final no mapa do passageiro (do local de partida ao destino final).
 * @param {string} origem - Endereço de partida do passageiro.
 * @param {string} destino - Endereço de destino final.
 */
function trazarRotaPassageiro(origem, destino) {
    const request = {
        origin: origem,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result);
            console.log("✅ Rota final traçada para o passageiro.");
            map.fitBounds(result.routes[0].bounds); // Ajusta o zoom para mostrar a rota completa
        } else {
            console.error("❌ Erro ao traçar rota final para o passageiro:", status);
            exibirMensagemStatus("❌ Erro ao traçar rota final.", "red");
        }
    });
}


/**
 * Exibe mensagens de status na interface do passageiro.
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