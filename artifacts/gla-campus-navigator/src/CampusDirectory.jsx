import { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, Check, ChevronRight, ExternalLink, Footprints, Hospital, MapPin, RefreshCw, Search, Trees, Utensils, X } from 'lucide-react';
import {
  FALLBACK_CAMPUS_INDEX,
  OFFICIAL_SOURCES,
  OFFICIAL_SPORTS,
  OFFICIAL_TOURS,
  loadCampusIndex,
  normalizeName,
} from './campus-directory-data.js';
import './campus-directory.css';

const FILTERS = ['All', 'Academic blocks', 'Hostels', 'Grounds', 'Food & dining', 'Health', 'Virtual tours', 'Nearby / verify'];

function categoryIcon(category) {
  if (category === 'Academic blocks') return Building2;
  if (category === 'Hostels') return Building2;
  if (category === 'Grounds') return Trees;
  if (category === 'Food & dining') return Utensils;
  if (category === 'Health') return Hospital;
  if (category === 'Virtual tours') return Activity;
  return MapPin;
}

function googleMapsUrl(item) {
  const query = item.lat != null && item.lon != null
    ? `${item.lat},${item.lon}`
    : (item.mapsQuery || `${item.name}, GLA University, Mathura`);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function CampusDirectory({ onClose, onSelectPlace }) {
  const [index, setIndex] = useState(FALLBACK_CAMPUS_INDEX);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  async function refresh(forceRefresh = false) {
    setLoading(true);
    setError('');
    try {
      const next = await loadCampusIndex({ forceRefresh });
      setIndex(next);
      if (next.refreshError) setError(`Showing saved public map data. Refresh failed: ${next.refreshError}`);
    } catch (cause) {
      setError(cause.message || 'The public campus map directory could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(false);
  }, []);

  const records = useMemo(() => {
    const mapped = (index.places || []).map((place) => ({
      id: place.id,
      name: place.name,
      rawName: place.rawName,
      category: place.category,
      lat: place.lat,
      lon: place.lon,
      campusLikely: place.campusLikely,
      approx: Boolean(place.approx),
      detail: place.approx ? place.subtitle : undefined,
      source: place.approx ? 'GLA published name' : 'OpenStreetMap',
      url: place.osmType && place.osmId
        ? `https://www.openstreetmap.org/${place.osmType}/${place.osmId}`
        : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${place.name} GLA University`)}`,
      tags: place.tags,
    }));
    const known = new Set((index.places || []).map((place) => normalizeName(place.name)));
    const sports = OFFICIAL_SPORTS
      .filter((place) => ![...known].some((key) => key && (key === normalizeName(place.name) || key.startsWith(normalizeName(place.name)))))
      .map((place) => ({
        id: `gla-sport-${place.name}`,
        ...place,
        campusLikely: true,
        sourceUrl: OFFICIAL_SOURCES.sports,
        locationMissing: true,
      }));
    const tours = OFFICIAL_TOURS.map((tour) => ({
      id: `gla-tour-${tour.name}`,
      ...tour,
      campusLikely: true,
      source: 'GLA official virtual tour',
    }));
    return [...mapped, ...sports, ...tours];
  }, [index]);

  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((item) => {
      const matchesFilter = filter === 'All' || (filter === 'Nearby / verify'
        ? !item.campusLikely
        : item.category === filter);
      const matchesSearch = !q || `${item.name} ${item.category} ${item.rawName || ''} ${item.detail || ''}`.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filter, records, search]);

  function openGoogleMaps(event, item) {
    event.stopPropagation();
    window.open(googleMapsUrl(item), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="campus-directory-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="campus-directory" role="dialog" aria-modal="true" aria-labelledby="campus-directory-title">
        <header className="campus-directory-header">
          <div className="campus-directory-brand">
            <span className="campus-directory-mark"><MapPin size={18}/></span>
            <div>
              <h2 id="campus-directory-title">GLA Campus Directory</h2>
              <p>Blocks, hostels, grounds, services &amp; official virtual tours</p>
            </div>
          </div>
          <button className="campus-directory-close" aria-label="Close campus directory" onClick={onClose}><X size={20}/></button>
        </header>

        <div className="campus-directory-summary">
          <div><b>110 acres</b><span>GLA-published campus overview</span></div>
          <div><b>19 hostels</b><span>15 boys’ · 4 girls’ (published count)</span></div>
          <div><b>{index.places?.filter((place) => place.campusLikely).length || 0} campus names</b><span>{index.stale ? 'Saved public map snapshot' : 'Publicly named OSM features'}</span></div>
        </div>

        <div className="campus-directory-body">
          <main className="campus-directory-listing">
            <div className="campus-directory-list-title">
              <div><h3>Places and facilities</h3><span>{visibleRecords.length} results</span></div>
              <button className="campus-refresh" onClick={() => refresh(true)} disabled={loading} aria-label="Refresh public map places" title="Refresh places from OpenStreetMap">
                <RefreshCw size={16} className={loading ? 'campus-refresh-spinning' : ''}/><span>{loading ? 'Updating…' : 'Refresh map data'}</span>
              </button>
            </div>

            <label className="campus-directory-search">
              <Search size={17}/>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search AB blocks, hostels, grounds…" aria-label="Search campus places"/>
            </label>

            <div className="campus-directory-filters" role="group" aria-label="Filter campus directory">
              {FILTERS.map((item) => (
                <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>

            {error && <div className="campus-directory-alert" role="status">{error}</div>}
            {index.unnamedBuildingCount > 0 && (
              <div className="campus-directory-alert muted">
                {index.unnamedBuildingCount} building footprint(s) have no public name in OpenStreetMap. Their outlines remain visible on the map, but a name or pin cannot be verified from public data.
              </div>
            )}

            <div className="campus-directory-results">
              {visibleRecords.map((item) => {
                const Icon = categoryIcon(item.category);
                const mappable = Number.isFinite(item.lat) && Number.isFinite(item.lon);
                const Row = mappable ? 'button' : 'article';
                return (
                  <Row
                    key={item.id}
                    className={`campus-directory-row${mappable ? ' mapped' : ''}`}
                    onClick={mappable ? () => { onSelectPlace(item); onClose(); } : undefined}
                    type={mappable ? 'button' : undefined}
                  >
                    <span className={`campus-directory-icon ${item.category.toLowerCase().replace(/[^a-z]+/g, '-')}`}><Icon size={16}/></span>
                    <span className="campus-directory-copy">
                      <b>{item.name}</b>
                      <small>{item.category}{item.rawName && item.rawName !== item.name ? ` · map label: ${item.rawName}` : ''}</small>
                      {item.detail && <small className="campus-directory-detail">{item.detail}</small>}
                      {item.approx && <small className="campus-directory-missing">≈ Approximate location — official name is confirmed, exact map pin is not verified yet.</small>}
                      {item.locationMissing && <small className="campus-directory-missing">No individual public map pin — showing the official listing, not a guessed location.</small>}
                      {!item.campusLikely && <small className="campus-directory-missing">Nearby public map feature; campus membership needs verification.</small>}
                    </span>
                    <span className="campus-directory-actions">
                      {(item.url || item.sourceUrl) && <a href={item.url || item.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} title="Open source record"><ExternalLink size={14}/><span>{item.source === 'GLA official virtual tour' ? '360 tour' : 'Source'}</span></a>}
                      <button type="button" onClick={(event) => openGoogleMaps(event, item)} title="Search this place in Google Maps"><MapPin size={14}/><span>Google Maps</span></button>
                    </span>
                    {mappable && <ChevronRight className="campus-directory-chevron" size={16}/>}
                  </Row>
                );
              })}
              {!visibleRecords.length && !loading && <div className="campus-directory-empty">No public directory entry matches that search.</div>}
            </div>
          </main>

          <aside className="campus-directory-aside">
            <section className="campus-source-card hostel-source-card">
              <div className="campus-source-heading"><Building2 size={16}/><b>Hostel coverage</b></div>
              <p>All 4 girls’ hostels (Ganga, Yamuna, Godawari, Kalpana Chawla) and the boys’ hostels (F–J &amp; X Blocks, Wings I–V and the named hostels) are listed. Hostel names come from GLA’s published listings; pins marked ≈ are approximate until OpenStreetMap maps the exact building.</p>
              <a href={OFFICIAL_SOURCES.hostel} target="_blank" rel="noreferrer">GLA hostel details <ExternalLink size={13}/></a>
            </section>
            <section className="campus-source-card">
              <div className="campus-source-heading"><Footprints size={16}/><b>Campus overview &amp; resources</b></div>
              <a href={OFFICIAL_SOURCES.overview} target="_blank" rel="noreferrer">GLA campus overview <ExternalLink size={13}/></a>
              <a href={OFFICIAL_SOURCES.tour} target="_blank" rel="noreferrer">All official virtual tours <ExternalLink size={13}/></a>
              <a href={OFFICIAL_SOURCES.sports} target="_blank" rel="noreferrer">Sports ground facilities <ExternalLink size={13}/></a>
              <a href={OFFICIAL_SOURCES.medical} target="_blank" rel="noreferrer">Aarogyam medical facility <ExternalLink size={13}/></a>
            </section>
            <section className="campus-source-card campus-map-note">
              <div className="campus-source-heading"><Check size={16}/><b>Map data &amp; accuracy</b></div>
              <p>Building names and footprints are from OpenStreetMap and may be incomplete. Selecting a building uses its mapped feature center—not a verified entrance. 3D heights are map estimates, not an official architectural survey.</p>
              <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Suggest a map correction <ExternalLink size={13}/></a>
            </section>
          </aside>
        </div>

        <footer className="campus-directory-footer">
          <span>{index.source || 'Public map data'}{index.updatedAt ? ` · Updated ${new Date(index.updatedAt).toLocaleString()}` : ''}{index.stale ? ' · saved snapshot' : ''}</span>
          <span>Public maps do not confirm every entrance, hostel boundary, or path status.</span>
        </footer>
      </section>
    </div>
  );
}

export default CampusDirectory;
