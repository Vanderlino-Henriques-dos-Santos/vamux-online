// javascript/motorista.js

import { getDatabase, ref, onValue, update, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { app } from "./firebase-config.js";

console.log("🚗 Arquivo motorista.js carregado!");

const database = getDatabase(app);

let map;
let directionsService;
let directionsRenderer;
let marcadorMotorista = null; // Marcador da posição do motorista
let corridaAtivaId = null; // ID da corrida que o motorista aceitou (substitui corridaPendenteId)
let corridaAtivaDetalhes = null; // Detalhes completos da corrida ativa
let motoristaLocalizacaoAtual = null; // Armazena a última localização conhecida do motorista (coordenadas lat/lng)

// Função initMap é chamada pelo Google Maps API
window.initMap = function () {
    console.log("📍 initMap foi chamada pelo Google Maps API.");

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const mapDiv = document.getElementById("map");
    if (!mapDiv) {
        console.error("❌ Erro: Elemento #map não encontrado no HTML do motorista!");
        document.getElementById("mensagemStatus").textContent = "Erro: Elemento do mapa não encontrado.";
        return;
    }

    // Tenta obter a localização atual do motorista
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                motoristaLocalizacaoAtual = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                console.log("✅ Localização do motorista obtida:", motoristaLocalizacaoAtual);

                map = new google.maps.Map(mapDiv, {
                    zoom: 14,
                    center: motoristaLocalizacaoAtual,
                });

                directionsRenderer.setMap(map);

                marcadorMotorista = new google.maps.Marker({
                    position: motoristaLocalizacaoAtual,
                    map: map,
                    icon: "http://maps.google.com/mapfiles/ms/icons/car.png", // Ícone de carro
                    title: "Sua Posição (Motorista)",
                });

                exibirMensagemStatus("Mapa carregado com sua localização.", "green");

            },
            (error) => {
                console.error("❌ Erro ao obter geolocalização do motorista:", error);
                exibirMensagemStatus("Erro ao obter sua localização. Mapa centralizado em SP.", "orange");
                // Fallback para uma localização padrão se a geolocalização falhar
                const defaultCenter = { lat: -23.55052, lng: -46.633308 };
                map = new google.maps.Map(mapDiv, {
                    zoom: 13,
                    center: defaultCenter,
                });
                directionsRenderer.setMap(map);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        console.warn("⚠️ Geolocalização não suportada pelo navegador do motorista.");
        exibirMensagemStatus("Geolocalização não suportada. Mapa centralizado em SP.", "orange");
        // Fallback para uma localização padrão se a geolocalização não for suportada
        const defaultCenter = { lat: -23.55052, lng: -46.633308 };
        map = new google.maps.Map(mapDiv, {
            zoom: 13,
            center: defaultCenter,
        });
        directionsRenderer.setMap(map);
    }
};

// Exibe ou atualiza mensagens de status na UI
function exibirMensagemStatus(texto, cor = "white") {
    const mensagem = document.getElementById('mensagemStatus');
    if (mensagem) {
        mensagem.innerHTML = texto;
        mensagem.style.color = cor;
    }
}

// Quando o motorista clica em "Ficar Online"
window.ficarOnline = function () {
    console.log("🟢 Motorista ficou online. Buscando corridas...");
    exibirMensagemStatus("🟡 Buscando corridas disponíveis...", "yellow");

    // Limpa qualquer rota ou informações de corrida anterior
    directionsRenderer.set('directions', null);
    document.getElementById('infoCorrida').innerHTML = ""; 
    corridaAtivaId = null;
    corridaAtivaDetalhes = null;


    // Consulta apenas corridas com status 'aguardando_motorista'
    const corridasQuery = query(ref(database, 'corridas'), orderByChild('status'), equalTo('aguardando_motorista'));

    // Escuta as corridas em tempo real
    onValue(corridasQuery, (snapshot) => {
        const dadosCorridas = snapshot.val();
        
        // Se já houver uma corrida ativa sendo exibida ou aceita, não mostra novas para evitar sobreposição
        if (corridaAtivaId && corridaAtivaDetalhes && (corridaAtivaDetalhes.status === "aceita_pelo_motorista" || corridaAtivaDetalhes.status === "aguardando_motorista")) {
            console.log("ℹ️ Já há uma corrida ativa. Ignorando novas notificações por enquanto.");
            return;
        }

        if (dadosCorridas) {
            const corridasDisponiveis = Object.entries(dadosCorridas);

            if (corridasDisponiveis.length > 0) {
                // Pega a primeira corrida disponível para simplificar por enquanto.
                // Em um app real, você listaria várias ou aplicaria filtros de proximidade.
                const [id, corrida] = corridasDisponiveis[0];
                
                // Verifica se a corrida já foi processada ou aceita por outro motorista (concorrência)
                if (corrida.status !== "aguardando_motorista") {
                    console.log(`ℹ️ Corrida ${id} não está mais aguardando. Status: ${corrida.status}.`);
                    return; 
                }

                corridaAtivaId = id; // Armazena o ID da corrida para uso posterior
                corridaAtivaDetalhes = corrida; // Armazena os detalhes da corrida

                const info = `
                    <h3>Nova Corrida!</h3>
                    📍 Partida: ${corrida.localPartida}<br>
                    🎯 Destino: ${corrida.localDestino}<br>
                    🛣️ Distância: ${corrida.distancia || 'N/A'}<br>
                    ⏳ Duração: ${corrida.duracao || 'N/A'}<br>
                    💰 Valor Estimado: R$ ${corrida.valor || 'N/A'}<br><br>
                    <button class="btn" onclick="aceitarCorrida()">Aceitar Corrida</button>
                `;
                document.getElementById('infoCorrida').innerHTML = info;
                exibirMensagemStatus("🚕 Corrida disponível! Analise e aceite.", "lime");
                console.log("✨ Corrida encontrada:", corrida);

                // Opcional: Desenhar a rota da localização atual do motorista até o ponto de partida do passageiro
                if (motoristaLocalizacaoAtual && corrida.localPartida) {
                    calcularRotaParaPassageiro(motoristaLocalizacaoAtual, corrida.localPartida);
                }

            } else {
                exibirMensagemStatus("🟡 Nenhuma corrida disponível no momento.", "orange");
                document.getElementById('infoCorrida').innerHTML = "";
                corridaAtivaId = null;
                corridaAtivaDetalhes = null;
            }
        } else {
            exibirMensagemStatus("🟡 Nenhuma corrida disponível no momento.", "orange");
            document.getElementById('infoCorrida').innerHTML = "";
            corridaAtivaId = null;
            corridaAtivaDetalhes = null;
        }
    });
};

// Quando o motorista clica em "Aceitar Corrida"
window.aceitarCorrida = function () {
    if (!corridaAtivaId) {
        console.warn("🚫 Nenhuma corrida ativa para aceitar.");
        exibirMensagemStatus("Nenhuma corrida para aceitar.", "orange");
        return;
    }

    const corridaRef = ref(database, 'corridas/' + corridaAtivaId);
    update(corridaRef, { status: "aceita_pelo_motorista" }) // Novo status mais claro
        .then(() => {
            exibirMensagemStatus("🚗 Corrida aceita! Partindo para buscar passageiro.", "green");
            console.log(`✅ Corrida ${corridaAtivaId} aceita pelo motorista.`);
            
            // Oculta o botão de aceitar e mostra o status da viagem
            document.getElementById('infoCorrida').innerHTML = `
                <h3>Corrida Aceita!</h3>
                <p>A caminho de ${corridaAtivaDetalhes.localPartida} para buscar o passageiro.</p>
                <p>Destino final: ${corridaAtivaDetalhes.localDestino}</p>
            `;

            // Desenha a rota do motorista até o destino FINAL da corrida (passando pelo passageiro)
            // Primeiro, rota do motorista até o passageiro.
            // Quando o motorista "pega" o passageiro, ele recalcula a rota para o destino final.
            // Por simplicidade, vamos desenhar a rota do motorista para o destino final, ASSUMINDO que ele pegará o passageiro.
            if (motoristaLocalizacaoAtual && corridaAtivaDetalhes.localDestino) {
                // Para uma implementação mais completa, você traçaria duas rotas:
                // 1. motoristaLocalizacaoAtual -> corridaAtivaDetalhes.localPartida
                // 2. corridaAtivaDetalhes.localPartida -> corridaAtivaDetalhes.localDestino
                // directionsService.route suporta waypoints, então poderia ser:
                const requestFinal = {
                    origin: motoristaLocalizacaoAtual,
                    destination: corridaAtivaDetalhes.localDestino,
                    waypoints: [{
                        location: corridaAtivaDetalhes.localPartida,
                        stopover: true // Indica que é uma parada
                    }],
                    travelMode: google.maps.TravelMode.DRIVING
                };

                directionsService.route(requestFinal, (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        directionsRenderer.setDirections(result);
                        console.log("✅ Rota completa (motorista -> passageiro -> destino final) calculada.");
                        const route = result.routes[0].legs[0]; // Primeiro trecho (motorista ao passageiro)
                        const distanciaPrimeiroTrecho = route.distance.text;
                        const duracaoPrimeiroTrecho = route.duration.text;
                        
                        document.getElementById('infoCorrida').innerHTML = `
                            <h3>Viagem Aceita!</h3>
                            <p>Indo buscar passageiro em: ${corridaAtivaDetalhes.localPartida}</p>
                            <p>Distância até passageiro: ${distanciaPrimeiroTrecho}</p>
                            <p>Duração até passageiro: ${duracaoPrimeiroTrecho}</p>
                            <button class="btn" onclick="iniciarViagem()">Iniciar Viagem</button>
                        `;
                        exibirMensagemStatus("🏁 Preparando para buscar passageiro...", "blue");

                    } else {
                        console.error("❌ Erro ao calcular rota completa:", status);
                        exibirMensagemStatus("Erro ao calcular rota completa da corrida.", "red");
                    }
                });
            }

            // Opcional: Começar a rastrear a localização do motorista e atualizá-la no Firebase
            // Para que o passageiro possa ver o motorista no mapa.
            // Isso envolveria usar navigator.geolocation.watchPosition e atualizar o Firebase em um nó de motoristas.

        })
        .catch((error) => {
            console.error("❌ Erro ao aceitar corrida no Firebase:", error);
            exibirMensagemStatus(`Erro ao aceitar corrida: ${error.message}`, "red");
        });
};

// Nova função: Quando o motorista clica em "Iniciar Viagem" (após pegar o passageiro)
window.iniciarViagem = function() {
    if (!corridaAtivaId) {
        exibirMensagemStatus("Nenhuma corrida ativa para iniciar.", "orange");
        return;
    }

    const corridaRef = ref(database, 'corridas/' + corridaAtivaId);
    update(corridaRef, { status: "em_viagem" })
        .then(() => {
            exibirMensagemStatus("🚀 Viagem iniciada! A caminho do destino final.", "green");
            console.log(`✅ Corrida ${corridaAtivaId} em andamento.`);
            // A rota já está exibida (motorista -> passageiro -> destino final)
            // Apenas atualiza a UI
            document.getElementById('infoCorrida').innerHTML = `
                <h3>Viagem em Andamento!</h3>
                <p>A caminho de ${corridaAtivaDetalhes.localDestino}</p>
                <button class="btn" onclick="finalizarCorrida()">Finalizar Corrida</button>
            `;
        })
        .catch((error) => {
            console.error("❌ Erro ao iniciar viagem no Firebase:", error);
            exibirMensagemStatus(`Erro ao iniciar viagem: ${error.message}`, "red");
        });
};


// Quando o motorista clica em "Finalizar Corrida"
window.finalizarCorrida = function () {
    if (!corridaAtivaId) {
        exibirMensagemStatus("Nenhuma corrida ativa para finalizar.", "orange");
        return;
    }

    const corridaRef = ref(database, 'corridas/' + corridaAtivaId);
    update(corridaRef, { status: "finalizada", dataFinalizacao: new Date().toISOString() })
        .then(() => {
            exibirMensagemStatus("🏁 Corrida finalizada com sucesso!", "green");
            console.log(`✅ Corrida ${corridaAtivaId} finalizada.`);
            directionsRenderer.set('directions', null); // Limpa a rota do mapa
            if (marcadorMotorista) {
                // Opcional: manter o marcador do motorista, apenas remover a rota
                // marcadorMotorista.setMap(null); // Remove o marcador
                // marcadorMotorista = null;
            }
            document.getElementById('infoCorrida').innerHTML = ""; // Limpa informações da corrida
            corridaAtivaId = null; // Reseta a corrida ativa
            corridaAtivaDetalhes = null;

            // Opcional: Redirecionar para uma tela de ganhos, ou voltar ao estado "online"
        })
        .catch((error) => {
            console.error("❌ Erro ao finalizar corrida no Firebase:", error);
            exibirMensagemStatus(`Erro ao finalizar corrida: ${error.message}`, "red");
        });
};