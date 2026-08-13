import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { RagService } from './rag/rag.service.js';
import { IngestionService } from './rag/ingestion.service.js';
import { RagRepository } from './rag/rag.repository.js';
import { ChunkingService } from './rag/chunking.service.js';
import { GeminiEmbeddingProvider } from './embedding/gemini-embedding.provider.js';
import { GroqLlmProvider } from './llm/groq-llm.provider.js';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

// DI Setup
const ragRepo = new RagRepository(prisma);
const embeddingProvider = new GeminiEmbeddingProvider();
const llmProvider = new GroqLlmProvider();
const chunkingService = new ChunkingService(3000);

const ragService = new RagService(ragRepo, embeddingProvider, llmProvider, prisma);
const ingestionService = new IngestionService(prisma, embeddingProvider, chunkingService, ragRepo);

const controller = new AiController(ragService, ingestionService, prisma);

// Public AI Routes (Add rate limiting in production)
router.post('/chat', controller.chat);
router.post('/search', controller.search);

// Admin RAG Management Routes
router.get('/admin/rag/status', authenticate, controller.getStatus);
router.post('/admin/rag/index', authenticate, controller.indexPortfolio);
router.get('/admin/rag/documents', authenticate, controller.getDocuments);
router.delete('/admin/rag/documents/:id', authenticate, controller.deleteDocument);

export const aiRouter = router;
