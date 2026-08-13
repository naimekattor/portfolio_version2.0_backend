import { pipeline, Pipeline } from '@xenova/transformers';

export class EmbeddingModelManager {
  private static instance: EmbeddingModelManager;
  private extractor: Promise<Pipeline> | null = null;
  private modelName: string;

  private constructor(modelName: string) {
    this.modelName = modelName;
  }

  public static getInstance(modelName: string): EmbeddingModelManager {
    if (!EmbeddingModelManager.instance) {
      EmbeddingModelManager.instance = new EmbeddingModelManager(modelName);
    }
    return EmbeddingModelManager.instance;
  }

  /**
   * Lazily loads the embedding model as a singleton.
   */
  public async getExtractor(): Promise<Pipeline> {
    if (!this.extractor) {
      console.log(`[Embedding] Initializing local model: ${this.modelName}`);
      
      // Load pipeline in background
      this.extractor = pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized for lower memory
      }).then((pipe) => {
        console.log(`[Embedding] Model ${this.modelName} loaded successfully.`);
        return pipe;
      }).catch((err) => {
        console.error(`[Embedding] Failed to load model ${this.modelName}`, err);
        this.extractor = null;
        throw err;
      });
    }
    
    return this.extractor;
  }
}
