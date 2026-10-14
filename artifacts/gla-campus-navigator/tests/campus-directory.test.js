import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenStreetMapElements } from '../src/campus-directory-data.js';

test('OSM campus entries use feature centers and correct the visible AB II alias', () => {
  const result = parseOpenStreetMapElements([
    { type: 'way', id: 1, center: { lat: 27.606, lon: 77.593 }, tags: { name: 'AB II', building: 'university' } },
    { type: 'way', id: 2, center: { lat: 27.607, lon: 77.594 }, tags: { name: 'DISPANSERY', amenity: 'hospital' } },
    { type: 'way', id: 3, center: { lat: 27.608, lon: 77.595 }, tags: { name: 'Girls Hostel', tourism: 'hostel' } },
  ]);

  assert.equal(result.places.length, 3);
  assert.equal(result.places[0].name, 'AB2 — Academic Block II');
  assert.equal(result.places.find((place) => place.rawName === 'DISPANSERY').name, 'Dispensary / Aarogyam');
  assert.equal(result.places.find((place) => place.name === 'Girls Hostel').category, 'Hostels');
  assert.ok(result.places.every((place) => place.campusLikely));
});

test('directory skips roads and counts unnamed building footprints instead of inventing names', () => {
  const result = parseOpenStreetMapElements([
    { type: 'way', id: 1, center: { lat: 27.604, lon: 77.594 }, tags: { building: 'yes' } },
    { type: 'way', id: 2, center: { lat: 27.605, lon: 77.594 }, tags: { name: 'NH 44', highway: 'trunk' } },
    { type: 'way', id: 3, center: { lat: 27.606, lon: 77.595 }, tags: { name: 'KC GROUND', leisure: 'park' } },
    { type: 'way', id: 4, center: { lat: 27.7, lon: 77.7 }, tags: { name: 'Outside campus', building: 'yes' } },
  ]);

  assert.equal(result.unnamedBuildingCount, 1);
  assert.deepEqual(result.places.map((place) => place.name), ['KC GROUND']);
});

test('named public services without campus-specific tags are marked for verification', () => {
  const result = parseOpenStreetMapElements([
    { type: 'node', id: 1, lat: 27.602, lon: 77.592, tags: { name: 'Nearby Dhaba', amenity: 'restaurant' } },
  ]);

  assert.equal(result.places.length, 1);
  assert.equal(result.places[0].category, 'Nearby / verify');
  assert.equal(result.places[0].campusLikely, false);
});
