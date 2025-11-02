// Type definitions for the application

export interface Service {
  id: string
  name: string
  description?: string
  owner?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Dependency {
  id: string
  sourceServiceId: string
  targetServiceId: string
  dependencyType: string
  isRequired: boolean
  sourceService?: Service
  targetService?: Service
}

export interface Metric {
  id: string
  serviceId: string
  uptime: number
  latencyP95: number
  latencyP99: number
  errorRate: number
  throughput: number
  timestamp: string
  service?: Service
}

export interface Incident {
  id: string
  serviceId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  status: string
  startTime: string
  endTime?: string
  resolvedAt?: string
  service?: Service
}

export interface Score {
  id: string
  serviceId: string
  overallScore: number
  availabilityScore: number
  incidentScore: number
  redundancyScore: number
  dependencyScore: number
  computedAt: string
  service?: Service
}

export interface Recommendation {
  id: string
  serviceId: string
  category: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable: string
  priority: number
  status: string
  createdAt: string
  service?: Service
}

export interface DependencyGraphNode {
  id: string
  name: string
  score?: number
  riskLevel?: 'high' | 'medium' | 'low'
  dependencyCount: number
  dependentCount: number
}

export interface DependencyGraphEdge {
  source: string
  target: string
  type: string
}

export interface DashboardOverview {
  summary: {
    totalServices: number
    averageScore: number
    riskDistribution: {
      high: number
      medium: number
      low: number
    }
    totalIncidents: number
    openRecommendations: number
  }
  resilience: {
    scoreDistribution: {
      high: number
      medium: number
      low: number
    }
    topPerformers: Array<{
      name: string
      score: number
    }>
    bottomPerformers: Array<{
      name: string
      score: number
    }>
  }
  slaCompliance: {
    compliant: Array<{
      name: string
      uptime: number
      errorRate: number
    }>
    atRisk: Array<{
      name: string
      uptime: number
      errorRate: number
      issues: string[]
    }>
    complianceRate: number
  }
  incidents: {
    total: number
    byCategory: Record<string, number>
    bySeverity: Record<string, number>
    weeklyTrend: Array<{
      week: string
      count: number
      critical: number
    }>
    recentTrend: string
  }
  dependencies: {
    graph: {
      nodes: DependencyGraphNode[]
      edges: DependencyGraphEdge[]
    }
    critical: Array<{
      id: string
      name: string
      score: number
      dependentCount: number
      incidentCount: number
      reasons: string[]
    }>
    stats: {
      totalDependencies: number
      avgDependenciesPerService: number
      isolatedServices: number
    }
  }
  recommendations: {
    top: Recommendation[]
    byCategory: Record<string, number>
    bySeverity: Record<string, number>
  }
  lastUpdated: string
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  message?: string
  data?: T
  error?: string
}