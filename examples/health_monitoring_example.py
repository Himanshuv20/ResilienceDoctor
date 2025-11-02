"""
Example: Health Monitoring Usage

Demonstrates how to use health checks to monitor service health.
"""
import time
import random
from resilience_doctor.monitoring.health import HealthMonitor, HealthStatus


# Simulate different service checks
class ServiceChecks:
    def __init__(self):
        self.database_healthy = True
        self.cache_healthy = True
        self.api_healthy = True
    
    def check_database(self):
        """Check database connectivity."""
        if not self.database_healthy:
            raise ConnectionError("Database connection failed")
        return True
    
    def check_cache(self):
        """Check cache availability."""
        if not self.cache_healthy:
            return False
        return True
    
    def check_api(self):
        """Check external API."""
        if not self.api_healthy:
            raise TimeoutError("API timeout")
        # Simulate occasional slowness
        time.sleep(random.uniform(0.01, 0.1))
        return True


if __name__ == "__main__":
    print("=" * 60)
    print("Example: Health Monitoring")
    print("=" * 60)
    
    # Initialize services and monitor
    services = ServiceChecks()
    monitor = HealthMonitor()
    
    # Add health checks
    monitor.add_check(
        "database",
        services.check_database,
        critical=True,
        timeout=5.0
    )
    monitor.add_check(
        "cache",
        services.check_cache,
        critical=False,
        timeout=5.0
    )
    monitor.add_check(
        "external-api",
        services.check_api,
        critical=True,
        timeout=5.0
    )
    
    # Scenario 1: All services healthy
    print("\nScenario 1: All services healthy")
    print("-" * 60)
    
    report = monitor.check_all()
    print(f"Overall Status: {report['status']}")
    print("\nIndividual Checks:")
    for check in report['checks']:
        status_icon = "✅" if check['status'] == 'healthy' else "❌"
        critical = " (Critical)" if check['critical'] else ""
        print(f"  {status_icon} {check['name']}{critical}: {check['status']} "
              f"({check['duration']:.3f}s)")
    
    # Scenario 2: Non-critical service degraded
    print("\n\nScenario 2: Non-critical service (cache) degraded")
    print("-" * 60)
    
    services.cache_healthy = False
    report = monitor.check_all()
    print(f"Overall Status: {report['status']}")
    print("\nIndividual Checks:")
    for check in report['checks']:
        status_icon = "✅" if check['status'] == 'healthy' else "⚠️" if check['status'] == 'degraded' else "❌"
        critical = " (Critical)" if check['critical'] else ""
        error_msg = f" - {check['error']}" if check['error'] else ""
        print(f"  {status_icon} {check['name']}{critical}: {check['status']} "
              f"({check['duration']:.3f}s){error_msg}")
    
    # Scenario 3: Critical service down
    print("\n\nScenario 3: Critical service (database) down")
    print("-" * 60)
    
    services.database_healthy = False
    report = monitor.check_all()
    print(f"Overall Status: {report['status']}")
    print("\nIndividual Checks:")
    for check in report['checks']:
        status_icon = "✅" if check['status'] == 'healthy' else "❌"
        critical = " (Critical)" if check['critical'] else ""
        error_msg = f" - {check['error']}" if check['error'] else ""
        print(f"  {status_icon} {check['name']}{critical}: {check['status']} "
              f"({check['duration']:.3f}s){error_msg}")
    
    # Scenario 4: Check single service
    print("\n\nScenario 4: Check individual service")
    print("-" * 60)
    
    services.cache_healthy = True  # Recover cache
    result = monitor.check_one("cache")
    print(f"Cache check: {result['status']} (duration: {result['duration']:.3f}s)")
    
    # Display full report as JSON
    print("\n\nFull Health Report (JSON):")
    print("-" * 60)
    import json
    report = monitor.check_all()
    print(json.dumps(report, indent=2))
    
    print("\n" + "=" * 60)
