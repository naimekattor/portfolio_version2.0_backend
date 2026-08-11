import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { ChunkingService } from './chunking.service.js';
import { IEmbeddingProvider } from '../interfaces/embedding.interface.js';
import { RagRepository } from './rag.repository.js';

export class IngestionService {
  private prisma: PrismaClient;
  private chunking: ChunkingService;
  private embeddingProvider: IEmbeddingProvider;
  private ragRepo: RagRepository;

  constructor(
    prisma: PrismaClient,
    embeddingProvider: IEmbeddingProvider,
    chunking: ChunkingService,
    ragRepo: RagRepository
  ) {
    this.prisma = prisma;
    this.embeddingProvider = embeddingProvider;
    this.chunking = chunking;
    this.ragRepo = ragRepo;
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async ingestDocument(
    sourceId: string, 
    sourceType: string, 
    title: string, 
    content: string, 
    metadata?: any
  ): Promise<void> {
    const checksum = this.generateChecksum(content);
    
    const existing = await this.prisma.ragDocument.findFirst({
      where: { checksum }
    });

    if (existing && existing.status === 'INDEXED') {
      return; // Skip if already indexed with same content
    }

    // Delete any old document from this source to replace it
    await this.prisma.ragDocument.deleteMany({
      where: { source: sourceId, sourceType }
    });

    const doc = await this.prisma.ragDocument.create({
      data: {
        title,
        source: sourceId,
        sourceType,
        content,
        metadata: metadata || {},
        checksum,
        status: 'PENDING'
      }
    });

    try {
      const chunks = this.chunking.chunkText(content);
      const chunkData = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        const embedding = await this.embeddingProvider.generateEmbedding(text);
        
        chunkData.push({
          content: text,
          chunkIndex: i,
          embedding,
          metadata: { ...metadata, tokenEstimate: Math.ceil(text.length / 4) }
        });
      }

      await this.ragRepo.insertChunks(doc.id, chunkData);

      await this.prisma.ragDocument.update({
        where: { id: doc.id },
        data: { status: 'INDEXED', indexedAt: new Date() }
      });
      
    } catch (error) {
      await this.prisma.ragDocument.update({
        where: { id: doc.id },
        data: { status: 'FAILED' }
      });
      throw error;
    }
  }

  async syncAllPortfolioContent() {
    // Projects
    const projects = await this.prisma.project.findMany({ where: { isAiEnabled: true, status: 'PUBLISHED' } });
    for (const p of projects) {
      const content = `${p.title}\n\n${p.description}\n\nTechnologies: ${p.technologies.join(', ')}\n\nImpact: ${p.impact || ''}`;
      await this.ingestDocument(p.id, 'Project', p.title, content, { url: p.liveUrl, category: p.category });
    }

    // Blogs
    const blogs = await this.prisma.blog.findMany({ where: { isAiEnabled: true, status: 'PUBLISHED' } });
    for (const b of blogs) {
      const content = `${b.title}\n\n${b.excerpt}\n\n${b.content}`;
      await this.ingestDocument(b.id, 'Blog', b.title, content, { slug: b.slug });
    }

    // Experiences
    const experiences = await this.prisma.experience.findMany({ where: { isAiEnabled: true } });
    for (const e of experiences) {
      const content = `${e.position} at ${e.company} (${e.duration})\n\n${e.description}\n\nResponsibilities: ${e.responsibilities.join(', ')}\n\nTechnologies: ${e.technologies.join(', ')}`;
      await this.ingestDocument(e.id, 'Experience', `${e.position} at ${e.company}`, content);
    }
    
    // Education
    const educations = await this.prisma.education.findMany({ where: { isAiEnabled: true } });
    for (const e of educations) {
      const content = `${e.degree} in ${e.field} at ${e.institution}\n${e.startDate} - ${e.endDate}\nGrade: ${e.grade || ''}`;
      await this.ingestDocument(e.id, 'Education', `${e.degree} at ${e.institution}`, content);
    }

    // Skills
    const skills = await this.prisma.skill.findMany({ where: { isAiEnabled: true } });
    for (const s of skills) {
      const content = `Skill: ${s.name}\nCategory: ${s.category}\nProficiency: ${s.percentage}%`;
      await this.ingestDocument(s.id, 'Skill', s.name, content);
    }
  }
}
