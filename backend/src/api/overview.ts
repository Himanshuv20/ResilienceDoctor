import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/overview:
 *   get:
 *     summary: Get dashboard overview data
 *     tags: [Overview]
 *     responses:
 *       200:
 *         description: Complete dashboard overview
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get all services with comprehensive data
    const services = await prisma.service.findMany({
      include: {
        scores: {
          orderBy: { computedAt: 'desc' },
          take: 1
        },
        metrics: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        },
        incidents: {
          where: {
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        recommendations: {
          where: { status: 'open' }
        },
        sourceDependencies: {
          include: {
            targetService: {
              select: { id: true, name: true }
            }
          }
        },
        targetDependencies: {
          include: {
            sourceService: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Calculate overall statistics
    const totalServices = services.length;
    const servicesWithScores = services.filter(s => s.scores.length > 0);
    const averageScore = servicesWithScores.length > 0 ? 
      servicesWithScores.reduce((sum, s) => sum + s.scores[0].overallScore, 0) / servicesWithScores.length : 0;

    // Risk distribution
    const riskDistribution = {
      high: servicesWithScores.filter(s => s.scores[0].overallScore < 60).length,
      medium: servicesWithScores.filter(s => s.scores[0].overallScore >= 60 && s.scores[0].overallScore < 80).length,
      low: servicesWithScores.filter(s => s.scores[0].overallScore >= 80).length
    };

    // SLA compliance overview
    const slaCompliance = await calculateSLACompliance(services);

    // Incident trends
    const incidentTrends = calculateIncidentTrends(services);

    // Dependency graph data
    const dependencyGraph = {
      nodes: services.map(service => ({
        id: service.id,
        name: service.name,
        score: service.scores[0]?.overallScore || 0,
        riskLevel: getRiskLevel(service.scores[0]?.overallScore || 0),
        dependencyCount: service.sourceDependencies.length,
        dependentCount: service.targetDependencies.length
      })),
      edges: services.flatMap(service =>
        service.sourceDependencies.map(dep => ({
          source: service.id,
          target: dep.targetServiceId,
          type: dep.dependencyType
        }))
      )
    };

    // Top recommendations
    const topRecommendations = services
      .flatMap(service => service.recommendations.map(rec => ({
        ...rec,
        serviceName: service.name
      })))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    // Critical services (high dependency count or low score)
    const criticalServices = services
      .filter(service => 
        service.targetDependencies.length > 3 || 
        (service.scores[0] && service.scores[0].overallScore < 70)
      )
      .map(service => ({
        id: service.id,
        name: service.name,
        score: service.scores[0]?.overallScore || 0,
        dependentCount: service.targetDependencies.length,
        incidentCount: service.incidents.length,
        reasons: getCriticalReasons(service)
      }))
      .sort((a, b) => (b.dependentCount * 10 + (100 - b.score)) - (a.dependentCount * 10 + (100 - a.score)))
      .slice(0, 5);

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalServices,
          averageScore: Math.round(averageScore * 10) / 10,
          riskDistribution,
          totalIncidents: services.reduce((sum, s) => sum + s.incidents.length, 0),
          openRecommendations: topRecommendations.length
        },
        resilience: {
          scoreDistribution: riskDistribution,
          topPerformers: servicesWithScores
            .sort((a, b) => b.scores[0].overallScore - a.scores[0].overallScore)
            .slice(0, 5)
            .map(s => ({
              name: s.name,
              score: s.scores[0].overallScore
            })),
          bottomPerformers: servicesWithScores
            .sort((a, b) => a.scores[0].overallScore - b.scores[0].overallScore)
            .slice(0, 5)
            .map(s => ({
              name: s.name,
              score: s.scores[0].overallScore
            }))
        },
        slaCompliance,
        incidents: incidentTrends,
        dependencies: {
          graph: dependencyGraph,
          critical: criticalServices,
          stats: {
            totalDependencies: dependencyGraph.edges.length,
            avgDependenciesPerService: dependencyGraph.edges.length / totalServices,
            isolatedServices: services.filter(s => 
              s.sourceDependencies.length === 0 && s.targetDependencies.length === 0
            ).length
          }
        },
        recommendations: {
          top: topRecommendations,
          byCategory: groupBy(topRecommendations, 'category'),
          bySeverity: groupBy(topRecommendations, 'severity')
        },
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('Error fetching overview data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch overview data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Helper functions
function getRiskLevel(score: number): string {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  return 'high';
}

async function calculateSLACompliance(services: any[]) {
  const compliantServices = [];
  const atRiskServices = [];

  for (const service of services) {
    if (service.metrics.length === 0) continue;

    const avgUptime = service.metrics.reduce((sum: number, m: any) => sum + m.uptime, 0) / service.metrics.length;
    const avgErrorRate = service.metrics.reduce((sum: number, m: any) => sum + m.errorRate, 0) / service.metrics.length;

    const isCompliant = avgUptime >= 99.0 && avgErrorRate <= 1.0;

    if (isCompliant) {
      compliantServices.push({
        name: service.name,
        uptime: avgUptime,
        errorRate: avgErrorRate
      });
    } else {
      atRiskServices.push({
        name: service.name,
        uptime: avgUptime,
        errorRate: avgErrorRate,
        issues: [
          ...(avgUptime < 99.0 ? ['Low uptime'] : []),
          ...(avgErrorRate > 1.0 ? ['High error rate'] : [])
        ]
      });
    }
  }

  return {
    compliant: compliantServices,
    atRisk: atRiskServices,
    complianceRate: services.length > 0 ? 
      (compliantServices.length / services.length) * 100 : 0
  };
}

function calculateIncidentTrends(services: any[]) {
  const allIncidents = services.flatMap(s => s.incidents);
  
  // Group by category
  const byCategory = groupBy(allIncidents, 'category');
  
  // Group by severity
  const bySeverity = groupBy(allIncidents, 'severity');
  
  // Weekly trend (last 4 weeks)
  const weeklyTrend = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    
    const weekIncidents = allIncidents.filter(incident => {
      const incidentDate = new Date(incident.startTime);
      return incidentDate >= weekStart && incidentDate < weekEnd;
    });
    
    weeklyTrend.unshift({
      week: `Week ${4 - i}`,
      count: weekIncidents.length,
      critical: weekIncidents.filter(i => i.severity === 'critical').length
    });
  }

  return {
    total: allIncidents.length,
    byCategory,
    bySeverity,
    weeklyTrend,
    recentTrend: weeklyTrend.length >= 2 ? 
      (weeklyTrend[weeklyTrend.length - 1].count > weeklyTrend[weeklyTrend.length - 2].count ? 'increasing' : 'decreasing') : 'stable'
  };
}

function getCriticalReasons(service: any): string[] {
  const reasons = [];
  
  if (service.targetDependencies.length > 5) {
    reasons.push(`High dependency count (${service.targetDependencies.length} services depend on this)`);
  }
  
  if (service.scores[0] && service.scores[0].overallScore < 70) {
    reasons.push(`Low resilience score (${service.scores[0].overallScore})`);
  }
  
  if (service.incidents.length > 2) {
    reasons.push(`Frequent incidents (${service.incidents.length} in last 30 days)`);
  }

  return reasons;
}

function groupBy(array: any[], key: string) {
  return array.reduce((groups, item) => {
    const value = item[key];
    groups[value] = (groups[value] || 0) + 1;
    return groups;
  }, {});
}

export default router;