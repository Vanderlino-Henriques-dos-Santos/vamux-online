// src/javascript/passageiro.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set } from "firebase/database";
import { firebaseConfig } from "../firebase-config.js"; // Presumindo que firebase-config.js está na mesma pasta que passageiro.js no src

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let map, directionsService, directionsRenderer, autocompleteOrigem, autocompleteDestino; // Adicionado directionsService, directionsRenderer, autocompleteOrigem
let valorEstimado = 0;
let distanciaTexto = '';
let tempoTexto = '';

// Referências aos elementos do HTML
const origemInput = document.getElementById('origemInput'); // Novo ID
const destinoInput = document.getElementById('destinoInput'); // Novo ID
const btnCalcularEstimativa = document.getElementById('btnCalcularEstimativa');
const btnSolicitarCorrida = document.getElementById('btnSolicitarCorrida'); // Novo botão
const estimateDisplay = document.getElementById('estimateDisplay'); // Novo elemento
const statusCorrida = document.getElementById('statusCorrida');
const mensagemInterna = document.getElementById('mensagemInterna'); // Já existe no HTML
const btnLogout = document.getElementById('btnLogout'); // Adicionado o botão de sair

// Inicializa o mapa (agora com o nome correto para o callback da API do Google Maps)
function initMapPassageiro() { // Nome da função alterado
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            map = new google.maps.Map(document.getElementById("mapPassageiro"), {
                center: userLocation,
                zoom: 15,
            });
            directionsRenderer.setMap(map); // Conecta o DirectionsRenderer ao mapa

            // Preenche o input de origem com a localização atual se possível
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'location': userLocation }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    origemInput.value = results[0].formatted_address;
                    origem = results[0].formatted_address; // Armazena o endereço formatado
                } else {
                    origemInput.value = 'Localização atual (não foi possível obter endereço detalhado)';
                    origem = userLocation; // Armazena as coordenadas se não conseguir o endereço
                }
                initAutocompletes(); // Inicializa o autocomplete após obter a localização inicial
            });
        },
        () => {
            // Caso não consiga a localização, define um local padrão (São Paulo)
            const defaultLocation = { lat: -23.55052, lng: -46.633309 }; // São Paulo
            map = new google.maps.Map(document.getElementById("mapPassageiro"), {
                center: defaultLocation,
                zoom: 12,
            });
            directionsRenderer.setMap(map);
            mensagemInterna.textContent = 'Não foi possível obter sua localização. Usando localização padrão.';
            mensagemInterna.style.display = 'block';
            initAutocompletes();
        }
    );
}

// Expõe a função initMapPassageiro globalmente para o callback da API do Google Maps
window.initMapPassageiro = initMapPassageiro; // ESSA LINHA É CRÍTICA


// Autocompletes para origem e destino
function initAutocompletes() {
    autocompleteOrigem = new google.maps.places.Autocomplete(origemInput, {
        componentRestrictions: { country: "br" },
        fields: ["geometry", "formatted_address"],
    });

    autocompleteDestino = new google.maps.places.Autocomplete(destinoInput, {
        componentRestrictions: { country: "br" },
        fields: ["geometry", "formatted_address"],
    });

    autocompleteOrigem.addListener("place_changed", () => {
        const place = autocompleteOrigem.getPlace();
        if (!place.geometry) {
            mensagemInterna.textContent = "Origem inválida.";
            mensagemInterna.style.display = 'block';
            resetEstimate();
            return;
        }
        origem = place.formatted_address; // Atualiza a origem com o endereço formatado
        // Não calcula rota aqui, espera o destino ser preenchido/selecionado
    });

    autocompleteDestino.addListener("place_changed", () => {
        const place = autocompleteDestino.getPlace();
        if (!place.geometry) {
            mensagemInterna.textContent = "Destino inválido.";
            mensagemInterna.style.display = 'block';
            resetEstimate();
            return;
        }
        destino = place.formatted_address; // Atualiza o destino com o endereço formatado
        // A lógica de cálculo será acionada pelo botão
    });
}

// Calcula rota e valor estimado
function calcularRotaEValor() {
    if (!origemInput.value || !destinoInput.value) {
        mensagemInterna.textContent = "Por favor, preencha origem e destino.";
        mensagemInterna.style.display = 'block';
        resetEstimate();
        return;
    }

    directionsService.route(
        {
            origin: origemInput.value, // Usa o valor do input diretamente
            destination: destinoInput.value, // Usa o valor do input diretamente
            travelMode: google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(response); // Exibe a rota no mapa

                const route = response.routes[0].legs[0];
                distanciaTexto = route.distance.text;
                tempoTexto = route.duration.text;
                const distanciaKm = route.distance.value / 1000; // Convertendo metros para km
                valorEstimado = distanciaKm * 2.5 + 5.0; // R$2.50 por km + R$5.00 taxa base

                estimateDisplay.innerText = `Valor Estimado: R$ ${valorEstimado.toFixed(2)} | Distância: ${distanciaTexto} | Tempo: ${tempoTexto}`;
                estimateDisplay.style.display = 'block';
                btnSolicitarCorrida.style.display = 'block'; // Mostra o botão de solicitar
                mensagemInterna.style.display = 'none'; // Esconde mensagens de erro anteriores

            } else {
                mensagemInterna.textContent = `Erro ao calcular rota: ${status}`;
                mensagemInterna.style.display = 'block';
                resetEstimate();
            }
        }
    );
}

// Reseta a exibição da estimativa
function resetEstimate() {
    estimateDisplay.style.display = 'none';
    btnSolicitarCorrida.style.display = 'none';
    directionsRenderer.setDirections({ routes: [] }); // Limpa a rota do mapa
}


// Envia a corrida para o Firebase
btnSolicitarCorrida.addEventListener("click", () => {
    if (!origemInput.value || !destinoInput.value || valorEstimado === 0) {
        mensagemInterna.textContent = "Calcule a estimativa primeiro.";
        mensagemInterna.style.display = 'block';
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.type !== 'passenger') {
        mensagemInterna.textContent = "Faça login como passageiro para solicitar uma corrida.";
        mensagemInterna.style.display = 'block';
        // Opcional: redirecionar para login
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        return;
    }

    // Dados da corrida para o Firebase
    const corridaData = {
        passageiroEmail: currentUser.email,
        passageiroNome: currentUser.name || currentUser.email, // Use o nome se existir, senão o email
        origem: origemInput.value,
        destino: destinoInput.value,
        valor: valorEstimado.toFixed(2),
        distancia: distanciaTexto,
        tempoEstimado: tempoTexto,
        status: "pendente", // Status inicial da corrida
        timestamp: Date.now(),
        // Você pode adicionar mais campos como coordenadas de origem/destino se tiver
        // origemCoords: origem, 
        // destinoCoords: destino,
    };

    const novaCorridaRef = push(ref(database, "corridas"));
    set(novaCorridaRef, corridaData)
        .then(() => {
            mensagemInterna.className = 'mensagem-interna success'; // Estilo de sucesso
            mensagemInterna.textContent = "Corrida solicitada com sucesso! Aguardando motorista...";
            mensagemInterna.style.display = 'block';
            
            // Opcional: desabilitar inputs e botões após a solicitação
            origemInput.disabled = true;
            destinoInput.disabled = true;
            btnCalcularEstimativa.disabled = true;
            btnSolicitarCorrida.disabled = true;

            // Salvar a corrida solicitada no localStorage para monitoramento
            localStorage.setItem('corridaSolicitada', JSON.stringify({
                id: novaCorridaRef.key, // Salva a chave gerada pelo Firebase
                ...corridaData
            }));

            // Iniciar monitoramento do status da corrida
            checkCorridaStatusPassageiro();

        })
        .catch((error) => {
            mensagemInterna.className = 'mensagem-interna error'; // Estilo de erro
            mensagemInterna.textContent = `Erro ao solicitar corrida: ${error.message}`;
            mensagemInterna.style.display = 'block';
        });
});


// Event Listeners para os botões e inputs
btnCalcularEstimativa.addEventListener('click', calcularRotaEValor);

// Adicionar ouvintes para inputs para resetar a estimativa ao digitar
origemInput.addEventListener('input', resetEstimate);
destinoInput.addEventListener('input', resetEstimate);

btnLogout.addEventListener('click', () => {
    localStorage.clear(); // Limpa todos os dados do localStorage
    window.location.href = 'login.html'; // Redireciona para a página de login
});

// Funções de verificação de login e monitoramento de status (adicionadas para completar a lógica)
function checkLoginAndRedirect() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.type !== 'passenger') {
        localStorage.clear(); // Limpa caso haja dados inconsistentes
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

let corridaStatusInterval; // Variável para controlar o intervalo

function checkCorridaStatusPassageiro() {
    if (corridaStatusInterval) {
        clearInterval(corridaStatusInterval); // Limpa qualquer intervalo anterior
    }

    corridaStatusInterval = setInterval(() => {
        const corridaSolicitada = JSON.parse(localStorage.getItem('corridaSolicitada'));
        
        if (corridaSolicitada && corridaSolicitada.id) {
            const corridaRef = ref(database, `corridas/${corridaSolicitada.id}`);
            // No Firebase, você usaria 'onValue' para ouvir mudanças em tempo real
            // Mas para simplificar aqui, você pode simular uma verificação periódica ou
            // adicionar uma lógica de 'onValue' aqui se estiver usando SDK JS completo
            // Para este exemplo, vamos simular a atualização (precisaria ser um listener real no Firebase)
            
            // Exemplo de como você obteria o status real (Firebase Web SDK)
            // onValue(corridaRef, (snapshot) => {
            //     const currentCorrida = snapshot.val();
            //     if (currentCorrida) {
            //         updateUIBasedOnStatus(currentCorrida);
            //     } else {
            //         // Corrida não existe mais ou foi finalizada/removida
            //         handleCorridaCompletion();
            //     }
            // });

            // Para simulação LOCAL (remova quando usar Firebase listeners):
            // Supondo que outro processo (motorista) atualiza o localStorage
            const simulatedCorridaStatus = JSON.parse(localStorage.getItem(`corrida_${corridaSolicitada.id}_status`)) || corridaSolicitada.status;
            corridaSolicitada.status = simulatedCorridaStatus; // Atualiza o status localmente

            updateUIBasedOnStatus(corridaSolicitada);

        } else {
            // Nenhuma corrida solicitada, redefinir UI
            handleCorridaCompletion();
        }
    }, 3000); // Verifica a cada 3 segundos
}

function updateUIBasedOnStatus(corrida) {
    statusCorrida.style.display = 'block';
    origemInput.disabled = true;
    destinoInput.disabled = true;
    btnCalcularEstimativa.disabled = true;
    btnSolicitarCorrida.disabled = true;

    switch (corrida.status) {
        case 'pendente':
            statusCorrida.innerHTML = `<p>Aguardando motorista aceitar sua corrida...</p><p>Origem: ${corrida.origem}</p><p>Destino: ${corrida.destino}</p><p>Valor: R$ ${corrida.valor}</p>`;
            break;
        case 'aceita':
            statusCorrida.innerHTML = `<p>Corrida aceita por ${corrida.motoristaNome || 'um motorista'}!</p><p>O motorista está a caminho da sua origem.</p>`;
            // Aqui você pode adicionar lógica para mostrar a rota do motorista até o passageiro
            // requires motoristaLocation in corrida object from Firebase
            break;
        case 'a_bordo':
            statusCorrida.innerHTML = `<p>Você está a bordo! Boa viagem!</p><p>Destino: ${corrida.destino}</p>`;
            // Aqui você pode redefinir a rota para mostrar a viagem do passageiro até o destino
            break;
        case 'finalizada':
            statusCorrida.innerHTML = `<p>Corrida finalizada! Obrigado por usar VAMUX.</p>`;
            handleCorridaCompletion();
            break;
        case 'cancelada':
            statusCorrida.innerHTML = `<p>Sua corrida foi cancelada.</p>`;
            handleCorridaCompletion();
            break;
        default:
            statusCorrida.innerHTML = `<p>Status desconhecido: ${corrida.status}</p>`;
            break;
    }
}

function handleCorridaCompletion() {
    clearInterval(corridaStatusInterval);
    localStorage.removeItem('corridaSolicitada');
    localStorage.removeItem('corrida_id_status'); // Limpa a simulação
    
    statusCorrida.style.display = 'none';
    origemInput.disabled = false;
    destinoInput.disabled = false;
    btnCalcularEstimativa.disabled = false;
    btnSolicitarCorrida.style.display = 'none'; // Oculta o botão de solicitar
    estimateDisplay.style.display = 'none'; // Oculta a estimativa
    mensagemInterna.style.display = 'none'; // Limpa mensagens

    // Opcional: Limpar campos de input
    origemInput.value = '';
    destinoInput.value = '';

    // Limpar o mapa/rota
    if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
    }
    // Reinicializar o mapa para a localização atual do usuário se necessário
    // initMapPassageiro(); // Chame novamente para centralizar no usuário e re-inicializar autocompletes
}


// Ao carregar a página:
document.addEventListener('DOMContentLoaded', () => {
    if (checkLoginAndRedirect()) {
        const corridaSolicitada = JSON.parse(localStorage.getItem('corridaSolicitada'));
        if (corridaSolicitada && corridaSolicitada.status && corridaSolicitada.status !== 'finalizada' && corridaSolicitada.status !== 'cancelada') {
            // Se já houver uma corrida em andamento, atualiza a UI e monitora
            updateUIBasedOnStatus(corridaSolicitada);
            checkCorridaStatusPassageiro();
        } else {
            // Caso contrário, garante que a UI está no estado inicial
            handleCorridaCompletion(); // Limpa e prepara para nova corrida
        }
    }
});