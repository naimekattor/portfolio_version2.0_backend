import { prisma } from '../../database/prisma.js';

export class BlogsService {
  async getAll(query: { status?: string; search?: string; categoryId?: string }) {
    const where: any = { deletedAt: null };
    if (query.status) where.status = query.status as any;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const blogs = await prisma.blog.findMany({
      where,
      include: { category: true, tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (blogs.length === 0 && !query.search && !query.status) {
      const defaultBlogs = [
        {
          title: 'Architecting for Scale: Lessons from 1M Users',
          slug: 'architecting-for-scale-lessons-from-1m-users',
          excerpt:
            'How we handled a sudden 10x traffic spike without downtime using serverless functions and edge caching.',
          content:
            'How we handled a sudden 10x traffic spike without downtime using serverless functions and edge caching.',
          readingTime: 8,
          status: 'PUBLISHED' as const,
          isFeatured: true,
          publishedAt: new Date('2023-10-12'),
        },
        {
          title: 'The Future of AI in Web Development',
          slug: 'the-future-of-ai-in-web-development',
          excerpt:
            'Beyond chatbots: Integrating LLMs into core application logic for smarter user experiences.',
          content:
            'Beyond chatbots: Integrating LLMs into core application logic for smarter user experiences.',
          readingTime: 6,
          status: 'PUBLISHED' as const,
          isFeatured: true,
          publishedAt: new Date('2023-09-28'),
        },
      ];

      for (const b of defaultBlogs) {
        await prisma.blog.create({ data: b });
      }

      return prisma.blog.findMany({
        where,
        include: { category: true, tags: { include: { tag: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return blogs;
  }

  async getBySlug(slug: string) {
    return prisma.blog.findUnique({
      where: { slug },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async create(data: any) {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { tags, category, ...blogData } = data;

    const blog = await prisma.blog.create({
      data: {
        ...blogData,
        slug,
      },
    });

    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });
        await prisma.blogTag.create({
          data: { blogId: blog.id, tagId: tag.id },
        });
      }
    }

    return this.getBySlug(slug);
  }

  async update(id: string, data: any) {
    const { id: _, createdAt, updatedAt, deletedAt, category, tags, ...blogData } = data;
    if (blogData.title && !blogData.slug) {
      blogData.slug = blogData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    await prisma.blog.update({
      where: { id },
      data: blogData,
    });

    return prisma.blog.findUnique({
      where: { id },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async delete(id: string) {
    return prisma.blog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const blogsService = new BlogsService();
