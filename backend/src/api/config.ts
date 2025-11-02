import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get all configuration settings
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: List of all configuration settings
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const configs = await prisma.configuration.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' }
    });

    const configsByCategory = configs.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = {};
      }
      acc[config.category][config.key] = JSON.parse(config.value);
      return acc;
    }, {} as Record<string, any>);

    res.status(200).json({
      status: 'success',
      data: {
        configurations: configsByCategory,
        raw: configs
      }
    });

  } catch (error) {
    logger.error('Error fetching configurations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/config/{key}:
 *   get:
 *     summary: Get a specific configuration
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration data
 *       404:
 *         description: Configuration not found
 */
router.get('/:key', asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;

  try {
    const config = await prisma.configuration.findUnique({
      where: { key }
    });

    if (!config) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuration not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        key: config.key,
        value: JSON.parse(config.value),
        category: config.category,
        version: config.version,
        lastUpdated: config.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error fetching configuration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/config/{key}:
 *   put:
 *     summary: Update a configuration setting
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: key
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
 *               value:
 *                 type: object
 *               category:
 *                 type: string
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       404:
 *         description: Configuration not found
 */
router.put('/:key', asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, category, version } = req.body;

  if (!value) {
    return res.status(400).json({
      status: 'error',
      message: 'Configuration value is required'
    });
  }

  try {
    const config = await prisma.configuration.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        category: category || 'general',
        version: version || '1.0'
      },
      create: {
        key,
        value: JSON.stringify(value),
        category: category || 'general',
        version: version || '1.0'
      }
    });

    logger.info(`Configuration ${key} updated`);

    res.status(200).json({
      status: 'success',
      message: 'Configuration updated successfully',
      data: {
        key: config.key,
        value: JSON.parse(config.value),
        category: config.category,
        version: config.version
      }
    });

  } catch (error) {
    logger.error('Error updating configuration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/config/reload:
 *   post:
 *     summary: Reload all configurations
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Configurations reloaded successfully
 */
router.post('/reload', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Initialize default configurations if they don't exist
    await initializeDefaultConfigurations();

    res.status(200).json({
      status: 'success',
      message: 'Configurations reloaded successfully',
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error reloading configurations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reload configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/config/defaults:
 *   post:
 *     summary: Reset to default configurations
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Default configurations restored
 */
router.post('/defaults', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Remove all existing configurations
    await prisma.configuration.deleteMany();

    // Reinitialize with defaults
    await initializeDefaultConfigurations();

    res.status(200).json({
      status: 'success',
      message: 'Default configurations restored successfully',
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error restoring default configurations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore default configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Helper function to initialize default configurations
async function initializeDefaultConfigurations() {
  const defaultConfigs = [
    {
      key: 'scoring_weights',
      category: 'scoring',
      value: {
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
      }
    },
    {
      key: 'slo_thresholds',
      category: 'slo',
      value: {
        version: '1.0',
        targetUptime: 99.9,
        targetErrorRate: 1.0,
        targetLatencyP95: 1000,
        targetLatencyP99: 2000,
        evaluationPeriod: '24h'
      }
    },
    {
      key: 'recommendation_rules',
      category: 'rules',
      value: {
        version: '1.0',
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
          }
        ]
      }
    },
    {
      key: 'alert_rules',
      category: 'alerts',
      value: {
        version: '1.0',
        rules: [
          {
            name: 'Critical Service Down',
            condition: 'uptime < 50',
            severity: 'critical',
            enabled: true
          },
          {
            name: 'High Error Rate',
            condition: 'errorRate > 10',
            severity: 'warning',
            enabled: true
          },
          {
            name: 'Low Resilience Score',
            condition: 'resilienceScore < 40',
            severity: 'warning',
            enabled: true
          }
        ]
      }
    },
    {
      key: 'dashboard_settings',
      category: 'ui',
      value: {
        version: '1.0',
        refreshInterval: 30000, // 30 seconds
        defaultTimeRange: '24h',
        chartsToShow: ['resilience', 'sla', 'incidents', 'dependencies'],
        maxServicesInGraph: 50,
        colors: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#10b981'
        }
      }
    }
  ];

  for (const config of defaultConfigs) {
    await prisma.configuration.upsert({
      where: { key: config.key },
      update: {
        value: JSON.stringify(config.value),
        category: config.category,
        version: config.value.version
      },
      create: {
        key: config.key,
        value: JSON.stringify(config.value),
        category: config.category,
        version: config.value.version
      }
    });
  }

  logger.info('Default configurations initialized');
}

export default router;