// javascript/motorista.js

// --- VERIFICAÇÃO DE LOGIN: Garante que só motoristas logados acessem esta página ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'driver') {
    alert('Você precisa estar logado como Motorista para acessar esta página.');
    window.location.href = 'login.html'; // Redireciona para a página de login
}
// --- FIM DA VERIFICAÇÃO DE LOGIN ---

// Variáveis globais para o mapa e serviços de direção
let map;
let directionsService;
let directionsRenderer;
let motoristaMarker; // Marcador da posição atual do motorista
let watchId; // ID para o watchPosition da geolocalização

// Elementos HTML
const statusCorridaElement = document.getElementById("statusCorrida");
const btnAceitarCorrida = document.getElementById("btnAceitarCorrida");
const btnPassageiroABordo = document.getElementById("btnPassageiroABordo");
const btnFinalizarCorrida = document.getElementById("btnFinalizarCorrida");

// Variáveis para a corrida atual
let corridaAtual = null; // Objeto que armazenará os detalhes da corrida recebida

// --- Função de Inicialização do Mapa (callback da API do Google Maps) ---
window.initMap = function () {
    console.log("📍 initMap motorista foi chamada pelo Google Maps API.");

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const mapDiv = document.getElementById("map");

    if (mapDiv) {
        map = new google.maps.Map(mapDiv, {
            center: { lat: -23.55052, lng: -46.633309 }, // Centro padrão (São Paulo)
            zoom: 12,
        });
        directionsRenderer.setMap(map); // Associa o DirectionsRenderer ao mapa

        // Tenta obter a localização atual do motorista em tempo real
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const motoristaLatLng = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    if (!motoristaMarker) {
                        motoristaMarker = new google.maps.Marker({
                            position: motoristaLatLng,
                            map: map,
                            title: "Sua Localização (Motorista)",
                            icon: {
                                url: 'http://maps.google.com/mapfiles/ms/icons/car.png', // Ícone de carro
                                scaledSize: new google.maps.Size(40, 40) // Tamanho do ícone
                            }
                        });
                        map.setCenter(motoristaLatLng); // Centraliza o mapa na primeira localização
                        map.setZoom(15);
                    } else {
                        motoristaMarker.setPosition(motoristaLatLng);
                    }
                    console.log("✅ Localização do motorista atualizada.");
                },
                (error) => {
                    console.warn(`⚠️ Erro ao obter localização do motorista: ${error.message}`);
                    statusCorridaElement.textContent = "Erro na geolocalização. Mapa pode não ser preciso.";
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000,
                }
            );
            console.log("✅ Mapa motorista inicializado e monitorando localização.");
        } else {
            console.warn("⚠️ Navegador não suporta geolocalização. A localização do motorista não será atualizada.");
        }
    } else {
        console.error("❌ Elemento 'map' não encontrado no HTML.");
    }

    // --- Adiciona os Event Listeners para os botões de controle da corrida ---
    if (btnAceitarCorrida) {
        btnAceitarCorrida.addEventListener("click", aceitarCorrida);
    }
    if (btnPassageiroABordo) {
        btnPassageiroABordo.addEventListener("click", passageiroABordo);
    }
    if (btnFinalizarCorrida) {
        btnFinalizarCorrida.addEventListener("click", finalizarCorrida);
    }

    // Inicia a verificação de novas corridas no localStorage (simulando backend)
    checkNewCorrida(); // Verifica ao carregar a página
    setInterval(checkNewCorrida, 5000); // Verifica a cada 5 segundos
};

// --- Funções de Lógica da Corrida para Motorista ---

/**
 * Calcula o valor estimado da corrida com base na distância e duração.
 * (Função auxiliar, mantida aqui para o cálculo interno do valor final)
 * @param {number} distanceInMeters - Distância em metros.
 * @param {number} durationInSeconds - Duração em segundos.
 * @returns {string} Valor formatado em R$.
 */
function calculateEstimatedPrice(distanceInMeters, durationInSeconds) {
    const precoBase = 5.00;
    const precoPorKm = 2.50;
    const precoPorMin = 0.50;

    const distanciaKm = (distanceInMeters / 1000);
    const duracaoMin = (durationInSeconds / 60);

    let precoEstimado = precoBase + (distanciaKm * precoPorKm) + (duracaoMin * precoPorMin);
    precoEstimado = Math.max(precoEstimado, precoBase).toFixed(2);
    
    return precoEstimado;
}


/**
 * Verifica se há uma nova corrida solicitada no localStorage pelo passageiro.
 * Atualiza a UI do motorista para exibir a solicitação e seus detalhes.
 */
function checkNewCorrida() {
    const corridaJson = localStorage.getItem('corridaSolicitada');
    if (corridaJson) {
        const data = JSON.parse(corridaJson);
        // Se for uma nova corrida pendente e não houver corrida ativa no motorista
        if (data.status === "pendente" && (!corridaAtual || corridaAtual.status === "finalizada" || corridaAtual.status === "cancelada")) {
            corridaAtual = data;
            // Exibe as informações da corrida pendente, incluindo distância e duração estimadas
            statusCorridaElement.innerHTML = `Nova corrida disponível! <br> De: <b>${corridaAtual.origemPassageiro}</b> <br> Para: <b>${corridaAtual.destinoFinal}</b><br>Distância Estimada: ${corridaAtual.distanciaKmEstimada} km <br>Duração Estimada: ${corridaAtual.duracaoMinEstimada} min`;
            btnAceitarCorrida.style.display = "block";
            btnPassageiroABordo.style.display = "none";
            btnFinalizarCorrida.style.display = "none";
            console.log("Nova corrida detectada:", corridaAtual);
        }
        // Se a corrida já foi aceita mas o motorista recarregou a página
        else if (data.status === "aceita" && (!corridaAtual || corridaAtual.status !== "aceita")) {
            corridaAtual = data; // Restaura o estado da corrida
            statusCorridaElement.textContent = "Corrida em andamento: Indo buscar o passageiro...";
            btnAceitarCorrida.style.display = "none";
            btnPassageiroABordo.style.display = "block";
            btnFinalizarCorrida.style.display = "none";
            // Redesenha a rota se a corrida já está aceita
            if (motoristaMarker && motoristaMarker.getPosition()) {
                calculateAndDisplayRoute(motoristaMarker.getPosition(), corridaAtual.origemPassageiro);
            } else {
                console.warn("Localização do motorista ainda não disponível para redesenhar rota.");
            }
        }
        // Se o passageiro já está a bordo mas o motorista recarregou a página
        else if (data.status === "a_bordo" && (!corridaAtual || corridaAtual.status !== "a_bordo")) {
            corridaAtual = data; // Restaura o estado da corrida
            statusCorridaElement.textContent = "Corrida em andamento: Passageiro a bordo!";
            btnAceitarCorrida.style.display = "none";
            btnPassageiroABordo.style.display = "none";
            btnFinalizarCorrida.style.display = "block";
            // Redesenha a rota se o passageiro já está a bordo
            calculateAndDisplayRoute(corridaAtual.origemPassageiro, corridaAtual.destinoFinal);
        }
        // Se a corrida foi finalizada (pelo motorista ou passageiro)
        else if (data.status === "finalizada") {
            if (corridaAtual && corridaAtual.status !== "finalizada") { // Só executa se o status mudou para finalizada
                 // Exibe a mensagem de finalização (valores ainda não são o foco principal)
                 statusCorridaElement.innerHTML = `Corrida Finalizada! <br> Aguardando novas corridas...`;
                 btnAceitarCorrida.style.display = "none"; // Garante que nenhum botão de ação da corrida apareça
                 btnPassageiroABordo.style.display = "none";
                 btnFinalizarCorrida.style.display = "none";
                 directionsRenderer.setDirections({ routes: [] }); // Limpa a rota
                 corridaAtual = null; // Reseta a corrida atual
            }
        }

    } else {
        // Não há corrida solicitada no localStorage
        if (corridaAtual !== null) { // Se o motorista tinha uma corrida ativa que sumiu do localStorage
            console.log("Corrida removida do localStorage. Resetando interface do motorista.");
            statusCorridaElement.textContent = "Aguardando novas corridas...";
            btnAceitarCorrida.style.display = "none";
            btnPassageiroABordo.style.display = "none";
            btnFinalizarCorrida.style.display = "none";
            directionsRenderer.setDirections({ routes: [] }); // Limpa a rota
            corridaAtual = null;
        }
        if (statusCorridaElement.textContent !== "Aguardando novas corridas...") {
             statusCorridaElement.textContent = "Aguardando novas corridas...";
             btnAceitarCorrida.style.display = "none";
             btnPassageiroABordo.style.display = "none";
             btnFinalizarCorrida.style.display = "none";
        }
    }
}


/**
 * Simula a aceitação da corrida pelo motorista.
 * Exibe a rota do motorista até o passageiro.
 */
async function aceitarCorrida() {
    if (!corridaAtual || corridaAtual.status !== "pendente") {
        console.warn("Nenhuma corrida pendente para aceitar ou status incorreto.");
        return;
    }

    console.log("Motorista aceitou a corrida!");
    statusCorridaElement.textContent = "Aceitou a corrida! Indo buscar o passageiro...";

    // Atualiza o status da corrida no localStorage
    corridaAtual.status = "aceita";
    localStorage.setItem('corridaSolicitada', JSON.stringify(corridaAtual));

    // Esconde o botão de aceitar e mostra o de passageiro a bordo
    btnAceitarCorrida.style.display = "none";
    btnPassageiroABordo.style.display = "block";
    btnFinalizarCorrida.style.display = "none";

    // Calcula e exibe a rota da localização atual do motorista até o passageiro
    const origemMotorista = motoristaMarker ? motoristaMarker.getPosition() : null;
    if (origemMotorista) {
        await calculateAndDisplayRoute(origemMotorista, corridaAtual.origemPassageiro);
    } else {
        console.warn("Localização do motorista não disponível para traçar rota inicial.");
        statusCorridaElement.textContent = "Erro: Localização do motorista não encontrada. Tente novamente.";
    }
}

/**
 * Simula o momento em que o passageiro entra no carro.
 * Exibe a rota do passageiro até o destino final.
 */
async function passageiroABordo() {
    if (!corridaAtual || corridaAtual.status !== "aceita") {
        console.warn("Nenhuma corrida ativa para marcar como a bordo ou status incorreto.");
        return;
    }

    console.log("Passageiro a bordo!");
    statusCorridaElement.textContent = "Passageiro a bordo! Indo para o destino final...";

    // Atualiza o status da corrida no localStorage
    corridaAtual.status = "a_bordo";
    localStorage.setItem('corridaSolicitada', JSON.stringify(corridaAtual));

    // Esconde o botão de passageiro a bordo e mostra o de finalizar corrida
    btnPassageiroABordo.style.display = "none";
    btnFinalizarCorrida.style.display = "block";

    // Calcula e exibe a rota do passageiro até o destino final
    await calculateAndDisplayRoute(corridaAtual.origemPassageiro, corridaAtual.destinoFinal);
}

/**
 * Simula a finalização da corrida.
 * Limpa a rota do mapa e calcula o preço (valores ainda não são o foco principal).
 */
async function finalizarCorrida() {
    if (!corridaAtual || corridaAtual.status !== "a_bordo") {
        console.warn("Nenhuma corrida ativa para finalizar ou status incorreto.");
        return;
    }

    console.log("Corrida finalizada!");

    let precoCorrida = "N/A";
    let distanciaTotalKm = "N/A";
    let duracaoTotalMin = "N/A";

    if (directionsRenderer && directionsRenderer.getDirections()) {
        const route = directionsRenderer.getDirections().routes[0].legs[0];
        distanciaTotalKm = (route.distance.value / 1000).toFixed(2); // Distância em KM
        duracaoTotalMin = (route.duration.value / 60).toFixed(2); // Duração em minutos

        // Exemplo de cálculo de preço (mantido para fins de demonstração, mas a exibição é focada no fluxo)
        const precoBase = 5.00;
        const precoPorKm = 2.50;
        const precoPorMin = 0.50;
        precoCorrida = (precoBase + (parseFloat(distanciaTotalKm) * precoPorKm) + (parseFloat(duracaoTotalMin) * precoPorMin)).toFixed(2);

        // --- Lógica de Divisão do Valor (mantida, mas a exibição no status é simplificada) ---
        const VAMUX_TAXA_PERCENTUAL = 0.25; // 25% de taxa para a VAMUX
        const valorParaVamux = (parseFloat(precoCorrida) * VAMUX_TAXA_PERCENTUAL).toFixed(2);
        const valorParaMotorista = (parseFloat(precoCorrida) - parseFloat(valorParaVamux)).toFixed(2);

        statusCorridaElement.innerHTML = `Corrida Finalizada! <br> Aguardando novas corridas...`;
        
        // Atualiza o status da corrida no localStorage com o valor final e a divisão
        corridaAtual.status = "finalizada";
        corridaAtual.valorFinal = precoCorrida;
        corridaAtual.valorParaMotorista = valorParaMotorista;
        corridaAtual.valorParaVamux = valorParaVamux;
        localStorage.setItem('corridaSolicitada', JSON.stringify(corridaAtual));

    } else {
        // Se não conseguiu obter a rota para calcular
        statusCorridaElement.innerHTML = `Corrida Finalizada! <br> Aguardando novas corridas...`;
        corridaAtual.status = "finalizada";
        localStorage.setItem('corridaSolicitada', JSON.stringify(corridaAtual)); // Ainda finaliza a corrida
    }


    // Esconde todos os botões de ação e limpa a rota
    btnAceitarCorrida.style.display = "none";
    btnPassageiroABordo.style.display = "none";
    btnFinalizarCorrida.style.display = "none";
    directionsRenderer.setDirections({ routes: [] }); // Limpa a rota do mapa
    corridaAtual = null; // Limpa a corrida atual para receber uma nova
}


/**
 * Calcula e exibe uma rota entre um ponto de origem e um destino.
 * @param {string|google.maps.LatLngLiteral} origin - O endereço ou LatLng de partida.
 * @param {string} destination - O endereço de destino.
 */
async function calculateAndDisplayRoute(origin, destination) {
    if (!directionsService || !directionsRenderer) {
        console.error("Serviços de direção não inicializados.");
        return;
    }

    directionsRenderer.setDirections({ routes: [] }); // Limpa qualquer rota anterior

    try {
        const request = {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
        };

        const response = await directionsService.route(request);

        if (response.status === "OK") {
            directionsRenderer.setDirections(response);
            console.log(`✅ Rota exibida.`);

            const route = response.routes[0].legs[0];
            const distancia = route.distance.text;
            const duracao = route.duration.text;

            // Atualiza o status com informações da rota, se não for o status final
            if (!statusCorridaElement.innerHTML.includes("Finalizada") && !statusCorridaElement.innerHTML.includes("Aguardando novas corridas...")) {
                 statusCorridaElement.innerHTML += `<br> (Distância: ${distancia}, Duração: ${duracao})`;
            }

        } else {
            console.error("❌ Erro ao calcular rota: " + response.status);
            statusCorridaElement.innerHTML = `Erro ao calcular rota: ${response.status}. <br> Verifique os endereços.`;
        }
    } catch (error) {
        console.error("❌ Erro na requisição de rota:", error);
        statusCorridaElement.innerHTML = `Erro na requisição: ${error.message}.`;
    }
}