// javascript/carregar-maps.js

// Importa a chave de API que vem do arquivo google-maps-key.js
import { MAPS_API_KEY } from './google-maps-key.js';

// Esta função (initMap) será chamada pelo Google Maps API quando estiver carregada e pronta.
// É globalmente acessível porque é anexada a window.
window.initMap = function() {
    // Certifique-se de que 'map' é o ID da sua div no HTML onde o mapa será exibido.
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -23.55052, lng: -46.63330 }, // Exemplo: São Paulo (ajuste para o centro desejado)
        zoom: 12, // Nível de zoom inicial
    });

    // Você pode adicionar aqui qualquer outra lógica do mapa, como marcadores,
    // serviços de autocompletar, direções, etc.
    // Exemplo de um marcador simples:
    // const marker = new google.maps.Marker({
    //     position: { lat: -23.55052, lng: -46.63330 },
    //     map: map,
    //     title: 'Meu Ponto!'
    // });
};

// Função para criar e adicionar a tag script da API do Google Maps ao <head> do HTML.
// Esta função é exportada caso você precise chamá-la de outro módulo,
// mas ela também é chamada diretamente no final deste arquivo.
export function carregarGoogleMaps() {
    const script = document.createElement('script');
    // A chave de API é inserida na URL.
    // O parâmetro '&callback=initMap' é crucial para que a API saiba qual função chamar
    // no seu código JavaScript quando estiver totalmente carregada.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&callback=initMap`;
    script.defer = true; // Carrega o script em segundo plano e executa após o HTML ser parseado
    script.async = true; // Carrega o script de forma assíncrona, não bloqueia o parseamento do HTML
    document.head.appendChild(script); // Adiciona o script ao <head> do documento
}

// CHAMA a função para carregar o Google Maps assim que este script for executado.
// Isso garante que o script da API do Google Maps seja injetado no HTML
// e a função initMap seja registrada.
carregarGoogleMaps();