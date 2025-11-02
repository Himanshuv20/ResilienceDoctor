import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/scores:
 *   get:
 *     summary: Get resilience scores for all services
 *     tags: [Scores]
 *     responses:
 *       200:
 *         description: List of all service resilience scores
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const scores = await prisma.score.findMany({
      include: {
        service: {
          select: { name: true, description: true, owner: true }
        }
      },
      orderBy: { computedAt: 'desc' }
    });

    // Get latest score for each service
    const latestScores = new Map();
    scores.forEach(score => {
      if (!latestScores.has(score.serviceId) || 
          score.computedAt > latestScores.get(score.serviceId).computedAt) {
        latestScores.set(score.serviceId, score);
      }
    });

    const serviceScores = Array.from(latestScores.values()).map(score => ({
      ...score,
      riskLevel: getRiskLevel(score.overallScore),
      trend: 'stable' // TODO: Calculate trend from historical data
    }));

    res.status(200).json({
      status: 'success',
      data: {
        scores: serviceScores,
        summary: {
          totalServices: serviceScores.length,
          averageScore: serviceScores.length > 0 ? 
            serviceScores.reduce((sum, s) => sum + s.overallScore, 0) / serviceScores.length : 0,
          highRiskServices: serviceScores.filter(s => s.riskLevel === 'high').length,
          mediumRiskServices: serviceScores.filter(s => s.riskLevel === 'medium').length,
          lowRiskServices: serviceScores.filter(s => s.riskLevel === 'low').length
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching scores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch scores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/scores/compute:
 *   post:
 *     summary: Compute resilience scores for all services
 *     tags: [Scores]
 *     responses:
 *       200:
 *         description: Scores computed successfully
 */
router.post('/compute', asyncHandler(async (req: Request, res: Response) => {
  try {
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
        sourceDependencies: true,
        targetDependencies: true
      }
    });

    const scoringConfig = await getScoringConfig();
    const computedScores = [];

    for (const service of services) {
      const score = await computeResilienceScore(service, scoringConfig);
      
      const savedScore = await prisma.score.create({
        data: {
          serviceId: service.id,
          overallScore: score.overallScore,
          availabilityScore: score.availabilityScore,
          incidentScore: score.incidentScore,
          redundancyScore: score.redundancyScore,
          dependencyScore: score.dependencyScore,
          configurationVersion: scoringConfig.version || 'default'
        }
      });

      computedScores.push({
        ...savedScore,
        service: { name: service.name },
        riskLevel: getRiskLevel(savedScore.overallScore)
      });
    }

    logger.info(`Computed resilience scores for ${computedScores.length} services`);

    res.status(200).json({
      status: 'success',
      message: 'Resilience scores computed successfully',
      data: {
        scores: computedScores,
        computedAt: new Date(),
        configuration: scoringConfig
      }
    });

  } catch (error) {
    logger.error('Error computing scores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to compute scores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/scores/{serviceId}:
 *   get:
 *     summary: Get score history for a specific service
 *     tags: [Scores]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service score history
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;

  try {
    const scores = await prisma.score.findMany({
      where: { serviceId },
      include: {
        service: {
          select: { name: true, description: true, owner: true }
        }
      },
      orderBy: { computedAt: 'desc' },
      take: 50 // Last 50 score computations
    });

    if (scores.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No scores found for this service'
      });
    }

    // Calculate trend
    const trend = calculateTrend(scores);

    res.status(200).json({
      status: 'success',
      data: {
        scores,
        latest: scores[0],
        trend,
        analysis: {
          bestScore: Math.max(...scores.map(s => s.overallScore)),
          worstScore: Math.min(...scores.map(s => s.overallScore)),
          averageScore: scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length,
          volatility: calculateVolatility(scores.map(s => s.overallScore))
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching service scores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service scores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Helper function to get scoring configuration
async function getScoringConfig() {
  try {
    const config = await prisma.configuration.findUnique({
      where: { key: 'scoring_weights' }
    });

    if (config) {
      return JSON.parse(config.value);
    }
  } catch (error) {
    logger.warn('Failed to load scoring config, using defaults');
  }

  // Default scoring configuration
  return {
    version: '1.0',
    weights: {
      availability: 0.4,
      incident: 0.3,
      redundancy: 0.2,
      dependency: 0.1
    },
    thresholds: {
      excellent: 90,
      good: 75,
      fair: 60,
      poor: 0
    }
  };
}

// Helper function to compute resilience score
async function computeResilienceScore(service: any, config: any) {
  const weights = config.weights;

  // 1. Availability Score (based on recent metrics)
  const availabilityScore = calculateAvailabilityScore(service.metrics);

  // 2. Incident Score (based on incident frequency and severity)
  const incidentScore = calculateIncidentScore(service.incidents);

  // 3. Redundancy Score (based on infrastructure and dependencies)
  const redundancyScore = calculateRedundancyScore(service);

  // 4. Dependency Score (based on dependency complexity and risks)
  const dependencyScore = calculateDependencyScore(service.sourceDependencies, service.targetDependencies);

  // Calculate weighted overall score
  const overallScore = Math.round(
    (availabilityScore * weights.availability) +
    (incidentScore * weights.incident) +
    (redundancyScore * weights.redundancy) +
    (dependencyScore * weights.dependency)
  );

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    availabilityScore,
    incidentScore,
    redundancyScore,
    dependencyScore
  };
}

function calculateAvailabilityScore(metrics: any[]): number {
  if (metrics.length === 0) return 50; // Default score for no data

  const avgUptime = metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length;
  const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;

  // Score based on uptime and error rate
  const uptimeScore = Math.min(100, avgUptime * 1.1); // Slight boost for high uptime
  const errorScore = Math.max(0, 100 - (avgErrorRate * 10)); // Penalize high error rates

  return Math.round((uptimeScore + errorScore) / 2);
}

function calculateIncidentScore(incidents: any[]): number {
  if (incidents.length === 0) return 100; // Perfect score for no incidents

  // Weight incidents by severity
  const severityWeights = { critical: 10, high: 5, medium: 2, low: 1 };
  const totalWeight = incidents.reduce((sum, incident) => {
    return sum + (severityWeights[incident.severity as keyof typeof severityWeights] || 1);
  }, 0);

  // Score inversely related to incident weight
  const maxWeight = 50; // Threshold for 0 score
  return Math.max(0, Math.round(100 - (totalWeight / maxWeight * 100)));
}

function calculateRedundancyScore(service: any): number {
  // This is a simplified calculation - in real implementation,
  // you'd analyze infrastructure setup, multi-AZ deployment, etc.
  
  // For now, base it on service dependencies and assume some redundancy exists
  const dependencyCount = service.sourceDependencies.length;
  
  if (dependencyCount === 0) return 70; // Isolated service, moderate score
  if (dependencyCount <= 2) return 85; // Low dependency, good score
  if (dependencyCount <= 5) return 75; // Medium dependency
  return 60; // High dependency, lower score
}

function calculateDependencyScore(sourceDeps: any[], targetDeps: any[]): number {
  const totalDeps = sourceDeps.length;
  const dependents = targetDeps.length;

  // Penalize high dependency count and being a critical dependency
  let score = 100;
  
  // Penalize for having many dependencies
  if (totalDeps > 10) score -= 30;
  else if (totalDeps > 5) score -= 15;
  else if (totalDeps > 3) score -= 5;

  // Slightly penalize for being a critical dependency (many services depend on this)
  if (dependents > 10) score -= 10;
  else if (dependents > 5) score -= 5;

  return Math.max(0, score);
}

function getRiskLevel(score: number): string {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  return 'high';
}

function calculateTrend(scores: any[]): string {
  if (scores.length < 2) return 'stable';
  
  const recent = scores.slice(0, 5);
  const older = scores.slice(5, 10);
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, s) => sum + s.overallScore, 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + s.overallScore, 0) / older.length;
  
  const diff = recentAvg - olderAvg;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

function calculateVolatility(scores: number[]): number {
  if (scores.length < 2) return 0;
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  
  return Math.sqrt(variance);
}

export default router;