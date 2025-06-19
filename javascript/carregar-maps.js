// javascript/carregar-maps.js
import { MAPS_API_KEY } from './google-maps-key.js';

export function carregarGoogleMaps() {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
  script.defer = true;
  document.head.appendChild(script);
}
