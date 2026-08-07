import { prisma } from '../../database/prisma.js';

export class SkillsService {
  async getAll() {
    const skills = await prisma.skill.findMany({
      orderBy: [{ displayOrder: 'asc' }, { percentage: 'desc' }],
    });

    if (skills.length === 0) {
      const defaultSkills = [
        // Frontend
        { name: 'React', percentage: 98, category: 'Frontend', displayOrder: 1 },
        { name: 'Next.js', percentage: 95, category: 'Frontend', displayOrder: 2 },
        { name: 'TypeScript', percentage: 93, category: 'Frontend', displayOrder: 3 },
        { name: 'Tailwind CSS', percentage: 97, category: 'Frontend', displayOrder: 4 },
        { name: 'Framer Motion', percentage: 88, category: 'Frontend', displayOrder: 5 },
        // Backend
        { name: 'Node.js', percentage: 94, category: 'Backend', displayOrder: 6 },
        { name: 'Express', percentage: 92, category: 'Backend', displayOrder: 7 },
        { name: 'PostgreSQL', percentage: 89, category: 'Backend', displayOrder: 8 },
        { name: 'Redis', percentage: 85, category: 'Backend', displayOrder: 9 },
        { name: 'GraphQL', percentage: 87, category: 'Backend', displayOrder: 10 },
        // AI / LLM
        { name: 'OpenAI API', percentage: 96, category: 'AI / LLM', displayOrder: 11 },
        { name: 'Prompt Engineering', percentage: 94, category: 'AI / LLM', displayOrder: 12 },
        // Cloud / DevOps
        { name: 'AWS', percentage: 91, category: 'Cloud / DevOps', displayOrder: 13 },
        { name: 'Docker', percentage: 93, category: 'Cloud / DevOps', displayOrder: 14 },
        { name: 'CI/CD', percentage: 90, category: 'Cloud / DevOps', displayOrder: 15 },
        { name: 'Vercel', percentage: 96, category: 'Cloud / DevOps', displayOrder: 16 },
      ];

      for (const item of defaultSkills) {
        await prisma.skill.create({ data: item });
      }

      return prisma.skill.findMany({
        orderBy: [{ displayOrder: 'asc' }, { percentage: 'desc' }],
      });
    }

    return skills;
  }

  async create(data: any) {
    return prisma.skill.create({ data });
  }

  async update(id: string, data: any) {
    const { id: _, createdAt, updatedAt, ...updateData } = data;
    return prisma.skill.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    return prisma.skill.delete({ where: { id } });
  }
}

export const skillsService = new SkillsService();
