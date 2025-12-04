/**
 * E2E test for vector similarity API endpoint
 * 
 * Tests the /api/similarity endpoint by posting an embedding
 * and asserting the response schema is correct.
 */

import { test, expect } from '@playwright/test';

test.describe('Vector Similarity API', () => {
  test('POST /api/similarity returns similar identities', async ({ request }) => {
    // Sample embedding vector (using a small dimension for testing)
    const testEmbedding = Array.from({ length: 1536 }, (_, i) => Math.random());
    
    const response = await request.post('/api/similarity', {
      data: {
        embedding: testEmbedding,
        limit: 5,
        threshold: 0.8,
      },
    });

    // Assert response status
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Assert response schema
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBeTruthy();

    // If results exist, validate structure
    if (body.results.length > 0) {
      const firstResult = body.results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('distance');
      expect(typeof firstResult.id).toBe('string');
      expect(typeof firstResult.distance).toBe('number');
      
      // Distance should be between 0 and threshold
      expect(firstResult.distance).toBeGreaterThanOrEqual(0);
      expect(firstResult.distance).toBeLessThan(0.8);
    }

    // Verify results are limited to requested amount
    expect(body.results.length).toBeLessThanOrEqual(5);
  });

  test('POST /api/similarity validates embedding input', async ({ request }) => {
    // Test with invalid embedding (non-array)
    const response1 = await request.post('/api/similarity', {
      data: {
        embedding: 'not-an-array',
        limit: 5,
      },
    });

    expect(response1.status()).toBe(400);
    const body1 = await response1.json();
    expect(body1).toHaveProperty('error');

    // Test with empty embedding array
    const response2 = await request.post('/api/similarity', {
      data: {
        embedding: [],
        limit: 5,
      },
    });

    expect(response2.status()).toBe(400);
    const body2 = await response2.json();
    expect(body2).toHaveProperty('error');
  });

  test('POST /api/similarity validates limit parameter', async ({ request }) => {
    const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
    
    // Test with negative limit
    const response1 = await request.post('/api/similarity', {
      data: {
        embedding: testEmbedding,
        limit: -1,
      },
    });

    expect(response1.status()).toBe(400);
    const body1 = await response1.json();
    expect(body1).toHaveProperty('error');

    // Test with non-integer limit
    const response2 = await request.post('/api/similarity', {
      data: {
        embedding: testEmbedding,
        limit: 5.5,
      },
    });

    expect(response2.status()).toBe(400);
    const body2 = await response2.json();
    expect(body2).toHaveProperty('error');
  });

  test('POST /api/similarity handles missing parameters gracefully', async ({ request }) => {
    // Test with missing embedding
    const response = await request.post('/api/similarity', {
      data: {
        limit: 5,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('embedding');
  });
});
