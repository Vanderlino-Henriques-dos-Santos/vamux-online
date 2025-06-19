// javascript/passageiro.js (VERSÃO COMPLETA, CORRIGIDA E ATUALIZADA PARA O TEMPO DE EXIBIÇÃO DA ESTIMATIVA)
import { carregarGoogleMaps } from './carregar-maps.js';
carregarGoogleMaps();
function mostrarMensagemInterna(mensagem, tipo = 'info') {
    const mensagemDiv = document.getElementById("mensagemInterna");
    if (!mensagemDiv) return;

    mensagemDiv.textContent = mensagem;
    mensagemDiv.className = `mensagem-interna ${tipo}`;
    mensagemDiv.style.display = "block";

    setTimeout(() => {
        mensagemDiv.style.display = "none";
    }, 4000);
}


// --- VERIFICAÇÃO DE LOGIN: Garante que só passageiros logados acessem esta página ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'passenger') {
   mostrarMensagemInterna('Você precisa estar logado como Passageiro para acessar esta página.', 'erro');

    localStorage.clear(); // Limpa TUDO do localStorage se o usuário não está logado como passageiro
    window.location.href = 'login.html';
}
// --- FIM DA VERIFICAÇÃO DE LOGIN ---

let mapPassageiro;
let directionsServicePassageiro;
let directionsRendererPassageiro;
let autocompletePartida, autocompleteDestino;

// Elementos HTML
const partidaInput = document.getElementById("partidaInput");
const destinoInput = document.getElementById("destinoInput");
const btnCalcularEstimativa = document.getElementById("btnCalcularEstimativa");
const btnSolicitarCorrida = document.getElementById("btnSolicitarCorrida");
const estimateDisplay = document.getElementById("estimateDisplay");
const valorEstimadoSpan = document.getElementById("valorEstimado");
const distanciaEstimadaSpan = document.getElementById("distanciaEstimada");
const tempoEstimadoSpan = document.getElementById("tempoEstimado");
const corridaStatusDiv = document.getElementById("corridaStatus");
const statusMessageP = document.getElementById("statusMessage");
const motoristaInfoP = document.getElementById("motoristaInfo");
const btnLogout = document.getElementById("btnLogout");

let currentRouteData = null; // Armazenará os dados da rota e estimativa

// --- FUNÇÃO DE INICIALIZAÇÃO DO MAPA PARA PASSAGEIRO ---
window.initMapPassageiro = function () {
    console.log("📍 initMapPassageiro foi chamada pelo Google Maps API.");

    directionsServicePassageiro = new google.maps.DirectionsService();
    directionsRendererPassageiro = new google.maps.DirectionsRenderer();

    const mapDivPassageiro = document.getElementById("mapPassageiro");

    if (mapDivPassageiro) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const passageiroLatLng = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    mapPassageiro = new google.maps.Map(mapDivPassageiro, {
                        center: passageiroLatLng,
                        zoom: 15,
                    });
                    directionsRendererPassageiro.setMap(mapPassageiro);
                    console.log("✅ Mapa passageiro inicializado com localização atual.");
                },
                (error) => {
                    console.warn("⚠️ Falha ao obter localização do passageiro. Usando localização padrão. Erro:", error.message);
                    const defaultLatLng = { lat: -23.55052, lng: -46.633309 }; // São Paulo
                    mapPassageiro = new google.maps.Map(mapDivPassageiro, {
                        center: defaultLatLng,
                        zoom: 12,
                    });
                    directionsRendererPassageiro.setMap(mapPassageiro);
                }
            );
        } else {
            console.warn("⚠️ Navegador não suporta geolocalização. Usando localização padrão.");
            const defaultLatLng = { lat: -23.55052, lng: -46.633309 }; // São Paulo
            mapPassageiro = new google.maps.Map(mapDivPassageiro, {
                center: defaultLatLng,
                zoom: 12,
            });
            directionsRendererPassageiro.setMap(mapPassageiro);
        }
    } else {
        console.error("❌ Elemento 'mapPassageiro' não encontrado no HTML para passageiro.");
    }

    // Inicializa o Autocomplete para os campos de input
   
const options = {
  componentRestrictions: { country: 'br' },
  fields: ["formatted_address", "geometry", "name"],
};

const partidaAutocomplete = new google.maps.places.Autocomplete(partidaInput, options);
const destinoAutocomplete = new google.maps.places.Autocomplete(destinoInput, options);

    // Adiciona event listeners
    if (btnCalcularEstimativa) btnCalcularEstimativa.addEventListener("click", calculateAndDisplayEstimate);
    if (btnSolicitarCorrida) btnSolicitarCorrida.addEventListener("click", solicitarCorrida);
    if (btnLogout) btnLogout.addEventListener('click', () => {
        localStorage.clear(); // Limpa tudo, incluindo currentUser
        window.location.href = 'login.html';
    });

    // Adiciona event listeners para resetar a estimativa se os inputs forem alterados
    // Estes listeners NÃO DEVEM ESCONDER o estimateDisplay, apenas desabilitar o botão Solicitar
    partidaInput.addEventListener('input', () => {
        // Se o usuário começar a digitar, invalida a estimativa atual
        if (currentRouteData) { // Apenas se já houver uma estimativa
            btnSolicitarCorrida.disabled = true; // Desabilita o botão de solicitar
            // O estimateDisplay permanece visível, mas a estimativa exibida está desatualizada.
            // O passageiro terá que clicar em "Calcular Estimativa" novamente para reabilitar o botão.
        }
        currentRouteData = null; // Zera os dados da rota para forçar novo cálculo
    });
    destinoInput.addEventListener('input', () => {
        if (currentRouteData) { // Apenas se já houver uma estimativa
            btnSolicitarCorrida.disabled = true; // Desabilita o botão de solicitar
        }
        currentRouteData = null; // Zera os dados da rota para forçar novo cálculo
    });


    // Monitora o status da corrida no localStorage periodicamente
    checkCorridaStatusPassageiro(); // Chamada inicial
    setInterval(checkCorridaStatusPassageiro, 3000); // Verifica a cada 3 segundos
};

// --- Funções de Lógica da Corrida para Passageiro ---

async function calculateAndDisplayEstimate() {
    console.log("-> Iniciando cálculo de estimativa...");
    const partida = partidaInput.value;
    const destino = destinoInput.value;

    if (!partida || !destino) {
        mostrarMensagemInterna("Por favor, preencha a origem e o destino.", "erro");

        // Garante que o painel de estimativa não apareça se os campos estiverem vazios
        estimateDisplay.style.display = 'none'; 
        btnSolicitarCorrida.disabled = true;
        return;
    }

    // Limpa a rota anterior no mapa
    if (directionsRendererPassageiro) {
        directionsRendererPassageiro.setDirections({ routes: [] });
    }

    try {
        const request = {
            origin: partida,
            destination: destino,
            travelMode: google.maps.TravelMode.DRIVING,
        };

        const response = await directionsServicePassageiro.route(request);

        if (response.status === "OK") {
            directionsRendererPassageiro.setDirections(response);
            const route = response.routes[0].legs[0];

            const distanciaMetros = route.distance.value;
            const tempoSegundos = route.duration.value;

            // Lógica de cálculo de valor (exemplo simplificado)
            const precoPorKm = 2.50;
            const taxaBase = 5.00;
            const valorEstimado = (distanciaMetros / 1000) * precoPorKm + taxaBase;

            valorEstimadoSpan.textContent = `R$ ${valorEstimado.toFixed(2)}`;
            distanciaEstimadaSpan.textContent = `${route.distance.text}`;
            tempoEstimadoSpan.textContent = `${route.duration.text}`;

            // --- PONTO CRÍTICO: EXIBE A ESTIMATIVA E HABILITA O BOTÃO SOLICITAR ---
            estimateDisplay.style.display = 'block'; // Exibe o painel de estimativa
            btnSolicitarCorrida.disabled = false; // Habilita o botão "Solicitar Corrida"
            
            // NOTA: Os inputs (partidaInput, destinoInput) e o botão "Calcular Estimativa" (btnCalcularEstimativa)
            // PERMANECEM HABILITADOS AQUI para que o passageiro possa revisar, alterar ou recalcular.

            // Armazena os dados da rota para uso futuro
            currentRouteData = {
                origemPassageiro: partida,
                destinoFinal: destino,
                valorEstimado: valorEstimado.toFixed(2),
                distancia: route.distance.text,
                tempo: route.duration.text,
                rotaPassageiroDestino: response, 
            };
            console.log("✅ Estimativa calculada e exibida. Botão 'Solicitar Corrida' habilitado. Campos editáveis.");

        } else {
            mostrarMensagemInterna("Erro ao obter rota. Tente novamente. Status: " + response.status, "erro");

            console.error("❌ Erro DirectionsService no passageiro:", response.status, response);
            estimateDisplay.style.display = 'none'; // Esconde o painel se houver erro
            btnSolicitarCorrida.disabled = true; // Desabilita o botão de solicitar se houver erro
            currentRouteData = null;
        }
    } catch (error) {
        mostrarMensagemInterna("Erro ao calcular a estimativa. Verifique os endereços e tente novamente.", "erro");

        console.error("❌ Erro na requisição de rota no passageiro (catch):", error);
        estimateDisplay.style.display = 'none';
        btnSolicitarCorrida.disabled = true;
        currentRouteData = null;
    }
}

function solicitarCorrida() {
    console.log("-> Passageiro clicou em Solicitar Corrida!");
    if (!currentRouteData) {
       mostrarMensagemInterna("Nenhuma estimativa válida. Calcule a estimativa primeiro.", "erro");

        return;
    }

    const passageiroId = currentUser.email; 
    const passageiroNome = currentUser.name; 

    const corridaData = {
        passageiroId: passageiroId,
        passageiroNome: passageiroNome, 
        origemPassageiro: currentRouteData.origemPassageiro,
        destinoFinal: currentRouteData.destinoFinal,
        valorEstimado: currentRouteData.valorEstimado,
        distancia: currentRouteData.distancia,
        tempo: currentRouteData.tempo,
        status: "pendente", // Status inicial
        motoristaId: null, 
        motoristaNome: null, 
        // Armazenar a rota passageiro-destino para ser exibida quando o passageiro estiver "a_bordo"
        rotaPassageiroDestino: currentRouteData.rotaPassageiroDestino 
    };

    // Salva a corrida no localStorage como a corrida principal que o motorista vai pegar
    localStorage.setItem('corridaSolicitada', JSON.stringify(corridaData));

    // Adiciona/Atualiza a corrida na lista de corridas pendentes (para simular múltiplos motoristas)
    // Isso é importante para o motorista "encontrar" a corrida
    let corridasPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    // Remove qualquer corrida pendente anterior do mesmo passageiro para evitar duplicatas
    corridasPendentes = corridasPendentes.filter(c => !(c.passageiroId === passageiroId && c.status === "pendente"));
    corridasPendentes.push(corridaData);
    localStorage.setItem('corridasPendentes', JSON.stringify(corridasPendentes));

    // --- PONTO CRÍTICO: ESCONDE E DESABILITA TUDO APÓS A SOLICITAÇÃO ---
    updateCorridaStatusDisplay("pending", "Corrida solicitada com sucesso! Aguardando motorista...");
    btnSolicitarCorrida.disabled = true;
    btnCalcularEstimativa.disabled = true; // Desabilita o calcular
    partidaInput.disabled = true; // Desabilita os inputs
    destinoInput.disabled = true; // Desabilita os inputs
    estimateDisplay.style.display = 'none'; // Esconde o painel de estimativa APÓS SOLICITAR
    console.log("✅ Corrida solicitada e salva no localStorage.");
}

function checkCorridaStatusPassageiro() {
    const corridaAtual = JSON.parse(localStorage.getItem('corridaSolicitada'));
    // console.log("   Check status passageiro. Corrida atual:", corridaAtual ? corridaAtual.status : "Nenhuma");

    if (corridaAtual && corridaAtual.passageiroId === currentUser.email) {
        corridaStatusDiv.style.display = 'block';
        // Assegura que o painel de estimativa esteja escondido quando uma corrida está em andamento
        estimateDisplay.style.display = 'none'; 
        btnSolicitarCorrida.disabled = true;
        btnCalcularEstimativa.disabled = true;
        partidaInput.disabled = true;
        destinoInput.disabled = true;

        switch (corridaAtual.status) {
            case "pendente":
                updateCorridaStatusDisplay("pending", "Corrida solicitada! Aguardando motorista...");
                motoristaInfoP.textContent = "Seu motorista será notificado em breve.";
                // Exibir a rota original do passageiro se ela existir
                if (corridaAtual.rotaPassageiroDestino && directionsRendererPassageiro) {
                    directionsRendererPassageiro.setDirections(corridaAtual.rotaPassageiroDestino);
                }
                break;
            case "aceita":
                updateCorridaStatusDisplay("accepted", `Corrida aceita por ${corridaAtual.motoristaNome}!`);
                motoristaInfoP.innerHTML = `O motorista está a caminho de sua origem: <br><b>${corridaAtual.origemPassageiro}</b>`;
                // Exibir a rota do motorista até o passageiro, se tiver sido salva pelo motorista
                if (corridaAtual.rotaMotoristaPassageiro && directionsRendererPassageiro) {
                    directionsRendererPassageiro.setDirections(corridaAtual.rotaMotoristaPassageiro);
                } else {
                    console.warn("Rota motorista-passageiro não disponível ainda para o passageiro.");
                    // Opcional: tentar recalcular a rota aqui se preferir
                }
                break;
            case "a_bordo":
                updateCorridaStatusDisplay("a_bordo", `Você está a bordo!`);
                motoristaInfoP.innerHTML = `Dirigindo para: <br><b>${corridaAtual.destinoFinal}</b>`;
                // Exibir a rota final da corrida (passageiro ao destino)
                if (corridaAtual.rotaPassageiroDestino && directionsRendererPassageiro) {
                    directionsRendererPassageiro.setDirections(corridaAtual.rotaPassageiroDestino);
                }
                break;
            case "finalizada":
                updateCorridaStatusDisplay("finalizada", `Corrida finalizada! Valor total: R$ ${corridaAtual.valorFinal || corridaAtual.valorEstimado}`);
                motoristaInfoP.textContent = `Obrigado por usar VAMUX, ${currentUser.name}!`;
                // Limpar a corrida do localStorage do passageiro após a finalização
                localStorage.removeItem('corridaSolicitada');
                // --- MUDANÇA AQUI: HABILITAR INPUTS E BTN CALCULAR PARA NOVA CORRIDA ---
                partidaInput.value = "";
                destinoInput.value = "";
                btnCalcularEstimativa.disabled = false; // Habilita o calcular
                btnSolicitarCorrida.disabled = true; // Botão de solicitar desabilitado até novo cálculo
                partidaInput.disabled = false; // Habilita os inputs
                destinoInput.disabled = false; // Habilita os inputs
                estimateDisplay.style.display = 'none'; // Garante que a estimativa esteja escondida
                if (directionsRendererPassageiro) directionsRendererPassageiro.setDirections({ routes: [] }); // Limpa o mapa
                currentRouteData = null; // Zera dados de rota
                break;
            default:
                updateCorridaStatusDisplay("", "Status da corrida desconhecido.");
                motoristaInfoP.textContent = "";
                break;
        }
    } else {
        // Nenhuma corrida para este passageiro (ou foi finalizada/cancelada).
        // Deve-se permitir que o usuário inicie uma nova corrida ou veja a estimativa.
        corridaStatusDiv.style.display = 'none'; // Esconde o painel de status da corrida

        partidaInput.disabled = false; // Habilita inputs
        destinoInput.disabled = false;
        btnCalcularEstimativa.disabled = false; // Habilita o botão de calcular estimativa

        // **A CORREÇÃO ESTÁ AQUI:**
        // Se currentRouteData (dados da última estimativa calculada) existe,
        // então o painel de estimativa deve estar visível e o botão de solicitar habilitado.
        if (currentRouteData) {
            estimateDisplay.style.display = 'block';
            btnSolicitarCorrida.disabled = false;
        } else {
            // Se não há corrida e nem estimativa calculada (currentRouteData é null),
            // então esconde o estimateDisplay e desabilita o botão de solicitar.
            estimateDisplay.style.display = 'none';
            btnSolicitarCorrida.disabled = true;
        }

        if (directionsRendererPassageiro) directionsRendererPassageiro.setDirections({ routes: [] }); // Limpa o mapa se não há rota ativa
        // currentRouteData já é nulo se a corrida foi finalizada/cancelada, ou se o usuário digitou nos inputs.
        // Não precisamos forçar currentRouteData = null aqui.
    }
}

function updateCorridaStatusDisplay(className, message) {
    corridaStatusDiv.className = 'info-panel ' + className; 
    statusMessageP.textContent = message;
    corridaStatusDiv.style.display = 'block';
    motoristaInfoP.textContent = ''; // Limpa info anterior
}