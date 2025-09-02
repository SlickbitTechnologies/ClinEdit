from fastapi import WebSocket, WebSocketDisconnect, APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
import logging
import json

from models.comment import (
    Comment, CommentReply, CreateCommentRequest, CreateReplyRequest, 
    UpdateCommentRequest, CommentResponse, CommentStatus
)
from services.comment_service import CommentService
from dependencies.verify_token import (
    verify_shared_token, shared_links, verify_firebase_token_only, verify_share_token_only
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Active WebSocket connections grouped by document_id
active_connections: Dict[str, List[WebSocket]] = {}

# Store user information for WebSocket connections

connection_users: Dict[WebSocket, dict] = {}

@router.websocket("/documents/{doc_id}/comments")
async def document_comments_ws(websocket: WebSocket, doc_id: str):
    print(f"🔌 WebSocket connection request for document: {doc_id}")
    
    try:
        await websocket.accept()
        print(f"✅ WebSocket connection accepted for document: {doc_id}")
        
        if doc_id not in active_connections:
            active_connections[doc_id] = []
        active_connections[doc_id].append(websocket)
        print(f"📊 Active connections for document {doc_id}: {len(active_connections[doc_id])}")
    except Exception as e:
        print(f"❌ Error accepting WebSocket connection: {e}")
        return
    
    try:
        # Send existing comments when user connects
        try:
            existing_comments = CommentService.get_comments_for_document(doc_id)
            
            # Convert comments to JSON-serializable format using model_dump with mode='json'
            serializable_comments = []
            for comment in existing_comments:
                comment_dict = comment.model_dump(mode='json')
                serializable_comments.append(comment_dict)
            
            await websocket.send_json({
                "type": "existing_comments",
                "comments": serializable_comments
            })
            print(f"📤 Sent {len(serializable_comments)} existing comments to client")
        except Exception as e:
            print(f"❌ Error sending existing comments: {e}")
            await websocket.send_json({
                "type": "error",
                "message": "Failed to load existing comments"
            })
        
        while True:
            try:
                data = await websocket.receive_json()
                message_type = data.get("type")
                print(f"📨 Received message type: {message_type} for document: {doc_id}")
            except Exception as e:
                print(f"❌ Error receiving WebSocket message: {e}")
                break
            
            if message_type == "auth":
                # Store user information for this connection
                user_id = data.get("user_id", "anonymous")
                user_name = data.get("user_name", "Anonymous User")
                user_email = data.get("user_email")
                user_display_name = data.get("user_display_name")
                share_token = data.get("share_token")
                firebase_token = data.get("firebase_token")
                
                authenticated_user = None
                auth_error = None
                
                # Priority 1: Firebase token validation (for authenticated guest users)
                if firebase_token:
                    authenticated_user = verify_firebase_token_only(firebase_token)
                    if authenticated_user:
                        user_id = authenticated_user["uid"]
                        # Properly separate name and email
                        user_email = user_email or authenticated_user.get("email")
                        user_name = user_display_name or authenticated_user.get("name") or authenticated_user.get("email", "").split("@")[0] or "User"
                        logger.info(f"Firebase auth successful for user: {user_id} ({user_email})")
                    else:
                        auth_error = "Invalid or expired Firebase token"
                        logger.error(f"Firebase token validation failed for user: {user_id}")
                
                # Priority 2: Share token validation (fallback for legacy support)
                elif share_token:
                    authenticated_user = verify_share_token_only(share_token)
                    if authenticated_user:
                        user_id = authenticated_user["uid"]
                        # Keep frontend provided details for share token users
                        user_email = user_email or authenticated_user.get("email")
                        user_name = user_display_name or user_name or "Shared User"
                        logger.info(f"Share token auth successful for user: {user_id}")
                    else:
                        auth_error = "Invalid or expired share token"
                        logger.error(f"Share token validation failed: {share_token}")
                
                else:
                    auth_error = "No authentication token provided"
                    logger.error("WebSocket auth attempt without token")
                
                if authenticated_user and not auth_error:
                    connection_users[websocket] = {
                        "user_id": user_id,
                        "user_name": user_name,
                        "user_email": user_email,
                        "user_display_name": user_display_name,
                        "share_token": share_token,
                        "firebase_token": firebase_token,
                        "user_type": authenticated_user.get("user_type", "unknown"),
                        "authenticated": True
                    }
                    await websocket.send_json({
                        "type": "auth_success",
                        "message": "Authentication successful",
                        "user_info": {
                            "user_id": user_id,
                            "user_name": user_name,
                            "user_email": user_email,
                            "user_type": authenticated_user.get("user_type")
                        }
                    })
                    logger.info(f"WebSocket auth successful for {user_id} ({user_email})")
                else:
                    connection_users[websocket] = {
                        "user_id": "anonymous",
                        "user_name": "Anonymous User",
                        "authenticated": False
                    }
                    await websocket.send_json({
                        "type": "auth_failed",
                        "message": auth_error or "Authentication failed"
                    })
                    logger.error(f"WebSocket auth failed: {auth_error}")
                
            elif message_type == "new_comment":
                user_info = connection_users.get(websocket, {"user_id": "anonymous", "user_name": "Anonymous User", "authenticated": False})
                
                # Require authentication for commenting
                if not user_info.get("authenticated", False):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Authentication required to add comments"
                    })
                    logger.warning(f"Unauthenticated comment attempt from {user_info['user_id']}")
                    continue
                
                try:
                    # Properly separate display name and email
                    display_name = user_info.get("user_display_name") or user_info["user_name"]
                    user_email = user_info.get("user_email")
                    
                    comment = CommentService.create_comment(
                        document_id=doc_id,
                        user_id=user_info["user_id"],
                        user_name=display_name,
                        user_email=user_email,
                        content=data.get("content", ""),
                        selection_text=data.get("selection_text"),
                        position=data.get("position"),
                        section_id=data.get("section_id")
                    )
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Failed to create comment: {str(e)}"
                    })
                    logger.error(f"Comment creation failed: {str(e)}")
                    continue
                
                # Broadcast to all connections for this document
                disconnected_connections = []
                for conn in active_connections[doc_id]:
                    if conn != websocket:  # Don't send back to sender
                        try:
                            await conn.send_json({
                                "type": "new_comment",
                                "comment": comment.model_dump(mode='json')
                            })
                        except Exception as e:
                            print(f"❌ Error broadcasting to connection: {e}")
                            disconnected_connections.append(conn)
                
                # Clean up disconnected connections
                for conn in disconnected_connections:
                    if conn in active_connections[doc_id]:
                        active_connections[doc_id].remove(conn)
                    if conn in connection_users:
                        del connection_users[conn]
                
                # Send confirmation to sender
                await websocket.send_json({
                    "type": "comment_created",
                    "comment": comment.model_dump(mode='json')
                })
                
            elif message_type == "new_reply":
                user_info = connection_users.get(websocket, {"user_id": "anonymous", "user_name": "Anonymous User", "authenticated": False})
                
                # Require authentication for replying
                if not user_info.get("authenticated", False):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Authentication required to add replies"
                    })
                    logger.warning(f"Unauthenticated reply attempt from {user_info['user_id']}")
                    continue
                
                try:
                    # Properly separate display name and email
                    display_name = user_info.get("user_display_name") or user_info["user_name"]
                    user_email = user_info.get("user_email")
                    
                    comment = CommentService.add_reply_to_comment(
                        comment_id=data.get("comment_id"),
                        user_id=user_info["user_id"],
                        user_name=display_name,
                        user_email=user_email,
                        content=data.get("content", "")
                    )
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Failed to add reply: {str(e)}"
                    })
                    logger.error(f"Reply creation failed: {str(e)}")
                    continue
                
                if comment:
                    # Broadcast to all connections for this document
                    disconnected_connections = []
                    for conn in active_connections[doc_id]:
                        if conn != websocket:  # Don't send back to sender
                            try:
                                await conn.send_json({
                                    "type": "new_reply",
                                    "comment": comment.model_dump(mode='json')
                                })
                            except Exception as e:
                                print(f"❌ Error broadcasting reply to connection: {e}")
                                disconnected_connections.append(conn)
                    
                    # Clean up disconnected connections
                    for conn in disconnected_connections:
                        if conn in active_connections[doc_id]:
                            active_connections[doc_id].remove(conn)
                        if conn in connection_users:
                            del connection_users[conn]
                    
                    # Send confirmation to sender
                    await websocket.send_json({
                        "type": "reply_created",
                        "comment": comment.model_dump(mode='json')
                    })
                    
            elif message_type == "resolve_comment":
                user_info = connection_users.get(websocket, {"user_id": "anonymous", "user_name": "Anonymous User", "authenticated": False})
                
                # Require authentication for resolving
                if not user_info.get("authenticated", False):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Authentication required to resolve comments"
                    })
                    logger.warning(f"Unauthenticated resolve attempt from {user_info['user_id']}")
                    continue
                
                try:
                    comment = CommentService.resolve_comment(data.get("comment_id"))
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Failed to resolve comment: {str(e)}"
                    })
                    logger.error(f"Comment resolution failed: {str(e)}")
                    continue
                
                if comment:
                    # Broadcast to all connections for this document
                    disconnected_connections = []
                    for conn in active_connections[doc_id]:
                        if conn != websocket:  # Don't send back to sender
                            try:
                                await conn.send_json({
                                    "type": "comment_resolved",
                                    "comment": comment.model_dump(mode='json')
                                })
                            except Exception as e:
                                print(f"❌ Error broadcasting resolve to connection: {e}")
                                disconnected_connections.append(conn)
                    
                    # Clean up disconnected connections
                    for conn in disconnected_connections:
                        if conn in active_connections[doc_id]:
                            active_connections[doc_id].remove(conn)
                        if conn in connection_users:
                            del connection_users[conn]
                    
                    # Send confirmation to sender
                    await websocket.send_json({
                        "type": "comment_resolved",
                        "comment": comment.model_dump(mode='json')
                    })
                    
            elif message_type == "delete_comment":
                user_info = connection_users.get(websocket, {"user_id": "anonymous", "user_name": "Anonymous User", "authenticated": False})
                
                # Require authentication for deleting
                if not user_info.get("authenticated", False):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Authentication required to delete comments"
                    })
                    logger.warning(f"Unauthenticated delete attempt from {user_info['user_id']}")
                    continue
                
                try:
                    success = CommentService.delete_comment(data.get("comment_id"))
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Failed to delete comment: {str(e)}"
                    })
                    logger.error(f"Comment deletion failed: {str(e)}")
                    continue
                
                if success:
                    # Broadcast to all connections for this document
                    disconnected_connections = []
                    for conn in active_connections[doc_id]:
                        if conn != websocket:  # Don't send back to sender
                            try:
                                await conn.send_json({
                                    "type": "comment_deleted",
                                    "comment_id": data.get("comment_id")
                                })
                            except Exception as e:
                                print(f"❌ Error broadcasting delete to connection: {e}")
                                disconnected_connections.append(conn)
                    
                    # Clean up disconnected connections
                    for conn in disconnected_connections:
                        if conn in active_connections[doc_id]:
                            active_connections[doc_id].remove(conn)
                        if conn in connection_users:
                            del connection_users[conn]
                    
                    # Send confirmation to sender
                    await websocket.send_json({
                        "type": "comment_deleted",
                        "comment_id": data.get("comment_id")
                    })
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for document: {doc_id}")
        if doc_id in active_connections and websocket in active_connections[doc_id]:
            active_connections[doc_id].remove(websocket)
        if websocket in connection_users:
            user_info = connection_users[websocket]
            logger.info(f"Cleaning up connection for user: {user_info.get('user_id')}")
            del connection_users[websocket]
        if doc_id in active_connections and not active_connections[doc_id]:
            del active_connections[doc_id]
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket handler: {str(e)}")
        # Clean up connection on any error
        if doc_id in active_connections and websocket in active_connections[doc_id]:
            active_connections[doc_id].remove(websocket)
        if websocket in connection_users:
            del connection_users[websocket]
        if doc_id in active_connections and not active_connections[doc_id]:
            del active_connections[doc_id]

# REST API endpoint for getting comments (used by frontend service)
@router.get("/documents/{doc_id}/comments", response_model=List[Comment])
async def get_document_comments(doc_id: str, current_user: dict = Depends(verify_shared_token)):
    """Get all comments for a document - used for initial load"""
    try:
        # Log authentication info for debugging
        logger.info(f"Getting comments for document {doc_id}, user: {current_user.get('uid')}, type: {current_user.get('user_type')}")
        
        comments = CommentService.get_comments_for_document(doc_id)
        return comments
    except Exception as e:
        logger.error(f"Failed to fetch comments for document {doc_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch comments: {str(e)}")

# Additional REST endpoints for comment operations with proper authentication
@router.post("/documents/{doc_id}/comments", response_model=Comment)
async def create_comment_rest(doc_id: str, request: CreateCommentRequest, current_user: dict = Depends(verify_shared_token)):
    """Create a new comment via REST API"""
    try:
        logger.info(f"Creating comment for document {doc_id}, user: {current_user.get('uid')}")
        
        comment = CommentService.create_comment(
            document_id=doc_id,
            user_id=current_user["uid"],
            user_name=current_user.get("name") or current_user.get("email", "").split("@")[0] or "User",
            user_email=current_user.get("email"),
            content=request.content,
            selection_text=request.selection_text,
            position=request.position,
            section_id=request.section_id
        )
        return comment
    except Exception as e:
        logger.error(f"Failed to create comment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {str(e)}")

@router.put("/comments/{comment_id}", response_model=Comment)
async def update_comment_rest(comment_id: str, request: UpdateCommentRequest, current_user: dict = Depends(verify_shared_token)):
    """Update a comment via REST API"""
    try:
        logger.info(f"Updating comment {comment_id}, user: {current_user.get('uid')}")
        
        comment = CommentService.update_comment(comment_id, request.content)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        return comment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update comment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update comment: {str(e)}")

@router.delete("/comments/{comment_id}")
async def delete_comment_rest(comment_id: str, current_user: dict = Depends(verify_shared_token)):
    """Delete a comment via REST API"""
    try:
        logger.info(f"Deleting comment {comment_id}, user: {current_user.get('uid')}")
        
        success = CommentService.delete_comment(comment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete comment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete comment: {str(e)}")
