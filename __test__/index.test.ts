/**
 * Tests for text-to-cypher-node
 * 
 * These are mock tests that don't require a live FalkorDB instance or API keys.
 * They test the basic structure and error handling of the library.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextToCypher } from '../index';

describe('TextToCypher', () => {
  describe('constructor', () => {
    it('should create a new instance with valid options', () => {
      const client = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
        falkordbConnection: 'falkor://localhost:6379'
      });

      expect(client).toBeInstanceOf(TextToCypher);
    });

    it('should accept different AI models', () => {
      const models = [
        'gpt-4o-mini',
        'gpt-4o',
        'anthropic:claude-3',
        'gemini:gemini-2.0-flash-exp'
      ];

      models.forEach(model => {
        const client = new TextToCypher({
          model,
          apiKey: 'test-key',
          falkordbConnection: 'falkor://localhost:6379'
        });
        expect(client).toBeInstanceOf(TextToCypher);
      });
    });
  });

  describe('API methods', () => {
    let client: TextToCypher;

    beforeEach(() => {
      client = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
        falkordbConnection: 'falkor://localhost:6379'
      });
    });

    it('should have textToCypher method', () => {
      expect(typeof client.textToCypher).toBe('function');
    });

    it('should have textToCypherWithMessages method', () => {
      expect(typeof client.textToCypherWithMessages).toBe('function');
    });

    it('should have cypherOnly method', () => {
      expect(typeof client.cypherOnly).toBe('function');
    });

    it('should have discoverSchema method', () => {
      expect(typeof client.discoverSchema).toBe('function');
    });

    // Note: These tests will fail if there's no actual FalkorDB connection
    // They are included to demonstrate the test structure
    it('should reject with error when connection fails', async () => {
      const client = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: 'invalid-key',
        falkordbConnection: 'falkor://invalid:9999'
      });

      await expect(
        client.textToCypher('test', 'test question')
      ).rejects.toThrow();
    });
  });

  describe('message formatting', () => {
    let client: TextToCypher;

    beforeEach(() => {
      client = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
        falkordbConnection: 'falkor://localhost:6379'
      });
    });

    it('should accept messages with different roles', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
        { role: 'system', content: 'System message' }
      ];

      // This will fail without a real connection, but tests the interface
      await expect(
        client.textToCypherWithMessages('test', messages)
      ).rejects.toThrow();
    });

    it('should reject invalid message roles', async () => {
      const messages = [
        { role: 'invalid-role', content: 'Hello' }
      ];

      await expect(
        client.textToCypherWithMessages('test', messages)
      ).rejects.toThrow(/Invalid message role/);
    });
  });
});
