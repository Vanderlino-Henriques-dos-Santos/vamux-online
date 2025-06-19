import { MAPS_API_KEY } from './google-maps-key.js';

export function carregarGoogleMaps(callbackName = 'initMapPassageiro') {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&region=BR&language=pt-BR&callback=${callbackName}`;
  script.defer = true;
  script.async = true;
  document.head.appendChild(script);
}
