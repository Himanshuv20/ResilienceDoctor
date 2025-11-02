"""
Retry pattern implementation with exponential backoff.
"""
import time
import functools
from typing import Callable, Type, Tuple, Optional


class RetryExhaustedError(Exception):
    """Raised when all retry attempts have been exhausted."""
    pass


def retry(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[int, Exception], None]] = None
):
    """
    Decorator to retry a function with exponential backoff.
    
    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        backoff_factor: Multiplier for delay between retries
        exceptions: Tuple of exception types to catch and retry
        on_retry: Optional callback function called on each retry
    
    Example:
        @retry(max_attempts=3, initial_delay=1.0, backoff_factor=2.0)
        def fetch_data():
            # potentially failing operation
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        if on_retry:
                            on_retry(attempt + 1, e)
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        raise RetryExhaustedError(
                            f"Failed after {max_attempts} attempts"
                        ) from e
            
            raise RetryExhaustedError(
                f"Failed after {max_attempts} attempts"
            ) from last_exception
        
        return wrapper
    return decorator


class Retry:
    """
    Class-based retry implementation for more control.
    
    Example:
        retry_policy = Retry(max_attempts=3, initial_delay=1.0)
        result = retry_policy.execute(some_function, arg1, arg2)
    """
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        backoff_factor: float = 2.0,
        exceptions: Tuple[Type[Exception], ...] = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.backoff_factor = backoff_factor
        self.exceptions = exceptions
        self.attempts = 0
    
    def execute(self, func: Callable, *args, **kwargs):
        """Execute a function with retry logic."""
        delay = self.initial_delay
        last_exception = None
        
        for attempt in range(self.max_attempts):
            self.attempts = attempt + 1
            try:
                result = func(*args, **kwargs)
                return result
            except self.exceptions as e:
                last_exception = e
                if attempt < self.max_attempts - 1:
                    time.sleep(delay)
                    delay *= self.backoff_factor
                else:
                    raise RetryExhaustedError(
                        f"Failed after {self.max_attempts} attempts"
                    ) from e
        
        raise RetryExhaustedError(
            f"Failed after {self.max_attempts} attempts"
        ) from last_exception
