import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Settings as SettingsIcon, Database, Plug } from 'lucide-react';

interface Configuration {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
}

interface Connector {
  id: string;
  name: string;
  type: 'splunk' | 'dynatrace' | 'appdynamics' | 'datadog' | 'newrelic';
  enabled: boolean;
  config: {
    url?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    tenant?: string;
    orgId?: string;
    [key: string]: string | undefined;
  };
}

type TabType = 'general' | 'connectors';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: '1',
      name: 'Splunk',
      type: 'splunk',
      enabled: false,
      config: {
        url: '',
        apiKey: '',
        username: ''
      }
    },
    {
      id: '2',
      name: 'Dynatrace',
      type: 'dynatrace',
      enabled: false,
      config: {
        url: '',
        apiKey: '',
        tenant: ''
      }
    },
    {
      id: '3',
      name: 'AppDynamics',
      type: 'appdynamics',
      enabled: false,
      config: {
        url: '',
        username: '',
        password: '',
        account: ''
      }
    },
    {
      id: '4',
      name: 'Datadog',
      type: 'datadog',
      enabled: false,
      config: {
        apiKey: '',
        appKey: '',
        site: 'datadoghq.com'
      }
    },
    {
      id: '5',
      name: 'New Relic',
      type: 'newrelic',
      enabled: false,
      config: {
        apiKey: '',
        accountId: '',
        region: 'US'
      }
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editingConnector, setEditingConnector] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfigurations = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/config');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // API returns { status: "success", data: { raw: [], configurations: {} } }
        if (result.status === 'success' && result.data && result.data.raw) {
          // Transform the raw configurations to match component interface
          const transformedConfigs = result.data.raw.map((config: any) => {
            let parsedValue = config.value;
            try {
              // Try to parse JSON value for display
              const parsed = JSON.parse(config.value);
              parsedValue = JSON.stringify(parsed, null, 2);
            } catch {
              // If not JSON, keep as is
            }
            
            return {
              id: config.id,
              key: config.key,
              value: parsedValue,
              description: `Configuration for ${config.key}`,
              category: config.category || 'general'
            };
          });
          setConfigurations(transformedConfigs);
        } else {
          setConfigurations([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch configurations');
      } finally {
        setLoading(false);
      }
    };

    fetchConfigurations();
  }, []);

  const handleEdit = (config: Configuration) => {
    setEditingConfig(config.id);
    setEditValue(config.value);
  };

  const handleSave = async (configId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/config/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: editValue }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setConfigurations(prev => 
        prev.map(config => 
          config.id === configId 
            ? { ...config, value: editValue }
            : config
        )
      );

      setEditingConfig(null);
      setEditValue('');
    } catch (err) {
      console.error('Failed to update configuration:', err);
      alert('Failed to update configuration. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setEditValue('');
  };

  const handleToggleConnector = (connectorId: string) => {
    setConnectors(prev =>
      prev.map(conn =>
        conn.id === connectorId ? { ...conn, enabled: !conn.enabled } : conn
      )
    );
  };

  const handleConnectorConfigChange = (connectorId: string, field: string, value: string) => {
    setConnectors(prev =>
      prev.map(conn =>
        conn.id === connectorId
          ? { ...conn, config: { ...conn.config, [field]: value } }
          : conn
      )
    );
  };

  const handleTestConnection = async (connector: Connector) => {
    alert(`Testing connection to ${connector.name}...\nThis would validate the credentials and connectivity.`);
    // In production, this would make an API call to test the connection
  };

  const handleSaveConnector = async (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      alert(`Saving ${connector.name} configuration...\nConfiguration would be saved to the backend.`);
      setEditingConnector(null);
      // In production, this would make an API call to save the connector config
    }
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'splunk':
        return '🔍';
      case 'dynatrace':
        return '📊';
      case 'appdynamics':
        return '📈';
      case 'datadog':
        return '🐕';
      case 'newrelic':
        return '🔔';
      default:
        return '🔌';
    }
  };

  const getConnectorDescription = (type: string) => {
    switch (type) {
      case 'splunk':
        return 'Ingest logs, metrics, and traces from Splunk Enterprise or Splunk Cloud';
      case 'dynatrace':
        return 'Pull performance metrics, traces, and automated insights from Dynatrace';
      case 'appdynamics':
        return 'Monitor application performance and business transactions from AppDynamics';
      case 'datadog':
        return 'Collect infrastructure and application monitoring data from Datadog';
      case 'newrelic':
        return 'Import APM metrics, distributed tracing, and infrastructure data from New Relic';
      default:
        return 'Configure APM tool integration';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'alerts':
        return '🚨';
      case 'thresholds':
        return '📊';
      case 'monitoring':
        return '👁️';
      case 'security':
        return '🔒';
      case 'performance':
        return '⚡';
      default:
        return '⚙️';
    }
  };

  const groupedConfigs = configurations.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, Configuration[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Error loading settings</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure system parameters, thresholds, and APM tool integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>General Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('connectors')}
            className={`${
              activeTab === 'connectors'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <Plug className="h-5 w-5" />
            <span>APM Connectors</span>
          </button>
        </nav>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="space-y-8">
          {Object.entries(groupedConfigs).map(([category, configs]) => (
          <div key={category} className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
                <h2 className="text-lg font-medium text-gray-900 capitalize">
                  {category} Settings
                </h2>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {configs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {config.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {editingConfig === config.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="block w-32 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleSave(config.id)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {config.value}
                          </span>
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {configurations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No configurations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              System configurations will appear here when available.
            </p>
          </div>
        )}

        {/* System Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Information</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">Application Version:</span>
                <span className="ml-2 text-gray-900">1.0.0</span>
              </div>
              <div>
                <span className="font-medium text-gray-500">Database:</span>
                <span className="ml-2 text-gray-900">SQLite (Development)</span>
              </div>
              <div>
                <span className="font-medium text-gray-500">Environment:</span>
                <span className="ml-2 text-gray-900">Development</span>
              </div>
              <div>
                <span className="font-medium text-gray-500">Last Updated:</span>
                <span className="ml-2 text-gray-900">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* APM Connectors Tab */}
      {activeTab === 'connectors' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <Database className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  APM Tool Integration
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Connect to your APM tools to automatically ingest metrics, traces, and logs for resilience analysis.
                    Configure authentication and data collection settings for each tool.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connectors List */}
          <div className="space-y-4">
            {connectors.map((connector) => (
              <div key={connector.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getConnectorIcon(connector.type)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{connector.name}</h3>
                        <p className="text-sm text-gray-500">{getConnectorDescription(connector.type)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={connector.enabled}
                          onChange={() => handleToggleConnector(connector.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          {connector.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {connector.enabled && (
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      {/* Connector-specific configuration fields */}
                      {connector.type === 'splunk' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Splunk URL</label>
                            <input
                              type="url"
                              value={connector.config.url || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'url', e.target.value)}
                              placeholder="https://your-splunk-instance.com:8089"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">API Token</label>
                            <input
                              type="password"
                              value={connector.config.apiKey || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'apiKey', e.target.value)}
                              placeholder="Enter your Splunk API token"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                              type="text"
                              value={connector.config.username || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'username', e.target.value)}
                              placeholder="admin"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </>
                      )}

                      {connector.type === 'dynatrace' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Dynatrace Environment URL</label>
                            <input
                              type="url"
                              value={connector.config.url || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'url', e.target.value)}
                              placeholder="https://{your-environment-id}.live.dynatrace.com"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">API Token</label>
                            <input
                              type="password"
                              value={connector.config.apiKey || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'apiKey', e.target.value)}
                              placeholder="dt0c01.***"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                            <input
                              type="text"
                              value={connector.config.tenant || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'tenant', e.target.value)}
                              placeholder="abc12345"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </>
                      )}

                      {connector.type === 'appdynamics' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">AppDynamics Controller URL</label>
                            <input
                              type="url"
                              value={connector.config.url || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'url', e.target.value)}
                              placeholder="https://your-account.saas.appdynamics.com"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                              type="text"
                              value={connector.config.username || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'username', e.target.value)}
                              placeholder="user@customer1"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                              type="password"
                              value={connector.config.password || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'password', e.target.value)}
                              placeholder="Enter password"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Account Name</label>
                            <input
                              type="text"
                              value={connector.config.account || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'account', e.target.value)}
                              placeholder="customer1"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </>
                      )}

                      {connector.type === 'datadog' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">API Key</label>
                            <input
                              type="password"
                              value={connector.config.apiKey || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'apiKey', e.target.value)}
                              placeholder="Enter your Datadog API key"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Application Key</label>
                            <input
                              type="password"
                              value={connector.config.appKey || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'appKey', e.target.value)}
                              placeholder="Enter your Datadog application key"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Site</label>
                            <select
                              value={connector.config.site || 'datadoghq.com'}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'site', e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                              <option value="datadoghq.com">US (datadoghq.com)</option>
                              <option value="datadoghq.eu">EU (datadoghq.eu)</option>
                              <option value="us3.datadoghq.com">US3 (us3.datadoghq.com)</option>
                              <option value="us5.datadoghq.com">US5 (us5.datadoghq.com)</option>
                            </select>
                          </div>
                        </>
                      )}

                      {connector.type === 'newrelic' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">API Key</label>
                            <input
                              type="password"
                              value={connector.config.apiKey || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'apiKey', e.target.value)}
                              placeholder="NRAK-***"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Account ID</label>
                            <input
                              type="text"
                              value={connector.config.accountId || ''}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'accountId', e.target.value)}
                              placeholder="1234567"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Region</label>
                            <select
                              value={connector.config.region || 'US'}
                              onChange={(e) => handleConnectorConfigChange(connector.id, 'region', e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                              <option value="US">US</option>
                              <option value="EU">EU</option>
                            </select>
                          </div>
                        </>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={() => handleTestConnection(connector)}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Test Connection
                        </button>
                        <button
                          onClick={() => handleSaveConnector(connector.id)}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Save Configuration
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Panel */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">📝 Configuration Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Ensure your APM tool API credentials have read access to metrics, traces, and logs</li>
              <li>Test the connection after configuring to verify connectivity</li>
              <li>Data ingestion may take a few minutes to start after enabling a connector</li>
              <li>Configure retention policies in your APM tool to optimize data collection</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};