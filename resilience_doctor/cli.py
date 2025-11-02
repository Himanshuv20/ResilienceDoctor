"""
Command-line interface for ResilienceDoctor.
"""
import click
import json
from resilience_doctor import __version__
from resilience_doctor.patterns.retry import retry, Retry
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker, CircuitState
from resilience_doctor.patterns.timeout import timeout


@click.group()
@click.version_option(version=__version__)
def main():
    """
    ResilienceDoctor - A tool for implementing and monitoring resilience patterns.
    
    Helps you build resilient applications by providing implementations of
    common resilience patterns like Retry, Circuit Breaker, and Timeout.
    """
    pass


@main.command()
def info():
    """Display information about ResilienceDoctor."""
    click.echo("=" * 60)
    click.echo("ResilienceDoctor - Application Resilience Toolkit")
    click.echo("=" * 60)
    click.echo(f"Version: {__version__}")
    click.echo()
    click.echo("Available Resilience Patterns:")
    click.echo("  • Retry Pattern - Automatically retry failed operations")
    click.echo("  • Circuit Breaker - Prevent cascading failures")
    click.echo("  • Timeout Pattern - Set time limits on operations")
    click.echo()
    click.echo("Features:")
    click.echo("  • Easy-to-use decorators and classes")
    click.echo("  • Configurable parameters")
    click.echo("  • Health monitoring utilities")
    click.echo("  • Production-ready implementations")
    click.echo()
    click.echo("Documentation: https://github.com/Himanshuv20/ResilienceDoctor")
    click.echo("=" * 60)


@main.command()
@click.option('--pattern', type=click.Choice(['retry', 'circuit-breaker', 'timeout', 'all']), 
              default='all', help='Pattern to describe')
def patterns(pattern):
    """Display information about resilience patterns."""
    
    patterns_info = {
        'retry': {
            'name': 'Retry Pattern',
            'description': 'Automatically retry failed operations with exponential backoff',
            'use_cases': [
                'Transient network failures',
                'Temporary service unavailability',
                'Database connection timeouts'
            ],
            'example': '''
from resilience_doctor.patterns.retry import retry

@retry(max_attempts=3, initial_delay=1.0, backoff_factor=2.0)
def fetch_data():
    # Your code here
    pass
            '''
        },
        'circuit-breaker': {
            'name': 'Circuit Breaker Pattern',
            'description': 'Prevent cascading failures by stopping calls to failing services',
            'use_cases': [
                'Protecting downstream services',
                'Preventing resource exhaustion',
                'Fast failure when service is down'
            ],
            'example': '''
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker

circuit = CircuitBreaker(failure_threshold=5, timeout=60)
result = circuit.call(some_function, arg1, arg2)
            '''
        },
        'timeout': {
            'name': 'Timeout Pattern',
            'description': 'Set time limits on operations to prevent indefinite waits',
            'use_cases': [
                'Long-running operations',
                'Network calls',
                'Resource-intensive computations'
            ],
            'example': '''
from resilience_doctor.patterns.timeout import timeout

@timeout(5.0)
def long_operation():
    # Your code here
    pass
            '''
        }
    }
    
    def display_pattern(name, info):
        click.echo(f"\n{'=' * 60}")
        click.echo(f"{info['name']}")
        click.echo('=' * 60)
        click.echo(f"\n{info['description']}\n")
        click.echo("Use Cases:")
        for use_case in info['use_cases']:
            click.echo(f"  • {use_case}")
        click.echo("\nExample Usage:")
        click.echo(info['example'])
    
    if pattern == 'all':
        for name, info in patterns_info.items():
            display_pattern(name, info)
    else:
        display_pattern(pattern, patterns_info[pattern])


@main.command()
def examples():
    """Show example usage scenarios."""
    click.echo("\n" + "=" * 60)
    click.echo("ResilienceDoctor - Example Usage Scenarios")
    click.echo("=" * 60)
    
    click.echo("\n1. Simple Retry Example:")
    click.echo("""
from resilience_doctor.patterns.retry import retry

@retry(max_attempts=3, initial_delay=1.0)
def fetch_from_api():
    response = requests.get('https://api.example.com/data')
    return response.json()

# Automatically retries up to 3 times with exponential backoff
data = fetch_from_api()
    """)
    
    click.echo("\n2. Circuit Breaker Example:")
    click.echo("""
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker

circuit = CircuitBreaker(failure_threshold=5, timeout=60)

def call_external_service():
    try:
        return circuit.call(external_api_call, param1, param2)
    except CircuitBreakerError:
        # Circuit is open, use fallback
        return get_cached_data()
    """)
    
    click.echo("\n3. Combined Patterns Example:")
    click.echo("""
from resilience_doctor.patterns.retry import retry
from resilience_doctor.patterns.timeout import timeout
from resilience_doctor.patterns.circuit_breaker import CircuitBreaker

circuit = CircuitBreaker(failure_threshold=3, timeout=30)

@retry(max_attempts=3, initial_delay=0.5)
@timeout(10.0)
def resilient_operation():
    return circuit.call(risky_operation)
    """)
    
    click.echo("\n4. Health Monitoring Example:")
    click.echo("""
from resilience_doctor.monitoring.health import HealthMonitor

monitor = HealthMonitor()

def check_database():
    # Check database connectivity
    return db.ping()

def check_cache():
    # Check cache availability
    return cache.is_available()

monitor.add_check("database", check_database, critical=True)
monitor.add_check("cache", check_cache, critical=False)

# Get overall health status
report = monitor.check_all()
print(f"Overall Status: {report['status']}")
    """)
    
    click.echo("\n" + "=" * 60 + "\n")


if __name__ == '__main__':
    main()
