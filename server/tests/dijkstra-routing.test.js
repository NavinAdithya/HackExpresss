/**
 * Tests for Dijkstra Routing Service
 */

const {
  calculateDijkstraRoute,
  dijkstra,
  findNearestNode,
  NETWORK_NODES,
  MinHeap,
  haversineDistance,
} = require('../services/dijkstra-routing');
const { calculateRoute } = require('../services/route-service');

describe('Dijkstra Routing & Navigation Engine', () => {
  describe('MinHeap Priority Queue', () => {
    test('extracts minimum priority elements in correct order', () => {
      const heap = new MinHeap();
      heap.push('node_c', 50);
      heap.push('node_a', 10);
      heap.push('node_d', 100);
      heap.push('node_b', 25);

      expect(heap.pop()).toEqual({ item: 'node_a', priority: 10 });
      expect(heap.pop()).toEqual({ item: 'node_b', priority: 25 });
      expect(heap.pop()).toEqual({ item: 'node_c', priority: 50 });
      expect(heap.pop()).toEqual({ item: 'node_d', priority: 100 });
      expect(heap.pop()).toBeNull();
    });

    test('handles empty heap correctly', () => {
      const heap = new MinHeap();
      expect(heap.isEmpty()).toBe(true);
      expect(heap.pop()).toBeNull();
    });
  });

  describe('findNearestNode Snapping', () => {
    test('snaps exact coordinate to corresponding network node', () => {
      const guindy = NETWORK_NODES.kathipara_guindy;
      const snap = findNearestNode(guindy.coords);
      expect(snap.node.id).toBe('kathipara_guindy');
      expect(snap.distance).toBeLessThan(1); // < 1 meter
    });

    test('snaps nearby arbitrary coordinate to nearest node', () => {
      // Coordinate right next to SRM Easwari
      const nearbyEaswari = [80.1810, 13.0330];
      const snap = findNearestNode(nearbyEaswari);
      expect(snap.node.id).toBe('srm_easwari');
      expect(snap.distance).toBeLessThan(500);
    });
  });

  describe('dijkstra Core Shortest Path', () => {
    test('returns 0 distance when start equals target', () => {
      const result = dijkstra('srm_easwari', 'srm_easwari');
      expect(result).not.toBeNull();
      expect(result.distance).toBe(0);
      expect(result.duration).toBe(0);
      expect(result.path).toEqual(['srm_easwari']);
    });

    test('finds shortest path between SRM Easwari and Tidel Park', () => {
      // Path should traverse: srm_easwari -> kathipara_guindy -> ... -> tidel_park
      const result = dijkstra('srm_easwari', 'tidel_park');
      expect(result).not.toBeNull();
      expect(result.path.length).toBeGreaterThanOrEqual(3);
      expect(result.path[0]).toBe('srm_easwari');
      expect(result.path[result.path.length - 1]).toBe('tidel_park');
      expect(result.distance).toBeGreaterThan(5000); // > 5km
      expect(result.duration).toBeGreaterThan(0);
      expect(result.edges.length).toBe(result.path.length - 1);
    });

    test('finds shortest path between Koyambedu and SRM Kattankulathur', () => {
      const result = dijkstra('koyambedu', 'srm_kattankulathur');
      expect(result).not.toBeNull();
      expect(result.path[0]).toBe('koyambedu');
      expect(result.path[result.path.length - 1]).toBe('srm_kattankulathur');
      // Should traverse south through Kathipara & GST Road
      expect(result.path).toContain('kathipara_guindy');
      expect(result.path).toContain('tambaram');
    });

    test('returns null for unknown node IDs', () => {
      const result = dijkstra('non_existent_node', 'tidel_park');
      expect(result).toBeNull();
    });
  });

  describe('calculateDijkstraRoute High-Level Service', () => {
    test('generates valid GeoJSON LineString and metrics for route', () => {
      const origin = [80.1804, 13.0324]; // SRM Easwari
      const dest = [80.2476, 12.9895];   // Tidel Park

      const route = calculateDijkstraRoute(origin, dest);

      expect(route).toBeDefined();
      expect(route.geometry.type).toBe('LineString');
      expect(Array.isArray(route.geometry.coordinates)).toBe(true);
      expect(route.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(route.distance).toBeGreaterThan(5000);
      expect(route.duration).toBeGreaterThan(60);
      expect(route.algorithm).toBe('dijkstra');
      expect(Array.isArray(route.waypoints)).toBe(true);
      expect(route.waypoints.length).toBeGreaterThanOrEqual(2);
    });

    test('handles very close origin and destination gracefully', () => {
      const origin = [80.1804, 13.0324];
      const dest = [80.1805, 13.0325]; // ~15 meters away

      const route = calculateDijkstraRoute(origin, dest);
      expect(route).toBeDefined();
      expect(route.distance).toBeLessThan(100);
      expect(route.geometry.coordinates.length).toBe(2);
    });

    test('throws error for invalid coordinates', () => {
      expect(() => calculateDijkstraRoute(null, [80.2476, 12.9895])).toThrow();
      expect(() => calculateDijkstraRoute('invalid', [80.2476, 12.9895])).toThrow();
    });
  });

  describe('Integration with calculateRoute & Fallback', () => {
    test('calculateRoute supports explicit Dijkstra algorithm option', async () => {
      const origin = [80.1804, 13.0324];
      const dest = [80.2080, 13.0067]; // SRM Easwari to Guindy Kathipara

      const route = await calculateRoute(origin, dest, { algorithm: 'dijkstra' });

      expect(route).toBeDefined();
      expect(route.geometry).toBeDefined();
      expect(route.geometry.type).toBe('LineString');
      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
    });
  });
});
