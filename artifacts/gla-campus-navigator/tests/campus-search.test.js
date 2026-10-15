import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPUS_PLACES, findCampusPlace, labelablePlaces, searchCampusPlaces } from '../src/campus-directory-data.js';

const names = CAMPUS_PLACES.map((place) => place.name);

test('every published GLA hostel name is present', () => {
  for (const hostel of ['Ganga Girls Hostel', 'Yamuna Girls Hostel', 'Godawri Girls Hostel', 'K.C. Girls Hostel', 'F Block Hostel', 'G Block Hostel', 'H Block Hostel', 'Boys Hostel I — Sarvapalli Radha Krishnan', 'Boys Hostel J — Hari Das Agrawal', 'The Street', 'X Block Hostel', 'C.V. Raman Hostel', 'Dr. Rajendra Prasad Hostel', 'Shyama Prasad Mukherji Hostel', 'Pt. Lokmani Sharma Hostel', 'Sir Visvesvaraya Hostel']) {
    assert.ok(names.includes(hostel), `${hostel} missing`);
  }
  for (const wing of ['I', 'II', 'III', 'IV', 'V']) assert.ok(names.includes(`Boys Hostel Wing ${wing}`));
});

test('invented placeholder names are gone', () => {
  for (const bad of ['Girls Hostel 1', 'Girls Hostel 2', 'Boys Hostel A', 'Sports Arena', 'Hostel Mess (Boys)', 'PG / Staff Quarters', 'Temple', 'Medical Centre']) {
    assert.ok(!names.includes(bad), `${bad} should not exist`);
  }
});

test('place ids are unique and every place has valid coordinates', () => {
  assert.equal(new Set(CAMPUS_PLACES.map((place) => place.id)).size, CAMPUS_PLACES.length);
  for (const place of CAMPUS_PLACES) assert.ok(Number.isFinite(place.lat) && Number.isFinite(place.lon), place.name);
});

test('unverified coordinates never get permanent map labels', () => {
  const labelled = labelablePlaces(CAMPUS_PLACES);
  assert.ok(labelled.length > 0 && labelled.every((place) => !place.approx));
  assert.ok(!labelled.some((place) => place.name === 'Ganga Girls Hostel'));
});

test('typed text resolves to the right place', () => {
  assert.equal(findCampusPlace('ab3').rawName, 'AB3');
  assert.equal(findCampusPlace('AB-12').rawName, 'AB12');
  assert.equal(findCampusPlace('academic block 5').rawName, 'AB5');
  assert.equal(findCampusPlace('godavari').name, 'Godawri Girls Hostel');
  assert.equal(findCampusPlace('ganga hostel').name, 'Ganga Girls Hostel');
  assert.equal(findCampusPlace('kc ground').name, 'K C Ground');
  assert.equal(findCampusPlace('main canteen').name, 'GLA Canteen');
  assert.equal(findCampusPlace('kalpana chawla').name, 'K.C. Girls Hostel');
  assert.equal(findCampusPlace('wing iv').name, 'Boys Hostel Wing IV');
  assert.equal(findCampusPlace('girls hostel').name, 'Girls Hostel');
  assert.equal(findCampusPlace('ab'), null); // ambiguous: user must choose
  assert.ok(searchCampusPlaces('hostel', CAMPUS_PLACES, 5).length === 5);
});
