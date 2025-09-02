import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Divider,
  Chip,
  Menu,
  MenuItem,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Send as SendIcon,
  Reply as ReplyIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { commentService } from "../../services/commentService";
import "./comments.css";

export default function SharedDocumentComments({ documentId, token, currentUser = null }) {
  const [socket, setSocket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newReply, setNewReply] = useState({});
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showAddComment, setShowAddComment] = useState(false);
  const [selectedText, setSelectedText] = useState(null);

  const commentsEndRef = useRef(null);
  const newCommentRef = useRef(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTextSelection = (event) => {
    // Don't interfere if clicking on comment UI elements
    if (event && event.target) {
      const target = event.target;
      const isCommentUI = target.closest('[data-comment-ui]') || 
                         target.closest('.MuiPaper-root') || 
                         target.closest('.MuiTextField-root') ||
                         target.closest('.MuiButton-root') ||
                         target.closest('.comments-container');
      
      // If clicking on comment UI and we have existing selection, preserve it
      if (isCommentUI && selectedText) {
        return;
      }
    }

    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== "") {
      setSelectedText(selection.toString());
    } else {
      // Only clear if not interacting with comment UI
      if (!event || !event.target || !event.target.closest('.comments-container')) {
        setSelectedText(null);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    return () => document.removeEventListener("mouseup", handleTextSelection);
  }, [selectedText]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  useEffect(() => {
    if (!documentId) {
      console.log("No documentId provided, skipping WebSocket connection");
      return;
    }

    console.log("Setting up WebSocket connection for document:", documentId);
    console.log("Current user:", currentUser);
    console.log("Token:", token);

    // Initialize WebSocket connection with proper URL construction
    // let wsUrl;
    // if (process.env.REACT_APP_BASE_URL) {
    //   wsUrl = process.env.REACT_APP_BASE_URL
    //     .replace(/^https?:\/\//, '')
    //     .replace(/\/$/, '');
    //   wsUrl = `ws://${wsUrl}`;
    //   if (process.env.REACT_APP_BASE_URL.startsWith('https')) {
    //     wsUrl = `wss://${wsUrl.substring(5)}`;
    //   }
    // } else {
    //   wsUrl = 'ws://localhost:8000';
    // }
    
    const fullWsUrl = `ws://127.0.0.1:8000/api/documents/${documentId}/comments`;
    console.log("WebSocket URL:", fullWsUrl);
    
    let ws;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(fullWsUrl);
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        setError("Failed to create WebSocket connection");
        return;
      }
    
      ws.onopen = async () => {
        console.log("WebSocket connected for comments");
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        setError(null); // Clear any previous errors
        
        let userInfo;
        
        if (token) {
          // For shared documents, use share token
          userInfo = {
            type: "auth",
            user_id: currentUser?.uid || "anonymous",
            user_name: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Anonymous User",
            user_email: currentUser?.email,
            user_display_name: currentUser?.displayName,
            share_token: token
          };
        } else {
          // For document owners, use Firebase token
          try {
            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
              const firebaseToken = await user.getIdToken();
              userInfo = {
                type: "auth",
                user_id: user.uid,
                user_name: user.displayName || user.email?.split("@")[0] || "User",
                user_email: user.email,
                user_display_name: user.displayName,
                firebase_token: firebaseToken
              };
            } else {
              userInfo = {
                type: "auth",
                user_id: "anonymous",
                user_name: "Anonymous User"
              };
            }
          } catch (error) {
            console.error("Error getting Firebase token:", error);
            userInfo = {
              type: "auth",
              user_id: "anonymous",
              user_name: "Anonymous User"
            };
          }
        }
        
        try {
          ws.send(JSON.stringify(userInfo));
        } catch (error) {
          console.error("Error sending auth message:", error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received WebSocket message:", data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error, event.data);
        }
      };

      ws.onerror = (error) => {

        setError(`Failed to connect to comments service. URL: ${fullWsUrl}`);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(() => {
            connectWebSocket();
          }, reconnectDelay * reconnectAttempts);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError("WebSocket connection lost. Please refresh the page.");
        }
      };

      setSocket(ws);
    };
    
    // Initial connection
    connectWebSocket();

    // Load existing comments
    loadComments();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, [documentId, currentUser]);

  const loadComments = async () => {
    setLoading(true);
    try {
      let authToken;
      
      if (token) {
        // For shared documents, use the share token
        authToken = token;
      } else {
        // For document owners, get Firebase token
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          authToken = await user.getIdToken();
        } else {
          throw new Error("User not authenticated");
        }
      }
      
      const data = await commentService.getComments(documentId, authToken);
      setComments(data);
    } catch (error) {
      console.error("Error loading comments:", error);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleWebSocketMessage = (data) => {
    console.log("Processing WebSocket message:", data.type, data);
    
    try {
      switch (data.type) {
        case "existing_comments":
          setComments(data.comments || []);
          console.log("Loaded existing comments:", data.comments?.length || 0);
          break;
        case "new_comment":
          if (data.comment) {
            setComments(prev => {
              // Check if comment already exists to prevent duplicates
              const exists = prev.some(comment => comment.id === data.comment.id);
              if (exists) {
                console.log("Comment already exists, skipping duplicate:", data.comment.id);
                return prev;
              }
              return [data.comment, ...prev];
            });
            console.log("Added new comment:", data.comment.id);
          }
          break;
        case "comment_created":
          // This is a confirmation message for the sender - don't add to UI
          // The comment was already added when sending via WebSocket
          console.log("Comment created successfully:", data.comment?.id);
          break;
        case "new_reply":
          if (data.comment) {
            setComments(prev => prev.map(comment => 
              comment.id === data.comment.id ? data.comment : comment
            ));
            console.log("Added reply to comment:", data.comment.id);
          }
          break;
        case "reply_created":
          // This is a confirmation message for the sender - don't modify UI
          // The reply was already added when sending via WebSocket
          console.log("Reply created successfully:", data.comment?.id);
          break;
        case "comment_resolved":
          if (data.comment) {
            setComments(prev => prev.map(comment => 
              comment.id === data.comment.id ? data.comment : comment
            ));
            console.log("Comment resolved:", data.comment.id);
          }
          break;
        case "comment_deleted":
          if (data.comment_id) {
            setComments(prev => prev.filter(comment => comment.id !== data.comment_id));
            console.log("Comment deleted:", data.comment_id);
          }
          break;
        case "comment_updated":
          if (data.comment) {
            setComments(prev => prev.map(comment => 
              comment.id === data.comment.id ? data.comment : comment
            ));
            console.log("Comment updated:", data.comment.id);
          }
          break;
        case "error":
          console.error("WebSocket error message:", data.message);
          setError(data.message || "An error occurred");
          break;
        case "auth_success":
          console.log("Authentication successful");
          setError(null);
          break;
        case "auth_failed":
          console.error("Authentication failed:", data.message);
          setError(data.message || "Authentication failed");
          break;
        default:
          console.log("Unknown message type:", data.type, data);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error, data);
      setError("Error processing server message");
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. State:", socket?.readyState);
      const stateNames = {
        0: "CONNECTING",
        1: "OPEN", 
        2: "CLOSING",
        3: "CLOSED"
      };
      setError(`WebSocket is ${stateNames[socket?.readyState] || 'UNKNOWN'}. Please wait or refresh the page.`);
      return;
    }

    const commentData = {
      type: "new_comment",
      content: newComment.trim(),
      selection_text: selectedText || null,
      position: null,
      section_id: null,
    };

    try {
      console.log("Sending comment:", commentData);
      socket.send(JSON.stringify(commentData));
      setNewComment("");
      setSelectedText(null);
      setShowAddComment(false);
    } catch (error) {
      console.error("Error sending comment:", error);
      setError("Failed to send comment. Please try again.");
    }
  };

  const sendReply = async (commentId) => {
    const replyContent = newReply[commentId];
    if (!replyContent?.trim() || !socket) return;

    if (socket.readyState !== WebSocket.OPEN) {
      setError("WebSocket connection is not ready. Please try again.");
      return;
    }

    const replyData = {
      type: "new_reply",
      comment_id: commentId,
      content: replyContent.trim(),
    };

    try {
      socket.send(JSON.stringify(replyData));
      setNewReply(prev => ({ ...prev, [commentId]: "" }));
    } catch (error) {
      console.error("Error sending reply:", error);
      setError("Failed to send reply. Please try again.");
    }
  };

  const resolveComment = async (commentId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("WebSocket connection is not ready. Please try again.");
      return;
    }

    const resolveData = {
      type: "resolve_comment",
      comment_id: commentId,
    };

    try {
      socket.send(JSON.stringify(resolveData));
    } catch (error) {
      console.error("Error resolving comment:", error);
      setError("Failed to resolve comment. Please try again.");
    }
  };

  const deleteComment = async (commentId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("WebSocket connection is not ready. Please try again.");
      return;
    }

    const deleteData = {
      type: "delete_comment",
      comment_id: commentId,
    };

    try {
      socket.send(JSON.stringify(deleteData));
    } catch (error) {
      console.error("Error deleting comment:", error);
      setError("Failed to delete comment. Please try again.");
    }
    setAnchorEl(null);
  };

  const updateComment = async (commentId, newContent) => {
    try {
      let authToken;
      
      if (token) {
        // For shared documents, use the share token
        authToken = token;
      } else {
        // For document owners, get Firebase token
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          authToken = await user.getIdToken();
        } else {
          throw new Error("User not authenticated");
        }
      }
      
      await commentService.updateComment(commentId, { content: newContent }, authToken);
      setEditContent("");
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleMenuOpen = (event, comment) => {
    setAnchorEl(event.currentTarget);
    setSelectedComment(comment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedComment(null);
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };


  const canDeleteComment = (comment) => {
    // Allow owner to delete any comment, or user to delete their own comment
    if (!currentUser) return false;
    
    // If it's the document owner (no share token), they can delete any comment
    if (!token) return true;
    
    // If it's a shared user, they can only delete their own comments
    return comment.user_id === currentUser.uid;
  };

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getUserInitials = (userName) => {
    return userName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserColor = (userName) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'
    ];
    const index = userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Box className="comment-loading">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box >
      <Paper elevation={2} sx={{ p: 2 }} className="comments-container comment-scroll-container">
        <Box display="flex" alignItems="center" mb={2}>
          <CommentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            Comments ({comments.length})
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Add Comment Section */}
        <Box sx={{ mb: 3 }}>
          {!showAddComment ? (
            <Button
              variant="outlined"
              startIcon={<CommentIcon />}
              onClick={() => setShowAddComment(true)}
              fullWidth
              data-comment-ui="true"
            >
              Add a comment
            </Button>
          ) : (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{ mb: 1 }}
                ref={newCommentRef}
                autoFocus
                data-comment-ui="true"
              />
              <Box display="flex" gap={1} justifyContent="flex-end">
                <Button
                  variant="text"
                  onClick={() => {
                    setShowAddComment(false);
                    setNewComment("");
                  }}
                  data-comment-ui="true"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={sendComment}
                  disabled={!newComment.trim()}
                  data-comment-ui="true"
                >
                  Comment
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Comments List */}
        {comments.length === 0 ? (
          <Box className="comments-empty-state">
            <CommentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No comments yet. Be the first to add a comment!
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {comments.map((comment) => (
              <React.Fragment key={comment.id}>
                <ListItem
                  alignItems="flex-start"
                  className={`comment-item ${comment.status === 'resolved' ? 'resolved-comment' : ''}`}
                  sx={{
                    px: 0,
                    py: 2,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      className="comment-avatar"
                      sx={{
                        bgcolor: getUserColor(comment.user_name),
                        width: 32,
                        height: 32,
                        fontSize: '0.875rem',
                      }}
                    >
                      {getUserInitials(comment.user_name)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" component="span">
                          {comment.user_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(comment.created_at)}
                        </Typography>
                        {comment.status === 'resolved' && (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Resolved"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {comment.selection_text && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: "italic", borderLeft: "3px solid #1976d2", pl: 1, mb: 1 }}
                              >
                                “{comment.selection_text}”
                              </Typography>
                            )}
         
                          <Typography
                            variant="body2"
                            color="text.primary"
                            className="comment-content"
                            sx={{ mt: 1 }}
                          >
                            {comment.content}
                          </Typography>
                      
                        {/* Action Buttons */}
                        <Box display="flex" gap={0.5} mt={1} className="comment-actions">
                          {comment.status !== 'resolved' && (
                            <Tooltip title="Reply">
                              <IconButton
                                size="small"
                                onClick={() => toggleReplies(comment.id)}
                                sx={{ color: 'primary.main' }}
                                data-comment-ui="true"
                              >
                                <ReplyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {comment.status !== 'resolved' && (
                            <Tooltip title="Resolve">
                              <IconButton
                                size="small"
                                onClick={() => resolveComment(comment.id)}
                                sx={{ color: 'success.main' }}
                                data-comment-ui="true"
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {canDeleteComment(comment) && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => deleteComment(comment.id)}
                                sx={{ color: 'error.main' }}
                                data-comment-ui="true"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                        
                        {/* Reply Input */}
                        <Collapse in={expandedReplies[comment.id]}>
                          <Box sx={{ mt: 2, pl: 2 }} className="reply-section">
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              variant="outlined"
                              placeholder="Write a reply..."
                              value={newReply[comment.id] || ""}
                              onChange={(e) => setNewReply(prev => ({
                                ...prev,
                                [comment.id]: e.target.value
                              }))}
                              sx={{ mb: 1 }}
                              data-comment-ui="true"
                            />
                            <Box display="flex" gap={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                onClick={() => toggleReplies(comment.id)}
                                data-comment-ui="true"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={() => sendReply(comment.id)}
                                disabled={!newReply[comment.id]?.trim()}
                                data-comment-ui="true"
                              >
                                Reply
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <Box sx={{ mt: 2, pl: 2 }} className="comment-replies">
                                                          {comment.replies.map((reply) => (
                                <Box key={reply.id} className="reply-item">
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                  <Avatar
                                    sx={{
                                      bgcolor: getUserColor(reply.user_name),
                                      width: 24,
                                      height: 24,
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {getUserInitials(reply.user_name)}
                                  </Avatar>
                                  <Typography variant="subtitle2" component="span">
                                    {reply.user_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(reply.created_at)}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                  className="comment-content"
                                  sx={{ pl: 3 }}
                                >
                                  {reply.content}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
        
        <div ref={commentsEndRef} />
      </Paper>

      {/* Comment Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedComment && canDeleteComment(selectedComment) && (
          <MenuItem
            onClick={() => deleteComment(selectedComment.id)}
            className="comment-menu-item"
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Comment
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}