import { GoogleGenAI } from '@google/genai';
import { IEmbeddingProvider } from '../interfaces/embedding.interface.js';
import { env } from '../../../config/env.js';

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  private ai: GoogleGenAI | null = null;
  private modelName = 'text-embedding-004';
  private dimension = 768;

  constructor() {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (error) {
        console.error('Failed to initialize GoogleGenAI client:', error);
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not configured in backend environment.');
    }
    const response = await this.ai.models.embedContent({
      model: this.modelName,
      contents: text,
    });
    return response.embeddings?.[0]?.values || [];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not configured in backend environment.');
    }
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
