// javascript/motorista.js
import { carregarGoogleMaps } from './carregar-maps.js';
carregarGoogleMaps();


// --- VERIFICAÇÃO DE LOGIN: Garante que só motoristas logados acessem esta página ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.type !== 'driver') {
    alert('Você precisa estar logado como Motorista para acessar esta página.');
    localStorage.clear(); 
    window.location.href = 'login.html';
}
// --- FIM DA VERIFICAÇÃO DE LOGIN ---

let mapMotorista;
let directionsServiceMotorista;
let directionsRendererMotorista;
let passageiroMarker; 
let destinoMarker; 

// Elementos HTML
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



// --- FUNÇÃO DE INICIALIZAÇÃO DO MAPA PARA MOTORISTA ---
window.initMapMotorista = function () {
    console.log("📍 initMapMotorista foi chamada pelo Google Maps API.");

    directionsServiceMotorista = new google.maps.DirectionsService();
    directionsRendererMotorista = new google.maps.DirectionsRenderer();

    const mapDivMotorista = document.getElementById("mapMotorista");

    if (mapDivMotorista) {
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
                    directionsRendererMotorista.setMap(mapMotorista);
                    console.log("✅ Mapa motorista inicializado com localização atual.");

                    updateMotoristaLocation(motoristaLatLng.lat, motoristaLatLng.lng);
                    // Simula atualização de localização do motorista a cada 3 segundos
                    setInterval(() => {
                        updateMotoristaLocation(motoristaLatLng.lat, motoristaLatLng.lng);
                    }, 3000); 
                },
                (error) => { 
                    console.warn("⚠️ Falha ao obter localização do motorista. Usando localização padrão. Erro:", error.message);
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
            console.warn("⚠️ Navegador não suporta geolocalização. Usando localização padrão.");
            const defaultLatLng = { lat: -23.55052, lng: -46.633309 }; // São Paulo
            mapMotorista = new google.maps.Map(mapDivMotorista, {
                center: defaultLatLng,
                zoom: 12,
            });
            directionsRendererMotorista.setMap(mapMotorista);
            updateMotoristaLocation(defaultLatLng.lat, defaultLatLng.lng); 
        }
    } else {
        console.error("❌ Elemento 'mapMotorista' não encontrado no HTML para motorista.");
    }

    // Adiciona event listeners aos botões
    if (btnAceitarCorrida) btnAceitarCorrida.addEventListener("click", aceitarCorrida);
    if (btnRecusarCorrida) btnRecusarCorrida.addEventListener("click", recusarCorrida);
    if (btnChegueiNoPassageiro) btnChegueiNoPassageiro.addEventListener("click", chegueiNoPassageiro);
    if (btnFinalizarCorrida) btnFinalizarCorrida.addEventListener("click", finalizarCorrida);
    if (btnLogout) btnLogout.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // Chamada inicial e periódica do status da corrida
    checkCorridaStatusMotorista();
    setInterval(checkCorridaStatusMotorista, 3000); 
};


// --- Funções de Lógica da Corrida para Motorista ---

function updateMotoristaLocation(lat, lng) {
    const motoristaLocalizacaoAtual = { lat: lat, lng: lng };
    localStorage.setItem('motoristaLocalizacaoAtual', JSON.stringify(motoristaLocalizacaoAtual));
}

async function checkCorridaStatusMotorista() {
    // console.log("-> Executando checkCorridaStatusMotorista()"); 

    let corridasPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    const corridaAtivaMotorista = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));
    
    // --- LÓGICA PARA CORRIDA ATIVA (ACEITA/A BORDO) ---
    // Verifica se há uma corrida ativa para ESTE motorista
    if (corridaAtivaMotorista && (corridaAtivaMotorista.status === "aceita" || corridaAtivaMotorista.status === "a_bordo")) {
        console.log(`   Corrida ${corridaAtivaMotorista.status} detectada para este motorista.`);

        statusMotoristaElement.style.display = 'none';
        corridaPendenteDetalhes.style.display = 'none';
        corridaAtivaDetalhes.style.display = 'block';

        infoCorridaAtivaElement.innerHTML = ''; 

        if (corridaAtivaMotorista.status === "aceita") {
            infoCorridaAtivaElement.innerHTML = `Dirija-se a:<br><b>${corridaAtivaMotorista.origemPassageiro}</b><br>Para buscar o passageiro.`;
            btnChegueiNoPassageiro.disabled = false;
            btnFinalizarCorrida.disabled = true; // Só pode finalizar depois de chegar no passageiro e iniciar
            
            // Exibir a rota do motorista até o passageiro, usando o que foi salvo
            if (directionsRendererMotorista) {
                // Se a rota motorista-passageiro já está salva, usa ela
                if (corridaAtivaMotorista.rotaMotoristaPassageiro) {
                    directionsRendererMotorista.setDirections(corridaAtivaMotorista.rotaMotoristaPassageiro);
                    console.log("   Rota motorista-passageiro exibida a partir de dados salvos.");
                } else { // Caso a rota não tenha sido salva por algum motivo, tenta recalcular
                    console.warn("   Rota motorista-passageiro não encontrada em dados salvos. Recalculando...");
                    await displayRouteToPassageiro(corridaAtivaMotorista); // Chama a função para calcular e exibir
                }
                
                if (mapMotorista) {
                    if (passageiroMarker) passageiroMarker.setMap(null); 
                    passageiroMarker = new google.maps.Marker({
                        position: directionsRendererMotorista.getDirections().routes[0].legs[0].end_location, // Pega a posição final da rota
                        map: mapMotorista,
                        title: "Local do Passageiro",
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/man.png', // Ícone de pessoa
                            scaledSize: new google.maps.Size(32, 32)
                        }
                    });
                    if (destinoMarker) {
                        destinoMarker.setMap(null);
                        destinoMarker = null;
                    }
                }
            } else {
                console.warn("   directionsRendererMotorista não pronto para exibir rota.");
            }

        } else if (corridaAtivaMotorista.status === "a_bordo") {
            infoCorridaAtivaElement.innerHTML = `Indo para:<br><b>${corridaAtivaMotorista.destinoFinal}</b>`;
            btnChegueiNoPassageiro.disabled = true;
            btnFinalizarCorrida.disabled = false;
            
            // Exibir a rota do passageiro ao destino final, usando o que foi salvo
            if (directionsRendererMotorista) {
                 if (corridaAtivaMotorista.rotaPassageiroDestino) {
                    directionsRendererMotorista.setDirections(corridaAtivaMotorista.rotaPassageiroDestino);
                    console.log("   Rota para destino final exibida a partir de dados salvos.");
                } else {
                    console.warn("   Rota passageiro-destino não encontrada em dados salvos. Recalculando...");
                    await displayRouteToDestino(corridaAtivaMotorista);
                }

                if (passageiroMarker) {
                    passageiroMarker.setMap(null);
                    passageiroMarker = null;
                }
                if (destinoMarker) destinoMarker.setMap(null); 
                destinoMarker = new google.maps.Marker({
                    position: directionsRendererMotorista.getDirections().routes[0].legs[0].end_location, // Pega a posição final da rota
                    map: mapMotorista,
                    title: "Destino Final",
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Ícone de destino
                        scaledSize: new google.maps.Size(32, 32)
                    }
                });
            } else {
                console.warn("   directionsRendererMotorista não pronto para exibir rota para destino.");
            }
        }

        currentPendingRide = null; 

    } else {
        // --- LÓGICA PARA BUSCAR NOVAS CORRIDAS PENDENTES ---
        corridaAtivaDetalhes.style.display = 'none'; 

        // Encontra a primeira corrida pendente disponível que não tenha sido finalizada
        // Filtra para garantir que só pegamos corridas que não estão sendo gerenciadas por outro motorista (simulação)
        const novaCorridaPendente = corridasPendentes.find(c => c.status === "pendente");

        if (novaCorridaPendente) {
            console.log("   Nova corrida pendente encontrada:", novaCorridaPendente);
            statusMotoristaElement.style.display = 'none';
            corridaPendenteDetalhes.style.display = 'block';

            origemCorridaSpan.textContent = novaCorridaPendente.origemPassageiro;
            destinoCorridaSpan.textContent = novaCorridaPendente.destinoFinal;
            valorCorridaSpan.textContent = `R$ ${novaCorridaPendente.valorEstimado}`;
            passageiroNomeSpan.textContent = novaCorridaPendente.passageiroNome || novaCorridaPendente.passageiroId; 

            btnAceitarCorrida.disabled = false;
            btnRecusarCorrida.disabled = false;

            currentPendingRide = novaCorridaPendente; 

            // Exibir rota estimada para o motorista (origem do passageiro -> destino final)
            if (directionsRendererMotorista) {
                if (novaCorridaPendente.rotaPassageiroDestino) {
                    directionsRendererMotorista.setDirections(novaCorridaPendente.rotaPassageiroDestino);
                    console.log("   Rota passageiro-destino exibida para nova corrida pendente.");
                } else {
                    console.warn("   rotaPassageiroDestino não encontrada para a corrida pendente. Tentando reconstruir...");
                    // Se não tiver a rota em JSON, tenta construir a partir das strings de endereço
                    if (directionsServiceMotorista && mapMotorista && novaCorridaPendente.origemPassageiro && novaCorridaPendente.destinoFinal) {
                        try {
                            const request = {
                                origin: novaCorridaPendente.origemPassageiro,
                                destination: novaCorridaPendente.destinoFinal,
                                travelMode: google.maps.TravelMode.DRIVING,
                            };
                            directionsServiceMotorista.route(request, (response, status) => {
                                if (status === "OK") {
                                    directionsRendererMotorista.setDirections(response);
                                    console.log("   Rota passageiro-destino reconstruída a partir de strings para corrida pendente.");
                                } else {
                                    console.error("❌ Erro ao reconstruir rota para corrida pendente: STATUS = " + status, response);
                                }
                            });
                        } catch (e) {
                            console.error("❌ Erro ao tentar traçar rota para corrida pendente (strings - catch):", e);
                        }
                    }
                }
                
                if (mapMotorista) {
                    if (passageiroMarker) passageiroMarker.setMap(null); 
                    passageiroMarker = new google.maps.Marker({
                        position: directionsRendererMotorista.getDirections().routes[0].legs[0].start_location,
                        map: mapMotorista,
                        title: "Local do Passageiro",
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/man.png',
                            scaledSize: new google.maps.Size(32, 32)
                        }
                    });
                    if (destinoMarker) {
                        destinoMarker.setMap(null);
                        destinoMarker = null;
                    }
                }
            }


        } else {
            console.log("   Nenhuma corrida pendente ou ativa encontrada para este motorista.");
            statusMotoristaElement.style.display = 'block';
            statusMotoristaElement.textContent = "Aguardando novas corridas...";
            corridaPendenteDetalhes.style.display = 'none';
            btnAceitarCorrida.disabled = true;
            btnRecusarCorrida.disabled = true;
            currentPendingRide = null;

            if (directionsRendererMotorista) directionsRendererMotorista.setDirections({ routes: [] });
            if (passageiroMarker) {
                passageiroMarker.setMap(null);
                passageiroMarker = null;
            }
            if (destinoMarker) {
                destinoMarker.setMap(null);
                destinoMarker = null;
            }
        }
    }
}

async function aceitarCorrida() {
    console.log("-> Motorista clicou em Aceitar Corrida!");
    if (!currentPendingRide) {
        console.error("   Nenhuma corrida pendente selecionada para aceitar.");
        return;
    }

    // 1. Atualizar o status da corrida para "aceita" no localStorage do passageiro
    let passageiroCorrida = JSON.parse(localStorage.getItem('corridaSolicitada'));

    if (passageiroCorrida && passageiroCorrida.passageiroId === currentPendingRide.passageiroId && passageiroCorrida.status === "pendente") {
        passageiroCorrida.status = "aceita";
        passageiroCorrida.motoristaId = currentUser.email;
        passageiroCorrida.motoristaNome = currentUser.name; 
        
        // Calcular rota do motorista até o passageiro (motoristaLocation -> origemPassageiro)
        try {
            const motoristaLocalizacaoAtual = JSON.parse(localStorage.getItem('motoristaLocalizacaoAtual'));
            if (!motoristaLocalizacaoAtual) {
                alert("Sua localização não está disponível. Por favor, permita a geolocalização.");
                console.error("Localização do motorista não disponível ao aceitar corrida.");
                return;
            }

            console.log("   Calculando rota motorista -> passageiro para salvar em corridaSolicitada...");
            const request = {
                origin: new google.maps.LatLng(motoristaLocalizacaoAtual.lat, motoristaLocalizacaoAtual.lng),
                destination: passageiroCorrida.origemPassageiro, 
                travelMode: google.maps.TravelMode.DRIVING,
            };

            const response = await new Promise((resolve, reject) => {
                directionsServiceMotorista.route(request, (result, status) => {
                    if (status === "OK") {
                        resolve(result);
                    } else {
                        reject(new Error(`Directions Service failed: ${status}`));
                    }
                });
            });

            passageiroCorrida.rotaMotoristaPassageiro = response; // SALVA A ROTA NO OBJETO DA CORRIDA
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida));
            console.log("   Status da corrida do passageiro atualizado para 'aceita' com rota do motorista.");
        } catch (error) {
            console.error("❌ ERRO ao calcular rota motorista-passageiro ao aceitar:", error);
            alert("Erro ao calcular rota até o passageiro. Tente novamente. Detalhes no console.");
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida)); // Salva mesmo com erro na rota
        }

    } else {
        console.warn("   Corrida do passageiro não encontrada ou status incorreto para aceitar. Provavelmente já foi aceita por outro motorista ou cancelada.");
        alert("Esta corrida não está mais disponível ou já foi aceita por outro motorista.");
        checkCorridaStatusMotorista();
        return;
    }

    // 2. Remover a corrida da lista de `corridasPendentes` (para outros motoristas)
    let corridasPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    corridasPendentes = corridasPendentes.filter(c => !(c.passageiroId === currentPendingRide.passageiroId && c.status === "pendente"));
    localStorage.setItem('corridasPendentes', JSON.stringify(corridasPendentes));
    console.log("   Corrida removida da lista de pendentes para outros motoristas.");

    // 3. Salvar a corrida como a corrida "ativa" do motorista (corridaAceitaMotorista)
    localStorage.setItem('corridaAceitaMotorista', JSON.stringify(passageiroCorrida)); 

    // 4. Atualizar a interface do motorista imediatamente
    checkCorridaStatusMotorista();
    alert(`Corrida de ${currentPendingRide.origemPassageiro} para ${currentPendingRide.destinoFinal} aceita!`);
    console.log("-> Fim de aceitarCorrida()");
}

function recusarCorrida() {
    console.log("-> Motorista clicou em Recusar Corrida.");
    if (!currentPendingRide) {
        console.error("   Nenhuma corrida pendente selecionada para recusar.");
        return;
    }

    // Apenas remove a corrida pendente da lista para este motorista para que ele não a veja novamente.
    // Em um sistema real, poderíamos ter um status de "recusada" para evitar que outros motoristas a vejam
    // ou um mecanismo de re-atribuição. Para este MVP, ela continua pendente para outros se houver.
    let corridasPendentes = JSON.parse(localStorage.getItem('corridasPendentes')) || [];
    corridasPendentes = corridasPendentes.filter(c => 
        !(c.passageiroId === currentPendingRide.passageiroId && 
          c.origemPassageiro === currentPendingRide.origemPassageiro && 
          c.destinoFinal === currentPendingRide.destinoFinal && 
          c.status === "pendente") // Filtra apenas a corrida exata recusada
    );
    localStorage.setItem('corridasPendentes', JSON.stringify(corridasPendentes));

    currentPendingRide = null; 
    
    checkCorridaStatusMotorista(); 
    console.log("   Corrida recusada. Voltando a aguardar novas corridas.");
    alert("Corrida recusada. Aguardando novas solicitações.");
}

async function chegueiNoPassageiro() {
    console.log("-> Motorista clicou em Cheguei no Passageiro.");
    let corridaAtiva = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));

    if (corridaAtiva && corridaAtiva.status === "aceita") {
        corridaAtiva.status = "a_bordo";
        // Não é necessário recalcular rota aqui, pois a rota passageiro-destino já está salva (rotaPassageiroDestino)
        // Isso otimiza o uso da API e o desempenho
        localStorage.setItem('corridaAceitaMotorista', JSON.stringify(corridaAtiva));

        // Sincroniza com o localStorage do passageiro
        let passageiroCorrida = JSON.parse(localStorage.getItem('corridaSolicitada'));
        if (passageiroCorrida && passageiroCorrida.passageiroId === corridaAtiva.passageiroId) {
            passageiroCorrida.status = "a_bordo";
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida));
            console.log("   Status do passageiro atualizado para 'a_bordo'.");
        }
        console.log("   Status da corrida do motorista atualizado para 'a_bordo'.");
        checkCorridaStatusMotorista(); 
        alert("Passageiro a bordo! Indo para o destino.");
    } else {
        console.warn("   Nenhuma corrida ativa ou status incorreto para 'cheguei no passageiro'.");
    }
}

async function finalizarCorrida() {
    console.log("-> Motorista clicou em Finalizar Corrida.");
    let corridaAtiva = JSON.parse(localStorage.getItem('corridaAceitaMotorista'));

    if (corridaAtiva && corridaAtiva.status === "a_bordo") {
        corridaAtiva.status = "finalizada";
        corridaAtiva.valorFinal = corridaAtiva.valorEstimado; // Para o MVP, o valor final é o estimado

        localStorage.setItem('corridaAceitaMotorista', JSON.stringify(corridaAtiva));

        // Sincroniza com o localStorage do passageiro
        let passageiroCorrida = JSON.parse(localStorage.getItem('corridaSolicitada'));
        if (passageiroCorrida && passageiroCorrida.passageiroId === corridaAtiva.passageiroId) {
            passageiroCorrida.status = "finalizada";
            passageiroCorrida.valorFinal = corridaAtiva.valorFinal; 
            localStorage.setItem('corridaSolicitada', JSON.stringify(passageiroCorrida));
            console.log("   Status do passageiro atualizado para 'finalizada'.");
        }

        console.log("   Status da corrida do motorista atualizado para 'finalizada'.");
        alert(`Corrida Finalizada! Valor: R$ ${corridaAtiva.valorFinal}`);

        // Remove a corrida ativa do motorista
        localStorage.removeItem('corridaAceitaMotorista');
        
        checkCorridaStatusMotorista(); 
    } else {
        console.warn("   Nenhuma corrida ativa ou status incorreto para 'finalizar corrida'.");
    }
}

// Funções auxiliares para exibir rotas no mapa do motorista
async function displayRouteToPassageiro(corridaData) {
    console.log("-> displayRouteToPassageiro: Iniciando.");
    if (!directionsServiceMotorista || !directionsRendererMotorista || !mapMotorista) {
        console.error("❌ Serviços de mapa do motorista NÃO inicializados para displayRouteToPassageiro.");
        return; 
    }
    const motoristaLocalizacaoAtual = JSON.parse(localStorage.getItem('motoristaLocalizacaoAtual'));
    if (!motoristaLocalizacaoAtual) {
        console.warn("⚠️ Localização do motorista não disponível para traçar rota até o passageiro.");
        statusMotoristaElement.textContent = "Erro: Localização do motorista não disponível.";
        statusMotoristaElement.style.display = 'block';
        return;
    }

    try {
        console.log("   Solicitando rota motorista -> passageiro:", {
            origin: motoristaLocalizacaoAtual,
            destination: corridaData.origemPassageiro
        });
        const request = {
            origin: new google.maps.LatLng(motoristaLocalizacaoAtual.lat, motoristaLocalizacaoAtual.lng),
            destination: corridaData.origemPassageiro, 
            travelMode: google.maps.TravelMode.DRIVING,
        };

        const response = await new Promise((resolve, reject) => {
            directionsServiceMotorista.route(request, (result, status) => {
                if (status === "OK") {
                    resolve(result);
                } else {
                    reject(new Error(`Directions Service failed: ${status}`));
                }
            });
        });

        directionsRendererMotorista.setDirections(response);
        console.log("✅ Rota motorista -> passageiro exibida com SUCESSO.");

        if (passageiroMarker) passageiroMarker.setMap(null); 
        passageiroMarker = new google.maps.Marker({
            position: response.routes[0].legs[0].end_location, 
            map: mapMotorista,
            title: "Local do Passageiro",
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/man.png',
                scaledSize: new google.maps.Size(32, 32)
            }
        });
        if (destinoMarker) { 
            destinoMarker.setMap(null);
            destinoMarker = null;
        }
        return response; // Retorna a rota para que possa ser salva se necessário

    } catch (error) {
        console.error("❌ ERRO na requisição de rota motorista -> passageiro (catch):", error);
        statusMotoristaElement.textContent = `Erro ao obter rota calculada: ${error.message}. Verifique o console (F12).`;
        statusMotoristaElement.style.display = 'block';
        directionsRendererMotorista.setDirections({ routes: [] });
        if (passageiroMarker) passageiroMarker.setMap(null);
        passageiroMarker = null;
        throw error; // Re-lança o erro para ser capturado por quem chamou
    }
}

async function displayRouteToDestino(corridaData) {
    console.log("-> displayRouteToDestino: Iniciando.");
    if (!directionsServiceMotorista || !directionsRendererMotorista || !mapMotorista) {
        console.error("❌ Serviços de mapa do motorista NÃO inicializados para displayRouteToDestino.");
        return;
    }
    const motoristaLocalizacaoAtual = JSON.parse(localStorage.getItem('motoristaLocalizacaoAtual'));
    if (!motoristaLocalizacaoAtual) {
        console.warn("⚠️ Localização do motorista não disponível para traçar rota até o destino.");
        statusMotoristaElement.textContent = "Erro: Localização do motorista não disponível.";
        statusMotoristaElement.style.display = 'block';
        return;
    }

    try {
        console.log("   Solicitando rota motorista -> destino:", {
            origin: motoristaLocalizacaoAtual,
            destination: corridaData.destinoFinal
        });
        const request = {
            origin: new google.maps.LatLng(motoristaLocalizacaoAtual.lat, motoristaLocalizacaoAtual.lng),
            destination: corridaData.destinoFinal, 
            travelMode: google.maps.TravelMode.DRIVING,
        };

        const response = await new Promise((resolve, reject) => {
            directionsServiceMotorista.route(request, (result, status) => {
                if (status === "OK") {
                    resolve(result);
                } else {
                    reject(new Error(`Directions Service failed: ${status}`));
                }
            });
        });

        directionsRendererMotorista.setDirections(response);
        console.log("✅ Rota motorista -> destino final exibida com SUCESSO.");

        if (passageiroMarker) { 
            passageiroMarker.setMap(null);
            passageiroMarker = null;
        }
        if (destinoMarker) destinoMarker.setMap(null); 
        destinoMarker = new google.maps.Marker({
            position: response.routes[0].legs[0].end_location, 
            map: mapMotorista,
            title: "Destino Final",
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(32, 32)
            }
        });
        return response; // Retorna a rota para que possa ser salva se necessário

    } catch (error) {
        console.error("❌ ERRO na requisição de rota motorista -> destino (catch):", error);
        statusMotoristaElement.textContent = `Erro ao obter rota calculada: ${error.message}. Verifique o console (F12).`;
        statusMotoristaElement.style.display = 'block';
        directionsRendererMotorista.setDirections({ routes: [] });
        if (destinoMarker) destinoMarker.setMap(null);
        destinoMarker = null;
        throw error; // Re-lança o erro
    }
}



