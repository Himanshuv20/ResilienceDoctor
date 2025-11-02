import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get recommendations for all services
 *     tags: [Recommendations]
 *     responses:
 *       200:
 *         description: List of all recommendations
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const recommendations = await prisma.recommendation.findMany({
      include: {
        service: {
          select: { name: true, description: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Group by service
    const byService = recommendations.reduce((acc, rec) => {
      const serviceName = rec.service.name;
      if (!acc[serviceName]) {
        acc[serviceName] = [];
      }
      acc[serviceName].push(rec);
      return acc;
    }, {} as Record<string, any[]>);

    // Group by severity
    const bySeverity = recommendations.reduce((acc, rec) => {
      acc[rec.severity] = (acc[rec.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      status: 'success',
      data: {
        recommendations,
        byService,
        summary: {
          total: recommendations.length,
          bySeverity,
          highPriority: recommendations.filter(r => r.priority >= 4).length,
          openRecommendations: recommendations.filter(r => r.status === 'open').length
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/recommendations/generate:
 *   post:
 *     summary: Generate recommendations for all services
 *     tags: [Recommendations]
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get all services with their related data
    const services = await prisma.service.findMany({
      include: {
        metrics: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
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
        scores: {
          orderBy: { computedAt: 'desc' },
          take: 1
        },
        sourceDependencies: true,
        targetDependencies: true
      }
    });

    // Load recommendation rules
    const rules = await getRecommendationRules();
    
    // Clear existing open recommendations
    await prisma.recommendation.deleteMany({
      where: { status: 'open' }
    });

    const generatedRecommendations = [];

    for (const service of services) {
      const serviceRecommendations = await generateServiceRecommendations(service, rules);
      
      for (const recommendation of serviceRecommendations) {
        const created = await prisma.recommendation.create({
          data: {
            serviceId: service.id,
            category: recommendation.category,
            severity: recommendation.severity,
            title: recommendation.title,
            description: recommendation.description,
            actionable: recommendation.actionable,
            priority: recommendation.priority
          }
        });
        
        generatedRecommendations.push({
          ...created,
          service: { name: service.name }
        });
      }
    }

    logger.info(`Generated ${generatedRecommendations.length} recommendations for ${services.length} services`);

    res.status(200).json({
      status: 'success',
      message: 'Recommendations generated successfully',
      data: {
        recommendations: generatedRecommendations,
        summary: {
          servicesAnalyzed: services.length,
          recommendationsGenerated: generatedRecommendations.length,
          averagePerService: Math.round(generatedRecommendations.length / services.length * 10) / 10
        }
      }
    });

  } catch (error) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/recommendations/{serviceId}:
 *   get:
 *     summary: Get recommendations for a specific service
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service recommendations
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;

  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { serviceId },
      include: {
        service: {
          select: { name: true, description: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (recommendations.length === 0) {
      // Check if service exists
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        recommendations,
        summary: {
          total: recommendations.length,
          byCategory: recommendations.reduce((acc, rec) => {
            acc[rec.category] = (acc[rec.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          bySeverity: recommendations.reduce((acc, rec) => {
            acc[rec.severity] = (acc[rec.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching service recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/recommendations/{id}/status:
 *   patch:
 *     summary: Update recommendation status
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in-progress, completed, dismissed]
 *     responses:
 *       200:
 *         description: Recommendation status updated
 *       404:
 *         description: Recommendation not found
 */
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['open', 'in-progress', 'completed', 'dismissed'].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status value'
    });
  }

  try {
    const recommendation = await prisma.recommendation.update({
      where: { id },
      data: { status },
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Recommendation status updated',
      data: recommendation
    });

  } catch (error) {
    logger.error('Error updating recommendation status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update recommendation status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Helper function to get recommendation rules
async function getRecommendationRules() {
  try {
    const config = await prisma.configuration.findUnique({
      where: { key: 'recommendation_rules' }
    });

    if (config) {
      return JSON.parse(config.value);
    }
  } catch (error) {
    logger.warn('Failed to load recommendation rules, using defaults');
  }

  // Default recommendation rules
  return {
    rules: [
      {
        condition: "uptime < 95",
        category: "infrastructure",
        severity: "high",
        title: "Low Service Uptime",
        description: "Service uptime is below 95%",
        actionable: "Consider adding redundancy, implementing health checks, or investigating infrastructure issues",
        priority: 5
      },
      {
        condition: "errorRate > 5",
        category: "monitoring",
        severity: "high",
        title: "High Error Rate",
        description: "Service error rate exceeds 5%",
        actionable: "Implement better error handling, add circuit breakers, or review application logic",
        priority: 5
      },
      {
        condition: "incidentCount > 3",
        category: "process",
        severity: "medium",
        title: "Frequent Incidents",
        description: "Service has experienced multiple incidents recently",
        actionable: "Conduct root cause analysis, improve monitoring, or review deployment processes",
        priority: 4
      },
      {
        condition: "dependencyCount > 5",
        category: "architecture",
        severity: "medium",
        title: "High Dependency Complexity",
        description: "Service has too many dependencies",
        actionable: "Consider service decomposition, implement caching, or reduce coupling",
        priority: 3
      },
      {
        condition: "latencyP95 > 1000",
        category: "performance",
        severity: "medium",
        title: "High Latency",
        description: "Service latency is above acceptable thresholds",
        actionable: "Optimize database queries, implement caching, or scale resources",
        priority: 3
      },
      {
        condition: "criticalDependency",
        category: "architecture",
        severity: "high",
        title: "Single Point of Failure",
        description: "Service is a critical dependency for many other services",
        actionable: "Implement redundancy, add load balancing, or consider service splitting",
        priority: 4
      },
      {
        condition: "noRecentMetrics",
        category: "monitoring",
        severity: "medium",
        title: "Missing Monitoring Data",
        description: "No recent metrics available for this service",
        actionable: "Implement comprehensive monitoring, add health checks, or verify metric collection",
        priority: 3
      }
    ]
  };
}

// Helper function to generate recommendations for a service
async function generateServiceRecommendations(service: any, rules: any) {
  const recommendations = [];
  
  // Calculate service metrics
  const metrics = service.metrics;
  const incidents = service.incidents;
  const score = service.scores[0];
  
  const avgUptime = metrics.length > 0 ? 
    metrics.reduce((sum: number, m: any) => sum + m.uptime, 0) / metrics.length : 0;
  const avgErrorRate = metrics.length > 0 ? 
    metrics.reduce((sum: number, m: any) => sum + m.errorRate, 0) / metrics.length : 0;
  const avgLatencyP95 = metrics.length > 0 ? 
    metrics.reduce((sum: number, m: any) => sum + m.latencyP95, 0) / metrics.length : 0;
  const incidentCount = incidents.length;
  const dependencyCount = service.sourceDependencies.length;
  const criticalDependency = service.targetDependencies.length > 5;
  const noRecentMetrics = metrics.length === 0;

  // Evaluate each rule
  for (const rule of rules.rules) {
    let shouldRecommend = false;

    switch (rule.condition) {
      case "uptime < 95":
        shouldRecommend = avgUptime < 95;
        break;
      case "errorRate > 5":
        shouldRecommend = avgErrorRate > 5;
        break;
      case "incidentCount > 3":
        shouldRecommend = incidentCount > 3;
        break;
      case "dependencyCount > 5":
        shouldRecommend = dependencyCount > 5;
        break;
      case "latencyP95 > 1000":
        shouldRecommend = avgLatencyP95 > 1000;
        break;
      case "criticalDependency":
        shouldRecommend = criticalDependency;
        break;
      case "noRecentMetrics":
        shouldRecommend = noRecentMetrics;
        break;
    }

    if (shouldRecommend) {
      recommendations.push({
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        actionable: rule.actionable,
        priority: rule.priority
      });
    }
  }

  // Additional custom recommendations based on score
  if (score && score.overallScore < 60) {
    recommendations.push({
      category: "architecture",
      severity: "high",
      title: "Low Resilience Score",
      description: `Service has a low resilience score of ${score.overallScore}`,
      actionable: "Review all resilience factors: availability, incidents, redundancy, and dependencies",
      priority: 5
    });
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations per service
}

export default router;