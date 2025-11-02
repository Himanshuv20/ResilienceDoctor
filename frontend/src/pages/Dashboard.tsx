import { useQuery } from 'react-query'
import { 
  BarChart3, 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  GitBranch,
  Lightbulb,
  RefreshCw
} from 'lucide-react'
import { apiEndpoints } from '../utils/api'
import { DashboardOverview } from '../utils/types'
import { formatNumber, formatPercentage, getRiskColor, getScoreColor } from '../utils/helpers'
import { MetricCard } from '../components/MetricCard'
import { ResilienceChart } from '../components/charts/ResilienceChart'
import { SLAComplianceChart } from '../components/charts/SLAComplianceChart'
import { IncidentTrendChart } from '../components/charts/IncidentTrendChart'
import { DependencyGraph } from '../components/charts/DependencyGraph'
import { RecommendationsList } from '../components/RecommendationsList'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery<{ data: DashboardOverview }>(
    'dashboard-overview',
    async () => {
      const response = await apiEndpoints.overview()
      return response.data
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 25000,
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-error-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-error-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-error-800">
              Error loading dashboard data
            </h3>
            <div className="mt-2">
              <button
                onClick={() => refetch()}
                className="btn btn-error"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const overview = data?.data

  if (!overview) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resilience Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive view of your distributed application's resilience posture
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-primary"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Services"
          value={overview.summary.totalServices}
          icon={<Shield className="h-6 w-6 text-primary-600" />}
          change={{
            value: 0,
            type: 'neutral'
          }}
        />
        
        <MetricCard
          title="Average Resilience Score"
          value={formatNumber(overview.summary.averageScore)}
          icon={<BarChart3 className={`h-6 w-6 ${getScoreColor(overview.summary.averageScore)}`} />}
          change={{
            value: 0,
            type: 'neutral'
          }}
        />
        
        <MetricCard
          title="SLA Compliance"
          value={formatPercentage(overview.slaCompliance.complianceRate)}
          icon={<Activity className="h-6 w-6 text-success-600" />}
          change={{
            value: 0,
            type: 'neutral'
          }}
        />
        
        <MetricCard
          title="Active Incidents"
          value={overview.incidents.total}
          icon={<AlertTriangle className="h-6 w-6 text-warning-600" />}
          change={{
            value: 0,
            type: overview.incidents.recentTrend === 'increasing' ? 'negative' : 'positive'
          }}
        />
      </div>

      {/* Risk Distribution */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Risk Distribution</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-error-600">
              {overview.summary.riskDistribution.high}
            </div>
            <div className="text-sm text-gray-600">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-600">
              {overview.summary.riskDistribution.medium}
            </div>
            <div className="text-sm text-gray-600">Medium Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600">
              {overview.summary.riskDistribution.low}
            </div>
            <div className="text-sm text-gray-600">Low Risk</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resilience Scores */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Service Performance</h3>
            <TrendingUp className="h-5 w-5 text-success-500" />
          </div>
          <ResilienceChart 
            topPerformers={overview.resilience.topPerformers}
            bottomPerformers={overview.resilience.bottomPerformers}
          />
        </div>

        {/* SLA Compliance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">SLA Compliance Status</h3>
            <Activity className="h-5 w-5 text-primary-500" />
          </div>
          <SLAComplianceChart compliance={overview.slaCompliance} />
        </div>

        {/* Incident Trends */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Incident Trends</h3>
            {overview.incidents.recentTrend === 'increasing' ? (
              <TrendingUp className="h-5 w-5 text-error-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-success-500" />
            )}
          </div>
          <IncidentTrendChart incidents={overview.incidents} />
        </div>

        {/* Critical Services */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Critical Services</h3>
            <AlertTriangle className="h-5 w-5 text-warning-500" />
          </div>
          <div className="space-y-3">
            {overview.dependencies.critical.slice(0, 5).map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{service.name}</div>
                  <div className="text-sm text-gray-600">
                    {service.dependentCount} dependencies • Score: {service.score}
                  </div>
                </div>
                <div className={`risk-badge ${getRiskColor(service.score >= 80 ? 'low' : service.score >= 60 ? 'medium' : 'high')}`}>
                  {service.score >= 80 ? 'Low Risk' : service.score >= 60 ? 'Medium Risk' : 'High Risk'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dependency Graph */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Dependencies</h3>
          <GitBranch className="h-5 w-5 text-primary-500" />
        </div>
        <div className="h-96">
          <DependencyGraph 
            nodes={overview.dependencies.graph.nodes}
            edges={overview.dependencies.graph.edges}
          />
        </div>
      </div>

      {/* Top Recommendations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Recommendations</h3>
          <Lightbulb className="h-5 w-5 text-warning-500" />
        </div>
        <RecommendationsList 
          recommendations={overview.recommendations.top.slice(0, 5)}
          showService={true}
        />
      </div>
    </div>
  )
}