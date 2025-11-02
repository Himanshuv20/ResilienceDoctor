# ResilienceDoctor 🏥

A comprehensive Python toolkit for implementing and monitoring resilience patterns in your applications. Build robust, fault-tolerant systems with ease!

## 🌟 Features

ResilienceDoctor provides production-ready implementations of essential resilience patterns:

- **Retry Pattern** - Automatically retry failed operations with exponential backoff
- **Circuit Breaker** - Prevent cascading failures by stopping calls to failing services
- **Timeout Pattern** - Set time limits on operations to prevent indefinite waits
- **Health Monitoring** - Monitor service health with customizable health checks

## 🚀 Installation

```bash
pip install -r requirements.txt
pip install -e .
```

## 📖 Quick Start

### Retry Pattern

Automatically retry failed operations with configurable exponential backoff:

```python
from resilience_doctor.patterns.retry import retry

@retry(max_attempts=3, initial_delay=1.0, backoff_factor=2.0)
def fetch_data_from_api():
    response = requests.get('https://api.example.com/data')
    return response.json()

# Automatically retries up to 3 times with exponential backoff
data = fetch_data_from_api()
```

### Circuit Breaker Pattern

Prevent cascading failures and protect your services:

```python
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker, CircuitBreakerError

circuit = CircuitBreaker(failure_threshold=5, timeout=60)

try:
    result = circuit.call(external_service_call, param1, param2)
except CircuitBreakerError:
    # Circuit is open, use fallback mechanism
    result = get_cached_data()
```

### Timeout Pattern

Set time limits to prevent indefinite waits:

```python
from resilience_doctor.patterns.timeout import timeout

@timeout(5.0)
def long_running_operation():
    # Operation must complete within 5 seconds
    process_large_dataset()
```

### Health Monitoring

Monitor service health with customizable checks:

```python
from resilience_doctor.monitoring.health import HealthMonitor

monitor = HealthMonitor()

def check_database():
    return database.ping()

def check_cache():
    return cache.is_available()

monitor.add_check("database", check_database, critical=True)
monitor.add_check("cache", check_cache, critical=False)

# Get comprehensive health report
report = monitor.check_all()
print(f"Overall Status: {report['status']}")
```

## 🎯 Use Cases

### When to Use Retry Pattern

- Transient network failures
- Temporary service unavailability
- Database connection timeouts
- Rate-limited API calls

### When to Use Circuit Breaker

- Protecting downstream services from overload
- Preventing resource exhaustion
- Fast failure when a service is known to be down
- Cascading failure prevention

### When to Use Timeout Pattern

- Long-running network operations
- Database queries
- External API calls
- Resource-intensive computations

## 💡 Advanced Examples

### Combining Multiple Patterns

Build highly resilient operations by combining patterns:

```python
from resilience_doctor.patterns.retry import retry
from resilience_doctor.patterns.timeout import timeout
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker

circuit = CircuitBreaker(failure_threshold=3, timeout=30)

@retry(max_attempts=3, initial_delay=0.5, backoff_factor=2.0)
@timeout(10.0)
def highly_resilient_operation():
    return circuit.call(risky_external_call)
```

### Custom Retry Logic

```python
from resilience_doctor.patterns.retry import Retry

def on_retry_callback(attempt, exception):
    print(f"Retry attempt {attempt} after error: {exception}")

retry_policy = Retry(
    max_attempts=5,
    initial_delay=0.5,
    backoff_factor=2.0
)

result = retry_policy.execute(my_function, arg1, arg2)
```

### Circuit Breaker Monitoring

```python
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker

circuit = CircuitBreaker(
    failure_threshold=5,
    timeout=60,
    success_threshold=2,
    name="payment-service"
)

# Get circuit statistics
stats = circuit.get_stats()
print(f"Circuit State: {stats['state']}")
print(f"Failure Count: {stats['failure_count']}")
```

## 🔧 CLI Usage

ResilienceDoctor includes a command-line interface:

```bash
# Display general information
resilience-doctor info

# Show pattern documentation
resilience-doctor patterns --pattern retry
resilience-doctor patterns --pattern circuit-breaker
resilience-doctor patterns --pattern timeout
resilience-doctor patterns --pattern all

# Show usage examples
resilience-doctor examples
```

## 📊 Best Practices

1. **Start Simple** - Begin with basic patterns and add complexity as needed
2. **Monitor Everything** - Use health checks to track service reliability
3. **Set Appropriate Timeouts** - Balance responsiveness with operation requirements
4. **Tune Circuit Breakers** - Adjust thresholds based on your traffic patterns
5. **Log Failures** - Always log retry attempts and circuit breaker state changes
6. **Test Failure Scenarios** - Regularly test your resilience patterns under failure conditions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- GitHub: https://github.com/Himanshuv20/ResilienceDoctor
- Documentation: https://github.com/Himanshuv20/ResilienceDoctor

## 🏗️ Architecture

ResilienceDoctor is designed with modularity and ease of use in mind:

```
resilience_doctor/
├── patterns/
│   ├── retry.py           # Retry pattern with exponential backoff
│   ├── circuit_breaker.py # Circuit breaker implementation
│   └── timeout.py         # Timeout pattern
├── monitoring/
│   └── health.py          # Health check utilities
└── cli.py                 # Command-line interface
```

## 📈 Roadmap

- [ ] Bulkhead pattern implementation
- [ ] Rate limiting pattern
- [ ] Fallback strategies
- [ ] Metrics collection and reporting
- [ ] Integration with popular monitoring tools
- [ ] Async/await support
- [ ] Configuration file support

---

Made with ❤️ by the ResilienceDoctor team
