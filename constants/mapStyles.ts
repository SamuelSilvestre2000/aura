/** Tema claro com tons azulados (substitui o verde padrão do Google Maps). */
export const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#e4ecf4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6d82' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f0f4f8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a5f78' }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#9ec3e8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6a8fb5' }] },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#d8e6f2' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#e8eef5' }],
  },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c2d9ec' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#c5d4e3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d6e3f0' }] },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#a8bdd4' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a2438' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c2a4a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3b6a9e' }] },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#1e2d45' }],
  },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#243352' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#152238' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d4266' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a3050' }] },
];
