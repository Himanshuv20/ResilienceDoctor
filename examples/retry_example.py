"""
Example: Basic Retry Pattern Usage

Demonstrates how to use the retry pattern for handling transient failures.
"""
import time
import random
from resilience_doctor.patterns.retry import retry, RetryExhaustedError


# Simulate a flaky API call
call_count = 0

def flaky_api_call():
    """Simulates an API that fails randomly."""
    global call_count
    call_count += 1
    
    print(f"Attempt {call_count}: Calling API...")
    
    # Simulate 70% failure rate
    if random.random() < 0.7:
        print("  ❌ API call failed!")
        raise ConnectionError("Failed to connect to API")
    
    print("  ✅ API call succeeded!")
    return {"data": "success", "attempt": call_count}


# Example 1: Using decorator
@retry(max_attempts=5, initial_delay=0.5, backoff_factor=2.0)
def fetch_data_with_retry():
    """Fetch data with automatic retry."""
    return flaky_api_call()


# Example 2: Custom retry callback
def on_retry(attempt, exception):
    print(f"⚠️  Retrying after attempt {attempt}: {exception}")

@retry(
    max_attempts=5,
    initial_delay=0.5,
    backoff_factor=2.0,
    exceptions=(ConnectionError, TimeoutError),
    on_retry=on_retry
)
def fetch_data_with_callback():
    """Fetch data with retry and callback."""
    return flaky_api_call()


if __name__ == "__main__":
    print("=" * 60)
    print("Example: Retry Pattern")
    print("=" * 60)
    
    # Test basic retry
    print("\n1. Basic Retry Pattern:")
    print("-" * 60)
    call_count = 0
    random.seed(42)  # For reproducible results
    
    try:
        result = fetch_data_with_retry()
        print(f"\n✅ Success! Result: {result}")
    except RetryExhaustedError as e:
        print(f"\n❌ Failed after all retries: {e}")
    
    # Test retry with callback
    print("\n\n2. Retry Pattern with Callback:")
    print("-" * 60)
    call_count = 0
    random.seed(123)
    
    try:
        result = fetch_data_with_callback()
        print(f"\n✅ Success! Result: {result}")
    except RetryExhaustedError as e:
        print(f"\n❌ Failed after all retries: {e}")
    
    print("\n" + "=" * 60)
