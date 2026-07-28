/**
 * Playwright E2E test for similarity search endpoint
 * Tests the POST /api/similarity endpoint
 */

import { test, expect } from '@playwright/test';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

test.describe('Similarity Search API', () => {
  test('should return similar identities for valid embedding', async ({ request }) => {
    // Create a sample embedding (1536 dimensions for OpenAI ada-002)
    const embedding = Array(1536)
      .fill(0)
      .map(() => Math.random());

    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding,
        k: 5,
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeLessThanOrEqual(5);

    // Validate result structure
    if (data.results.length > 0) {
      const firstResult = data.results[0];
      expect(firstResult).toHaveProperty('address');
      expect(firstResult).toHaveProperty('distance');
      expect(typeof firstResult.address).toBe('string');
      expect(typeof firstResult.distance).toBe('number');
    }
  });

  test('should reject request with invalid embedding - not an array', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding: 'not-an-array',
        k: 5,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('should reject request with empty embedding', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding: [],
        k: 5,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('should reject request with invalid embedding - non-numeric values', async ({ request }) => {
    const embedding = Array(1536).fill('invalid');

    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding,
        k: 5,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('should use default k value when not provided', async ({ request }) => {
    const embedding = Array(1536)
      .fill(0)
      .map(() => Math.random());

    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeLessThanOrEqual(10); // Default k is 10
  });

  test('should handle k parameter correctly', async ({ request }) => {
    const embedding = Array(1536)
      .fill(0)
      .map(() => Math.random());
    const k = 3;

    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding,
        k,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.results.length).toBeLessThanOrEqual(k);
  });

  test('should return 404 or 405 for GET request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/similarity`);

    expect([404, 405]).toContain(response.status());
  });

  test('should handle missing request body gracefully', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {},
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Similarity Search API - Performance', () => {
  test('should respond within acceptable time', async ({ request }) => {
    const embedding = Array(1536)
      .fill(0)
      .map(() => Math.random());

    const startTime = Date.now();
    const response = await request.post(`${API_BASE_URL}/api/similarity`, {
      data: {
        embedding,
        k: 5,
      },
    });
    const duration = Date.now() - startTime;

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
  });
});
