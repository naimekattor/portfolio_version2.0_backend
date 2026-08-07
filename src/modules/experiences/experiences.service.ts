import { prisma } from '../../database/prisma.js';

export class ExperiencesService {
  async getAll() {
    return prisma.experience.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(data: any) {
    return prisma.experience.create({ data });
  }

  async update(id: string, data: any) {
    return prisma.experience.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.experience.delete({ where: { id } });
  }
}

export const experiencesService = new ExperiencesService();
