from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import secrets

security = HTTPBearer()

# In-memory storage for shared links (in production, use a database)
shared_links = {}

def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

def verify_shared_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify a shared document token for commenting"""
    token = credentials.credentials
    try:
        # Check if this is a shared token
        if token in shared_links:
            stored_info = shared_links[token]
            return {
                "uid": f"shared_{stored_info['user_id']}",
                "email": "shared@example.com",
                "name": "Shared User",
                "shared_token": token,
                "document_id": stored_info["doc_id"],
                "original_user_id": stored_info["user_id"]
            }
        else:
            # Try Firebase token as fallback
            decoded_token = auth.verify_id_token(token)
            return decoded_token
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

def get_shared_links():
    """Get the shared links dictionary (for use in other modules)"""
    return shared_links 