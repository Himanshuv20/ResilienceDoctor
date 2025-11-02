"""
Example: Circuit Breaker Pattern Usage

Demonstrates how to use the circuit breaker pattern to prevent cascading failures.
"""
import time
import random
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker, CircuitBreakerError


# Simulate a service that can fail
class ExternalService:
    def __init__(self):
        self.is_healthy = True
        self.call_count = 0
    
    def call(self):
        """Simulate a service call."""
        self.call_count += 1
        
        if not self.is_healthy:
            print(f"  Call {self.call_count}: Service is down ❌")
            raise ConnectionError("Service unavailable")
        
        # Random failures
        if random.random() < 0.3:
            print(f"  Call {self.call_count}: Random failure ❌")
            raise ConnectionError("Service temporarily unavailable")
        
        print(f"  Call {self.call_count}: Success ✅")
        return {"status": "ok", "data": "response"}
    
    def make_unhealthy(self):
        """Simulate service going down."""
        self.is_healthy = False
        print("\n⚠️  Service went DOWN")
    
    def make_healthy(self):
        """Simulate service recovery."""
        self.is_healthy = True
        print("\n✅ Service recovered")


def fallback_response():
    """Fallback when circuit is open."""
    return {"status": "fallback", "data": "cached_response"}


if __name__ == "__main__":
    print("=" * 60)
    print("Example: Circuit Breaker Pattern")
    print("=" * 60)
    
    # Initialize service and circuit breaker
    service = ExternalService()
    circuit = CircuitBreaker(
        failure_threshold=3,
        timeout=5.0,
        success_threshold=2,
        name="external-service"
    )
    
    print("\nScenario 1: Normal operation")
    print("-" * 60)
    random.seed(42)
    
    for i in range(5):
        try:
            result = circuit.call(service.call)
            print(f"Result: {result}")
        except CircuitBreakerError:
            print("Circuit is OPEN - using fallback")
            result = fallback_response()
            print(f"Fallback result: {result}")
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(0.1)
    
    stats = circuit.get_stats()
    print(f"\nCircuit Stats: State={stats['state']}, Failures={stats['failure_count']}")
    
    print("\n\nScenario 2: Service failure and recovery")
    print("-" * 60)
    
    # Reset circuit and service
    circuit.reset()
    service.call_count = 0
    service.make_unhealthy()
    
    # Try to call while service is down (will open circuit)
    print("\nCalling service while it's down:")
    for i in range(5):
        try:
            result = circuit.call(service.call)
            print(f"Result: {result}")
        except CircuitBreakerError:
            print(f"  Call {i+1}: Circuit is OPEN - using fallback ⚡")
            result = fallback_response()
        except Exception as e:
            print(f"  Call {i+1}: Error caught - {type(e).__name__}")
        
        time.sleep(0.1)
    
    stats = circuit.get_stats()
    print(f"\nCircuit Stats: State={stats['state']}, Failures={stats['failure_count']}")
    
    # Wait for timeout and recover service
    print(f"\nWaiting {circuit.timeout} seconds for circuit timeout...")
    time.sleep(circuit.timeout)
    service.make_healthy()
    
    print("\nAttempting calls after timeout (circuit will try HALF_OPEN):")
    for i in range(5):
        try:
            result = circuit.call(service.call)
            print(f"  Call {i+1}: Success ✅")
        except CircuitBreakerError:
            print(f"  Call {i+1}: Circuit is OPEN - using fallback")
        except Exception as e:
            print(f"  Call {i+1}: Error - {type(e).__name__}")
        
        time.sleep(0.1)
    
    stats = circuit.get_stats()
    print(f"\nFinal Circuit Stats: State={stats['state']}, Failures={stats['failure_count']}")
    
    print("\n" + "=" * 60)
