export interface IEmbeddingProvider {
  /**
   * Generates a vector embedding for a single text string.
   */
  generateEmbedding(text: string): Promise<number[]>;
  
  /**
   * Generates vector embeddings for an array of text strings.
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  
  /**
   * Returns the dimension of the embedding space.
   */
  getDimension(): number;
  
  /**
   * Returns the model identifier being used.
   */
  getModelName(): string;
}
