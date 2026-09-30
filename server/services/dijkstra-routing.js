/**
 * Dijkstra Routing Service — PO → PO
 *
 * Implements Dijkstra's algorithm for finding the optimal shortest path
 * across transportation networks and commuter hubs.
 *
 * Features:
 * - High-efficiency Min-Priority Queue (Binary Min-Heap) for O((V + E) log V) complexity
 * - Comprehensive Chennai road-graph network containing commuter hubs, universities, and IT corridors
 * - Coordinate snapping for arbitrary [lng, lat] points to the nearest road network nodes
 * - GeoJSON LineString geometry generation for seamless map rendering
 * - Non-negative edge weights based on physical road distance and realistic transit speeds
 * - Output format 100% compatible with calculateRoute (geometry, distance, duration)
 */

class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[index] = parent;
      index = parentIndex;
    }
    this.heap[index] = element;
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swap = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < element.priority) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const rightChild = this.heap[rightChildIdx];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < this.heap[leftChildIdx].priority)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      index = swap;
    }
    this.heap[index] = element;
  }
}

/**
 * Standard Haversine distance in meters between two [lng, lat] coordinates.
 */
function haversineDistance(coordA, coordB) {
  const [lng1, lat1] = coordA;
  const [lng2, lat2] = coordB;
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * High-precision Transit & Road Graph Network for Chennai and surrounding commuter corridors
 * Coordinates: [longitude, latitude]
 */
const NETWORK_NODES = {
  srm_easwari: {
    id: 'srm_easwari',
    name: 'SRM Easwari Engineering College',
    coords: [80.1804, 13.0324],
    type: 'college',
  },
  dlf_porur: {
    id: 'dlf_porur',
    name: 'DLF Cybercity Porur',
    coords: [80.1706, 13.0298],
    type: 'tech_hub',
  },
  porur_junction: {
    id: 'porur_junction',
    name: 'Porur Roundtana Junction',
    coords: [80.1558, 13.0382],
    type: 'transit_hub',
  },
  koyambedu: {
    id: 'koyambedu',
    name: 'Koyambedu CMBT / Metro',
    coords: [80.1948, 13.0694],
    type: 'transit_hub',
  },
  anna_nagar: {
    id: 'anna_nagar',
    name: 'Anna Nagar Roundtana',
    coords: [80.2101, 13.0850],
    type: 'hub',
  },
  srm_vadapalani: {
    id: 'srm_vadapalani',
    name: 'SRM Vadapalani / Vadapalani Metro',
    coords: [80.2104, 13.0519],
    type: 'college',
  },
  ashok_nagar: {
    id: 'ashok_nagar',
    name: 'Ashok Nagar 100ft Road',
    coords: [80.2114, 13.0360],
    type: 'hub',
  },
  kathipara_guindy: {
    id: 'kathipara_guindy',
    name: 'Guindy Kathipara Junction',
    coords: [80.2080, 13.0067],
    type: 'transit_hub',
  },
  guindy_station: {
    id: 'guindy_station',
    name: 'Guindy Railway / Metro Station',
    coords: [80.2120, 13.0090],
    type: 'transit_hub',
  },
  saidapet: {
    id: 'saidapet',
    name: 'Saidapet Anna Salai',
    coords: [80.2220, 13.0200],
    type: 'transit_hub',
  },
  tnagar_panagal: {
    id: 'tnagar_panagal',
    name: 'T. Nagar Panagal Park',
    coords: [80.2337, 13.0405],
    type: 'hub',
  },
  anna_univ: {
    id: 'anna_univ',
    name: 'Anna University Guindy Campus',
    coords: [80.2355, 13.0109],
    type: 'university',
  },
  iitm_gate: {
    id: 'iitm_gate',
    name: 'IIT Madras Sardar Patel Road',
    coords: [80.2337, 12.9915],
    type: 'university',
  },
  velachery_vijayanagar: {
    id: 'velachery_vijayanagar',
    name: 'Velachery Vijayanagar Bus Terminus',
    coords: [80.2180, 12.9815],
    type: 'transit_hub',
  },
  tidel_park: {
    id: 'tidel_park',
    name: 'Tidel Park Taramani OMR',
    coords: [80.2476, 12.9895],
    type: 'tech_hub',
  },
  thiruvanmiyur: {
    id: 'thiruvanmiyur',
    name: 'Thiruvanmiyur ECR / OMR Junction',
    coords: [80.2590, 12.9830],
    type: 'transit_hub',
  },
  perungudi_omr: {
    id: 'perungudi_omr',
    name: 'Perungudi OMR Toll Plazas',
    coords: [80.2425, 12.9650],
    type: 'tech_hub',
  },
  sholinganallur: {
    id: 'sholinganallur',
    name: 'OMR Sholinganallur Junction',
    coords: [80.2279, 12.9010],
    type: 'tech_hub',
  },
  medavakkam: {
    id: 'medavakkam',
    name: 'Medavakkam Junction',
    coords: [80.1890, 12.9200],
    type: 'transit_hub',
  },
  airport_meenambakkam: {
    id: 'airport_meenambakkam',
    name: 'Chennai International Airport (MAA)',
    coords: [80.1709, 12.9941],
    type: 'airport',
  },
  chromepet: {
    id: 'chromepet',
    name: 'Chromepet GST Road',
    coords: [80.1415, 12.9515],
    type: 'transit_hub',
  },
  tambaram: {
    id: 'tambaram',
    name: 'Tambaram Sanatorium GST Road',
    coords: [80.1200, 12.9249],
    type: 'transit_hub',
  },
  srm_kattankulathur: {
    id: 'srm_kattankulathur',
    name: 'SRM University Kattankulathur',
    coords: [80.0442, 12.8231],
    type: 'university',
  },
  chennai_central: {
    id: 'chennai_central',
    name: 'Chennai Central Railway Station',
    coords: [80.2707, 13.0827],
    type: 'railway',
  },
  gemini_flyover: {
    id: 'gemini_flyover',
    name: 'Gemini Flyover / Nungambakkam',
    coords: [80.2505, 13.0515],
    type: 'hub',
  },
  adyar_signal: {
    id: 'adyar_signal',
    name: 'Adyar Signal / L.B. Road',
    coords: [80.2565, 13.0012],
    type: 'transit_hub',
  },
};

/**
 * Raw connections definition.
 * Each edge: [fromNode, toNode, roadName, speedKmph, curvaturePoints]
 */
const RAW_EDGES = [
  // Mount Poonamallee Road
  ['porur_junction', 'dlf_porur', 'Mount Poonamallee Road', 35, [[80.1630, 13.0340]]],
  ['dlf_porur', 'srm_easwari', 'Mount Poonamallee Road', 35, [[80.1755, 13.0310]]],
  ['srm_easwari', 'kathipara_guindy', 'Mount Poonamallee Road', 45, [[80.1900, 13.0200], [80.2010, 13.0110]]],

  // 100 Feet Road / Inner Ring Road
  ['koyambedu', 'srm_vadapalani', 'Jawaharlal Nehru Road (100 Ft Rd)', 40, [[80.2030, 13.0610]]],
  ['srm_vadapalani', 'ashok_nagar', 'Jawaharlal Nehru Road (100 Ft Rd)', 40, [[80.2109, 13.0440]]],
  ['ashok_nagar', 'kathipara_guindy', 'Jawaharlal Nehru Road (100 Ft Rd)', 45, [[80.2100, 13.0210]]],

  // Poonamallee High Road & Central
  ['chennai_central', 'koyambedu', 'Poonamallee High Road', 40, [[80.2350, 13.0780], [80.2120, 13.0730]]],
  ['koyambedu', 'porur_junction', 'Vanagaram - Porur Link Road', 40, [[80.1750, 13.0540]]],
  ['anna_nagar', 'koyambedu', 'Jawaharlal Nehru Road', 40, [[80.2010, 13.0780]]],
  ['anna_nagar', 'chennai_central', 'EVR Periyar Salai', 40, [[80.2400, 13.0840]]],

  // Anna Salai / Mount Road
  ['chennai_central', 'gemini_flyover', 'Anna Salai', 45, [[80.2620, 13.0680]]],
  ['gemini_flyover', 'tnagar_panagal', 'G.N. Chetty Road', 30, [[80.2420, 13.0460]]],
  ['tnagar_panagal', 'saidapet', 'Anna Salai Link', 35, [[80.2280, 13.0300]]],
  ['gemini_flyover', 'saidapet', 'Anna Salai', 45, [[80.2380, 13.0360]]],
  ['saidapet', 'kathipara_guindy', 'Anna Salai Guindy Bridge', 45, [[80.2150, 13.0130]]],

  // Sardar Patel Road & Adyar Corridor
  ['kathipara_guindy', 'guindy_station', 'GST Road / Guindy Race Course', 40, [[80.2100, 13.0078]]],
  ['guindy_station', 'anna_univ', 'Sardar Patel Road', 40, [[80.2240, 13.0100]]],
  ['anna_univ', 'iitm_gate', 'Sardar Patel Road', 40, [[80.2345, 13.0010]]],
  ['iitm_gate', 'adyar_signal', 'Sardar Patel Road', 40, [[80.2450, 12.9960]]],
  ['iitm_gate', 'tidel_park', 'Gandhi Mandapam / OMR Link', 40, [[80.2410, 12.9905]]],
  ['adyar_signal', 'thiruvanmiyur', 'L.B. Road', 35, [[80.2580, 12.9920]]],
  ['thiruvanmiyur', 'tidel_park', 'Tidel Flyover Road', 40, [[80.2530, 12.9860]]],

  // Velachery Linkages
  ['guindy_station', 'velachery_vijayanagar', 'Velachery Road', 40, [[80.2150, 12.9950]]],
  ['velachery_vijayanagar', 'tidel_park', 'Velachery - Taramani 100ft Bypass', 40, [[80.2330, 12.9855]]],
  ['velachery_vijayanagar', 'medavakkam', 'Velachery Main Road', 40, [[80.2035, 12.9510]]],

  // OMR (Rajiv Gandhi Salai - IT Expressway)
  ['tidel_park', 'perungudi_omr', 'Rajiv Gandhi Salai (OMR)', 50, [[80.2450, 12.9770]]],
  ['perungudi_omr', 'sholinganallur', 'Rajiv Gandhi Salai (OMR)', 55, [[80.2350, 12.9330]]],
  ['medavakkam', 'sholinganallur', 'Medavakkam - Sholinganallur Link Road', 40, [[80.2085, 12.9105]]],

  // GST Road (Grand Southern Trunk Road)
  ['kathipara_guindy', 'airport_meenambakkam', 'Grand Southern Trunk Road (GST)', 55, [[80.1895, 13.0004]]],
  ['airport_meenambakkam', 'chromepet', 'Grand Southern Trunk Road (GST)', 55, [[80.1562, 12.9728]]],
  ['chromepet', 'tambaram', 'Grand Southern Trunk Road (GST)', 55, [[80.1308, 12.9382]]],
  ['tambaram', 'srm_kattankulathur', 'Grand Southern Trunk Road (GST / NH 45)', 65, [[80.0825, 12.8740]]],
];

/**
 * Build graph adjacency list representation
 */
function buildGraph() {
  const adjacency = {};
  for (const nodeId of Object.keys(NETWORK_NODES)) {
    adjacency[nodeId] = [];
  }

  for (const [fromId, toId, roadName, speedKmph, curvature] of RAW_EDGES) {
    if (!NETWORK_NODES[fromId] || !NETWORK_NODES[toId]) continue;

    const fromNode = NETWORK_NODES[fromId];
    const toNode = NETWORK_NODES[toId];

    // Compute direct Haversine with 1.15 road winding factor
    const directDist = haversineDistance(fromNode.coords, toNode.coords);
    const roadDist = Math.round(directDist * 1.15);
    const speedMps = (speedKmph * 1000) / 3600;
    const durationSec = Math.round(roadDist / speedMps);

    // Forward edge
    adjacency[fromId].push({
      target: toId,
      weight: roadDist,
      duration: durationSec,
      roadName,
      speedKmph,
      geometry: [fromNode.coords, ...(curvature || []), toNode.coords],
    });

    // Reverse edge (two-way urban roads)
    const revCurvature = curvature ? [...curvature].reverse() : [];
    adjacency[toId].push({
      target: fromId,
      weight: roadDist,
      duration: durationSec,
      roadName,
      speedKmph,
      geometry: [toNode.coords, ...revCurvature, fromNode.coords],
    });
  }

  return adjacency;
}

const GRAPH_ADJACENCY = buildGraph();

/**
 * Snaps arbitrary [lng, lat] coordinate to the closest network node.
 * @param {[number, number]} coords - [lng, lat]
 * @returns {{ node: object, distance: number }}
 */
function findNearestNode(coords) {
  let nearest = null;
  let minDistance = Infinity;

  for (const node of Object.values(NETWORK_NODES)) {
    const d = haversineDistance(coords, node.coords);
    if (d < minDistance) {
      minDistance = d;
      nearest = node;
    }
  }

  return { node: nearest, distance: minDistance };
}

/**
 * Core Dijkstra Algorithm.
 * Finds the strictly shortest path between startNodeId and targetNodeId.
 *
 * @param {string} startNodeId
 * @param {string} targetNodeId
 * @returns {{ path: string[], distance: number, duration: number, edges: object[] } | null}
 */
function dijkstra(startNodeId, targetNodeId) {
  if (!NETWORK_NODES[startNodeId] || !NETWORK_NODES[targetNodeId]) {
    return null;
  }

  if (startNodeId === targetNodeId) {
    return {
      path: [startNodeId],
      distance: 0,
      duration: 0,
      edges: [],
    };
  }

  const distances = {};
  const durations = {};
  const previous = {};
  const edgeUsed = {};
  const visited = new Set();
  const minHeap = new MinHeap();

  for (const nodeId of Object.keys(NETWORK_NODES)) {
    distances[nodeId] = Infinity;
    durations[nodeId] = Infinity;
    previous[nodeId] = null;
    edgeUsed[nodeId] = null;
  }

  distances[startNodeId] = 0;
  durations[startNodeId] = 0;
  minHeap.push(startNodeId, 0);

  while (!minHeap.isEmpty()) {
    const { item: currentId, priority: currentDist } = minHeap.pop();

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Reached destination target
    if (currentId === targetNodeId) break;

    const neighbors = GRAPH_ADJACENCY[currentId] || [];
    for (const edge of neighbors) {
      if (visited.has(edge.target)) continue;

      const newDist = currentDist + edge.weight;
      if (newDist < distances[edge.target]) {
        distances[edge.target] = newDist;
        durations[edge.target] = durations[currentId] + edge.duration;
        previous[edge.target] = currentId;
        edgeUsed[edge.target] = edge;
        minHeap.push(edge.target, newDist);
      }
    }
  }

  if (distances[targetNodeId] === Infinity) {
    return null; // No path found
  }

  // Backtrack path
  const path = [];
  const edges = [];
  let curr = targetNodeId;
  while (curr) {
    path.unshift(curr);
    if (edgeUsed[curr]) {
      edges.unshift(edgeUsed[curr]);
    }
    curr = previous[curr];
  }

  return {
    path,
    distance: distances[targetNodeId],
    duration: durations[targetNodeId],
    edges,
  };
}

/**
 * High-level Route Calculation using Dijkstra.
 * Accepts any origin and destination [lng, lat] coordinates,
 * snaps to the transit graph, runs Dijkstra, and returns a standard GeoJSON route.
 *
 * @param {[number, number]} origin - [lng, lat]
 * @param {[number, number]} destination - [lng, lat]
 * @param {object} [options]
 * @returns {object} { geometry, distance, duration, algorithm, waypoints, path }
 */
function calculateDijkstraRoute(origin, destination, options = {}) {
  if (!Array.isArray(origin) || !Array.isArray(destination)) {
    throw new Error('Origin and destination must be [lng, lat] coordinates.');
  }

  const directDistance = haversineDistance(origin, destination);

  // If origin and destination are almost identical (< 100 meters)
  if (directDistance < 100) {
    return {
      geometry: {
        type: 'LineString',
        coordinates: [origin, destination],
      },
      distance: Math.round(directDistance),
      duration: Math.max(30, Math.round(directDistance / 8.33)), // ~30 km/h
      algorithm: 'dijkstra',
      waypoints: [],
      path: [],
    };
  }

  // Snap to network nodes
  const startSnap = findNearestNode(origin);
  const endSnap = findNearestNode(destination);

  const startNode = startSnap.node;
  const endNode = endSnap.node;

  // Run Dijkstra on graph
  const dijkstraResult = dijkstra(startNode.id, endNode.id);

  if (!dijkstraResult) {
    // Fallback: direct line with intermediate points
    return {
      geometry: {
        type: 'LineString',
        coordinates: [origin, destination],
      },
      distance: Math.round(directDistance * 1.2),
      duration: Math.round((directDistance * 1.2) / 10),
      algorithm: 'dijkstra_direct_fallback',
      waypoints: [],
      path: [],
    };
  }

  // Assemble complete coordinate sequence
  const coordinates = [origin];

  // If origin is not already at the start node, connect to it
  if (haversineDistance(origin, startNode.coords) > 50) {
    coordinates.push(startNode.coords);
  }

  // Add all intermediate edge coordinates along the shortest path
  for (const edge of dijkstraResult.edges) {
    if (edge.geometry && edge.geometry.length > 0) {
      for (const pt of edge.geometry) {
        const last = coordinates[coordinates.length - 1];
        if (!last || last[0] !== pt[0] || last[1] !== pt[1]) {
          coordinates.push(pt);
        }
      }
    }
  }

  // If destination is not already at the end node, connect to it
  if (haversineDistance(endNode.coords, destination) > 50) {
    coordinates.push(destination);
  }

  // Total cumulative distance & duration (lead-in + graph + lead-out)
  const leadInDist = haversineDistance(origin, startNode.coords);
  const leadOutDist = haversineDistance(endNode.coords, destination);

  const totalDistance = Math.round(leadInDist + dijkstraResult.distance + leadOutDist);
  const leadInDuration = Math.round(leadInDist / 8.33); // ~30 km/h in urban streets
  const leadOutDuration = Math.round(leadOutDist / 8.33);
  const totalDuration = Math.round(leadInDuration + dijkstraResult.duration + leadOutDuration);

  const waypoints = dijkstraResult.path.map((nodeId) => ({
    id: nodeId,
    name: NETWORK_NODES[nodeId].name,
    coords: NETWORK_NODES[nodeId].coords,
    type: NETWORK_NODES[nodeId].type,
  }));

  return {
    geometry: {
      type: 'LineString',
      coordinates,
    },
    distance: totalDistance, // in meters
    duration: totalDuration, // in seconds
    algorithm: 'dijkstra',
    path: dijkstraResult.path,
    waypoints,
    roadSegments: dijkstraResult.edges.map((e) => ({
      roadName: e.roadName,
      distance: e.weight,
      duration: e.duration,
      speedKmph: e.speedKmph,
    })),
  };
}

module.exports = {
  calculateDijkstraRoute,
  dijkstra,
  findNearestNode,
  NETWORK_NODES,
  RAW_EDGES,
  haversineDistance,
  MinHeap,
};
