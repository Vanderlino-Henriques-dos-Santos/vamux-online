// javascript/passageiro.js

// --- VERIFICAÇÃO DE LOGIN: Garante que só passageiros logados acessem esta página ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'passenger') {
    alert('Você precisa estar logado como Passageiro para acessar esta página.');
    window.location.href = 'login.html'; // Redireciona para a página de login
}
// --- FIM DA VERIFICAÇÃO DE LOGIN ---

let map;
let directionsService;
let directionsRenderer;
let autocompletePartida;
let autocompleteDestino;

// Elementos HTML
const inputPartida = document.getElementById("partida");
const inputDestino = document.getElementById("destino");
const btnSolicitarCorrida = document.getElementById("btnSolicitarCorrida");
const statusPassageiroElement = document.getElementById("statusPassageiro");

// --- Função de Inicialização do Mapa (callback da API do Google Maps) ---
window.initMap = function () {
    console.log("📍 initMap passageiro foi chamada pelo Google Maps API.");

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const mapDiv = document.getElementById("map");

    if (mapDiv) {
        // Tenta obter a localização atual do passageiro (geolocalização do navegador)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const passageiroLatLng = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    map = new google.maps.Map(mapDiv, {
                        center: passageiroLatLng,
                        zoom: 15,
                    });
                    directionsRenderer.setMap(map); // Associa o DirectionsRenderer ao mapa

                    // Adiciona um marcador para a localização atual do passageiro
                    new google.maps.Marker({
                        position: passageiroLatLng,
                        map: map,
                        title: "Sua Localização",
                    });
                    console.log("✅ Mapa passageiro inicializado com localização atual.");
                },
                () => {
                    // Se a geolocalização falhar, usa uma localização padrão (ex: São Paulo)
                    console.warn("⚠️ Falha ao obter localização do passageiro. Usando localização padrão.");
                    const defaultLatLng = { lat: -23.55052, lng: -46.633309 }; // São Paulo
                    map = new google.maps.Map(mapDiv, {
                        center: defaultLatLng,
                        zoom: 12,
                    });
                    directionsRenderer.setMap(map);
                }
            );
        } else {
            // Navegador não suporta geolocalização
            console.warn("⚠️ Navegador não suporta geolocalização. Usando localização padrão.");
            const defaultLatLng = { lat: -23.55052, lng: -46.633309 }; // São Paulo
            map = new google.maps.Map(mapDiv, {
                center: defaultLatLng,
                zoom: 12,
            });
            directionsRenderer.setMap(map);
        }
    } else {
        console.error("❌ Elemento 'map' não encontrado no HTML para passageiro.");
    }

    // --- Autocomplete para campos de input de partida e destino ---
    if (inputPartida && inputDestino) {
        autocompletePartida = new google.maps.places.Autocomplete(inputPartida);
        autocompleteDestino = new google.maps.places.Autocomplete(inputDestino);
        console.log("✅ Autocompletes de partida e destino inicializados para passageiro.");

        // Adiciona listeners para recalcular rota e estimativa ao mudar os inputs
        autocompletePartida.addListener('place_changed', () => {
            console.log("Autocomplete Partida changed. Chamando calculateAndDisplayEstimate.");
            const place = autocompletePartida.getPlace();
            if (place.geometry) {
                map.setCenter(place.geometry.location);
            }
            calculateAndDisplayEstimate();
        });
        autocompleteDestino.addListener('place_changed', () => {
            console.log("Autocomplete Destino changed. Chamando calculateAndDisplayEstimate.");
            const place = autocompleteDestino.getPlace();
            if (place.geometry) {
                map.setCenter(place.geometry.location);
            }
            calculateAndDisplayEstimate();
        });
        // Para garantir que a estimativa seja exibida mesmo sem usar o autocomplete
        inputPartida.addEventListener('blur', () => {
            console.log("Input Partida blurred. Chamando calculateAndDisplayEstimate.");
            calculateAndDisplayEstimate();
        });
        inputDestino.addEventListener('blur', () => {
            console.log("Input Destino blurred. Chamando calculateAndDisplayEstimate.");
            calculateAndDisplayEstimate();
        });

    } else {
        console.warn("⚠️ Campos de input 'partida' ou 'destino' não encontrados para autocomplete (passageiro).");
    }

    // Adiciona o event listener para o botão de solicitar corrida
    if (btnSolicitarCorrida) {
        btnSolicitarCorrida.addEventListener("click", solicitarCorrida);
    }

    // Inicia a verificação de status da corrida no localStorage para manter a UI atualizada
    checkCorridaStatus(); // Verifica ao carregar a página
    setInterval(checkCorridaStatus, 3000); // Verifica a cada 3 segundos
};

// --- Funções de Lógica da Corrida para Passageiro ---

/**
 * Calcula o valor estimado da corrida com base na distância e duração.
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
 * Calcula e exibe a rota e a estimativa de distância/duração no mapa do passageiro.
 * Chamado ao mudar partida/destino.
 */
async function calculateAndDisplayEstimate() {
    console.log("-> Iniciando calculateAndDisplayEstimate()");
    const partida = inputPartida.value.trim();
    const destino = inputDestino.value.trim();

    if (!partida || !destino) {
        console.log("   Partida ou destino vazios. Resetando status.");
        statusPassageiroElement.innerHTML = "Insira **partida** e **destino** para ver a estimativa.";
        directionsRenderer.setDirections({ routes: [] }); // Limpa a rota se não houver dados
        btnSolicitarCorrida.disabled = true; // Desabilita o botão
        return;
    }

    if (!directionsService || !directionsRenderer) {
        console.error("   Serviços de direção não inicializados.");
        return;
    }

    // Verifica se já existe uma corrida solicitada
    const corridaEmAndamento = localStorage.getItem('corridaSolicitada');
    if (corridaEmAndamento) {
        // Se uma corrida já está em andamento, não recalcula a estimativa e não mostra a mensagem de "calcular"
        // A função checkCorridaStatus cuidará da mensagem neste caso.
        console.log("   Corrida já em andamento, ignorando recalcular estimativa.");
        return; 
    }

    statusPassageiroElement.textContent = "Calculando rota e estimativa...";
    btnSolicitarCorrida.disabled = true; // Desabilita enquanto calcula

    try {
        console.log(`   Solicitando rota da API: ${partida} para ${destino}`);
        const response = await directionsService.route({
            origin: partida,
            destination: destino,
            travelMode: google.maps.TravelMode.DRIVING,
        });

        if (response.status === "OK") {
            console.log("   Resposta da API OK. Exibindo rota.");
            directionsRenderer.setDirections(response);
            console.log(`✅ Rota passageiro de "${partida}" para "${destino}" exibida.`);

            const route = response.routes[0].legs[0];
            const distanciaTexto = route.distance.text; // Ex: "10 km"
            const distanciaMetros = route.distance.value; // Ex: 10000 (metros)
            const duracaoTexto = route.duration.text; // Ex: "15 mins"
            const duracaoSegundos = route.duration.value; // Ex: 900 (segundos)

            const valorEstimado = calculateEstimatedPrice(distanciaMetros, duracaoSegundos);

            console.log(`   Distância: ${distanciaTexto}, Duração: ${duracaoTexto}, Valor: R$ ${valorEstimado}`);
            // --- AQUI É O PONTO CHAVE: Deixa a estimativa clara e visível ---
            statusPassageiroElement.innerHTML = `**Estimativa da Corrida:**<br>
                                                 Distância: <b>${distanciaTexto}</b><br>
                                                 Duração: <b>${duracaoTexto}</b><br>
                                                 Valor Estimado: <b>R$ ${valorEstimado}</b><br>
                                                 Revise as informações e clique em "Solicitar Corrida".`;
            btnSolicitarCorrida.disabled = false; // Habilita o botão após calcular
            
        } else {
            console.error("❌ Erro ao calcular rota para passageiro: " + response.status, response);
            statusPassageiroElement.textContent = `Erro ao calcular rota: ${response.status}. Verifique os endereços.`;
            directionsRenderer.setDirections({ routes: [] }); // Limpa rota em caso de erro
            btnSolicitarCorrida.disabled = true; // Mantém desabilitado em caso de erro
        }
    } catch (error) {
        console.error("❌ Erro na requisição de rota para passageiro:", error);
        statusPassageiroElement.textContent = `Erro na requisição: ${error.message}.`;
        directionsRenderer.setDirections({ routes: [] }); // Limpa rota em caso de erro
        btnSolicitarCorrida.disabled = true; // Mantém desabilitado em caso de erro
    }
    console.log("-> Fim de calculateAndDisplayEstimate()");
}


/**
 * Função chamada quando o passageiro clica em "Solicitar Corrida".
 * Salva os dados da corrida no localStorage e atualiza o status.
 */
async function solicitarCorrida() {
    console.log("-> Iniciando solicitarCorrida()");
    const partida = inputPartida.value.trim();
    const destino = inputDestino.value.trim();

    if (!partida || !destino) {
        console.log("   Partida ou destino vazios ao solicitar corrida.");
        statusPassageiroElement.textContent = "Por favor, preencha partida e destino.";
        return;
    }

    const currentDirections = directionsRenderer.getDirections();
    if (!currentDirections || currentDirections.status !== "OK") {
        console.error("   Erro: Direções não obtidas ou status não é OK antes de solicitar.");
        statusPassageiroElement.textContent = "Erro ao obter rota calculada. Tente novamente.";
        return;
    }
    const route = currentDirections.routes[0].legs[0];
    const distanciaMetros = route.distance.value;
    const duracaoSegundos = route.duration.value;
    const valorEstimado = calculateEstimatedPrice(distanciaMetros, duracaoSegundos);

    console.log("   Passageiro solicitou corrida:", partida, "->", destino);
    
    // Altera o texto imediatamente após a solicitação
    statusPassageiroElement.innerHTML = `**Corrida solicitada com sucesso!**<br>Aguardando motorista...`;
    btnSolicitarCorrida.disabled = true; // Desabilita o botão para evitar múltiplas solicitações
    inputPartida.disabled = true; // Desabilita os campos de input
    inputDestino.disabled = true; // Desabilita os campos de input


    // --- SALVAR INFORMAÇÕES NO LOCALSTORAGE ---
    const corridaData = {
        origemPassageiro: partida,
        destinoFinal: destino,
        distanciaKmEstimada: (distanciaMetros / 1000).toFixed(2), // Salva em KM
        duracaoMinEstimada: (duracaoSegundos / 60).toFixed(2), // Salva em Minutos
        valorEstimado: valorEstimado,
        status: "pendente", // Status inicial da corrida
    };
    localStorage.setItem('corridaSolicitada', JSON.stringify(corridaData));
    console.log("   Dados da corrida salvos no localStorage. Status: PENDENTE");
    console.log("-> Fim de solicitarCorrida()");
}

/**
 * Verifica o status da corrida no localStorage para atualizar a UI do passageiro.
 */
function checkCorridaStatus() {
    // console.log("-> Executando checkCorridaStatus()");
    const corridaJson = localStorage.getItem('corridaSolicitada');
    if (corridaJson) {
        const corridaData = JSON.parse(corridaJson);
        
        // Corrida pendente (solicitada, mas não aceita ainda)
        if (corridaData.status === "pendente") {
            if (!statusPassageiroElement.textContent.includes("Corrida solicitada com sucesso!")) {
                statusPassageiroElement.innerHTML = `**Corrida solicitada com sucesso!**<br>Aguardando motorista...`;
                console.log("   Status da corrida atualizado para passageiro: Pendente (aguardando motorista).");
            }
            btnSolicitarCorrida.disabled = true; // Mantém desabilitado
            inputPartida.disabled = true; // Desabilita os campos de input
            inputDestino.disabled = true; // Desabilita os campos de input
        }
        // Motorista aceitou
        else if (corridaData.status === "aceita") {
            if (!statusPassageiroElement.textContent.includes("Motorista aceitou a corrida")) {
                statusPassageiroElement.innerHTML = "🎉 **Motorista aceitou a corrida!** 🎉<br>Ele está a caminho!";
                console.log("   Status da corrida atualizado para passageiro: Motorista aceitou!");
            }
            btnSolicitarCorrida.disabled = true; // Mantém desabilitado
            inputPartida.disabled = true;
            inputDestino.disabled = true;
        }
        // Passageiro a bordo
        else if (corridaData.status === "a_bordo") {
            if (!statusPassageiroElement.textContent.includes("Você está a bordo")) {
                 statusPassageiroElement.innerHTML = "🚗 **Você está a bordo!** 💨<br>Boa viagem!";
                 console.log("   Status da corrida atualizado para passageiro: Passageiro a bordo!");
            }
            btnSolicitarCorrida.disabled = true; // Mantém desabilitado
            inputPartida.disabled = true;
            inputDestino.disabled = true;
        }
        // Corrida finalizada
        else if (corridaData.status === "finalizada") {
            if (!statusPassageiroElement.textContent.includes("Corrida Finalizada!")) {
                const valorFinal = corridaData.valorFinal ? `R$ ${corridaData.valorFinal}` : 'Não calculado';
                statusPassageiroElement.innerHTML = `✅ **Corrida Finalizada!** ✅<br>Obrigado por usar a VAMUX.<br>Valor total: **${valorFinal}**<br>Para uma nova corrida, preencha e solicite novamente.`;
                btnSolicitarCorrida.disabled = false; // Habilita para nova corrida
                inputPartida.disabled = false; // Habilita campos para nova corrida
                inputDestino.disabled = false; // Habilita campos para nova corrida
                directionsRenderer.setDirections({ routes: [] }); // Limpa a rota do passageiro
                console.log("   Status da corrida atualizado para passageiro: Finalizada!");
                localStorage.removeItem('corridaSolicitada'); // Remove a corrida do localStorage
            }
        }
    } else {
        // Se não há corrida no localStorage
        // Apenas atualiza o status para o estado inicial se a mensagem atual não for a de "Estimativa da Corrida"
        // ou "Insira partida e destino..." (que já é o estado inicial)
        const currentMessage = statusPassageiroElement.innerHTML;
        if (!currentMessage.includes("Estimativa da Corrida:") && 
            !currentMessage.includes("Insira **partida** e **destino** para ver a estimativa.")) {
             statusPassageiroElement.innerHTML = "Insira **partida** e **destino** para ver a estimativa.";
             btnSolicitarCorrida.disabled = true; // Desabilita enquanto não há input válido
             inputPartida.disabled = false; // Habilita campos
             inputDestino.disabled = false; // Habilita campos
             directionsRenderer.setDirections({ routes: [] }); // Limpa a rota se não há corrida ativa
        }
    }
    // console.log("-> Fim de checkCorridaStatus()");
}