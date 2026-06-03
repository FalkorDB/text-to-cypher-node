/**
 * Tests for text-to-cypher-node
 * 
 * These tests don't require a live FalkorDB instance or API keys by default.
 * Live provider model discovery tests are skipped unless API key env vars are set.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextToCypher } from '../index';
import type { TextToCypherResponse, TokenUsage } from '../index';

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
    const createLiveClient = (apiKey: string) => new TextToCypher({
      model: 'gpt-4o-mini',
      apiKey,
      falkordbConnection: 'falkor://localhost:6379'
    });

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

    (process.env.TEXT_TO_CYPHER_MODEL_DISCOVERY_API_KEY ? it : it.skip)('should list all available models with live credentials', async () => {
      const liveClient = createLiveClient(process.env.TEXT_TO_CYPHER_MODEL_DISCOVERY_API_KEY!);
      const models = await liveClient.listModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    (process.env.OPENAI_API_KEY ? it : it.skip)('should list OpenAI models with live credentials', async () => {
      const liveClient = createLiveClient(process.env.OPENAI_API_KEY!);
      const models = await liveClient.listModelsByProvider('openai');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    (process.env.ANTHROPIC_API_KEY ? it : it.skip)('should list Anthropic models with live credentials', async () => {
      const liveClient = createLiveClient(process.env.ANTHROPIC_API_KEY!);
      const models = await liveClient.listModelsByProvider('anthropic');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    (process.env.GEMINI_API_KEY ? it : it.skip)('should list Gemini models with live credentials', async () => {
      const liveClient = createLiveClient(process.env.GEMINI_API_KEY!);
      const models = await liveClient.listModelsByProvider('gemini');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should handle Ollama when not running', async () => {
      // Ollama might not be running in CI, so we expect this to potentially fail
      try {
        const models = await client.listModelsByProvider('ollama');
        expect(Array.isArray(models)).toBe(true);
      } catch (error: any) {
        // Expected when Ollama is not running
        expect(error.message).toContain('Failed to list models');
      }
    });

    (process.env.OPENAI_API_KEY ? it : it.skip)('should handle provider name case-insensitively', async () => {
      const liveClient = createLiveClient(process.env.OPENAI_API_KEY!);
      const modelsLower = await liveClient.listModelsByProvider('openai');
      const modelsUpper = await liveClient.listModelsByProvider('OPENAI');
      const modelsMixed = await liveClient.listModelsByProvider('OpenAI');
      
      expect(modelsLower).toEqual(modelsUpper);
      expect(modelsLower).toEqual(modelsMixed);
    });

    it('should reject invalid provider', async () => {
      await expect(
        client.listModelsByProvider('invalid-provider')
      ).rejects.toThrow(/Unknown provider/);
    });

    // text-to-cypher >= 0.1.19 merges each provider's live list with a curated static
    // catalog, so catalog-backed providers return well-known models even without an API key.
    it('should return curated models without an API key', async () => {
      const noKeyClient = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: '',
        falkordbConnection: 'falkor://localhost:6379'
      });
      for (const provider of ['openai', 'anthropic', 'gemini']) {
        const models = await noKeyClient.listModelsByProvider(provider);
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);
      }
    }, 30000);

    it('should aggregate curated models across providers without an API key', async () => {
      const noKeyClient = new TextToCypher({
        model: 'gpt-4o-mini',
        apiKey: '',
        falkordbConnection: 'falkor://localhost:6379'
      });
      const models = await noKeyClient.listModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      // Non-OpenAI providers are namespaced with a provider prefix.
      expect(models.some(model => model.includes('::'))).toBe(true);
    }, 30000);
  });

  describe('TokenUsage', () => {
    it('should expose an optional tokenUsage field on the response type', () => {
      const usage: TokenUsage = {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      };

      const response: TextToCypherResponse = {
        status: 'success',
        answer: 'ok',
        tokenUsage: usage,
      };

      expect(response.tokenUsage).toBeDefined();
      expect(response.tokenUsage?.promptTokens).toBe(10);
      expect(response.tokenUsage?.completionTokens).toBe(5);
      expect(response.tokenUsage?.totalTokens).toBe(15);
    });

    it('should allow responses without tokenUsage', () => {
      const response: TextToCypherResponse = {
        status: 'error',
        error: 'boom',
      };

      expect(response.tokenUsage).toBeUndefined();
    });
  });
});
