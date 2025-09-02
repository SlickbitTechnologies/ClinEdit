from fastapi import WebSocket, WebSocketDisconnect, APIRouter, HTTPException, Depends
from typing import Dict, List, Optional

from models.comment import (
    Comment, CommentReply, CreateCommentRequest, CreateReplyRequest, 
    UpdateCommentRequest, CommentResponse, CommentStatus
)
from services.comment_service import CommentService
from dependencies.verify_token import verify_shared_token,shared_links

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
                share_token = data.get("share_token")
                firebase_token = data.get("firebase_token")
                
                # If this is a shared document, validate the share token
                if share_token:
                    if share_token in shared_links:
                        stored_info = shared_links[share_token]
                        user_id = f"shared_{stored_info['user_id']}"
                        # Keep the user_name from the frontend instead of overriding it
                        # user_name = "Shared User"
                
                # If this is a document owner, validate the Firebase token
                elif firebase_token:
                    try:
                        from firebase_admin import auth
                        decoded_token = auth.verify_id_token(firebase_token)
                        user_id = decoded_token["uid"]
                        user_name = decoded_token.get("name") or decoded_token.get("email") or "Document Owner"
                    except Exception as e:
                        print(f"Firebase token validation failed: {e}")
                        user_id = "anonymous"
                        user_name = "Anonymous User"
                
                connection_users[websocket] = {
                    "user_id": user_id,
                    "user_name": user_name,
                    "share_token": share_token,
                    "firebase_token": firebase_token
                }
                await websocket.send_json({
                    "type": "auth_success",
                    "message": "Authentication successful"
                })
                
            elif message_type == "new_comment":
                user_info = connection_users.get(websocket, {"user_id": "anonymous", "user_name": "Anonymous User"})
                
                comment = CommentService.create_comment(
                    document_id=doc_id,
                    user_id=user_info["user_id"],
                    user_name=user_info["user_name"],
                    content=data.get("content", ""),
                    selection_text=data.get("selection_text"),
                    position=data.get("position"),
                    section_id=data.get("section_id")
                )
                
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
                user_info = connection_users.get(websocket, {"user_id": "anonymous", "user_name": "Anonymous User"})
                
                comment = CommentService.add_reply_to_comment(
                    comment_id=data.get("comment_id"),
                    user_id=user_info["user_id"],
                    user_name=user_info["user_name"],
                    content=data.get("content", "")
                )
                
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
                comment = CommentService.resolve_comment(data.get("comment_id"))
                
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
                success = CommentService.delete_comment(data.get("comment_id"))
                
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
        active_connections[doc_id].remove(websocket)
        if websocket in connection_users:
            del connection_users[websocket]
        if not active_connections[doc_id]:
            del active_connections[doc_id]

# REST API endpoint for getting comments (used by frontend service)
@router.get("/documents/{doc_id}/comments", response_model=List[Comment])
async def get_document_comments(doc_id: str, current_user: dict = Depends(verify_shared_token)):
    """Get all comments for a document - used for initial load"""
    try:
        comments = CommentService.get_comments_for_document(doc_id)
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch comments: {str(e)}")
