import { Request, Response, NextFunction } from 'express';
import { RagService } from './rag/rag.service.js';
import { IngestionService } from './rag/ingestion.service.js';
import { PrismaClient } from '@prisma/client';

export class AiController {
  private ragService: RagService;
  private ingestionService: IngestionService;
  private prisma: PrismaClient;

  constructor(ragService: RagService, ingestionService: IngestionService, prisma: PrismaClient) {
    this.ragService = ragService;
    this.ingestionService = ingestionService;
    this.prisma = prisma;
  }

  // PUBLIC AI ENDPOINTS
  chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, message: 'Query is required.' });
      }

      const response = await this.ragService.askQuestion(query);
      res.status(200).json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req.body;
      // Basically just fetching sources without LLM synthesis
      // Re-using chat endpoint logic for now, but skipping LLM part if needed.
      // Or just call chat.
      const response = await this.ragService.askQuestion(query);
      res.status(200).json({ success: true, data: response.sources });
    } catch (error) {
      next(error);
    }
  };

  // ADMIN ENDPOINTS
  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const totalDocs = await this.prisma.ragDocument.count();
      const totalChunks = await this.prisma.ragChunk.count();
      const indexedDocs = await this.prisma.ragDocument.count({ where: { status: 'INDEXED' } });
      const failedDocs = await this.prisma.ragDocument.count({ where: { status: 'FAILED' } });
      
      const lastIndexed = await this.prisma.ragDocument.findFirst({
        orderBy: { indexedAt: 'desc' },
        select: { indexedAt: true }
      });

      res.status(200).json({
        success: true,
        data: {
          totalDocs,
          totalChunks,
          indexedDocs,
          failedDocs,
          lastIndexedAt: lastIndexed?.indexedAt || null
        }
      });
    } catch (error) {
      next(error);
    }
  };

  indexPortfolio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Background indexing job. 
      // Does not block the HTTP request. A queue like BullMQ can be added later.
      this.ingestionService.syncAllPortfolioContent().catch(err => {
        console.error('Background indexing failed:', err);
      });
      
      res.status(200).json({ success: true, message: 'Indexing started in the background.' });
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docs = await this.prisma.ragDocument.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { chunks: true } } }
      });
      res.status(200).json({ success: true, data: docs });
    } catch (error) {
      next(error);
    }
  };
  
  deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.prisma.ragDocument.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Document removed from index.' });
    } catch (error) {
      next(error);
    }
  };
}
