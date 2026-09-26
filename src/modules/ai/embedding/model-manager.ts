import type { FeatureExtractionPipeline } from '@xenova/transformers';

export class EmbeddingModelManager {
  private static instance: EmbeddingModelManager;
  private extractor: Promise<FeatureExtractionPipeline> | null = null;
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
   * Lazily loads the embedding model as a singleton using dynamic import for ESM compatibility in CommonJS runtime.
   */
  public async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      console.log(`[Embedding] Initializing local model: ${this.modelName}`);
      
      this.extractor = (async () => {
        // Dynamically import ESM package @xenova/transformers
        const transformers = await import('@xenova/transformers');

        // Configure transformers environment for serverless /tmp
        transformers.env.cacheDir = '/tmp';
        transformers.env.useBrowserCache = false;
        transformers.env.allowLocalModels = false;

        const pipe = await transformers.pipeline('feature-extraction', this.modelName, {
          quantized: true,
        });

        console.log(`[Embedding] Model ${this.modelName} loaded successfully.`);
        return pipe as FeatureExtractionPipeline;
      })().catch((err) => {
        console.error(`[Embedding] Failed to load model ${this.modelName}`, err);
        this.extractor = null;
        throw err;
      });
    }
    
    return this.extractor;
  }
}
