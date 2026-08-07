import { prisma } from '../../database/prisma.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { ApiError } from '../../utils/api-error.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class AuthService {
  async ensureSuperAdminExists() {
    try {
      const adminCount = await prisma.admin.count();
      if (adminCount === 0) {
        const hashedPassword = await hashPassword(env.ADMIN_PASSWORD);
        await prisma.admin.create({
          data: {
            email: env.ADMIN_EMAIL,
            password: hashedPassword,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            isVerified: true,
          },
        });
        logger.info('Default Super Admin account created successfully');
      }
    } catch (error) {
      logger.error('Database query failed during super admin check. Please verify DATABASE_URL credentials in backend/.env', error);
    }
  }

  async login(email: string, pass: string, ipAddress?: string, userAgent?: string) {
    await this.ensureSuperAdminExists();

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || admin.deletedAt) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await comparePassword(pass, admin.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const payload = { id: admin.id, email: admin.email, role: admin.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        token: accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);
    const session = await prisma.adminSession.findUnique({
      where: { refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(401, 'Refresh token expired or invalid');
    }

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await prisma.adminSession.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.adminSession.deleteMany({
        where: { refreshToken },
      });
    }
  }
}

export const authService = new AuthService();
