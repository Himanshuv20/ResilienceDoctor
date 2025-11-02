"""
Example: Combined Patterns

Demonstrates combining multiple resilience patterns for robust operations.
"""
import time
import random
from resilience_doctor.patterns.retry import retry
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker, CircuitBreakerError
from resilience_doctor.patterns.timeout import TimeoutError
from resilience_doctor.monitoring.health import HealthMonitor


# Simulate an unreliable external service
class UnreliableService:
    def __init__(self):
        self.call_count = 0
        self.success_rate = 0.6  # 60% success rate
    
    def call(self, delay=0.5):
        """Make a call to the service."""
        self.call_count += 1
        time.sleep(delay)  # Simulate network latency
        
        if random.random() > self.success_rate:
            raise ConnectionError("Service call failed")
        
        return {"data": f"Success on call {self.call_count}"}


# Initialize components
service = UnreliableService()
circuit = CircuitBreaker(
    failure_threshold=5,
    timeout=10.0,
    success_threshold=2,
    name="external-api"
)


# Pattern 1: Retry + Circuit Breaker
@retry(max_attempts=3, initial_delay=0.5, backoff_factor=1.5)
def call_with_retry_and_circuit():
    """Call service with retry and circuit breaker protection."""
    return circuit.call(service.call, delay=0.2)


# Pattern 2: All patterns combined
def resilient_operation():
    """
    Highly resilient operation combining:
    - Circuit Breaker (fail fast when service is down)
    - Retry (handle transient failures)
    - Fallback (provide degraded service)
    """
    try:
        result = call_with_retry_and_circuit()
        return result
    except CircuitBreakerError:
        print("  ⚡ Circuit breaker is open - using fallback")
        return {"data": "Cached/Fallback response"}
    except Exception as e:
        print(f"  ❌ Operation failed: {e}")
        return {"data": "Fallback response after error"}


if __name__ == "__main__":
    print("=" * 60)
    print("Example: Combined Resilience Patterns")
    print("=" * 60)
    
    # Set up health monitoring
    monitor = HealthMonitor()
    
    def check_circuit():
        stats = circuit.get_stats()
        return stats['state'] != 'open'
    
    monitor.add_check("circuit-breaker", check_circuit, critical=True)
    
    # Scenario: Multiple operations with combined patterns
    print("\nMaking resilient API calls...")
    print("-" * 60)
    
    random.seed(42)
    success_count = 0
    fallback_count = 0
    
    for i in range(20):
        print(f"\nCall {i+1}:")
        result = resilient_operation()
        
        if "Cached" in result['data'] or "Fallback" in result['data']:
            fallback_count += 1
            print(f"  Result: {result['data']} (fallback)")
        else:
            success_count += 1
            print(f"  Result: {result['data']} ✅")
        
        # Check health periodically
        if (i + 1) % 5 == 0:
            health_report = monitor.check_all()
            print(f"\n  📊 Health Status: {health_report['status']}")
            circuit_stats = circuit.get_stats()
            print(f"  📊 Circuit State: {circuit_stats['state']}")
            print(f"  📊 Success Rate: {success_count}/{i+1} "
                  f"({100*success_count/(i+1):.1f}%)")
        
        time.sleep(0.1)
    
    # Final statistics
    print("\n" + "=" * 60)
    print("Final Statistics")
    print("=" * 60)
    print(f"Total Calls: 20")
    print(f"Successful: {success_count} ({100*success_count/20:.1f}%)")
    print(f"Fallback Used: {fallback_count} ({100*fallback_count/20:.1f}%)")
    print(f"Service Calls: {service.call_count}")
    
    circuit_stats = circuit.get_stats()
    print(f"\nCircuit Breaker Final State: {circuit_stats['state']}")
    print(f"Circuit Failures: {circuit_stats['failure_count']}")
    
    health_report = monitor.check_all()
    print(f"\nOverall Health: {health_report['status']}")
    
    print("\n" + "=" * 60)
