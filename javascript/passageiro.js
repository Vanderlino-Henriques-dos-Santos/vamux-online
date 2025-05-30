// javascript/passageiro.js

import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { app } from "./firebase-config.js";

console.log("🥳 Arquivo passageiro.js carregado!");

const database = getDatabase(app);

let map;
let directionsService;
let directionsRenderer;
let marcadorPassageiro;
let autocompletePartida;
let autocompleteDestino;

// Variável para armazenar o valor calculado da corrida
let valorEstimadoCorrida = 0; // Inicializa com 0

window.initMap = function () {
  console.log("📍 initMap foi chamada pelo Google Maps API.");

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    console.error("❌ Erro: Elemento #map não encontrado no HTML!");
    document.getElementById("mensagemStatus").textContent = "Erro: Elemento do mapa não encontrado.";
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const localPassageiro = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("✅ Localização do passageiro obtida:", localPassageiro);

        map = new google.maps.Map(mapDiv, {
          zoom: 13,
          center: localPassageiro,
        });

        directionsRenderer.setMap(map);

        marcadorPassageiro = new google.maps.Marker({
          position: localPassageiro,
          map: map,
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          title: "Você (Passageiro)",
        });

        const inputPartida = document.getElementById("partida");
        const inputDestino = document.getElementById("destino");

        if (inputPartida && inputDestino) {
          autocompletePartida = new google.maps.places.Autocomplete(inputPartida);
          autocompleteDestino = new google.maps.places.Autocomplete(inputDestino);
          console.log("✅ Autocompletes de partida e destino inicializados.");
        } else {
          console.warn("⚠️ Campos de input 'partida' ou 'destino' não encontrados para autocomplete.");
        }

      },
      (error) => {
        console.error("❌ Erro ao obter geolocalização:", error);
        document.getElementById("mensagemStatus").textContent = "Erro ao obter sua localização. O mapa pode estar centralizado em São Paulo.";
        const defaultCenter = { lat: -23.55052, lng: -46.633308 }; 
        map = new google.maps.Map(mapDiv, {
          zoom: 13,
          center: defaultCenter,
        });
        directionsRenderer.setMap(map);

        const inputPartida = document.getElementById("partida");
        const inputDestino = document.getElementById("destino");

        if (inputPartida && inputDestino) {
          autocompletePartida = new google.maps.places.Autocomplete(inputPartida);
          autocompleteDestino = new google.maps.places.Autocomplete(inputDestino);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  } else {
    console.warn("⚠️ Geolocalização não suportada pelo navegador.");
    document.getElementById("mensagemStatus").textContent = "Seu navegador não suporta geolocalização. O mapa pode estar centralizado em São Paulo.";
    const defaultCenter = { lat: -23.55052, lng: -46.633308 }; 
    map = new google.maps.Map(mapDiv, {
      zoom: 13,
      center: defaultCenter,
    });
    directionsRenderer.setMap(map);

    const inputPartida = document.getElementById("partida");
    const inputDestino = document.getElementById("destino");

    if (inputPartida && inputDestino) {
      autocompletePartida = new google.maps.places.Autocomplete(inputPartida);
      autocompleteDestino = new google.maps.places.Autocomplete(inputDestino);
    }
  }
};

// --- Funções de Lógica da Corrida ---

window.calcularCorrida = function () {
  console.log("➡️ Botão 'Calcular Corrida' clicado.");
  const partida = document.getElementById("partida").value;
  const destino = document.getElementById("destino").value;
  const mensagemStatus = document.getElementById("mensagemStatus");
  const infoCorrida = document.getElementById("infoCorrida");

  if (!partida || !destino) {
    mensagemStatus.textContent = "Por favor, digite o local de partida e destino.";
    mensagemStatus.style.color = "orange";
    console.warn("⚠️ Campos de partida/destino vazios.");
    infoCorrida.innerHTML = ""; // Limpa info anterior
    valorEstimadoCorrida = 0; // Reseta valor
    return;
  }

  const request = {
    origin: partida,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
      const route = result.routes[0].legs[0];
      const distanciaTexto = route.distance.text; // Ex: "115 km"
      const duracaoTexto = route.duration.text;   // Ex: "1 hora 44 minutos"
      
      // Extrair apenas o número da distância em km para cálculo
      const distanciaKm = parseFloat(distanciaTexto.replace(' km', '').replace(',', '.')); // "115 km" -> 115

      // LÓGICA DE CÁLCULO DO VALOR DA CORRIDA
      // Preços de exemplo (ajuste conforme a necessidade do seu projeto)
      const precoPorKm = 2.50; // R$ 2.50 por km
      const precoPorMinuto = 0.50; // R$ 0.50 por minuto (se a duração for um fator)
      const taxaBase = 5.00; // Taxa de início de corrida

      // Para calcular duração em minutos de forma mais precisa, você pode usar route.duration.value (em segundos)
      const duracaoSegundos = route.duration.value;
      const duracaoMinutos = duracaoSegundos / 60;

      valorEstimadoCorrida = (taxaBase + (distanciaKm * precoPorKm) + (duracaoMinutos * precoPorMinuto)).toFixed(2);
      
      infoCorrida.innerHTML = `
        <p>Distância: ${distanciaTexto}</p>
        <p>Duração Estimada: ${duracaoTexto}</p>
        <p><strong>Valor Estimado: R$ ${valorEstimadoCorrida}</strong></p>
      `;
      mensagemStatus.textContent = "Cálculo da corrida realizado!";
      mensagemStatus.style.color = "green";
      console.log("✅ Rota calculada com sucesso:", { distancia: distanciaTexto, duracao: duracaoTexto, valor: valorEstimadoCorrida });
    } else {
      console.error("❌ Erro ao calcular rota:", status);
      mensagemStatus.textContent = `Erro ao calcular rota: ${status}. Verifique os endereços.`;
      mensagemStatus.style.color = "red";
      infoCorrida.innerHTML = ""; // Limpa info
      valorEstimadoCorrida = 0; // Reseta valor
    }
  });
};

window.chamarCorrida = function () {
  console.log("📞 Botão 'Chamar Corrida' clicado.");
  const partida = document.getElementById("partida").value;
  const destino = document.getElementById("destino").value;
  const mensagemStatus = document.getElementById("mensagemStatus");
  const infoCorrida = document.getElementById("infoCorrida"); // Para pegar os dados exibidos

  // Certificar-se que a corrida foi calculada e os valores estão disponíveis
  if (valorEstimadoCorrida === 0 || !partida || !destino || infoCorrida.innerHTML === "") {
    mensagemStatus.textContent = "Por favor, calcule a corrida e verifique os endereços antes de chamar.";
    mensagemStatus.style.color = "orange";
    console.warn("⚠️ Tentativa de chamar corrida sem cálculo prévio ou campos vazios.");
    return;
  }

  // Extrair distância e duração diretamente do HTML para garantir consistência
  const distanciaTexto = infoCorrida.querySelector("p:nth-child(1)").textContent.replace("Distância: ", "");
  const duracaoTexto = infoCorrida.querySelector("p:nth-child(2)").textContent.replace("Duração Estimada: ", "");

  // Salvar a corrida no Firebase
  const novaCorridaRef = push(ref(database, "corridas"));
  set(novaCorridaRef, {
    passageiroId: "ID_DO_PASSAGEIRO_AQUI", // 🚨 Lembre-se de substituir pelo ID real do usuário logado
    localPartida: partida,
    localDestino: destino,
    distancia: distanciaTexto, // Salvando o texto completo
    duracao: duracaoTexto,     // Salvando o texto completo
    valor: valorEstimadoCorrida, // Salvando o valor calculado
    status: "aguardando_motorista", // Status correto para o motorista buscar
    timestamp: new Date().toISOString(),
  })
    .then(() => {
      mensagemStatus.textContent = "🚗 Corrida solicitada! Aguardando motorista...";
      mensagemStatus.style.color = "blue";
      console.log("✅ Corrida salva no Firebase:", { partida, destino, valor: valorEstimadoCorrida });
      // Opcional: Limpar campos após chamar ou desabilitar botões
      // document.getElementById("partida").value = "";
      // document.getElementById("destino").value = "";
      // infoCorrida.innerHTML = "";
    })
    .catch((error) => {
      console.error("❌ Erro ao salvar corrida no Firebase:", error);
      mensagemStatus.textContent = `Erro ao solicitar corrida: ${error.message}`;
      mensagemStatus.style.color = "red";
    });
};

// ... (restante do código para autenticação, se houver) ...