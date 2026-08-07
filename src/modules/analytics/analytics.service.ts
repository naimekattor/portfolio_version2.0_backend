import { prisma } from '../../database/prisma.js';
import { parseUserAgent } from '../../utils/user-agent.js';
import { notifyPageView } from '../../socket/index.js';

export interface TrackPayload {
  visitorId: string;
  url: string;
  path: string;
  title?: string;
  referrer?: string;
  ip?: string;
  userAgent?: string;
  language?: string;
  screenSize?: string;
  country?: string;
  city?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export class AnalyticsService {
  async trackPageView(data: TrackPayload) {
    const { browser, os, device } = parseUserAgent(data.userAgent);

    let visitor = await prisma.visitor.findUnique({
      where: { visitorId: data.visitorId },
    });

    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: {
          visitorId: data.visitorId,
          ip: data.ip,
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          browser,
          device,
          os,
          language: data.language || 'en',
          screenSize: data.screenSize,
        },
      });
    }

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    let session = await prisma.session.findFirst({
      where: {
        visitorId: data.visitorId,
        updatedAt: { gte: thirtyMinsAgo },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) {
      session = await prisma.session.create({
        data: {
          visitorId: data.visitorId,
          landingPage: data.path,
          isBounce: true,
        },
      });
    } else {
      await prisma.session.update({
        where: { id: session.id },
        data: {
          exitPage: data.path,
          isBounce: false,
        },
      });
    }

    const pageView = await prisma.pageView.create({
      data: {
        sessionId: session.id,
        url: data.url,
        path: data.path,
        title: data.title,
        referrer: data.referrer,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
      },
    });

    notifyPageView({
      id: pageView.id,
      path: data.path,
      country: visitor.country,
      device,
      browser,
      timestamp: pageView.createdAt,
    });

    return pageView;
  }

  async getSummaryMetrics() {
    const totalVisitors = await prisma.visitor.count();
    const totalSessions = await prisma.session.count();
    const totalPageViews = await prisma.pageView.count();
    const totalContacts = await prisma.contact.count();
    const totalSubscribers = await prisma.newsletterSubscriber.count();
    const totalProjects = await prisma.project.count({ where: { deletedAt: null } });
    const totalSkills = await prisma.skill.count();
    const totalBlogs = await prisma.blog.count({ where: { deletedAt: null } });

    const bounceCount = await prisma.session.count({ where: { isBounce: true } });
    const bounceRate = totalSessions > 0 ? Number(((bounceCount / totalSessions) * 100).toFixed(1)) : 0;

    const allVisitors = await prisma.visitor.findMany({
      include: { _count: { select: { sessions: true } } },
    });

    const returningVisitors = allVisitors.filter((v) => v._count.sessions > 1).length;
    const newVisitors = Math.max(0, totalVisitors - returningVisitors);
    const retentionRate = totalVisitors > 0 ? Number(((returningVisitors / totalVisitors) * 100).toFixed(1)) : 0;

    return {
      totalVisitors,
      newVisitors,
      returningVisitors,
      retentionRate,
      bounceRate,
      totalPageViews,
      totalContacts,
      totalSubscribers,
      totalProjects,
      totalSkills,
      totalBlogs,
    };
  }

  async getRetentionCohorts() {
    const now = new Date();

    const calculateRetentionForDays = async (days: number) => {
      const cohortStartDate = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000);
      const cohortEndDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const cohortVisitors = await prisma.visitor.findMany({
        where: {
          createdAt: { gte: cohortStartDate, lte: cohortEndDate },
        },
        select: { visitorId: true },
      });

      if (cohortVisitors.length === 0) return 0;

      const visitorIds = cohortVisitors.map((v) => v.visitorId);
      const returnedSessions = await prisma.session.findMany({
        where: {
          visitorId: { in: visitorIds },
          createdAt: { gt: cohortEndDate },
        },
        distinct: ['visitorId'],
      });

      return Number(((returnedSessions.length / cohortVisitors.length) * 100).toFixed(1));
    };

    const day1 = await calculateRetentionForDays(1);
    const day7 = await calculateRetentionForDays(7);
    const day14 = await calculateRetentionForDays(14);
    const day30 = await calculateRetentionForDays(30);

    return {
      day1,
      day7,
      day14,
      day30,
      cohortData: [
        { cohort: 'Day 1', retention: day1 },
        { cohort: 'Day 7', retention: day7 },
        { cohort: 'Day 14', retention: day14 },
        { cohort: 'Day 30', retention: day30 },
      ],
    };
  }

  async getBreakdowns() {
    const topPagesGroup = await prisma.pageView.groupBy({
      by: ['path'],
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 5,
    });
    const topPages = topPagesGroup.map((p) => ({ path: p.path, views: p._count.path }));

    const topDevicesGroup = await prisma.visitor.groupBy({
      by: ['device'],
      _count: { device: true },
      orderBy: { _count: { device: 'desc' } },
      take: 5,
    });
    const topDevices = topDevicesGroup.map((d) => ({ device: d.device || 'Desktop', count: d._count.device }));

    const topBrowsersGroup = await prisma.visitor.groupBy({
      by: ['browser'],
      _count: { browser: true },
      orderBy: { _count: { browser: 'desc' } },
      take: 5,
    });
    const topBrowsers = topBrowsersGroup.map((b) => ({ browser: b.browser || 'Chrome', count: b._count.browser }));

    const topCountriesGroup = await prisma.visitor.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 5,
    });
    const topCountries = topCountriesGroup.map((c) => ({ country: c.country || 'Unknown', count: c._count.country }));

    return {
      topPages,
      topDevices,
      topBrowsers,
      topCountries,
    };
  }
}

export const analyticsService = new AnalyticsService();
