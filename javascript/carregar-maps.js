export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function carregarGoogleMaps(callbackName) {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&region=BR&language=pt-BR&callback=${callbackName}`;
  script.defer = true;
  script.async = true;
  document.head.appendChild(script);
}

export default carregarGoogleMaps;
