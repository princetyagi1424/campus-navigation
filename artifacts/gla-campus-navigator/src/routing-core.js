export const haversine = (a, b) => {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export function nodeDistance(a, b) { return haversine([a.lat, a.lon], [b.lat, b.lon]); }

export function nearestGraphNode(point, graph, maxDistance = 200) {
  let best = null, bestDistance = Infinity;
  for (const [id, node] of graph.nodes) {
    if (!graph.adj.has(id)) continue;
    const d = haversine(point, [node.lat, node.lon]);
    if (d < bestDistance) { bestDistance = d; best = node; }
  }
  if (!best || bestDistance > maxDistance) {
    throw new Error(
      `No mapped walking path is within ${Math.round(maxDistance)} m of the selected point (nearest is ${Math.round(bestDistance)} m). ` +
      `Select a point closer to a visible road/path, or use the public route fallback.`
    );
  }
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
  if (!distances.has(endId)) {
    throw new Error(
      'The selected points are not connected by the mapped walking network. ' +
      'Campus paths may be missing from OpenStreetMap — a recommended route will be tried instead.'
    );
  }
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

export function polylineLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversine(coords[i - 1], coords[i]);
  return total;
}

/**
 * Projects a live position onto a route polyline (coords are [lat, lon]).
 * Search starts at `fromIndex` so progress never jumps backwards on loops or parallel paths.
 * Returns the snapped point, the segment index it lies on, how far the walker is from the
 * route (metres) and how much of the route is still ahead (metres).
 */
export function projectOnRoute(position, coords, fromIndex = 0) {
  if (!coords || coords.length < 2) return { index: 0, point: position, offRoute: 0, remaining: 0 };
  const rad = Math.PI / 180;
  const cosLat = Math.cos(position[0] * rad);
  const toXY = ([lat, lon]) => [(lon - position[1]) * rad * 6371000 * cosLat, (lat - position[0]) * rad * 6371000];
  let best = null;
  const first = Math.max(0, Math.min(fromIndex, coords.length - 2));
  for (let i = first; i < coords.length - 1; i++) {
    const [ax, ay] = toXY(coords[i]);
    const [bx, by] = toXY(coords[i + 1]);
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx + -ay * dy) / len2));
    const px = ax + t * dx, py = ay + t * dy;
    const dist = Math.hypot(px, py);
    if (!best || dist < best.dist - 0.01) best = { i, t, dist };
  }
  const a = coords[best.i], b = coords[best.i + 1];
  const point = [a[0] + (b[0] - a[0]) * best.t, a[1] + (b[1] - a[1]) * best.t];
  const remaining = haversine(point, b) + polylineLength(coords.slice(best.i + 1));
  return { index: best.i, point, offRoute: best.dist, remaining };
}

/** The part of the route still ahead: snapped point first, then the untravelled vertices. */
export function trimRoute(coords, projection) {
  if (!coords || coords.length < 2 || !projection) return coords;
  return [projection.point, ...coords.slice(projection.index + 1)];
}
