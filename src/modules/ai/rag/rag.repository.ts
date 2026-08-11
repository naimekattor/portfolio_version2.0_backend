import { PrismaClient, Prisma } from '@prisma/client';

export class RagRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Insert chunks with vector embeddings.
   * Since Prisma doesn't natively support creating vectors via Prisma client, we use $executeRaw.
   */
  async insertChunks(
    documentId: string,
    chunks: { content: string; chunkIndex: number; embedding: number[]; metadata?: any }[]
  ) {
    for (const chunk of chunks) {
      const embeddingString = `[${chunk.embedding.join(',')}]`;
      const metadataJson = chunk.metadata ? JSON.stringify(chunk.metadata) : null;
      
      await this.prisma.$executeRaw`
        INSERT INTO rag_chunks (id, "documentId", content, "chunkIndex", metadata, embedding, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(), 
          ${documentId}, 
          ${chunk.content}, 
          ${chunk.chunkIndex}, 
          ${metadataJson}::jsonb, 
          ${embeddingString}::vector, 
          NOW(), 
          NOW()
        )
      `;
    }
  }

  /**
   * Search for similar chunks using cosine similarity (<=>).
   */
  async searchSimilarChunks(queryEmbedding: number[], topK: number = 5, similarityThreshold: number = 0.5) {
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    // We compute cosine similarity as 1 - (embedding <=> queryEmbedding)
    const results = await this.prisma.$queryRaw`
      SELECT 
        c.id, 
        c."documentId", 
        c.content,
        c.metadata,
        d.title,
        d.source,
        d."sourceType",
        1 - (c.embedding <=> ${embeddingString}::vector) as similarity
      FROM rag_chunks c
      JOIN rag_documents d ON c."documentId" = d.id
      WHERE 1 - (c.embedding <=> ${embeddingString}::vector) >= ${similarityThreshold}
      ORDER BY c.embedding <=> ${embeddingString}::vector
      LIMIT ${topK}
    `;

    return results as any[];
  }
}
