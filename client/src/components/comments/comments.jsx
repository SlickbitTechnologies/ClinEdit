import { useEffect, useState } from "react";

export default function SharedDocumentComments({ docId }) {
  const [socket, setSocket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8000/api/ws/documents/${docId}/comments`
    );
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setComments((prev) => [...prev, data]);
    };
    setSocket(ws);

    return () => ws.close();
  }, [docId]);

  const sendComment = () => {
    if (socket && newComment.trim() !== "") {
      socket.send(JSON.stringify({ user: "Guest", comment: newComment }));
      setComments((prev) => [...prev, { user: "Me", comment: newComment }]); // optimistic
      setNewComment("");
    }
  };

  return (
    <div>
      <h3>Comments</h3>
      <div>
        {comments.map((c, i) => (
          <p key={i}>
            <b>{c.user}:</b> {c.comment}
          </p>
        ))}
      </div>
      <input
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Write a comment..."
      />
      <button onClick={sendComment}>Send</button>
    </div>
  );
}
