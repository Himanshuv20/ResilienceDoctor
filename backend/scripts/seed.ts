import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

const SAMPLE_SERVICES = [
  { name: 'user-service', description: 'User management and authentication', owner: 'Platform Team' },
  { name: 'order-service', description: 'Order processing and management', owner: 'Commerce Team' },
  { name: 'payment-service', description: 'Payment processing', owner: 'Finance Team' },
  { name: 'inventory-service', description: 'Product inventory management', owner: 'Inventory Team' },
  { name: 'notification-service', description: 'Email and SMS notifications', owner: 'Platform Team' },
  { name: 'analytics-service', description: 'Data analytics and reporting', owner: 'Data Team' },
  { name: 'search-service', description: 'Product search and discovery', owner: 'Search Team' },
  { name: 'recommendation-engine', description: 'ML-based product recommendations', owner: 'ML Team' },
  { name: 'api-gateway', description: 'API routing and load balancing', owner: 'Platform Team' },
  { name: 'database-proxy', description: 'Database connection pooling', owner: 'Infrastructure Team' },
];

const SERVICE_DEPENDENCIES = [
  { source: 'api-gateway', targets: ['user-service', 'order-service', 'search-service'] },
  { source: 'order-service', targets: ['user-service', 'payment-service', 'inventory-service', 'notification-service'] },
  { source: 'payment-service', targets: ['user-service', 'notification-service'] },
  { source: 'inventory-service', targets: ['database-proxy'] },
  { source: 'analytics-service', targets: ['database-proxy', 'user-service', 'order-service'] },
  { source: 'search-service', targets: ['database-proxy', 'recommendation-engine'] },
  { source: 'recommendation-engine', targets: ['user-service', 'analytics-service'] },
  { source: 'notification-service', targets: ['user-service'] },
];

const INCIDENT_CATEGORIES = ['network', 'infrastructure', 'application', 'configuration'];
const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'];

async function clearDatabase() {
  logger.info('Clearing existing data...');
  
  await prisma.recommendation.deleteMany();
  await prisma.score.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.service.deleteMany();
  await prisma.configuration.deleteMany();
  
  logger.info('Database cleared');
}

async function seedServices() {
  logger.info('Seeding services...');
  
  const services = [];
  for (const serviceData of SAMPLE_SERVICES) {
    const service = await prisma.service.create({
      data: serviceData,
    });
    services.push(service);
  }
  
  logger.info(`Created ${services.length} services`);
  return services;
}

async function seedDependencies(services: any[]) {
  logger.info('Seeding dependencies...');
  
  const serviceMap = new Map(services.map(s => [s.name, s]));
  let dependencyCount = 0;
  
  for (const depData of SERVICE_DEPENDENCIES) {
    const sourceService = serviceMap.get(depData.source);
    
    if (sourceService) {
      for (const targetName of depData.targets) {
        const targetService = serviceMap.get(targetName);
        
        if (targetService) {
          await prisma.dependency.create({
            data: {
              sourceServiceId: sourceService.id,
              targetServiceId: targetService.id,
              dependencyType: 'api',
              isRequired: true,
            },
          });
          dependencyCount++;
        }
      }
    }
  }
  
  logger.info(`Created ${dependencyCount} dependencies`);
}

async function seedMetrics(services: any[]) {
  logger.info('Seeding metrics...');
  
  let metricCount = 0;
  const now = new Date();
  
  for (const service of services) {
    // Generate metrics for the last 7 days
    for (let i = 0; i < 7; i++) {
      const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Generate realistic metrics with some variance
      const baseUptime = 95 + Math.random() * 5; // 95-100%
      const baseLatency = 200 + Math.random() * 300; // 200-500ms
      const baseErrorRate = Math.random() * 2; // 0-2%
      const baseThroughput = 100 + Math.random() * 400; // 100-500 RPS
      
      await prisma.metric.create({
        data: {
          serviceId: service.id,
          uptime: Math.min(100, baseUptime + (Math.random() - 0.5) * 10),
          latencyP95: baseLatency + (Math.random() - 0.5) * 100,
          latencyP99: baseLatency * 1.5 + (Math.random() - 0.5) * 150,
          errorRate: Math.max(0, baseErrorRate + (Math.random() - 0.5) * 1),
          throughput: Math.max(0, baseThroughput + (Math.random() - 0.5) * 100),
          timestamp,
        },
      });
      metricCount++;
    }
  }
  
  logger.info(`Created ${metricCount} metrics`);
}

async function seedIncidents(services: any[]) {
  logger.info('Seeding incidents...');
  
  const incidentTemplates = [
    { title: 'Database connection timeout', description: 'Multiple timeout errors when connecting to primary database' },
    { title: 'High memory usage', description: 'Service experiencing OOM errors due to memory leak' },
    { title: 'API rate limit exceeded', description: 'External API rate limits causing service degradation' },
    { title: 'Configuration deployment failure', description: 'Failed configuration deployment caused service restart' },
    { title: 'Network connectivity issues', description: 'Intermittent network issues affecting service performance' },
    { title: 'CPU throttling detected', description: 'High CPU usage leading to performance degradation' },
    { title: 'Disk space full', description: 'Service logs filled up disk space causing failures' },
    { title: 'Load balancer misconfiguration', description: 'Traffic routing issues due to LB config error' },
  ];
  
  let incidentCount = 0;
  const now = new Date();
  
  for (const service of services) {
    // Generate 0-3 incidents per service in the last 30 days
    const numIncidents = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numIncidents; i++) {
      const template = incidentTemplates[Math.floor(Math.random() * incidentTemplates.length)];
      const severity = SEVERITY_LEVELS[Math.floor(Math.random() * SEVERITY_LEVELS.length)];
      const category = INCIDENT_CATEGORIES[Math.floor(Math.random() * INCIDENT_CATEGORIES.length)];
      const startTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + Math.random() * 4 * 60 * 60 * 1000);
      
      await prisma.incident.create({
        data: {
          serviceId: service.id,
          severity,
          category,
          title: template.title,
          description: template.description,
          status: Math.random() > 0.2 ? 'resolved' : 'open',
          startTime,
          endTime: Math.random() > 0.1 ? endTime : null,
          resolvedAt: Math.random() > 0.2 ? endTime : null,
        },
      });
      incidentCount++;
    }
  }
  
  logger.info(`Created ${incidentCount} incidents`);
}

async function seedConfigurations() {
  logger.info('Seeding configurations...');
  
  const configs = [
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
          }
        ]
      }
    }
  ];
  
  for (const config of configs) {
    await prisma.configuration.create({
      data: {
        key: config.key,
        value: JSON.stringify(config.value),
        category: config.category,
        version: config.value.version,
      },
    });
  }
  
  logger.info(`Created ${configs.length} configurations`);
}

async function seedRecommendations(services: any[]) {
  logger.info('Seeding recommendations...');
  
  const recommendationTemplates = [
    {
      category: 'infrastructure',
      severity: 'high',
      title: 'Implement Circuit Breaker Pattern',
      description: 'Service lacks circuit breaker implementation for downstream dependencies',
      actionable: 'Implement a circuit breaker pattern using libraries like Hystrix or resilience4j to prevent cascading failures when downstream services are unavailable',
      priority: 5
    },
    {
      category: 'monitoring',
      severity: 'high',
      title: 'Add Distributed Tracing',
      description: 'No distributed tracing implementation detected',
      actionable: 'Implement distributed tracing using OpenTelemetry or Jaeger to track requests across microservices and identify performance bottlenecks',
      priority: 4
    },
    {
      category: 'resilience',
      severity: 'medium',
      title: 'Configure Auto-Scaling',
      description: 'Service does not have auto-scaling configured',
      actionable: 'Configure horizontal pod autoscaling (HPA) based on CPU/memory metrics to handle traffic spikes automatically',
      priority: 4
    },
    {
      category: 'infrastructure',
      severity: 'critical',
      title: 'Add Health Check Endpoints',
      description: 'Service is missing proper health check endpoints',
      actionable: 'Implement /health/live and /health/ready endpoints for Kubernetes liveness and readiness probes',
      priority: 5
    },
    {
      category: 'monitoring',
      severity: 'medium',
      title: 'Set Up SLO Alerts',
      description: 'No SLO-based alerting configured',
      actionable: 'Define and implement SLO-based alerts for critical service metrics (uptime, latency, error rate) to catch issues before they impact users',
      priority: 3
    },
    {
      category: 'resilience',
      severity: 'high',
      title: 'Implement Rate Limiting',
      description: 'Service lacks rate limiting protection',
      actionable: 'Add rate limiting middleware to prevent abuse and ensure fair resource allocation across clients',
      priority: 4
    },
    {
      category: 'infrastructure',
      severity: 'medium',
      title: 'Enable Multi-Region Deployment',
      description: 'Service is deployed in a single region',
      actionable: 'Deploy service across multiple regions for improved availability and disaster recovery capabilities',
      priority: 3
    },
    {
      category: 'monitoring',
      severity: 'low',
      title: 'Improve Logging Structure',
      description: 'Logs are not structured or lack correlation IDs',
      actionable: 'Implement structured logging with correlation IDs to improve debugging and log analysis capabilities',
      priority: 2
    },
    {
      category: 'resilience',
      severity: 'high',
      title: 'Add Retry Logic with Exponential Backoff',
      description: 'Service does not implement retry logic for transient failures',
      actionable: 'Implement retry logic with exponential backoff for API calls to handle transient network failures gracefully',
      priority: 4
    },
    {
      category: 'infrastructure',
      severity: 'medium',
      title: 'Configure Resource Limits',
      description: 'Container resource limits not properly configured',
      actionable: 'Set appropriate CPU and memory limits/requests to prevent resource starvation and ensure predictable performance',
      priority: 3
    }
  ];
  
  let recommendationCount = 0;
  
  // Assign recommendations to services that need them most
  // Services with lower mock scores get more critical recommendations
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    // Give 2-4 recommendations per service
    const numRecommendations = Math.floor(Math.random() * 3) + 2;
    
    // Select random recommendations from templates
    const shuffled = [...recommendationTemplates].sort(() => Math.random() - 0.5);
    const selectedRecommendations = shuffled.slice(0, numRecommendations);
    
    for (const rec of selectedRecommendations) {
      await prisma.recommendation.create({
        data: {
          serviceId: service.id,
          category: rec.category,
          severity: rec.severity,
          title: rec.title,
          description: rec.description,
          actionable: rec.actionable,
          priority: rec.priority,
          status: Math.random() > 0.3 ? 'open' : 'resolved', // 70% open, 30% resolved
          createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random time in last 14 days
        },
      });
      recommendationCount++;
    }
  }
  
  logger.info(`Created ${recommendationCount} recommendations for ${services.length} services`);
}

async function computeScores(services: any[]) {
  logger.info('Computing initial resilience scores...');
  
  for (const service of services) {
    // Fetch recent metrics and incidents for score calculation
    const metrics = await prisma.metric.findMany({
      where: { serviceId: service.id },
      orderBy: { timestamp: 'desc' },
      take: 7,
    });
    
    const incidents = await prisma.incident.findMany({
      where: {
        serviceId: service.id,
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
    });
    
    const dependencies = await prisma.dependency.findMany({
      where: { sourceServiceId: service.id },
    });
    
    // Simple scoring algorithm
    const avgUptime = metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length : 95;
    const avgErrorRate = metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length : 1;
    
    const availabilityScore = Math.min(100, avgUptime * 1.05);
    const incidentScore = Math.max(0, 100 - (incidents.length * 10));
    const redundancyScore = Math.max(60, 100 - (dependencies.length * 5));
    const dependencyScore = Math.max(70, 100 - (dependencies.length * 3));
    
    const overallScore = Math.round(
      (availabilityScore * 0.4) +
      (incidentScore * 0.3) +
      (redundancyScore * 0.2) +
      (dependencyScore * 0.1)
    );
    
    await prisma.score.create({
      data: {
        serviceId: service.id,
        overallScore,
        availabilityScore: Math.round(availabilityScore),
        incidentScore: Math.round(incidentScore),
        redundancyScore: Math.round(redundancyScore),
        dependencyScore: Math.round(dependencyScore),
        configurationVersion: 'default',
      },
    });
  }
  
  logger.info(`Computed scores for ${services.length} services`);
}

async function main() {
  try {
    logger.info('Starting database seeding...');
    
    await clearDatabase();
    
    const services = await seedServices();
    await seedDependencies(services);
    await seedMetrics(services);
    await seedIncidents(services);
    await seedConfigurations();
    await seedRecommendations(services);
    await computeScores(services);
    
    logger.info('Database seeding completed successfully!');
    
    // Print summary
    const summary = {
      services: await prisma.service.count(),
      dependencies: await prisma.dependency.count(),
      metrics: await prisma.metric.count(),
      incidents: await prisma.incident.count(),
      recommendations: await prisma.recommendation.count(),
      scores: await prisma.score.count(),
      configurations: await prisma.configuration.count(),
    };
    
    logger.info('Database summary:', summary);
    
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}