import { prisma } from '../database/prisma.js';
import { IngestionService } from '../modules/ai/rag/ingestion.service.js';
import { LocalTransformerProvider } from '../modules/ai/embedding/local-transformer.provider.js';
import { ChunkingService } from '../modules/ai/rag/chunking.service.js';
import { RagRepository } from '../modules/ai/rag/rag.repository.js';

async function seed() {
  console.log('--- Starting Portfolio Seed ---');

  // 1. Experiences
  const existingExp = await prisma.experience.count();
  if (existingExp === 0) {
    console.log('Seeding experiences...');
    await prisma.experience.createMany({
      data: [
        {
          company: 'TechFlow Systems',
          position: 'Senior Full-Stack Engineer',
          duration: '2022 — Present',
          startDate: '2022-01',
          endDate: 'Present',
          isCurrent: true,
          description: 'Architected microservices, AI workflows, and high-concurrency web applications scaling to 1M+ active users.',
          responsibilities: [
            'Led migration from monolithic architecture to Next.js microservices with 99.9% uptime',
            'Implemented Redis caching layer reducing PostgreSQL database load by 60%',
            'Integrated LLM automated document extraction pipelines with vector embeddings and Groq',
            'Designed high-throughput PostgreSQL schemas with Neon serverless and pgvector'
          ],
          technologies: ['Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'OpenAI/Groq', 'pgvector'],
          order: 1,
          isAiEnabled: true,
        },
        {
          company: 'Stackform Digital',
          position: 'Full-Stack Developer',
          duration: '2020 — 2022',
          startDate: '2020-03',
          endDate: '2022-12',
          isCurrent: false,
          description: 'Built custom SaaS web portals, PostgreSQL data pipelines, and responsive frontend UI components.',
          responsibilities: [
            'Engineered real-time analytics dashboard with Socket.IO and live data streaming',
            'Developed OAuth2 and JWT authentication flows, session handling, and security controls',
            'Optimized client-side rendering performance and SEO across 15+ high-traffic client portals'
          ],
          technologies: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Socket.io', 'Tailwind CSS', 'Redux'],
          order: 2,
          isAiEnabled: true,
        },
        {
          company: 'GreenWorld & Client Solutions',
          position: 'Full-Stack Developer & UI Designer',
          duration: '2018 — 2020',
          startDate: '2018-05',
          endDate: '2020-02',
          isCurrent: false,
          description: 'Designed and built high-performance responsive web applications, modern UI/UX design systems, and client platforms.',
          responsibilities: [
            'Delivered 40+ client projects with 99.8% satisfaction and responsive cross-device layouts',
            'Created interactive UI experiences with Framer Motion, GSAP animations, and Three.js',
            'Collaborated with clients from concept and Figma prototypes to production deployment'
          ],
          technologies: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Figma', 'Tailwind CSS', 'REST APIs'],
          order: 3,
          isAiEnabled: true,
        }
      ]
    });
    console.log('Experiences seeded successfully.');
  } else {
    console.log(`Experiences already exist (${existingExp} records).`);
  }

  // 2. Education
  const existingEdu = await prisma.education.count();
  if (existingEdu === 0) {
    console.log('Seeding education...');
    await prisma.education.createMany({
      data: [
        {
          institution: 'Govt Titumir College',
          degree: 'Bachelor of Science (B.Sc)',
          field: 'Computer Science & Sciences',
          startDate: '2017',
          endDate: '2021',
          grade: 'First Class',
          order: 1,
          isAiEnabled: true,
        }
      ]
    });
    console.log('Education seeded successfully.');
  } else {
    console.log(`Education already exists (${existingEdu} records).`);
  }

  // 3. Site Settings (Profile, About, Contact)
  console.log('Seeding site settings...');
  const settings = [
    { key: 'about_name', value: 'Naimur Rahman Naim' },
    { key: 'about_title', value: 'Full-Stack Developer & UI/UX Designer' },
    { key: 'about_location', value: 'Mirpur-2, Dhaka-1216, Bangladesh' },
    { key: 'about_experience_summary', value: '6+ years building modern web applications, scalable microservices, and AI integrations with 118+ completed projects and 45+ full-stack production apps.' },
    { key: 'about_bio', value: 'I am a Full-Stack Developer and UI/UX Designer with over 6 years of experience building modern web applications, real-time architectures, and AI-driven solutions. I specialize in Next.js, React, Node.js, PostgreSQL/Neon, Redis, pgvector semantic search, and Groq/LLM integrations.' },
    { key: 'contact_email', value: 'naimekattor@gmail.com' },
    { key: 'contact_whatsapp', value: '+880 1518 920 316' },
    { key: 'contact_github', value: 'https://github.com/naimekattor' }
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value, group: 'general' }
    });
  }
  console.log('Site settings seeded successfully.');

  // 4. Ingest and re-index RAG Knowledge Base
  console.log('Ingesting all portfolio content into RAG Knowledge Base...');
  const ragRepo = new RagRepository(prisma);
  const embeddingProvider = new LocalTransformerProvider();
  const chunkingService = new ChunkingService(3000);
  const ingestionService = new IngestionService(prisma, embeddingProvider, chunkingService, ragRepo);

  await ingestionService.syncAllPortfolioContent();
  console.log('--- RAG Ingestion Complete ---');

  const totalDocs = await prisma.ragDocument.count();
  const totalChunks = await prisma.ragChunk.count();
  console.log(`Indexed RAG Documents: ${totalDocs}, Chunks: ${totalChunks}`);
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
