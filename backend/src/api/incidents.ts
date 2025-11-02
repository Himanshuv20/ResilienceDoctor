import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  },
});

// Validation schemas
const createIncidentSchema = Joi.object({
  serviceId: Joi.string().required(),
  severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().optional(),
  status: Joi.string().valid('open', 'investigating', 'resolved', 'closed').default('open')
});

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Create a new incident
 *     tags: [Incidents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [open, investigating, resolved, closed]
 *     responses:
 *       201:
 *         description: Incident created successfully
 *       400:
 *         description: Invalid incident data
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createIncidentSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: error.details
    });
  }

  try {
    // Classify the incident based on description
    const category = classifyIncident(value.description + ' ' + value.title);

    const incident = await prisma.incident.create({
      data: {
        ...value,
        category
      },
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    logger.info(`Created incident ${incident.id} for service ${incident.service.name}`);

    res.status(201).json({
      status: 'success',
      message: 'Incident created successfully',
      data: incident
    });

  } catch (error) {
    logger.error('Error creating incident:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create incident',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/incidents/upload:
 *   post:
 *     summary: Upload incidents from CSV or JSON file
 *     tags: [Incidents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Incidents uploaded successfully
 *       400:
 *         description: Invalid file format or data
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  try {
    let incidents: any[] = [];

    if (req.file.mimetype === 'application/json') {
      incidents = JSON.parse(req.file.buffer.toString());
    } else if (req.file.mimetype === 'text/csv') {
      incidents = await parseCsvFile(req.file.buffer);
    }

    // Validate and process incidents
    const processedIncidents = [];
    const errors = [];

    for (let i = 0; i < incidents.length; i++) {
      const incidentData = incidents[i];
      
      try {
        // Map CSV headers to our schema
        const mappedData = mapIncidentData(incidentData);
        const { error, value } = createIncidentSchema.validate(mappedData);
        
        if (error) {
          errors.push({ row: i + 1, errors: error.details });
          continue;
        }

        // Classify the incident
        const category = classifyIncident(value.description + ' ' + value.title);
        
        const incident = await prisma.incident.create({
          data: {
            ...value,
            category
          }
        });

        processedIncidents.push(incident);
      } catch (err) {
        errors.push({ 
          row: i + 1, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    logger.info(`Processed ${processedIncidents.length} incidents, ${errors.length} errors`);

    res.status(201).json({
      status: 'success',
      message: 'Incidents uploaded successfully',
      data: {
        processed: processedIncidents.length,
        errors: errors.length,
        incidents: processedIncidents,
        processingErrors: errors
      }
    });

  } catch (error) {
    logger.error('Error uploading incidents:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload incidents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: Get all incidents with optional filtering
 *     tags: [Incidents]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
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
 *         description: List of incidents
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { serviceId, severity, status, from, to, limit = 100 } = req.query;

    const where: any = {};
    
    if (serviceId) {
      where.serviceId = serviceId as string;
    }

    if (severity) {
      where.severity = severity as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from as string);
      if (to) where.startTime.lte = new Date(to as string);
    }

    const incidents = await prisma.incident.findMany({
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
      orderBy: { startTime: 'desc' },
      take: Number(limit)
    });

    res.status(200).json({
      status: 'success',
      data: incidents
    });

  } catch (error) {
    logger.error('Error fetching incidents:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch incidents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/incidents/summary:
 *   get:
 *     summary: Get incident analytics summary
 *     tags: [Incidents]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Incident analytics summary
 */
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const incidents = await prisma.incident.findMany({
      where: {
        startTime: { gte: fromDate }
      },
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    // Analyze by category
    const byCategory = incidents.reduce((acc, incident) => {
      acc[incident.category] = (acc[incident.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze by severity
    const bySeverity = incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze by service
    const byService = incidents.reduce((acc, incident) => {
      const serviceName = incident.service.name;
      if (!acc[serviceName]) {
        acc[serviceName] = { count: 0, critical: 0, high: 0, medium: 0, low: 0 };
      }
      acc[serviceName].count++;
      acc[serviceName][incident.severity as keyof typeof acc[string]]++;
      return acc;
    }, {} as Record<string, any>);

    // Weekly trend
    const weeklyTrend = calculateWeeklyTrend(incidents);

    // Top problematic services
    const topServices = Object.entries(byService)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([name, data]) => ({ serviceName: name, ...data }));

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalIncidents: incidents.length,
          period: `${days} days`,
          averagePerDay: Math.round(incidents.length / days * 10) / 10
        },
        byCategory,
        bySeverity,
        topServices,
        weeklyTrend,
        insights: generateInsights(incidents, byCategory, bySeverity)
      }
    });

  } catch (error) {
    logger.error('Error fetching incident summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch incident summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /api/incidents/{serviceId}:
 *   get:
 *     summary: Get incidents for a specific service
 *     tags: [Incidents]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service incidents
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const { limit = 50, status } = req.query;

  try {
    const whereClause: any = { serviceId };
    if (status) {
      whereClause.status = status;
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        service: {
          select: { name: true, description: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: Number(limit)
    });

    res.status(200).json({
      status: 'success',
      data: {
        incidents,
        count: incidents.length
      }
    });

  } catch (error) {
    logger.error('Error fetching service incidents:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service incidents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Helper function to classify incidents using simple NLP
function classifyIncident(text: string): string {
  const lowerText = text.toLowerCase();

  // Network-related keywords
  if (/timeout|latency|network|connectivity|dns|connection|slow response/i.test(lowerText)) {
    return 'network';
  }

  // Infrastructure-related keywords
  if (/oom|memory|cpu|disk|storage|hardware|crash|restart|reboot/i.test(lowerText)) {
    return 'infrastructure';
  }

  // Configuration-related keywords
  if (/config|configuration|deployment|version|release|environment|variable/i.test(lowerText)) {
    return 'configuration';
  }

  // Application-related keywords (default)
  return 'application';
}

// Helper function to parse CSV file
function parseCsvFile(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to map CSV data to our incident schema
function mapIncidentData(data: any) {
  return {
    serviceId: data.serviceId || data.service_id || data.service,
    severity: data.severity || 'medium',
    title: data.title || data.summary || data.description?.substring(0, 100),
    description: data.description || data.details || data.title,
    startTime: new Date(data.startTime || data.start_time || data.timestamp || data.created_at),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    status: data.status || 'open'
  };
}

// Helper function to calculate weekly trend
function calculateWeeklyTrend(incidents: any[]) {
  const weeks = new Map();
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const weekIncidents = incidents.filter(incident => {
      const incidentDate = new Date(incident.startTime);
      return incidentDate >= weekStart && incidentDate < weekEnd;
    });

    weeks.set(`Week ${8 - i}`, weekIncidents.length);
  }

  return Array.from(weeks.entries()).map(([week, count]) => ({ week, count }));
}

// Helper function to generate insights
function generateInsights(incidents: any[], byCategory: Record<string, number>, bySeverity: Record<string, number>) {
  const insights = [];

  // Most common category
  const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
  if (topCategory) {
    insights.push(`Most incidents are ${topCategory[0]}-related (${topCategory[1]} incidents)`);
  }

  // Severity distribution
  const criticalCount = bySeverity.critical || 0;
  const totalCount = incidents.length;
  if (criticalCount > totalCount * 0.2) {
    insights.push(`High critical incident rate: ${Math.round(criticalCount / totalCount * 100)}% of incidents are critical`);
  }

  // Recent trend
  const recentIncidents = incidents.filter(i => 
    new Date(i.startTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const olderIncidents = incidents.filter(i => 
    new Date(i.startTime) <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  if (recentIncidents.length > olderIncidents.length) {
    insights.push('Incident frequency is increasing in recent weeks');
  }

  return insights;
}

export default router;