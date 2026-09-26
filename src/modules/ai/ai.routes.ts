import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { RagService } from './rag/rag.service.js';
import { IngestionService } from './rag/ingestion.service.js';
import { RagRepository } from './rag/rag.repository.js';
import { ChunkingService } from './rag/chunking.service.js';
import { GeminiEmbeddingProvider } from './embedding/gemini-embedding.provider.js';
import { GroqLlmProvider } from './llm/groq-llm.provider.js';
import { LocalTransformerProvider } from './embedding/local-transformer.provider.js';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/auth.js';
import { env } from '../../config/env.js';

const router = Router();

let controller: AiController | null = null;

function getController(): AiController {
  if (!controller) {
    const ragRepo = new RagRepository(prisma);
    const embeddingProvider = env.EMBEDDING_PROVIDER === 'gemini' 
      ? new GeminiEmbeddingProvider() 
      : new LocalTransformerProvider();
    const llmProvider = new GroqLlmProvider();
    const chunkingService = new ChunkingService(3000);

    const ragService = new RagService(ragRepo, embeddingProvider, llmProvider, prisma);
    const ingestionService = new IngestionService(prisma, embeddingProvider, chunkingService, ragRepo);

    controller = new AiController(ragService, ingestionService, prisma);
  }
  return controller;
}

// Public AI Routes (Add rate limiting in production)
router.post('/chat', (req, res, next) => getController().chat(req, res, next));
router.post('/search', (req, res, next) => getController().search(req, res, next));

// Admin RAG Management Routes
router.get('/admin/rag/status', authenticate, (req, res, next) => getController().getStatus(req, res, next));
router.post('/admin/rag/index', authenticate, (req, res, next) => getController().indexPortfolio(req, res, next));
router.get('/admin/rag/documents', authenticate, (req, res, next) => getController().getDocuments(req, res, next));
router.delete('/admin/rag/documents/:id', authenticate, (req, res, next) => getController().deleteDocument(req, res, next));

export const aiRouter = router;
