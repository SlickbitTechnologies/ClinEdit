from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Dict, List

router = APIRouter()

# Active connections grouped by document_id
active_connections: Dict[str, List[WebSocket]] = {}

@router.websocket("/ws/documents/{doc_id}/comments")
async def document_comments_ws(websocket: WebSocket, doc_id: str):
    await websocket.accept()

    if doc_id not in active_connections:
        active_connections[doc_id] = []
    active_connections[doc_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            # Example: {"user": "John", "comment": "This looks good", "pos": "section1"}
            for conn in active_connections[doc_id]:
                if conn != websocket:  # broadcast to others
                    await conn.send_json(data)
    except WebSocketDisconnect:
        active_connections[doc_id].remove(websocket)
