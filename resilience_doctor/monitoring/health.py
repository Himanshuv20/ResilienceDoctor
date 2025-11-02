"""
Health check utilities for monitoring application resilience.
"""
import time
from typing import Dict, Callable, Optional, List
from enum import Enum


class HealthStatus(Enum):
    """Health check status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class HealthCheck:
    """
    Health check implementation for monitoring service health.
    
    Example:
        def check_database():
            # Check database connection
            return True
        
        health = HealthCheck(name="database", check_fn=check_database)
        status = health.check()
    """
    
    def __init__(
        self,
        name: str,
        check_fn: Callable[[], bool],
        critical: bool = False,
        timeout: float = 5.0
    ):
        """
        Initialize health check.
        
        Args:
            name: Name of the health check
            check_fn: Function that returns True if healthy
            critical: Whether this check is critical for overall health
            timeout: Timeout for the check in seconds
        """
        self.name = name
        self.check_fn = check_fn
        self.critical = critical
        self.timeout = timeout
        self.last_check_time = None
        self.last_status = None
        self.last_error = None
    
    def check(self) -> Dict:
        """
        Execute health check.
        
        Returns:
            Dict with check results
        """
        start_time = time.time()
        
        try:
            result = self.check_fn()
            duration = time.time() - start_time
            
            if result:
                status = HealthStatus.HEALTHY
            else:
                status = HealthStatus.UNHEALTHY
            
            self.last_status = status
            self.last_check_time = start_time
            self.last_error = None
            
            return {
                "name": self.name,
                "status": status.value,
                "critical": self.critical,
                "duration": duration,
                "timestamp": start_time,
                "error": None
            }
        except Exception as e:
            duration = time.time() - start_time
            self.last_status = HealthStatus.UNHEALTHY
            self.last_check_time = start_time
            self.last_error = str(e)
            
            return {
                "name": self.name,
                "status": HealthStatus.UNHEALTHY.value,
                "critical": self.critical,
                "duration": duration,
                "timestamp": start_time,
                "error": str(e)
            }


class HealthMonitor:
    """
    Monitor multiple health checks.
    
    Example:
        monitor = HealthMonitor()
        monitor.add_check("database", check_database, critical=True)
        monitor.add_check("cache", check_cache, critical=False)
        
        report = monitor.check_all()
    """
    
    def __init__(self):
        self.checks: Dict[str, HealthCheck] = {}
    
    def add_check(
        self,
        name: str,
        check_fn: Callable[[], bool],
        critical: bool = False,
        timeout: float = 5.0
    ):
        """Add a health check."""
        self.checks[name] = HealthCheck(name, check_fn, critical, timeout)
    
    def remove_check(self, name: str):
        """Remove a health check."""
        if name in self.checks:
            del self.checks[name]
    
    def check_all(self) -> Dict:
        """
        Execute all health checks.
        
        Returns:
            Overall health report
        """
        results = []
        overall_status = HealthStatus.HEALTHY
        
        for check in self.checks.values():
            result = check.check()
            results.append(result)
            
            if result["status"] == HealthStatus.UNHEALTHY.value:
                if check.critical:
                    overall_status = HealthStatus.UNHEALTHY
                elif overall_status == HealthStatus.HEALTHY:
                    overall_status = HealthStatus.DEGRADED
        
        return {
            "status": overall_status.value,
            "timestamp": time.time(),
            "checks": results
        }
    
    def check_one(self, name: str) -> Optional[Dict]:
        """Execute a single health check by name."""
        if name in self.checks:
            return self.checks[name].check()
        return None
