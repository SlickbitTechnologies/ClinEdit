from fastapi import WebSocket, WebSocketDisconnect, APIRouter, HTTPException, Depends
from typing import Dict, List
from loguru import logger
from models.comment import Comment, CreateCommentRequest, UpdateCommentRequest
from services.comment_service import CommentService
from dependencies.verify_token import (
    verify_shared_token,
    verify_firebase_token_only,
    verify_share_token_only,
)

router = APIRouter()

# Active WebSocket connections grouped by document_id
active_connections: Dict[str, List[WebSocket]] = {}
# Store user information for WebSocket connections
connection_users: Dict[WebSocket, dict] = {}



async def broadcast_to_document(doc_id: str, message: dict, exclude: WebSocket = None):
    """Send a message to all WebSocket connections for a document."""
    if doc_id not in active_connections:
        return

    disconnected = []
    for conn in active_connections[doc_id]:
        if conn == exclude:
            continue
        try:
            await conn.send_json(message)
        except Exception as e:
            logger.warning(f"Broadcast failed to connection: {e}")
            disconnected.append(conn)

    for conn in disconnected:
        await cleanup_connection(doc_id, conn)


async def cleanup_connection(doc_id: str, websocket: WebSocket):
    """Clean up disconnected WebSocket."""
    if doc_id in active_connections and websocket in active_connections[doc_id]:
        active_connections[doc_id].remove(websocket)
    if websocket in connection_users:
        del connection_users[websocket]
    if doc_id in active_connections and not active_connections[doc_id]:
        del active_connections[doc_id]


def authenticate_user(data: dict):
    """Authenticate using Firebase or Share token, returning user info and error (if any)."""
    firebase_token = data.get("firebase_token")
    share_token = data.get("share_token")
    user_email = data.get("user_email")
    user_display_name = data.get("user_display_name")
    user_name = data.get("user_name", "Anonymous User")

    authenticated_user = None
    auth_error = None

    # Priority 1: Firebase authentication
    if firebase_token:
        authenticated_user = verify_firebase_token_only(firebase_token)
        if authenticated_user:
            return {
                "user_id": authenticated_user["uid"],
                "user_name": user_display_name
                or authenticated_user.get("name")
                or authenticated_user.get("email", "").split("@")[0],
                "user_email": user_email or authenticated_user.get("email"),
                "user_type": authenticated_user.get("user_type", "firebase"),
                "authenticated": True,
            }, None
        auth_error = "Invalid or expired Firebase token"

    # Priority 2: Share token authentication
    elif share_token:
        authenticated_user = verify_share_token_only(share_token)
        if authenticated_user:
            return {
                "user_id": authenticated_user["uid"],
                "user_name": user_display_name or user_name or "Shared User",
                "user_email": user_email or authenticated_user.get("email"),
                "user_type": authenticated_user.get("user_type", "shared"),
                "authenticated": True,
            }, None
        auth_error = "Invalid or expired share token"

    else:
        auth_error = "No authentication token provided"

    return (
        {"user_id": "anonymous", "user_name": "Anonymous User", "authenticated": False},
        auth_error,
    )



@router.websocket("/documents/{doc_id}/comments")
async def document_comments_ws(websocket: WebSocket, doc_id: str):
    logger.info(f"WebSocket connection request for document: {doc_id}")

    try:
        await websocket.accept()
        active_connections.setdefault(doc_id, []).append(websocket)
        logger.info(f"Connected. Active for {doc_id}: {len(active_connections[doc_id])}")
    except Exception as e:
        logger.error(f"Error accepting WebSocket connection: {e}")
        return

    # Send existing comments when user connects
    try:
        existing_comments = CommentService.get_comments_for_document(doc_id)
        serializable_comments = [
            c.model_dump(mode="json") for c in existing_comments
        ]
        await websocket.send_json(
            {"type": "existing_comments", "comments": serializable_comments}
        )
    except Exception as e:
        await websocket.send_json(
            {"type": "error", "message": "Failed to load existing comments"}
        )
        logger.error(f"Error sending existing comments: {e}")

    # Handle incoming messages
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            logger.debug(f"Received message type: {msg_type}")

            # --- Authentication ---
            if msg_type == "auth":
                user_info, auth_error = authenticate_user(data)
                connection_users[websocket] = user_info

                if user_info["authenticated"]:
                    await websocket.send_json(
                        {"type": "auth_success", "user_info": user_info}
                    )
                else:
                    await websocket.send_json(
                        {"type": "auth_failed", "message": auth_error}
                    )
                continue

            # --- Comment creation ---
            if msg_type == "new_comment":
                user_info = connection_users.get(websocket, {})
                if not user_info.get("authenticated"):
                    await websocket.send_json(
                        {"type": "error", "message": "Authentication required"}
                    )
                    continue

                try:
                    comment = CommentService.create_comment(
                        document_id=doc_id,
                        user_id=user_info["user_id"],
                        user_name=user_info["user_name"],
                        user_email=user_info.get("user_email"),
                        content=data.get("content", ""),
                        selection_text=data.get("selection_text"),
                        position=data.get("position"),
                        section_id=data.get("section_id"),
                    )

                    await broadcast_to_document(
                        doc_id,
                        {"type": "new_comment", "comment": comment.model_dump(mode="json")},
                        exclude=websocket,
                    )

                    await websocket.send_json(
                        {"type": "comment_created", "comment": comment.model_dump(mode="json")}
                    )
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)})
                    logger.error(f"Comment creation failed: {e}")

            # --- Reply creation ---
            elif msg_type == "new_reply":
                user_info = connection_users.get(websocket, {})
                if not user_info.get("authenticated"):
                    await websocket.send_json(
                        {"type": "error", "message": "Authentication required"}
                    )
                    continue

                try:
                    comment = CommentService.add_reply_to_comment(
                        comment_id=data.get("comment_id"),
                        user_id=user_info["user_id"],
                        user_name=user_info["user_name"],
                        user_email=user_info.get("user_email"),
                        content=data.get("content", ""),
                    )

                    if comment:
                        await broadcast_to_document(
                            doc_id,
                            {"type": "new_reply", "comment": comment.model_dump(mode="json")},
                            exclude=websocket,
                        )

                        await websocket.send_json(
                            {"type": "reply_created", "comment": comment.model_dump(mode="json")}
                        )
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)})
                    logger.error(f"Reply creation failed: {e}")

            # --- Resolve comment ---
            elif msg_type == "resolve_comment":
                user_info = connection_users.get(websocket, {})
                if not user_info.get("authenticated"):
                    await websocket.send_json(
                        {"type": "error", "message": "Authentication required"}
                    )
                    continue

                try:
                    comment = CommentService.resolve_comment(data.get("comment_id"))
                    if comment:
                        payload = {
                            "type": "comment_resolved",
                            "comment": comment.model_dump(mode="json"),
                        }
                        await broadcast_to_document(doc_id, payload, exclude=websocket)
                        await websocket.send_json(payload)
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)})
                    logger.error(f"Resolve failed: {e}")

            # --- Delete comment ---
            elif msg_type == "delete_comment":
                user_info = connection_users.get(websocket, {})
                if not user_info.get("authenticated"):
                    await websocket.send_json(
                        {"type": "error", "message": "Authentication required"}
                    )
                    continue

                try:
                    success = CommentService.delete_comment(data.get("comment_id"))
                    if success:
                        payload = {
                            "type": "comment_deleted",
                            "comment_id": data.get("comment_id"),
                        }
                        await broadcast_to_document(doc_id, payload, exclude=websocket)
                        await websocket.send_json(payload)
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)})
                    logger.error(f"Delete failed: {e}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {doc_id}")
        await cleanup_connection(doc_id, websocket)
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket handler: {e}")
        await cleanup_connection(doc_id, websocket)




@router.get("/documents/{doc_id}/comments", response_model=List[Comment])
async def get_document_comments(doc_id: str, current_user: dict = Depends(verify_shared_token)):
    """Get all comments for a document."""
    try:
        comments = CommentService.get_comments_for_document(doc_id)
        return comments
    except Exception as e:
        logger.error(f"Failed to fetch comments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch comments: {e}")


@router.post("/documents/{doc_id}/comments", response_model=Comment)
async def create_comment_rest(doc_id: str, request: CreateCommentRequest, current_user: dict = Depends(verify_shared_token)):
    """Create a new comment via REST API."""
    try:
        comment = CommentService.create_comment(
            document_id=doc_id,
            user_id=current_user["uid"],
            user_name=current_user.get("name")
            or current_user.get("email", "").split("@")[0]
            or "User",
            user_email=current_user.get("email"),
            content=request.content,
            selection_text=request.selection_text,
            position=request.position,
            section_id=request.section_id,
        )
        return comment
    except Exception as e:
        logger.error(f"Failed to create comment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {e}")


@router.put("/comments/{comment_id}", response_model=Comment)
async def update_comment_rest(comment_id: str, request: UpdateCommentRequest, current_user: dict = Depends(verify_shared_token)):
    """Update a comment via REST API."""
    try:
        comment = CommentService.update_comment(comment_id, request.content)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        return comment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update comment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update comment: {e}")


@router.delete("/comments/{comment_id}")
async def delete_comment_rest(comment_id: str, current_user: dict = Depends(verify_shared_token)):
    """Delete a comment via REST API."""
    try:
        success = CommentService.delete_comment(comment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete comment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete comment: {e}")
