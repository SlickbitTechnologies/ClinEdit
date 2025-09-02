from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import secrets
import logging
from typing import Optional, Dict, Any

security = HTTPBearer()
logger = logging.getLogger(__name__)

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


def verify_firebase_token_only(token: str) -> Optional[Dict[str, Any]]:
    """Verify Firebase token and return decoded token or None"""
    try:
        decoded_token = auth.verify_id_token(token)
        decoded_token["user_type"] = "authenticated"
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {str(e)}")
        return None

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
                "email": stored_info.get("user_email", "shared@example.com"),
                "name": stored_info.get("user_name", "Shared User"),
                "shared_token": token,
                "document_id": stored_info["doc_id"],
                "original_user_id": stored_info["user_id"],
                "user_type": "shared"
            }
        else:
            # Try Firebase token as fallback
            decoded_token = auth.verify_id_token(token)
            decoded_token["user_type"] = "owner"
            return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

def verify_share_token_only(token: str) -> Optional[Dict[str, Any]]:
    """Verify share token and return user info or None"""
    if token in shared_links:
        stored_info = shared_links[token]
        return {
            "uid": f"shared_{stored_info['user_id']}",
            "email": stored_info.get("user_email", "shared@example.com"),
            "name": stored_info.get("user_name", "Shared User"),
            "shared_token": token,
            "document_id": stored_info["doc_id"],
            "original_user_id": stored_info["user_id"],
            "user_type": "shared"
        }
    return None

def get_shared_links():
    """Get the shared links dictionary (for use in other modules)"""
    return shared_links 