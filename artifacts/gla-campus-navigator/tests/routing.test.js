import test from 'node:test';
import assert from 'node:assert/strict';
import { dijkstra, haversine, nearestGraphNode, graphInstructions } from '../src/routing-core.js';

function graphFromEdges(nodes, edges) {
  const nodeMap = new Map(nodes.map(([id, lat, lon]) => [id, { id, lat, lon }]));
  const adj = new Map();
  for (const [a, b, weight] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ id: b, weight });
    adj.get(b).push({ id: a, weight });
  }
  return { nodes: nodeMap, adj };
}

test('Dijkstra returns the lowest-distance path, not the fewest-edge path', () => {
  const graph = graphFromEdges([['A', 0, 0], ['B', 0, 0.001], ['C', 0.001, 0], ['D', 0.001, 0.001]], [
    ['A', 'B', 10], ['B', 'D', 10], ['A', 'C', 2], ['C', 'D', 2],
  ]);
  assert.deepEqual(dijkstra(graph, 'A', 'D'), ['A', 'C', 'D']);
});

test('Dijkstra handles same-point routes', () => {
  const graph = graphFromEdges([['A', 0, 0]], []);
  assert.deepEqual(dijkstra(graph, 'A', 'A'), ['A']);
});

test('Dijkstra reports disconnected points', () => {
  const graph = graphFromEdges([['A', 0, 0], ['B', 1, 1]], []);
  assert.throws(() => dijkstra(graph, 'A', 'B'), /not connected/);
});

test('nearest path node enforces maximum snap distance', () => {
  const graph = graphFromEdges([['A', 27.605, 77.594], ['B', 27.605, 77.595]], [['A', 'B', 100]]);
  assert.equal(nearestGraphNode([27.605, 77.594], graph).node.id, 'A');
  assert.throws(() => nearestGraphNode([28, 78], graph), /No mapped walking path/);
});

test('distance and directions return useful values', () => {
  assert.ok(haversine([27.605, 77.594], [27.605, 77.595]) > 90);
  const steps = graphInstructions([[27.605, 77.594], [27.605, 77.595]]);
  assert.equal(steps[0].text, 'Start walking along the mapped path');
  assert.match(steps.at(-1).text, /arrived/);
});

import { projectOnRoute, trimRoute, polylineLength } from '../src/routing-core.js';

test('live navigation: remaining distance shrinks and the passed part of the route is trimmed', () => {
  const route = [[27.6, 77.59], [27.6, 77.591], [27.601, 77.591], [27.601, 77.592]];
  const total = polylineLength(route);
  const early = projectOnRoute([27.60003, 77.5905], route, 0);
  const later = projectOnRoute([27.6005, 77.59102], route, early.index);
  assert.ok(early.remaining < total && later.remaining < early.remaining);
  assert.ok(early.offRoute < 10);
  assert.equal(trimRoute(route, later).length, 3);
  assert.deepEqual(trimRoute(route, later).at(-1), route.at(-1));
});

test('live navigation: far-away positions are reported as off-route', () => {
  const route = [[27.6, 77.59], [27.6, 77.591]];
  assert.ok(projectOnRoute([27.603, 77.595], route, 0).offRoute > 100);
});
