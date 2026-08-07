import { prisma } from '../../database/prisma.js';

export class ProjectsService {
  async getAll(query: { category?: string; status?: string; search?: string }) {
    const where: any = { deletedAt: null };
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status as any;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    if (projects.length === 0 && !query.category && !query.search) {
      const defaultProjects = [
        {
          title: 'Islamic Knowledge Center',
          slug: 'islamic-knowledge-center',
          description:
            'Engineered a high-performance verification platform using Next.js 16 and Supabase, featuring a centralized database of authentic texts and advanced search indexing.',
          impact:
            "Established a 'Single Source of Truth' for community education, providing 100% verified content with sub-second retrieval times.",
          technologies: ['Next.js', 'Supabase', 'PostgreSQL', 'Tailwind CSS'],
          images: ['/hokpath.png'],
          liveUrl: 'https://hokpath.com',
          githubUrl: '#',
          category: 'Web App',
          featured: true,
          order: 1,
        },
        {
          title: 'Refabry E-commerce',
          slug: 'refabry-e-commerce',
          description:
            "Designed a minimalist, high-conversion shopping experience with optimized state management and a seamless 'One-Click' inspired UI flow.",
          impact:
            'Boosted user engagement by 40% through intuitive navigation and a mobile-first responsive architecture.',
          technologies: ['React', 'Node.js', 'Tailwind CSS', 'Redux'],
          images: ['/refabry.png'],
          liveUrl: 'https://loquacious-cucurucho-76d0bb.netlify.app/',
          githubUrl: '#',
          category: 'E-commerce',
          featured: true,
          order: 2,
        },
      ];

      for (const p of defaultProjects) {
        await prisma.project.create({ data: p });
      }

      return prisma.project.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    }

    return projects;
  }

  async getBySlug(slug: string) {
    return prisma.project.findUnique({ where: { slug } });
  }

  async create(data: any) {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return prisma.project.create({
      data: { ...data, slug },
    });
  }

  async update(id: string, data: any) {
    const { id: _, createdAt, updatedAt, deletedAt, ...updateData } = data;
    if (updateData.title && !updateData.slug) {
      updateData.slug = updateData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    return prisma.project.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const projectsService = new ProjectsService();
