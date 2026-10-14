export const CAMPUS_BOUNDS = { south: 27.598, west: 77.588, north: 27.612, east: 77.602 };
export const CAMPUS_DATA_CACHE_KEY = 'gla-campus-public-directory-v1';

export const OFFICIAL_SOURCES = {
  overview: 'https://www.gla.ac.in/campus-life/overview',
  hostel: 'https://www.gla.ac.in/campus-life/hostel',
  sports: 'https://www.gla.ac.in/campus-life/sports-ground',
  medical: 'https://www.gla.ac.in/campus-life/aarogyam-medical-facilities',
  tour: 'https://www.gla.ac.in/virtual-tour',
};

export const OFFICIAL_TOURS = [
  { name: 'Department of Computer Engineering & Application', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/Dept.%20of%20Computer%20Science/_auto/html5/GLA_FIN.html' },
  { name: 'Admin Block', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/Administrative%20Block/_auto/html5/GLA_FIN.html' },
  { name: 'Institute of Pharmaceutical Research', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/Institute%20of%20Pharmaceutical%20Research/_auto/html5/GLA_FIN.html' },
  { name: 'Department of Mechanical Engineering', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/Mechanical%20Engineering/_auto/html5/GLA_FIN.html' },
  { name: 'Electronics, Communications & Electrical Engineering', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/EC-EE-dept/_auto/html5/GLA_FIN.html' },
  { name: 'Institute of Business Management', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/IBM/_auto/html5/GLA_FIN.html' },
  { name: 'Department of Civil Engineering', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/Dept.%20of%20Civil%20Engineering/_auto/html5/GLA_FIN.html' },
  { name: 'Institute of Applied Sciences & Humanities', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/Institute%20of%20Applied%20sciences/_auto/html5/GLA_FIN.html' },
  { name: 'Girls Hostel — virtual tour', category: 'Hostels', url: 'https://gla.ac.in/campus_tour/Girls_hostel/_auto/html5/GLA_FIN.html' },
  { name: 'Boys Hostel — virtual tour', category: 'Hostels', url: 'https://gla.ac.in/campus_tour/Boys_Hostel/_auto/html5/GLA_FIN.html' },
  { name: 'Sports Facilities — virtual tour', category: 'Grounds', url: 'https://gla.ac.in/campus_tour/Sports%20Facilities/_auto/html5/GLA_FIN.html' },
  { name: 'University Polytechnic', category: 'Academic blocks', url: 'https://gla.ac.in/campus_tour/University%20Polytechnic/_auto/html5/GLA_FIN.html' },
  { name: 'Other Facilities — virtual tour', category: 'Other facilities', url: 'https://gla.ac.in/campus_tour/Other%20Facilites/_auto/html5/GLA_FIN.html' },
  { name: 'GLA Complete Campus Tour', category: 'Virtual tours', url: 'https://gla.ac.in/campus_tour/GLA_complete_webversion/_auto/html5/GLA_FIN.html' },
];

export const OFFICIAL_SPORTS = [
  'Athletics Track',
  'Badminton Court',
  'Basketball Court',
  'Cricket Ground',
  'Football Ground',
  'Karate Ground',
  'Handball Ground',
  'Volleyball Court',
  'Chess Hall',
  'Table Tennis Hall',
  'Lawn Tennis',
].map((name) => ({ name, category: 'Grounds', source: 'GLA Sports Ground page' }));

const FALLBACK_FEATURES = [
  ['AB1', 27.6058535, 77.5934114, 'Academic blocks'],
  ['AB2 (mapped as AB II)', 27.6061443, 77.5929219, 'Academic blocks'],
  ['AB3', 27.6061411, 77.5949034, 'Academic blocks'],
  ['AB4', 27.6055333, 77.5954272, 'Academic blocks'],
  ['AB5', 27.6052432, 77.595634, 'Academic blocks'],
  ['AB6', 27.6048194, 77.5959432, 'Academic blocks'],
  ['AB7', 27.6065157, 77.595524, 'Academic blocks'],
  ['AB8', 27.6063512, 77.5957426, 'Academic blocks'],
  ['AB9', 27.6029265, 77.5953981, 'Academic blocks'],
  ['AB10', 27.6032842, 77.5959404, 'Academic blocks'],
  ['AB11', 27.6031208, 77.5956856, 'Academic blocks'],
  ['AB12', 27.601781, 77.5968221, 'Academic blocks'],
  ['KC Ground', 27.606379, 77.5942812, 'Grounds'],
  ['Ninad Ground', 27.6054066, 77.5946042, 'Grounds'],
  ['Girls Hostel', 27.6034571, 77.5979109, 'Hostels'],
  ['Boys Hostel Wings', 27.6038591, 77.5992022, 'Hostels'],
  ['I&J Block', 27.6040363, 77.6004804, 'Academic blocks'],
  ['I&J Mess', 27.6035092, 77.6004372, 'Food & dining'],
  ['Main Canteen', 27.6050264, 77.5927952, 'Food & dining'],
  ['GD Subway', 27.6045404, 77.5971517, 'Food & dining'],
  ['Dispensary', 27.6069072, 77.5948829, 'Health'],
].map(([name, lat, lon, category]) => ({
  id: `snapshot-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  rawName: ({
    'AB2 (mapped as AB II)': 'AB II',
    'Dispensary': 'DISPANSERY',
    'Boys Hostel Wings': 'BOYS WINGS',
  })[name] || name,
  lat,
  lon,
  category,
  campusLikely: true,
  osmType: null,
  osmId: null,
  tags: {},
}));

export const FALLBACK_CAMPUS_INDEX = {
  places: FALLBACK_FEATURES,
  unnamedBuildingCount: null,
  updatedAt: '2026-10-14T00:00:00.000Z',
  stale: true,
  source: 'OpenStreetMap snapshot',
};

function categoryFor(tags, name, campusLikely) {
  if (!campusLikely) return 'Nearby / verify';
  const text = name.toLowerCase();
  if (/^ab\s*(\d+|ii|iii)$/i.test(name) || /block|institute|department|polytechnic/i.test(text)) return 'Academic blocks';
  if (/hostel|boys wings/i.test(text) || tags.tourism === 'hostel' || tags.guest_house === 'hostel') return 'Hostels';
  if (/ground|court|track|sports|park/i.test(text) || tags.leisure || tags.sport) return 'Grounds';
  if (/canteen|mess|subway|cafe|restaurant|food/i.test(text) || ['cafe', 'restaurant', 'fast_food'].includes(tags.amenity)) return 'Food & dining';
  if (/dispensary|medical|clinic|hospital/i.test(text) || ['clinic', 'hospital', 'doctors'].includes(tags.amenity)) return 'Health';
  return 'Other campus places';
}

function withinBounds(lat, lon) {
  return lat >= CAMPUS_BOUNDS.south && lat <= CAMPUS_BOUNDS.north && lon >= CAMPUS_BOUNDS.west && lon <= CAMPUS_BOUNDS.east;
}

export function parseOpenStreetMapElements(elements) {
  const places = [];
  const seen = new Set();
  let unnamedBuildingCount = 0;

  for (const element of elements || []) {
    if (element.type === 'relation') continue;
    const tags = element.tags || {};
    const point = element.center || element;
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !withinBounds(lat, lon)) continue;
    if (tags.highway || tags.railway || tags.route || tags.waterway) continue;

    const rawName = (tags.name || tags['name:en'] || '').trim();
    if (!rawName && element.type === 'way' && tags.building) unnamedBuildingCount += 1;
    if (!rawName) continue;

    const dedupeKey = `${rawName.toLowerCase()}-${lat.toFixed(5)}-${lon.toFixed(5)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const campusLikely = tags.building === 'university'
      || tags.tourism === 'hostel'
      || tags.guest_house === 'hostel'
      || tags.leisure === 'park'
      || /^(ab\s|ab\d|boys wings|girls hostel|i&j|kc ground|ninad ground|main canteen|gd subway|dispans?ery)/i.test(rawName);

    let name = rawName;
    if (/^ab\s*ii$/i.test(rawName)) name = 'AB2 (mapped as AB II)';
    if (/^dispans?ery$/i.test(rawName)) name = 'Dispensary';
    if (/^boys wings$/i.test(rawName)) name = 'Boys Hostel Wings';

    places.push({
      id: `${element.type}-${element.id}`,
      name,
      rawName,
      lat,
      lon,
      category: categoryFor(tags, rawName, campusLikely),
      campusLikely,
      osmType: element.type,
      osmId: element.id,
      tags,
    });
  }

  places.sort((a, b) => {
    if (a.campusLikely !== b.campusLikely) return a.campusLikely ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { places, unnamedBuildingCount };
}

function readCache() {
  try {
    const value = JSON.parse(localStorage.getItem(CAMPUS_DATA_CACHE_KEY) || 'null');
    return value?.places?.length ? value : null;
  } catch {
    return null;
  }
}

async function requestOverpass(signal) {
  const { south, west, north, east } = CAMPUS_BOUNDS;
  const query = `[out:json][timeout:20];nwr(${south},${west},${north},${east})["name"];out center tags;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let lastError;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!response.ok) throw new Error(`OpenStreetMap directory request failed (${response.status}).`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') break;
    }
  }
  throw lastError || new Error('OpenStreetMap directory is temporarily unavailable.');
}

export async function loadCampusIndex({ forceRefresh = false } = {}) {
  const cached = readCache();
  const freshForMs = 6 * 60 * 60 * 1000;
  if (!forceRefresh && cached && Date.now() - Date.parse(cached.updatedAt) < freshForMs) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const data = await requestOverpass(controller.signal);
    const parsed = parseOpenStreetMapElements(data.elements);
    if (!parsed.places.length) throw new Error('No named places were returned for the campus map area.');
    const index = { ...parsed, updatedAt: new Date().toISOString(), stale: false, source: 'OpenStreetMap' };
    try { localStorage.setItem(CAMPUS_DATA_CACHE_KEY, JSON.stringify(index)); } catch {}
    return index;
  } catch (error) {
    if (cached) return { ...cached, stale: true, refreshError: error.message };
    if (FALLBACK_CAMPUS_INDEX.places.length) {
      return { ...FALLBACK_CAMPUS_INDEX, refreshError: error.message };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
