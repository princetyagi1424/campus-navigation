# GLA Campus Navigator

Responsive campus-navigation website built with React, Vite, Leaflet and OpenStreetMap. It supports browser GPS, manual point selection, place search, pedestrian path routing, route distance/ETA, directions, and mobile layouts.

## Requirements
- Node.js 18+ (Node.js 20 LTS or newer recommended)
- npm
- Internet connection for OpenStreetMap tiles, Nominatim place search, Overpass walking data, and the public pedestrian-router fallback

## Run locally
1. Extract the ZIP.
2. Open a terminal inside `gla-campus-navigator`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the local URL shown by Vite, usually `http://localhost:5173`.

Run the included routing unit tests:
```bash
npm test
```

Production build:
```bash
npm run build
npm run preview
```

## How to use
- Click the location icon beside **From** to request browser GPS permission. Geolocation normally requires HTTPS or `localhost`.
- Or click **Pick start point on map** and tap the map.
- Search for a place and choose a result, use a popular destination (only if OpenStreetMap returns a result inside the campus bounds), or select the exact point on the map.
- Click **Find walking route**. Campus-scale routes first attempt a local Dijkstra calculation over mapped OpenStreetMap walking paths, minimizing route distance in metres. If that graph is unavailable or disconnected, the app transparently falls back to the public pedestrian router and marks the result as a recommended route, not a guaranteed shortest route.
- Open the turn-by-turn directions, swap points, recenter the map, or open the route in OpenStreetMap.

## Routing and data integrity
- The initial campus center and campus bounding box are approximate map bounds, not an official surveyed campus plan.
- Shortest-path routing is only as accurate as the OpenStreetMap pedestrian network. The Dijkstra result is the shortest route in the downloaded graph, not proof that all real-world campus paths are mapped.
- The route graph is downloaded from the Overpass API and cached in memory for 10 minutes. If the campus paths are absent, access-restricted, disconnected, or the Overpass service is busy, a fallback route may be shown or the app will explain that a route could not be found.
- The public fallback service generally returns a recommended route, which may optimize travel time rather than shortest distance. The UI does not label it as a guaranteed shortest path.
- Popular destination names are suggestions, not surveyed coordinates. The app does not invent a point when search fails; it asks the user to verify search results or select the location manually.
- GPS may be inaccurate indoors; the app displays the browser-reported accuracy radius when available.
- This is outdoor navigation. Building interiors, floor-by-floor directions, room numbers, wheelchair access, and closed-path status need verified campus-specific data and are not guaranteed by the public map.

## Privacy note
Browser GPS permission is requested only when the student presses the location button. When place labels are resolved or a route is calculated, coordinates and search text are sent to the public OpenStreetMap ecosystem services listed below. Do not use this prototype for sensitive location scenarios.

## Public service use
This project calls public OpenStreetMap ecosystem services from the browser. These services are community infrastructure and may be rate-limited or unavailable. Place search runs only on explicit user action (button/Enter), not on each keystroke. Do not launch a high-traffic production deployment against public endpoints without reviewing the current service usage policies; for production, consider a managed routing/geocoding provider or self-hosting the required services.

## Attribution and references
- OpenStreetMap data: https://www.openstreetmap.org/copyright
- Leaflet quick start: https://leafletjs.com/examples/quick-start/
- React Leaflet setup: https://react-leaflet.js.org/docs/start-setup/
- OpenStreetMap Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
- OSRM API reference: https://project-osrm.org/docs/v5.15.2/api/
- GLA University campus tour / facility names: https://www.gla.ac.in/virtual-tour

## Recommended next step before real student use
Have someone walk the campus and verify the gates, paths, building entrances, and restricted areas. Add an approved campus-specific dataset for any missing footpaths and use a maintained routing service for reliable availability. Do not rely on this prototype as an official safety or accessibility navigation system until that survey and testing are complete.
