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
 * GLA University Mathura campus places.
 *
 * Accuracy rules (please keep them when editing):
 *  - Entries WITHOUT `approx` use coordinates taken from OpenStreetMap feature centres.
 *    Only these get permanent labels on the map.
 *  - Entries with `approx: true` have a real, published NAME (GLA / AISHE listings) but no
 *    verified coordinates yet. They are searchable and routable, are always shown as
 *    "approximate" in the UI, and are replaced automatically by exact OpenStreetMap
 *    coordinates when OSM has a feature with the same name. To make one exact, replace
 *    its lat/lon here and delete `approx: true`.
 */
const GIRLS_HOSTEL = [27.6034571, 77.5979109];
const BOYS_WINGS = [27.6038591, 77.5992022];

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const AB_COORDS = [
  [27.6058535, 77.5934114], [27.6061443, 77.5929219], [27.6061411, 77.5949034],
  [27.6055333, 77.5954272], [27.6052432, 77.595634], [27.6048194, 77.5959432],
  [27.6065157, 77.595524], [27.6063512, 77.5957426], [27.6029265, 77.5953981],
  [27.6032842, 77.5959404], [27.6031208, 77.5956856], [27.601781, 77.5968221],
];

// [name, lat, lon, category, extras]
const RAW_PLACES = [
  // Academic blocks (12 air-conditioned blocks; department-to-block mapping is intentionally not guessed)
  ...AB_COORDS.map(([lat, lon], i) => [`AB${i + 1} — Academic Block ${roman[i]}`, lat, lon, 'Academic blocks', { label: `AB${i + 1}`, popular: i < 3, subtitle: 'Academic block', aliases: [`AB ${roman[i]}`, `Academic Block ${i + 1}`] }]),
  ['I&J Block', 27.6040363, 77.6004804, 'Academic blocks', { subtitle: 'Academic / hostel area', popular: true, aliases: ['I and J Block', 'IJ Block'] }],
  ['Admin Block', 27.60565, 77.59305, 'Academic blocks', { approx: true, popular: true, subtitle: 'Administration', aliases: ['Administrative Block'] }],
  ['Central Library', 27.6054, 77.5939, 'Academic blocks', { approx: true, popular: true, subtitle: 'Study & research', aliases: ['Library'] }],
  ['Seminar / Conference Halls', 27.6057, 77.5942, 'Academic blocks', { approx: true, subtitle: 'Seminar complex', aliases: ['Conference Hall', 'Seminar Hall'] }],
  ['Auditorium', 27.6059, 77.5936, 'Other campus places', { approx: true, subtitle: 'Events' }],

  // Grounds & sports (names from GLA's Sports Ground page; KC / Ninad are mapped in OSM)
  ['K C Ground', 27.606379, 77.5942812, 'Grounds', { popular: true, subtitle: 'Sports', aliases: ['KC Ground', 'K C GROUND'] }],
  ['Ninad Ground', 27.6054066, 77.5946042, 'Grounds', { popular: true, subtitle: 'Sports' }],
  ['Cricket Ground', 27.6068, 77.5936, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Football Ground', 27.6072, 77.5945, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Basketball Court', 27.6061, 77.5938, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Volleyball Court', 27.6059, 77.594, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Badminton Court', 27.6057, 77.5937, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Athletics Track', 27.6065, 77.5948, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Lawn Tennis Court', 27.606, 77.5951, 'Grounds', { approx: true, subtitle: 'Sports', aliases: ['Lawn Tennis'] }],
  ['Handball Ground', 27.6063, 77.5945, 'Grounds', { approx: true, subtitle: 'Sports' }],
  ['Karate Ground', 27.6055, 77.5949, 'Grounds', { approx: true, subtitle: 'Sports' }],

  // Hostels — names from GLA's published hostel listings (4 girls' + 15 boys' hostels incl. Wings I–V).
  ['Girls Hostel', GIRLS_HOSTEL[0], GIRLS_HOSTEL[1], 'Hostels', { popular: true, subtitle: 'Girls hostel area', aliases: ['Girls Hostels'] }],
  ['Ganga Girls Hostel', 27.60364, 77.59769, 'Hostels', { approx: true, subtitle: 'Girls hostel', aliases: ['Ganga Hostel'] }],
  ['Yamuna Girls Hostel', 27.60364, 77.59813, 'Hostels', { approx: true, subtitle: 'Girls hostel', aliases: ['Yamuna Hostel'] }],
  ['Godawri Girls Hostel', 27.60328, 77.59769, 'Hostels', { approx: true, subtitle: 'Girls hostel', aliases: ['Godawari Hostel', 'Godavari Hostel', 'Godawari Girls Hostel'] }],
  ['K.C. Girls Hostel', 27.60328, 77.59813, 'Hostels', { approx: true, subtitle: 'Girls hostel (Kalpana Chawla)', aliases: ['Kalpana Chawla Hostel', 'Kalpan Chawla Hostel', 'KC Girls Hostel'] }],
  ['Boys Hostel Wings', BOYS_WINGS[0], BOYS_WINGS[1], 'Hostels', { popular: true, subtitle: 'Boys hostel area (Wings I–V)', aliases: ['Boys Wings', 'Boys Hostel'] }],
  ['Boys Hostel Wing I', 27.60398, 77.59884, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Wing I'] }],
  ['Boys Hostel Wing II', 27.60398, 77.59902, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Wing II'] }],
  ['Boys Hostel Wing III', 27.60398, 77.5992, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Wing III'] }],
  ['Boys Hostel Wing IV', 27.60398, 77.59938, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Wing IV'] }],
  ['Boys Hostel Wing V', 27.60398, 77.59956, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Wing V'] }],
  ['F Block Hostel', 27.6035, 77.5986, 'Hostels', { approx: true, subtitle: 'Boys hostel' }],
  ['G Block Hostel', 27.6035, 77.59885, 'Hostels', { approx: true, subtitle: 'Boys hostel' }],
  ['H Block Hostel', 27.6035, 77.5991, 'Hostels', { approx: true, subtitle: 'Boys hostel' }],
  ['Boys Hostel I — Sarvapalli Radha Krishnan', 27.6041, 77.6004, 'Hostels', { approx: true, subtitle: 'Boys hostel (I Block)', aliases: ['I Block Hostel', 'Boys Hostel I'] }],
  ['Boys Hostel J — Hari Das Agrawal', 27.60398, 77.60058, 'Hostels', { approx: true, subtitle: 'Boys hostel (J Block)', aliases: ['J Block Hostel', 'Boys Hostel J'] }],
  ['The Street', 27.6039, 77.6001, 'Hostels', { approx: true, subtitle: 'Boys hostel (800-room street-style complex)', aliases: ['The Street Hostel'] }],
  ['X Block Hostel', 27.60328, 77.5995, 'Hostels', { approx: true, subtitle: 'Boys hostel' }],
  ['Sir Visvesvaraya Hostel', 27.6033, 77.5987, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Sir Vishveshwaraya Hostel', 'Visvesvaraya Hostel'] }],
  ['C.V. Raman Hostel', 27.6033, 77.599, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['CV Raman Hostel'] }],
  ['Dr. Rajendra Prasad Hostel', 27.6033, 77.5993, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Rajendra Prasad Hostel'] }],
  ['Shyama Prasad Mukherji Hostel', 27.6031, 77.5988, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['SP Mukherji Hostel'] }],
  ['Pt. Lokmani Sharma Hostel', 27.6031, 77.59915, 'Hostels', { approx: true, subtitle: 'Boys hostel', aliases: ['Lokmani Sharma Hostel'] }],

  // Food & dining
  ['GLA Canteen', 27.6050264, 77.5927952, 'Food & dining', { popular: true, subtitle: 'Food & dining', aliases: ['Main Canteen', 'GLA CANTEEN', 'Canteen'] }],
  ['C Block Mess', 27.6052, 77.5938, 'Food & dining', { approx: true, subtitle: 'Mess' }],
  ["Wing's Mess", 27.6038, 77.5995, 'Food & dining', { approx: true, subtitle: 'Mess', aliases: ['Wings Mess'] }],
  ['GD Subway', 27.6045404, 77.5971517, 'Food & dining', { popular: true, subtitle: 'Food court' }],
  ['I&J Mess', 27.6035092, 77.6004372, 'Food & dining', { subtitle: 'Mess' }],

  // Health & services
  ['Dispensary / Aarogyam', 27.6069072, 77.5948829, 'Health', { popular: true, subtitle: 'Health', aliases: ['Dispensary', 'Aarogyam', 'Medical'] }],
  ['Bank & ATM', 27.6052, 77.5932, 'Other campus places', { approx: true, subtitle: 'Services', aliases: ['ATM', 'Bank'] }],
  ['Main Gate', 27.6075, 77.592, 'Other campus places', { approx: true, popular: true, subtitle: 'Campus entrance', aliases: ['Gate', 'Entrance'] }],
  ['Parking Area', 27.6068, 77.5925, 'Other campus places', { approx: true, subtitle: 'Parking' }],
  ['Student Activity Centre', 27.6047, 77.5941, 'Other campus places', { approx: true, subtitle: 'Student life', aliases: ['SAC'] }],
];

const LABEL_PRIORITY = { Hostels: 0, 'Academic blocks': 1, 'Food & dining': 2, Health: 2, Grounds: 3 };

export const FALLBACK_FEATURES = RAW_PLACES.map(([name, lat, lon, category, extra = {}]) => ({
  id: `campus-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  rawName: extra.label || name.split(' — ')[0].split(' (')[0].trim(),
  lat,
  lon,
  category,
  subtitle: extra.subtitle || category,
  aliases: extra.aliases || [],
  popular: Boolean(extra.popular),
  approx: Boolean(extra.approx),
  labelPriority: LABEL_PRIORITY[category] ?? 4,
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
  source: 'GLA campus names + OpenStreetMap',
};

/** All curated places (exact and approximate). */
export const CAMPUS_PLACES = FALLBACK_FEATURES;
/** Only verified-coordinate places get permanent labels on the map. */
export const labelablePlaces = (places) => places.filter((place) => place.campusLikely && !place.approx);

const ROMAN_VALUE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

/** Normalises names so "ab 3", "AB-3", "Academic Block 3" and "ab iii" all match "AB3". */
export function normalizeName(value) {
  let text = String(value || '').toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[—–]/g, ' ')
    .replace(/\bacademic\s*block[\s-]*(\d+|[ivx]+)\b/g, (_, n) => `ab${ROMAN_VALUE[n] || n}`)
    .replace(/\bab[\s-]*(\d+|[ivx]+)\b/g, (_, n) => `ab${ROMAN_VALUE[n] || n}`)
    .replace(/\bwing[\s-]*(\d+|[ivx]+)\b/g, (_, n) => `wing${ROMAN_VALUE[n] || n}`)
    .replace(/\bc\.?\s*v\.?\s*raman\b/g, 'cv raman')
    .replace(/\b(dr|pt|sir)\b\.?/g, ' ')
    .replace(/\b(hostel|hostels|block|the|of|gla|university)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return text;
}

function placeKeys(place) {
  return [place.name, place.rawName, ...(place.aliases || [])].map(normalizeName).filter(Boolean);
}

/** Ranked local search over campus places. Returns [{ place, score }]. */
export function searchCampusPlaces(text, places = CAMPUS_PLACES, limit = 6) {
  const q = normalizeName(text);
  if (!q) {
    // Generic words such as "hostel" or "block" normalise away; fall back to a plain substring match.
    const raw = String(text || '').toLowerCase().trim();
    if (raw.length < 2) return [];
    return places
      .filter((place) => place.name.toLowerCase().includes(raw) || place.category.toLowerCase().includes(raw))
      .slice(0, limit)
      .map((place) => ({ place, score: 30 }));
  }
  const tokens = q.split(' ');
  const ranked = [];
  for (const place of places) {
    let best = 0;
    for (const key of placeKeys(place)) {
      if (key === q) best = Math.max(best, 100);
      else if (key.startsWith(q)) best = Math.max(best, 80);
      else if (key.split(' ').some((word) => word.startsWith(q))) best = Math.max(best, 60);
      else if (key.includes(q)) best = Math.max(best, 45);
      else if (tokens.length > 1 && tokens.every((token) => key.includes(token))) best = Math.max(best, 40);
    }
    if (best) ranked.push({ place, score: best - (place.approx ? 1 : 0) });
  }
  return ranked.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name)).slice(0, limit);
}

/** The single confident match for typed text, or null. */
export function findCampusPlace(text, places = CAMPUS_PLACES) {
  const [top, second] = searchCampusPlaces(text, places, 2);
  if (!top || top.score < 60) return null;
  if (second && second.score === top.score && top.score < 100) return null; // ambiguous prefix, let the user choose
  return top.place;
}

function categoryFor(tags, name, campusLikely) {
  if (!campusLikely) return 'Nearby / verify';
  const text = name.toLowerCase();
  if (/^ab\s*(\d+|ii|iii)$/i.test(name) || /block|institute|department|polytechnic|library|admin/i.test(text)) return 'Academic blocks';
  if (/hostel|boys wings|the street|\bwing\s*[ivx\d]+\b|ganga|yamuna|godawri|godawari|godavari|sarvapalli|hari das|kalpan|k\.c\. girls/i.test(text) || tags.tourism === 'hostel' || tags.guest_house === 'hostel') return 'Hostels';
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
      || /^(ab\s|ab\d|boys wings|girls hostel|i&j|kc ground|ninad ground|main canteen|gd subway|dispans?ery|ganga|yamuna|godawri|godawari|godavari|sarvapalli|hari das|kalpan|k\.c\. girls|wing\s*[ivx\d]+|[fghx] block|[ij] block)/i.test(rawName);

    let name = rawName;
    if (/^ab\s*ii$/i.test(rawName)) name = 'AB2 — Academic Block II';
    if (/^dispans?ery$/i.test(rawName)) name = 'Dispensary / Aarogyam';
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

function mergeWithFallback(osmPlaces) {
  // Curated entries own the display name; an OpenStreetMap feature with the same (normalised)
  // name or alias supplies exact coordinates and clears the "approximate" flag.
  const merged = FALLBACK_FEATURES.map((place) => ({ ...place }));
  const keyToIndex = new Map();
  merged.forEach((place, index) => placeKeys(place).forEach((key) => { if (!keyToIndex.has(key)) keyToIndex.set(key, index); }));

  for (const osm of osmPlaces) {
    const keys = [osm.rawName, osm.name].map(normalizeName).filter(Boolean);
    const hit = keys.map((key) => keyToIndex.get(key)).find((index) => index !== undefined);
    if (hit === undefined) {
      merged.push({ aliases: [], approx: false, popular: false, subtitle: osm.category, labelPriority: 4, ...osm });
      continue;
    }
    merged[hit] = {
      ...merged[hit],
      lat: osm.lat,
      lon: osm.lon,
      approx: false,
      osmType: osm.osmType,
      osmId: osm.osmId,
      tags: osm.tags || merged[hit].tags,
    };
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
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
      source: 'OpenStreetMap + GLA curated',
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
