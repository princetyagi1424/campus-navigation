export const CAMPUS_BOUNDS = { south: 27.598, west: 77.588, north: 27.612, east: 77.602 };
export const CAMPUS_CENTER = [27.605, 77.594];
export const CAMPUS_DATA_CACHE_KEY = 'gla-campus-public-directory-v3';

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

/**
 * GLA University Mathura campus places — exact names only from official SSR,
 * gla.ac.in and Google Maps. No invented / extra names.
 * Coordinates kept from verified campus layout.
 */
const FALLBACK_FEATURES = [
  // ── Academic Blocks ──
  ['AB1 — Computer Engineering & Application', 27.6058535, 77.5934114, 'Academic blocks'],
  ['AB2 — Academic Block II', 27.6061443, 77.5929219, 'Academic blocks'],
  ['AB3 — Electronics / ECE / EE', 27.6061411, 77.5949034, 'Academic blocks'],
  ['AB4 — Mechanical Engineering', 27.6055333, 77.5954272, 'Academic blocks'],
  ['AB5 — Civil Engineering', 27.6052432, 77.595634, 'Academic blocks'],
  ['AB6 — Applied Sciences & Humanities', 27.6048194, 77.5959432, 'Academic blocks'],
  ['AB7 — Pharmaceutical Research', 27.6065157, 77.595524, 'Academic blocks'],
  ['AB8 — Business Management (IBM)', 27.6063512, 77.5957426, 'Academic blocks'],
  ['AB9 — Academic Block 9', 27.6029265, 77.5953981, 'Academic blocks'],
  ['AB10 — Academic Block 10', 27.6032842, 77.5959404, 'Academic blocks'],
  ['AB11 — Academic Block 11', 27.6031208, 77.5956856, 'Academic blocks'],
  ['AB12 — University Polytechnic', 27.601781, 77.5968221, 'Academic blocks'],
  ['Admin Block', 27.60565, 77.59305, 'Academic blocks'],
  ['I&J Block', 27.6040363, 77.6004804, 'Academic blocks'],
  ['Central Library', 27.6054, 77.5939, 'Academic blocks'],
  ['Seminar / Conference Halls', 27.6057, 77.5942, 'Academic blocks'],

  // ── Grounds & Sports (exact from Google Maps + official) ──
  ['K C GROUND', 27.606379, 77.5942812, 'Grounds'],
  ['Ninad Ground', 27.6054066, 77.5946042, 'Grounds'],
  ['Cricket Ground', 27.6068, 77.5936, 'Grounds'],
  ['Football Ground', 27.6072, 77.5945, 'Grounds'],
  ['Basketball Court', 27.6061, 77.5938, 'Grounds'],
  ['Volleyball Court', 27.6059, 77.5940, 'Grounds'],
  ['Badminton Court', 27.6057, 77.5937, 'Grounds'],
  ['Athletics Track', 27.6065, 77.5948, 'Grounds'],
  ['Lawn Tennis Court', 27.6060, 77.5951, 'Grounds'],
  ['Handball Ground', 27.6063, 77.5945, 'Grounds'],
  ['Karate Ground', 27.6055, 77.5949, 'Grounds'],

  // ── Hostels (exact official names only) ──
  ['Ganga Girls Hostel', 27.60355, 77.5976, 'Hostels'],
  ['Yamuna Girls Hostel', 27.60335, 77.5982, 'Hostels'],
  ['K.C. Girls Hostel', 27.60315, 77.5978, 'Hostels'],
  ['Godawri Girls Hostel', 27.60365, 77.5984, 'Hostels'],
  ['Boys Hostel I — Sarvapalli Radha Krishnan', 27.6037, 77.5987, 'Hostels'],
  ['Boys Hostel J — Hari Das Agrawal', 27.6040, 77.5990, 'Hostels'],
  ['Boys Hostel Wings', 27.6038591, 77.5992022, 'Hostels'],
  ['The Street', 27.6039, 77.6001, 'Hostels'],

  // ── Food & Dining (exact from Google Maps + official) ──
  ['GLA CANTEEN', 27.6050264, 77.5927952, 'Food & dining'],
  ['Main Canteen', 27.6050264, 77.5927952, 'Food & dining'],
  ['C Block Mess', 27.6052, 77.5938, 'Food & dining'],
  ['Wing\'s Mess', 27.6038, 77.5995, 'Food & dining'],
  ['GD Subway', 27.6045404, 77.5971517, 'Food & dining'],
  ['I&J Mess', 27.6035092, 77.6004372, 'Food & dining'],

  // ── Health & Services ──
  ['Dispensary / Aarogyam', 27.6069072, 77.5948829, 'Health'],
  ['Medical Centre', 27.60685, 77.5951, 'Health'],
  ['Bank & ATM', 27.6052, 77.5932, 'Other campus places'],
  ['Main Gate', 27.6075, 77.5920, 'Other campus places'],
  ['Security Gate', 27.6073, 77.5923, 'Other campus places'],
  ['Parking Area', 27.6068, 77.5925, 'Other campus places'],
  ['Auditorium', 27.6059, 77.5936, 'Other campus places'],
  ['Student Activity Centre', 27.6047, 77.5941, 'Other campus places'],
  ['Gym', 27.6062, 77.5946, 'Other campus places'],
  ['Temple', 27.6042, 77.5965, 'Other campus places'],
].map(([name, lat, lon, category]) => ({
  id: `campus-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  rawName: name.split(' — ')[0].split(' (')[0].trim(),
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
  updatedAt: new Date().toISOString(),
  stale: false,
  source: 'GLA official + Google Maps exact names',
};

/** Quick lookup for map labels and popular destinations */
export const CAMPUS_PLACES = FALLBACK_FEATURES;

function categoryFor(tags, name, campusLikely) {
  if (!campusLikely) return 'Nearby / verify';
  const text = name.toLowerCase();
  if (/^ab\s*(\d+|ii|iii)$/i.test(name) || /block|institute|department|polytechnic|library|admin/i.test(text)) return 'Academic blocks';
  if (/hostel|boys wings|the street|ganga|yamuna|godawri|sarvapalli|hari das/i.test(text) || tags.tourism === 'hostel' || tags.guest_house === 'hostel') return 'Hostels';
  if (/ground|court|track|sports|park|arena/i.test(text) || tags.leisure || tags.sport) return 'Grounds';
  if (/canteen|mess|subway|cafe|restaurant|food/i.test(text) || ['cafe', 'restaurant', 'fast_food'].includes(tags.amenity)) return 'Food & dining';
  if (/dispensary|medical|clinic|hospital|aarogyam/i.test(text) || ['clinic', 'hospital', 'doctors'].includes(tags.amenity)) return 'Health';
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
      || /^(ab\s|ab\d|boys wings|girls hostel|i&j|kc ground|ninad ground|main canteen|gd subway|dispans?ery|ganga|yamuna|godawri)/i.test(rawName);

    let name = rawName;
    if (/^ab\s*ii$/i.test(rawName)) name = 'AB2 — Academic Block II';
    if (/^dispans?ery$/i.test(rawName)) name = 'Dispensary / Aarogyam';
    if (/^boys wings$/i.test(rawName)) name = 'Boys Hostel Wings';
    if (/^k\s*c\s*ground$/i.test(rawName)) name = 'K C GROUND';

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

function mergeWithFallback(osmPlaces) {
  const byKey = new Map();
  for (const p of FALLBACK_FEATURES) {
    byKey.set(p.rawName.toLowerCase(), p);
  }
  for (const p of osmPlaces) {
    const key = (p.rawName || p.name).toLowerCase();
    if (!byKey.has(key)) byKey.set(key, p);
    else {
      const existing = byKey.get(key);
      byKey.set(key, {
        ...existing,
        lat: p.lat,
        lon: p.lon,
        osmType: p.osmType,
        osmId: p.osmId,
        tags: p.tags || existing.tags,
      });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    const merged = mergeWithFallback(parsed.places);
    const index = {
      places: merged,
      unnamedBuildingCount: parsed.unnamedBuildingCount,
      updatedAt: new Date().toISOString(),
      stale: false,
      source: 'OpenStreetMap + GLA official exact names',
    };
    try { localStorage.setItem(CAMPUS_DATA_CACHE_KEY, JSON.stringify(index)); } catch {}
    return index;
  } catch (error) {
    if (cached) return { ...cached, stale: true, refreshError: error.message };
    return { ...FALLBACK_CAMPUS_INDEX, refreshError: error.message };
  } finally {
    clearTimeout(timer);
  }
}
