export interface GenerateOptions {
  numPredict?: number;
  temperature?: number;
  format?: 'json';
}

export interface LLMProvider {
  /** Check if the provider is currently available/configured */
  isAvailable(): boolean;
  
  /** Generate a text completion (or JSON if format: 'json') from a prompt */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  
  /** Generate a vector embedding for the input string */
  embed(text: string): Promise<number[]>;
}
