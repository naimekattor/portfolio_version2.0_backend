import { RagRepository } from './rag.repository.js';
import { IEmbeddingProvider } from '../interfaces/embedding.interface.js';
import { ILLMProvider, RagResponse, RetrievalSource } from '../interfaces/llm.interface.js';

import { PrismaClient } from '@prisma/client';

export class RagService {
  private ragRepo: RagRepository;
  private embeddingProvider: IEmbeddingProvider;
  private llmProvider: ILLMProvider;
  private prisma: PrismaClient;

  constructor(
    ragRepo: RagRepository, 
    embeddingProvider: IEmbeddingProvider, 
    llmProvider: ILLMProvider,
    prisma: PrismaClient
  ) {
    this.ragRepo = ragRepo;
    this.embeddingProvider = embeddingProvider;
    this.llmProvider = llmProvider;
    this.prisma = prisma;
  }

  async askQuestion(query: string): Promise<RagResponse> {
    const startTime = Date.now();
    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

      // 2. Retrieve top chunks (Top K = 15, threshold = 0.10 for local embeddings)
      const chunks = await this.ragRepo.searchSimilarChunks(queryEmbedding, 15, 0.10);

      if (chunks.length === 0) {
        await this.logQuery(query, "No context found.", startTime, 0, [], true);
        return {
          answer: "I couldn't find any relevant information in the portfolio to answer your question.",
          sources: []
        };
      }

      // 3. Build context string
      let context = '';
      const sources: RetrievalSource[] = [];
      const addedSources = new Set<string>();
      const similarityScores: number[] = [];

      for (const chunk of chunks) {
        context += `[Source: ${chunk.title} (${chunk.sourceType})]\n${chunk.content}\n\n`;
        similarityScores.push(chunk.similarity);
        
        if (!addedSources.has(chunk.documentId)) {
          let sourceData = chunk.source;
          
          // If it's a project, fetch the full project details for the frontend UI cards
          if (chunk.sourceType === 'Project') {
            try {
              const project = await this.prisma.project.findUnique({ where: { id: chunk.source } });
              if (project) {
                sourceData = JSON.stringify({
                  title: project.title,
                  description: project.description,
                  technologies: project.technologies,
                  images: project.images,
                  liveUrl: project.liveUrl,
                  githubUrl: project.githubUrl
                });
              }
            } catch (e) {
              console.error('Failed to fetch project for AI source', e);
            }
          }

          sources.push({
            documentId: chunk.documentId,
            title: chunk.title,
            source: sourceData,
            relevance: chunk.similarity
          });
          addedSources.add(chunk.documentId);
        }
      }

      // 4. Generate LLM response
      const response = await this.llmProvider.generateRagResponse(query, context);
      response.sources = sources;

      await this.logQuery(query, response.answer, startTime, chunks.length, similarityScores, true);

      return response;
    } catch (error: any) {
      await this.logQuery(query, null, startTime, 0, [], false, error.message);
      throw error;
    }
  }

  private async logQuery(
    query: string, 
    response: string | null, 
    startTime: number, 
    retrievedChunks: number,
    similarityScores: number[],
    isSuccessful: boolean,
    errorMessage?: string
  ) {
    try {
      const durationMs = Date.now() - startTime;
      await this.prisma.ragQueryLog.create({
        data: {
          query,
          response,
          durationMs,
          retrievedChunks,
          similarityScores,
          isSuccessful,
          errorMessage
        }
      });
    } catch (e) {
      console.error('Failed to log RAG query', e);
    }
  }
}
