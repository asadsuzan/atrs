import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../../services/providers/OllamaProvider';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../utils/ollama', () => ({
  getOllamaUrl: () => 'http://localhost:11434',
  getOllamaHeaders: () => ({ 'Content-Type': 'application/json' }),
  getModel: () => 'test-model',
  KEEP_ALIVE: '30m',
  ollamaErrorMessage: () => 'Mocked ollama error',
}));

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
    mockFetch.mockReset();
  });

  it('should be available', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('should generate text from prompt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Generated output' }),
    });

    const result = await provider.generate('Hello world', { temperature: 0.5 });
    
    expect(result).toBe('Generated output');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"prompt":"Hello world"'),
    }));
  });

  it('should request JSON format when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"key":"value"}' }),
    });

    await provider.generate('Hello', { format: 'json' });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"format":"json"'),
    }));
  });

  it('should handle API errors during generation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Error',
    });

    await expect(provider.generate('Hello')).rejects.toThrow('Mocked ollama error');
  });

  it('should generate embeddings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2, 0.3] }),
    });

    const result = await provider.embed('Hello world');
    
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/embeddings', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"prompt":"Hello world"'),
    }));
  });
});
