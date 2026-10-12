export const haversine = (a, b) => {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export function nodeDistance(a, b) { return haversine([a.lat, a.lon], [b.lat, b.lon]); }

export function nearestGraphNode(point, graph, maxDistance = 35) {
  let best = null, bestDistance = Infinity;
  for (const [id, node] of graph.nodes) {
    if (!graph.adj.has(id)) continue;
    const d = haversine(point, [node.lat, node.lon]);
    if (d < bestDistance) { bestDistance = d; best = node; }
  }
  if (!best || bestDistance > maxDistance) throw new Error(`No mapped walking path is within ${Math.round(maxDistance)} m of the selected point (nearest is ${Math.round(bestDistance)} m). Select a point closer to a visible path.`);
  return { node: best, connectorDistance: bestDistance };
}

// Dijkstra minimizes accumulated path length in metres rather than travel time.
export function dijkstra(graph, startId, endId) {
  if (startId === endId) return [startId];
  const distances = new Map([[startId, 0]]), previous = new Map(), visited = new Set();
  const heap = [];
  const push = item => {
    heap.push(item); let i = heap.length - 1;
    while (i > 0) { const p = Math.floor((i - 1) / 2); if (heap[p].distance <= item.distance) break; heap[i] = heap[p]; i = p; }
    heap[i] = item;
  };
  const pop = () => {
    if (!heap.length) return null;
    const root = heap[0], tail = heap.pop();
    if (heap.length) {
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= heap.length) break;
        if (child + 1 < heap.length && heap[child + 1].distance < heap[child].distance) child++;
        if (heap[child].distance >= tail.distance) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = tail;
    }
    return root;
  };
  push({ id: startId, distance: 0 });
  while (heap.length) {
    const current = pop();
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === endId) break;
    for (const edge of graph.adj.get(current.id) || []) {
      if (visited.has(edge.id)) continue;
      const candidate = current.distance + edge.weight;
      if (candidate < (distances.get(edge.id) ?? Infinity)) {
        distances.set(edge.id, candidate);
        previous.set(edge.id, current.id);
        push({ id: edge.id, distance: candidate });
      }
    }
  }
  if (!distances.has(endId)) throw new Error('The selected points are not connected by the mapped walking network. Campus paths may be missing from OpenStreetMap.');
  const path = [endId]; let cursor = endId;
  while (cursor !== startId) {
    cursor = previous.get(cursor);
    if (cursor == null) throw new Error('Could not reconstruct the walking route. Please try again.');
    path.push(cursor);
  }
  return path.reverse();
}

function bearing(a, b) {
  const rad = Math.PI / 180;
  const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad);
  const x = Math.cos(a[0] * rad) * Math.sin(b[0] * rad) - Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function graphInstructions(coords) {
  if (coords.length < 2) return [{ text: 'You have arrived', distance: 0 }];
  let segmentDistance = haversine(coords[0], coords[1]);
  let prevBearing = bearing(coords[0], coords[1]);
  const steps = [{ text: 'Start walking along the mapped path', distance: segmentDistance }];
  for (let i = 2; i < coords.length; i++) {
    const edgeDistance = haversine(coords[i - 1], coords[i]);
    const nextBearing = bearing(coords[i - 1], coords[i]);
    const delta = ((nextBearing - prevBearing + 540) % 360) - 180;
    if (Math.abs(delta) >= 35) {
      steps[steps.length - 1].distance = segmentDistance;
      segmentDistance = edgeDistance;
      steps.push({ text: delta > 0 ? 'Turn right' : 'Turn left', distance: segmentDistance });
      prevBearing = nextBearing;
    } else {
      segmentDistance += edgeDistance;
    }
  }
  steps[steps.length - 1].distance = segmentDistance;
  steps.push({ text: 'You have arrived at your destination', distance: 0 });
  return steps.filter((s, i) => s.distance > 2 || i === steps.length - 1);
}
