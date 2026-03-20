export const GOOGLE_MAP_DARK_STYLE = [
  // Base land — deep dark navy
  { elementType: 'geometry',            stylers: [{ color: '#0A0B10' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#8b96c5' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#0A0B10' }] },

  // Roads — gold to match concept art
  { featureType: 'road',                elementType: 'geometry',            stylers: [{ color: '#1e1a0e' }] },
  { featureType: 'road',                elementType: 'geometry.stroke',     stylers: [{ color: '#C8A84E' }, { weight: 0.8 }] },
  { featureType: 'road',                elementType: 'labels.text.fill',    stylers: [{ color: '#C8A84E' }] },
  { featureType: 'road.highway',        elementType: 'geometry',            stylers: [{ color: '#2a2308' }] },
  { featureType: 'road.highway',        elementType: 'geometry.stroke',     stylers: [{ color: '#E6C989' }, { weight: 1.2 }] },
  { featureType: 'road.highway',        elementType: 'labels.text.fill',    stylers: [{ color: '#E6C989' }] },
  { featureType: 'road.arterial',       elementType: 'geometry.stroke',     stylers: [{ color: '#A08038' }, { weight: 0.6 }] },
  { featureType: 'road.local',          elementType: 'geometry.stroke',     stylers: [{ color: '#7a6028' }, { weight: 0.4 }] },

  // Water — deep navy blue
  { featureType: 'water',               elementType: 'geometry',            stylers: [{ color: '#0d1520' }] },
  { featureType: 'water',               elementType: 'labels.text.fill',    stylers: [{ color: '#4a6080' }] },

  // Landscape
  { featureType: 'landscape',           elementType: 'geometry',            stylers: [{ color: '#0d0f18' }] },
  { featureType: 'landscape.natural',   elementType: 'geometry',            stylers: [{ color: '#0a0f14' }] },

  // Administrative boundaries — subtle
  { featureType: 'administrative',      elementType: 'geometry.stroke',     stylers: [{ color: '#1f2535' }, { weight: 0.6 }] },
  { featureType: 'administrative',      elementType: 'labels.text.fill',    stylers: [{ color: '#6b7aaa' }] },

  // Hide POI and transit (kept clean)
  { featureType: 'poi',                 stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',             stylers: [{ visibility: 'off' }] },
];
