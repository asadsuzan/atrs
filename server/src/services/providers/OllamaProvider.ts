import { LLMProvider, GenerateOptions } from './LLMProvider';
import { getOllamaUrl, getOllamaHeaders, getModel, KEEP_ALIVE, ollamaErrorMessage } from '../../utils/ollama';

export class OllamaProvider implements LLMProvider {
  isAvailable(): boolean {
    return true; // Assume always true for now, can be checked via network ping if needed
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = getModel();
    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: getOllamaHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...(options?.format === 'json' ? { format: 'json' } : {}),
        keep_alive: KEEP_ALIVE,
        options: { 
          temperature: options?.temperature ?? 0.7, 
          top_p: 0.9, 
          ...(options?.numPredict ? { num_predict: options.numPredict } : {})
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(ollamaErrorMessage(res.status, body, model));
    }
    
    const data: any = await res.json();
    return data.response;
  }

  async embed(text: string): Promise<number[]> {
    const model = getModel();
    // Use the /api/embeddings endpoint for Ollama
    const res = await fetch(`${getOllamaUrl()}/api/embeddings`, {
      method: 'POST',
      headers: getOllamaHeaders(),
      body: JSON.stringify({
        model,
        prompt: text,
        keep_alive: KEEP_ALIVE,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(ollamaErrorMessage(res.status, body, model));
    }
    
    const data: any = await res.json();
    return data.embedding;
  }
}
