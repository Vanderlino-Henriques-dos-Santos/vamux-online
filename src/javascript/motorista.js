import { app } from './firebase-config.js';
import { getDatabase, ref, onValue, update } from 'firebase/database';

const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
script.async = true;
document.head.appendChild(script);

let map;
let directionsService;
let directionsRenderer;
let corridaAtual = null;
let keyCorrida = null;

window.initMap = () => {
  const sp = { lat: -23.5, lng: -46.6 };
  map = new google.maps.Map(document.getElementById("mapa"), {
    center: sp,
    zoom: 14,
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  document.getElementById('btnAceitar').addEventListener('click', aceitarCorrida);
  document.getElementById('btnRecusar').addEventListener('click', recusarCorrida);
  document.getElementById('btnFinalizar').addEventListener('click', finalizarCorrida);

  escutarCorridas();
});

function escutarCorridas() {
  const db = getDatabase(app);
  const corridasRef = ref(db, 'corridas');

  onValue(corridasRef, (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const corrida = childSnapshot.val();
      const status = corrida.status;
      const key = childSnapshot.key;

      if (status === 'pendente') {
        corridaAtual = corrida;
        keyCorrida = key;

        const nomePassageiro = corrida.nomePassageiro || 'Passageiro';

        mostrarMensagem(`🚕 Corrida encontrada:
Origem: ${corrida.origem}
Destino: ${corrida.destino}
Valor: R$ ${corrida.valorEstimado}
Passageiro: ${nomePassageiro}`, 'sucesso');

        document.getElementById('botoesAcao').style.display = 'flex';
        desenharRota(corrida.origem, corrida.destino);
      } else if (status === 'aceita' && corrida.idMotorista === localStorage.getItem('uid')) {
        mostrarMensagem('Corrida em andamento. Clique para finalizar quando terminar.', 'sucesso');
        document.getElementById('btnFinalizar').style.display = 'block';
        document.getElementById('botoesAcao').style.display = 'none';
        desenharRota(corrida.origem, corrida.destino);
        corridaAtual = corrida;
        keyCorrida = key;
      }
    });
  });
}

function aceitarCorrida() {
  if (!keyCorrida || !corridaAtual) return;

  const db = getDatabase(app);
  const corridaRef = ref(db, `corridas/${keyCorrida}`);

  const nomeMotorista = localStorage.getItem('nome') || 'Motorista';
  const veiculo = localStorage.getItem('veiculo') || 'Veículo não informado';
  const placa = localStorage.getItem('placa') || 'Placa não informada';

  update(corridaRef, {
    status: 'aceita',
    idMotorista: localStorage.getItem('uid'),
    nomeMotorista,
    veiculo,
    placa
  }).then(() => {
    mostrarMensagem('Corrida aceita! Rota traçada até o passageiro.', 'sucesso');
    document.getElementById('botoesAcao').style.display = 'none';
  }).catch((error) => {
    console.error(error);
    mostrarMensagem('Erro ao aceitar corrida.', 'erro');
  });
}

function recusarCorrida() {
  if (!keyCorrida) return;

  const db = getDatabase(app);
  const corridaRef = ref(db, `corridas/${keyCorrida}`);

  update(corridaRef, {
    status: 'recusada'
  }).then(() => {
    mostrarMensagem('Corrida recusada. Aguardando outra...', 'erro');
    resetarTela();
  }).catch((error) => {
    console.error(error);
    mostrarMensagem('Erro ao recusar corrida.', 'erro');
  });
}

function finalizarCorrida() {
  if (!keyCorrida) return;

  const db = getDatabase(app);
  const corridaRef = ref(db, `corridas/${keyCorrida}`);

  update(corridaRef, {
    status: 'finalizada'
  }).then(() => {
    mostrarMensagem('Corrida finalizada com sucesso!', 'sucesso');
    document.getElementById('btnFinalizar').style.display = 'none';
    setTimeout(() => window.location.reload(), 2000);
  }).catch((error) => {
    console.error(error);
    mostrarMensagem('Erro ao finalizar corrida.', 'erro');
  });
}

function desenharRota(origem, destino) {
  const request = {
    origin: origem,
    destination: destino,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
    } else {
      mostrarMensagem('Erro ao traçar rota.', 'erro');
    }
  });
}

function mostrarMensagem(msg, tipo) {
  const div = document.getElementById('mensagemCorrida');
  div.textContent = msg;
  div.style.color = tipo === 'erro' ? 'red' : 'green';
}

function resetarTela() {
  corridaAtual = null;
  keyCorrida = null;
  directionsRenderer.set('directions', null);
  document.getElementById('botoesAcao').style.display = 'none';
}
