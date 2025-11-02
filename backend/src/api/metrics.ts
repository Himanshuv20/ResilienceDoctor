import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createMetricSchema = Joi.object({
  serviceId: Joi.string().required(),
  uptime: Joi.number().min(0).max(100).required(),
  latencyP95: Joi.number().min(0).required(),
  latencyP99: Joi.number().min(0).required(),
  errorRate: Joi.number().min(0).max(100).required(),
  throughput: Joi.number().min(0).required(),
  timestamp: Joi.date().optional()
});

const batchMetricsSchema = Joi.object({
  metrics: Joi.array().items(createMetricSchema).required()
});

/**
 * @swagger
 * /api/metrics:
 *   post:
 *     summary: Ingest metrics data from monitoring systems
 *     tags: [Metrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     serviceId:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     latencyP95:
 *                       type: number
 *                     latencyP99:
 *                       type: number
 *                     errorRate:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     throughput:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       201:
 *         description: Metrics ingested successfully
 *       400:
 *         description: Invalid metrics data
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = batchMetricsSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: error.details
    });
  }

  const { metrics } = value;

  try {
    const createdMetrics = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const metricData of metrics) {
        // Verify service exists
        const service = await tx.service.findUnique({
          where: { id: metricData.serviceId }
        });

        if (!service) {
          throw new Error(`Service with ID ${metricData.serviceId} not found`);
        }

        const metric = await tx.metric.create({
          data: {
            serviceId: metricData.serviceId,
            uptime: metricData.uptime,
            latencyP95: metricData.latencyP95,
            latencyP99: metricData.latencyP99,
            errorRate: metricData.errorRate,
            throughput: metricData.throughput,
            timestamp: metricData.timestamp || new Date()
          }
        });

        results.push(metric);
      }

      return results;
    });

    logger.info(`Ingested ${createdMetrics.length} metrics`);

    res.status(201).json({
      status: 'success',
      message: 'Metrics ingested successfully',
      data: {
        count: createdMetrics.length,
        metrics: createdMetrics
      }
    });

  } catch (error) {
    logger.error('Error ingesting metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to ingest metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get all metrics with optional filtering
 *     tags: [Metrics]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of metrics
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { serviceId, from, to, limit = 100 } = req.query;

    const where: any = {};
    
    if (serviceId) {
      where.serviceId = serviceId as string;
    }

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from as string);
      if (to) where.timestamp.lte = new Date(to as string);
    }

    const metrics = await prisma.metric.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });

    res.status(200).json({
      status: 'success',
      data: metrics
    });

  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/metrics/{serviceId}:
 *   get:
 *     summary: Get metrics for a specific service
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Service metrics
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const { from, to, limit = 100 } = req.query;

  try {
    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from as string);
    if (to) dateFilter.lte = new Date(to as string);

    const whereClause: any = { serviceId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.timestamp = dateFilter;
    }

    const metrics = await prisma.metric.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      include: {
        service: {
          select: { name: true, description: true }
        }
      }
    });

    if (metrics.length === 0) {
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

    // Calculate SLO compliance
    const sloConfig = await getSLOConfig();
    const compliance = calculateSLOCompliance(metrics, sloConfig);

    res.status(200).json({
      status: 'success',
      data: {
        metrics,
        compliance,
        summary: {
          count: metrics.length,
          period: { from, to },
          averageUptime: metrics.length > 0 ? 
            metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length : 0,
          averageLatencyP95: metrics.length > 0 ? 
            metrics.reduce((sum, m) => sum + m.latencyP95, 0) / metrics.length : 0,
          averageErrorRate: metrics.length > 0 ? 
            metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length : 0
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/metrics/compliance/summary:
 *   get:
 *     summary: Get SLO compliance summary for all services
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: SLO compliance summary
 */
router.get('/compliance/summary', asyncHandler(async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        metrics: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    const sloConfig = await getSLOConfig();
    const complianceSummary = [];

    for (const service of services) {
      const compliance = calculateSLOCompliance(service.metrics, sloConfig);
      complianceSummary.push({
        serviceId: service.id,
        serviceName: service.name,
        compliance,
        metricsCount: service.metrics.length
      });
    }

    // Calculate overall statistics
    const compliantServices = complianceSummary.filter(s => s.compliance.isCompliant).length;
    const totalServices = complianceSummary.length;

    res.status(200).json({
      status: 'success',
      data: {
        services: complianceSummary,
        summary: {
          totalServices,
          compliantServices,
          complianceRate: totalServices > 0 ? (compliantServices / totalServices) * 100 : 0,
          atRiskServices: complianceSummary.filter(s => 
            s.compliance.riskLevel === 'high' || s.compliance.riskLevel === 'medium'
          ).length
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching compliance summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch compliance summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Helper function to get SLO configuration
async function getSLOConfig() {
  try {
    const config = await prisma.configuration.findUnique({
      where: { key: 'slo_thresholds' }
    });

    if (config) {
      return JSON.parse(config.value);
    }
  } catch (error) {
    logger.warn('Failed to load SLO config, using defaults');
  }

  // Default SLO configuration
  return {
    targetUptime: 99.9,
    targetErrorRate: 1.0,
    targetLatencyP95: 1000,
    targetLatencyP99: 2000
  };
}

// Helper function to calculate SLO compliance
function calculateSLOCompliance(metrics: any[], sloConfig: any) {
  if (metrics.length === 0) {
    return {
      isCompliant: false,
      uptime: 0,
      errorRate: 0,
      latencyP95: 0,
      latencyP99: 0,
      riskLevel: 'unknown'
    };
  }

  const avgUptime = metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length;
  const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
  const avgLatencyP95 = metrics.reduce((sum, m) => sum + m.latencyP95, 0) / metrics.length;
  const avgLatencyP99 = metrics.reduce((sum, m) => sum + m.latencyP99, 0) / metrics.length;

  const uptimeCompliant = avgUptime >= sloConfig.targetUptime;
  const errorRateCompliant = avgErrorRate <= sloConfig.targetErrorRate;
  const latencyP95Compliant = avgLatencyP95 <= sloConfig.targetLatencyP95;
  const latencyP99Compliant = avgLatencyP99 <= sloConfig.targetLatencyP99;

  const isCompliant = uptimeCompliant && errorRateCompliant && latencyP95Compliant && latencyP99Compliant;

  // Calculate risk level
  let riskLevel = 'low';
  if (!uptimeCompliant || avgErrorRate > sloConfig.targetErrorRate * 2) {
    riskLevel = 'high';
  } else if (!errorRateCompliant || !latencyP95Compliant) {
    riskLevel = 'medium';
  }

  return {
    isCompliant,
    uptime: avgUptime,
    errorRate: avgErrorRate,
    latencyP95: avgLatencyP95,
    latencyP99: avgLatencyP99,
    riskLevel,
    thresholds: sloConfig
  };
}

export default router;