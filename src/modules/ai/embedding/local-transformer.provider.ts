import { IEmbeddingProvider } from '../interfaces/embedding.interface.js';
import { EmbeddingModelManager } from './model-manager.js';

export class LocalTransformerProvider implements IEmbeddingProvider {
  private modelName = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
  private dimension = 384;
  private manager: EmbeddingModelManager;

  constructor() {
    // Model specified in env or fallback to our selected multilingual model
    this.modelName = process.env.EMBEDDING_MODEL || this.modelName;
    this.manager = EmbeddingModelManager.getInstance(this.modelName);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await this.manager.getExtractor();
    
    // Generate embeddings
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    
    // Convert Float32Array to standard number array
    const embeddingArray = Array.from(output.data) as number[];
    return embeddingArray;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Since transformers.js feature-extraction currently processes single strings or arrays,
    // we can pass the array directly.
    const extractor = await this.manager.getExtractor();
    
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    
    // The output for multiple texts is a flat array or 2D tensor.
    // Assuming output.tolist() works on the Tensor object returned.
    const embeddings = output.tolist();
    
    // If tolist() returns flat, we might need to chunk it. But tolist() on a 2D tensor returns number[][]
    return embeddings as number[][];
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.modelName;
  }
}
