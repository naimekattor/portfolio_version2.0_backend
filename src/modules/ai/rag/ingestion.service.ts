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
    // 1. Comprehensive Profile & About Overview (Critical for general questions, experience summaries, and introductions)
    const settings = await this.prisma.siteSetting.findMany();
    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.key] = s.value;
      }
    });

    const name = settingsMap.about_name || 'Naimur Rahman Naim';
    const title = settingsMap.about_title || 'Full-Stack Developer & UI/UX Designer';
    const location = settingsMap.about_location || 'Mirpur-2, Dhaka-1216, Bangladesh';
    const expSummary = settingsMap.about_experience_summary || '6+ years building modern web applications, high-concurrency microservices, and AI automations.';
    const bio = settingsMap.about_bio || 'I am a Full-Stack Developer and UI/UX Designer with over 6 years of experience building scalable web applications, real-time architectures, and AI-driven solutions.';
    const email = settingsMap.contact_email || 'naimekattor@gmail.com';
    const whatsapp = settingsMap.contact_whatsapp || '+880 1518 920 316';
    const github = settingsMap.contact_github || 'https://github.com/naimekattor';

    const profileContent = `Name: ${name}
Title: ${title}
Location: ${location}
Professional Experience: ${expSummary}
Biography: ${bio}
Key Metrics: 118+ completed projects, 45+ full-stack production web applications, 18+ performance optimizations.
Core Specialties: Next.js, React, Node.js, Express, TypeScript, PostgreSQL (Neon Serverless & pgvector), Redis, AI/LLM integration (Groq, OpenAI, RAG systems), Docker, Tailwind CSS, UI/UX Design (Figma).
Contact Information: Email: ${email} | WhatsApp: ${whatsapp} | GitHub: ${github}`;

    await this.ingestDocument(
      'profile-bio-overview',
      'Profile',
      `${name} — Profile, Background & Experience Overview`,
      profileContent,
      { type: 'profile_overview' }
    );

    // 2. Services & Engineering Capabilities
    const servicesContent = `Engineering Services & Solutions Provided by ${name}:
1. Website Design & UI/UX Design: Responsive design for mobile and desktop, user experience strategy, visual branding, Figma prototypes, design systems, and design-to-code conversion.
2. Full-Stack Web Development: Scalable web applications with React.js, Next.js, Node.js, Express, PostgreSQL, MongoDB, Redis caching, real-time WebSocket/Socket.io features, and secure authentication (OAuth2, JWT).
3. AI & RAG Solutions: Intelligent portfolio assistants, LLM integration, automated document processing, semantic search with vector embeddings (pgvector), and prompt engineering.
4. Performance Optimization & Cloud: Database indexing, query optimization, CDN caching, Docker containerization, CI/CD pipelines, and cloud deployments (Vercel, AWS, Netlify).`;

    await this.ingestDocument(
      'engineering-services-overview',
      'Services',
      'Engineering Services, Solutions & Capabilities',
      servicesContent,
      { type: 'services' }
    );

    // 3. Projects
    const projects = await this.prisma.project.findMany({ where: { isAiEnabled: true, status: 'PUBLISHED' } });
    for (const p of projects) {
      const content = `${p.title}\n\n${p.description}\n\nTechnologies: ${p.technologies.join(', ')}\n\nImpact: ${p.impact || ''}`;
      await this.ingestDocument(p.id, 'Project', p.title, content, { url: p.liveUrl, category: p.category });
    }

    // 4. Blogs
    const blogs = await this.prisma.blog.findMany({ where: { isAiEnabled: true, status: 'PUBLISHED' } });
    for (const b of blogs) {
      const content = `${b.title}\n\n${b.excerpt}\n\n${b.content}`;
      await this.ingestDocument(b.id, 'Blog', b.title, content, { slug: b.slug });
    }

    // 5. Experiences
    const experiences = await this.prisma.experience.findMany({ where: { isAiEnabled: true } });
    for (const e of experiences) {
      const content = `Work Experience: ${e.position} at ${e.company} (${e.duration})\n\nRole Description: ${e.description || ''}\n\nKey Responsibilities & Achievements:\n${(e.responsibilities || []).map((r: string) => `- ${r}`).join('\n')}\n\nTechnologies & Tools: ${(e.technologies || []).join(', ')}`;
      await this.ingestDocument(e.id, 'Experience', `${e.position} at ${e.company}`, content, { company: e.company, position: e.position, duration: e.duration });
    }
    
    // 6. Education
    const educations = await this.prisma.education.findMany({ where: { isAiEnabled: true } });
    for (const e of educations) {
      const content = `Education: ${e.degree} in ${e.field} at ${e.institution}\nTimeline: ${e.startDate || ''} - ${e.endDate || ''}\nGrade/Honor: ${e.grade || ''}`;
      await this.ingestDocument(e.id, 'Education', `${e.degree} at ${e.institution}`, content);
    }

    // 7. Skills
    const skills = await this.prisma.skill.findMany({ where: { isAiEnabled: true } });
    for (const s of skills) {
      const content = `Technical Skill: ${s.name}\nCategory: ${s.category}\nProficiency: ${s.percentage}%`;
      await this.ingestDocument(s.id, 'Skill', s.name, content);
    }
  }
}
