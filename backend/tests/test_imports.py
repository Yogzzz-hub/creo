import pytest

def test_app_imports_cleanly():
    """
    Test that the FastAPI app and all its routers can be imported cleanly.
    This prevents silent deploy failures caused by invalid module-level Depends() definitions
    or other import-time errors.
    """
    try:
        from app.main import app
        assert app is not None
        
        # Test a few other critical modules just in case
        from app.core import rbac
        assert rbac is not None
    except Exception as e:
        pytest.fail(f"App failed to import: {e}")
