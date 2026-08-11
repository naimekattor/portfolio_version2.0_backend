export interface RetrievalSource {
  documentId: string;
  title: string;
  source: string;
  relevance?: number;
}

export interface RagResponse {
  answer: string;
  sources: RetrievalSource[];
}

export interface ILLMProvider {
  /**
   * Generates a grounded response based strictly on the provided context.
   */
  generateRagResponse(query: string, context: string): Promise<RagResponse>;
  
  /**
   * Returns the LLM model identifier being used.
   */
  getModelName(): string;
}
