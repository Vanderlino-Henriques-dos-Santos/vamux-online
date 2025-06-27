import { app } from './firebase-config.js';
import { getDatabase, ref, push, onValue } from 'firebase/database';

const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
script.async = true;
document.head.appendChild(script);

let map, directionsService, directionsRenderer;
let origemInput, destinoInput, statusMensagem, btnChamar, dadosMotorista;
let origemFinal, destinoFinal, distanciaFinal, valorFinal;

window.initMap = () => {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  map = new google.maps.Map(document.getElementById("mapa"), {
    zoom: 14,
    center: { lat: -23.5, lng: -46.6 },
  });
  directionsRenderer.setMap(map);
};

document.addEventListener('DOMContentLoaded', () => {
  origemInput = document.getElementById('origem');
  destinoInput = document.getElementById('destino');
  statusMensagem = document.getElementById('statusMensagem');
  btnChamar = document.getElementById('btnChamarCorrida');
  dadosMotorista = document.getElementById('dadosMotorista');

  document.getElementById('btnCalcular').addEventListener('click', calcularEstimativa);
  btnChamar.addEventListener('click', () => {
    salvarCorrida(origemFinal, destinoFinal, distanciaFinal, valorFinal);
    btnChamar.style.display = 'none';
  });

  document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  escutarAtualizacaoCorrida();
});

function calcularEstimativa() {
  const origem = origemInput.value.trim();
  const destino = destinoInput.value.trim();

  if (!origem || !destino) {
    mostrarMensagem('Preencha origem e destino.', 'erro');
    return;
  }

  const request = {
    origin: origem,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      const distanciaTexto = result.routes[0].legs[0].distance.text;
      const distanciaKm = parseFloat(result.routes[0].legs[0].distance.value) / 1000;
      const valorEstimado = (distanciaKm * 3.5).toFixed(2);

      mostrarMensagem(`Distância: ${distanciaTexto} | Valor estimado: R$ ${valorEstimado}`, 'sucesso');

      // Armazena para envio posterior
      origemFinal = origem;
      destinoFinal = destino;
      distanciaFinal = distanciaKm;
      valorFinal = valorEstimado;

      btnChamar.style.display = 'block';
    } else {
      mostrarMensagem('Erro ao calcular rota.', 'erro');
    }
  });
}

function salvarCorrida(origem, destino, distanciaKm, valorEstimado) {
  const db = getDatabase(app);
  const corridaRef = ref(db, 'corridas');
  const idPassageiro = localStorage.getItem('uid');
  const nomePassageiro = localStorage.getItem('nome') || 'Passageiro';

  const novaCorrida = {
    origem,
    destino,
    distanciaKm,
    valorEstimado,
    status: 'pendente',
    idPassageiro,
    nomePassageiro,
    timestamp: Date.now(),
  };

  push(corridaRef, novaCorrida)
    .then(() => {
      mostrarMensagem('Corrida solicitada! Aguardando motorista...', 'sucesso');
    })
    .catch((error) => {
      console.error(error);
      mostrarMensagem('Erro ao solicitar corrida.', 'erro');
    });
}

function escutarAtualizacaoCorrida() {
  const db = getDatabase(app);
  const corridasRef = ref(db, 'corridas');
  const idPassageiro = localStorage.getItem('uid');

  onValue(corridasRef, (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const corrida = childSnapshot.val();

      if (corrida.idPassageiro === idPassageiro) {
        if (corrida.status === 'aceita') {
          mostrarMensagem('Corrida aceita! Motorista a caminho.', 'sucesso');
          dadosMotorista.style.display = 'block';
          dadosMotorista.innerHTML = `
            <strong>Motorista:</strong> ${corrida.nomeMotorista || 'N/A'}<br>
            <strong>Veículo:</strong> ${corrida.veiculo || 'N/A'}<br>
            <strong>Placa:</strong> ${corrida.placa || 'N/A'}
          `;
        } else if (corrida.status === 'recusada') {
          mostrarMensagem('Corrida recusada pelo motorista. Tente novamente.', 'erro');
        } else if (corrida.status === 'finalizada') {
          mostrarMensagem('Corrida finalizada. Obrigado por usar o VAMUX!', 'sucesso');
          setTimeout(() => window.location.reload(), 3000);
        }
      }
    });
  });
}

function mostrarMensagem(msg, tipo) {
  statusMensagem.textContent = msg;
  statusMensagem.style.color = tipo === 'erro' ? 'red' : 'green';
}
