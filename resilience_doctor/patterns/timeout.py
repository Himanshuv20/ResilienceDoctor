"""
Timeout pattern implementation.
"""
import signal
import functools
from typing import Callable, Optional


class TimeoutError(Exception):
    """Raised when operation exceeds timeout."""
    pass


def timeout(seconds: float, error_message: Optional[str] = None):
    """
    Decorator to add timeout to a function.
    
    Args:
        seconds: Timeout duration in seconds
        error_message: Custom error message
    
    Example:
        @timeout(5.0)
        def long_running_task():
            # operation that should complete within 5 seconds
            pass
    
    Note:
        This implementation uses signals and only works on Unix-like systems.
        For cross-platform support, consider using threading or asyncio.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            def timeout_handler(signum, frame):
                raise TimeoutError(
                    error_message or f"Function '{func.__name__}' timed out after {seconds} seconds"
                )
            
            # Set up signal handler
            old_handler = signal.signal(signal.SIGALRM, timeout_handler)
            signal.setitimer(signal.ITIMER_REAL, seconds)
            
            try:
                result = func(*args, **kwargs)
            finally:
                # Restore old handler and cancel alarm
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_handler)
            
            return result
        
        return wrapper
    return decorator


class Timeout:
    """
    Class-based timeout implementation.
    
    Example:
        timeout_policy = Timeout(seconds=5.0)
        result = timeout_policy.execute(some_function, arg1, arg2)
    """
    
    def __init__(self, seconds: float):
        self.seconds = seconds
    
    def execute(self, func: Callable, *args, **kwargs):
        """Execute function with timeout."""
        def timeout_handler(signum, frame):
            raise TimeoutError(
                f"Function timed out after {self.seconds} seconds"
            )
        
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.setitimer(signal.ITIMER_REAL, self.seconds)
        
        try:
            result = func(*args, **kwargs)
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, old_handler)
        
        return result
