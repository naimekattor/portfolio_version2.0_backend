import { GoogleGenAI } from '@google/genai';
import { IEmbeddingProvider } from '../interfaces/embedding.interface.js';
import { env } from '../../../config/env.js';

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  private ai: GoogleGenAI;
  private modelName = 'text-embedding-004';
  private dimension = 768;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: this.modelName,
      contents: text,
    });
    return response.embeddings?.[0]?.values || [];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.ai.models.embedContent({
      model: this.modelName,
      contents: texts,
    });
    return response.embeddings?.map(e => e.values || []) || [];
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.modelName;
  }
}
