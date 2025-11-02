import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createDependencySchema = Joi.object({
  services: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      owner: Joi.string().optional(),
      dependsOn: Joi.array().items(Joi.string()).default([])
    })
  ).required()
});

const updateDependencySchema = Joi.object({
  sourceServiceId: Joi.string().required(),
  targetServiceId: Joi.string().required(),
  dependencyType: Joi.string().valid('api', 'database', 'queue', 'cache', 'external').default('api'),
  isRequired: Joi.boolean().default(true)
});

/**
 * @swagger
 * /api/dependencies:
 *   post:
 *     summary: Create or update service dependencies
 *     tags: [Dependencies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     owner:
 *                       type: string
 *                     dependsOn:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       200:
 *         description: Dependencies created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createDependencySchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: error.details
    });
  }

  const { services } = value;
  
  try {
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const createdServices = [];
      const createdDependencies = [];

      // First, create or update all services
      for (const serviceData of services) {
        const service = await tx.service.upsert({
          where: { name: serviceData.name },
          update: {
            description: serviceData.description,
            owner: serviceData.owner,
          },
          create: {
            name: serviceData.name,
            description: serviceData.description,
            owner: serviceData.owner,
          },
        });
        createdServices.push(service);
      }

      // Then, create dependencies
      for (const serviceData of services) {
        const sourceService = createdServices.find(s => s.name === serviceData.name);
        
        if (sourceService && serviceData.dependsOn && serviceData.dependsOn.length > 0) {
          for (const targetServiceName of serviceData.dependsOn) {
            const targetService = createdServices.find(s => s.name === targetServiceName);
            
            if (targetService) {
              const dependency = await tx.dependency.upsert({
                where: {
                  sourceServiceId_targetServiceId: {
                    sourceServiceId: sourceService.id,
                    targetServiceId: targetService.id,
                  },
                },
                update: {},
                create: {
                  sourceServiceId: sourceService.id,
                  targetServiceId: targetService.id,
                  dependencyType: 'api',
                  isRequired: true,
                },
              });
              createdDependencies.push(dependency);
            }
          }
        }
      }

      return { services: createdServices, dependencies: createdDependencies };
    });

    logger.info(`Created ${result.services.length} services and ${result.dependencies.length} dependencies`);

    res.status(200).json({
      status: 'success',
      message: 'Dependencies created successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error creating dependencies:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create dependencies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/dependencies:
 *   get:
 *     summary: Get all service dependencies
 *     tags: [Dependencies]
 *     responses:
 *       200:
 *         description: List of all services and their dependencies
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        sourceDependencies: {
          include: {
            targetService: true
          }
        },
        targetDependencies: {
          include: {
            sourceService: true
          }
        }
      }
    });

    // Transform data for dependency graph visualization
    const nodes = services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      owner: service.owner,
      dependsOnCount: service.sourceDependencies.length,
      dependentCount: service.targetDependencies.length
    }));

    const edges = [];
    for (const service of services) {
      for (const dependency of service.sourceDependencies) {
        edges.push({
          source: service.id,
          target: dependency.targetServiceId,
          type: dependency.dependencyType,
          isRequired: dependency.isRequired
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        nodes,
        edges,
        services,
        summary: {
          totalServices: services.length,
          totalDependencies: edges.length,
          avgDependenciesPerService: edges.length / (services.length || 1)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching dependencies:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dependencies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/dependencies/{serviceId}:
 *   get:
 *     summary: Get dependencies for a specific service
 *     tags: [Dependencies]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service dependencies
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        sourceDependencies: {
          include: {
            targetService: true
          }
        },
        targetDependencies: {
          include: {
            sourceService: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: service
    });

  } catch (error) {
    logger.error('Error fetching service dependencies:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service dependencies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/dependencies/analysis/critical-path:
 *   get:
 *     summary: Analyze critical paths and single points of failure
 *     tags: [Dependencies]
 *     responses:
 *       200:
 *         description: Critical path analysis
 */
router.get('/analysis/critical-path', asyncHandler(async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        sourceDependencies: {
          include: {
            targetService: true
          }
        },
        targetDependencies: {
          include: {
            sourceService: true
          }
        }
      }
    });

    // Analyze single points of failure (services with many dependents)
    const dependencyCount = new Map();
    services.forEach(service => {
      dependencyCount.set(service.id, {
        service,
        dependentCount: service.targetDependencies.length,
        dependsOnCount: service.sourceDependencies.length
      });
    });

    const criticalServices = Array.from(dependencyCount.values())
      .sort((a, b) => b.dependentCount - a.dependentCount)
      .slice(0, 5);

    const isolatedServices = Array.from(dependencyCount.values())
      .filter(item => item.dependentCount === 0 && item.dependsOnCount === 0);

    res.status(200).json({
      status: 'success',
      data: {
        criticalServices,
        isolatedServices,
        analysis: {
          totalServices: services.length,
          mostCritical: criticalServices[0]?.service.name || 'None',
          averageDependencies: Array.from(dependencyCount.values())
            .reduce((sum, item) => sum + item.dependsOnCount, 0) / services.length
        }
      }
    });

  } catch (error) {
    logger.error('Error analyzing critical path:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze critical path',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;