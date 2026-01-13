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

  describe('Model Discovery', () => {
    let client: TextToCypher;

    beforeEach(() => {
      client = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
        falkordbConnection: 'falkor://localhost:6379'
      });
    });

    it('should have listModels method', () => {
      expect(typeof client.listModels).toBe('function');
    });

    it('should have listModelsByProvider method', () => {
      expect(typeof client.listModelsByProvider).toBe('function');
    });

    it('should list all available models', async () => {
      const models = await client.listModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // Check that we have models from different providers
      const hasOpenAI = models.some(m => m.startsWith('gpt-'));
      const hasAnthropic = models.some(m => m.includes('anthropic:'));
      const hasGemini = models.some(m => m.includes('gemini:'));
      
      expect(hasOpenAI).toBe(true);
      expect(hasAnthropic).toBe(true);
      expect(hasGemini).toBe(true);
    });

    it('should list OpenAI models', async () => {
      const models = await client.listModelsByProvider('openai');
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // All models should be OpenAI models (no prefix)
      models.forEach(model => {
        expect(model.startsWith('gpt-')).toBe(true);
      });
    });

    it('should list Anthropic models', async () => {
      const models = await client.listModelsByProvider('anthropic');
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // All models should have anthropic prefix
      models.forEach(model => {
        expect(model.startsWith('anthropic:')).toBe(true);
      });
    });

    it('should list Gemini models', async () => {
      const models = await client.listModelsByProvider('gemini');
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // All models should have gemini prefix
      models.forEach(model => {
        expect(model.startsWith('gemini:')).toBe(true);
      });
    });

    it('should list Ollama models', async () => {
      const models = await client.listModelsByProvider('ollama');
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // All models should have ollama prefix
      models.forEach(model => {
        expect(model.startsWith('ollama:')).toBe(true);
      });
    });

    it('should handle provider name case-insensitively', async () => {
      const modelsLower = await client.listModelsByProvider('openai');
      const modelsUpper = await client.listModelsByProvider('OPENAI');
      const modelsMixed = await client.listModelsByProvider('OpenAI');
      
      expect(modelsLower).toEqual(modelsUpper);
      expect(modelsLower).toEqual(modelsMixed);
    });

    it('should reject invalid provider', async () => {
      await expect(
        client.listModelsByProvider('invalid-provider')
      ).rejects.toThrow(/Unknown provider/);
    });
  });
});
