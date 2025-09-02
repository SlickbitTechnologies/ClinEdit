import React, { useState, useRef, useEffect } from "react";
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
  Collapse,
  Alert,
} from "@mui/material";
import {
  Send as SendIcon,
  Reply as ReplyIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";

export default function InlineCommentPanel({
  comments,
  onSendComment,
  onSendReply,
  onResolveComment,
  onDeleteComment,
  onClose,
  selectedText,
  currentUser,
  position,
  visible,
}) {
  const [newComment, setNewComment] = useState("");
  const [newReply, setNewReply] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showAddComment, setShowAddComment] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (visible && selectedText) {
      setShowAddComment(true);
    }
  }, [visible, selectedText]);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    if (onSendComment) {
      onSendComment(newComment.trim(), selectedText);
    }
    setNewComment("");
    setShowAddComment(false);
  };

  const handleSendReply = (commentId) => {
    const replyContent = newReply[commentId];
    if (!replyContent?.trim()) return;
    onSendReply(commentId, replyContent.trim());
    setNewReply(prev => ({ ...prev, [commentId]: "" }));
    setExpandedReplies(prev => ({ ...prev, [commentId]: false }));
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
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

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  if (!visible) return null;

  return (
    <Paper
      ref={panelRef}
      elevation={8}
      sx={{
        position: "absolute",
        top: position?.top || 0,
        right: position?.right || 20,
        width: 320,
        maxHeight: 400,
        overflowY: "auto",
        zIndex: 1001,
        borderRadius: 2,
        border: "1px solid #e0e4e7",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Comments
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Selected Text Display */}
        {selectedText && (
          <Box sx={{ mb: 2, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Selected text:
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
              "{selectedText}"
            </Typography>
          </Box>
        )}

        {/* Add Comment Section */}
        {showAddComment && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              sx={{ mb: 1 }}
              autoFocus
            />
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                size="small"
                onClick={() => {
                  setShowAddComment(false);
                  setNewComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSendComment}
                disabled={!newComment.trim()}
              >
                Comment
              </Button>
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Comments List */}
        {comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            No comments yet
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {comments.map((comment) => (
              <React.Fragment key={comment.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0, py: 1 }}>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getUserColor(comment.user_name),
                        width: 28,
                        height: 28,
                        fontSize: '0.75rem',
                      }}
                    >
                      {getUserInitials(comment.user_name)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="subtitle2" sx={{ fontSize: "0.875rem" }}>
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
                            sx={{ height: 20, fontSize: "0.7rem" }}
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
                            sx={{ 
                              fontStyle: "italic", 
                              borderLeft: "3px solid #1976d2", 
                              pl: 1, 
                              mb: 1,
                              fontSize: "0.8rem"
                            }}
                          >
                            "{comment.selection_text}"
                          </Typography>
                        )}
                        
                        <Typography
                          variant="body2"
                          color="text.primary"
                          sx={{ fontSize: "0.875rem" }}
                        >
                          {comment.content}
                        </Typography>
                        
                        {/* Action Buttons */}
                        <Box display="flex" gap={1} mt={1}>
                          <Button
                            size="small"
                            startIcon={<ReplyIcon />}
                            onClick={() => toggleReplies(comment.id)}
                            sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1 }}
                          >
                            Reply
                          </Button>
                          
                          {comment.status !== 'resolved' && (
                            <Button
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => onResolveComment(comment.id)}
                              sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1 }}
                            >
                              Resolve
                            </Button>
                          )}
                        </Box>
                        
                        {/* Reply Input */}
                        <Collapse in={expandedReplies[comment.id]}>
                          <Box sx={{ mt: 1 }}>
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
                              size="small"
                            />
                            <Box display="flex" gap={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                onClick={() => toggleReplies(comment.id)}
                                sx={{ fontSize: "0.75rem" }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={() => handleSendReply(comment.id)}
                                disabled={!newReply[comment.id]?.trim()}
                                sx={{ fontSize: "0.75rem" }}
                              >
                                Reply
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <Box sx={{ mt: 1, pl: 1 }}>
                            {comment.replies.map((reply) => (
                              <Box key={reply.id} sx={{ mb: 1 }}>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <Avatar
                                    sx={{
                                      bgcolor: getUserColor(reply.user_name),
                                      width: 20,
                                      height: 20,
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    {getUserInitials(reply.user_name)}
                                  </Avatar>
                                  <Typography variant="subtitle2" sx={{ fontSize: "0.8rem" }}>
                                    {reply.user_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(reply.created_at)}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="body2"
                                  sx={{ pl: 2.5, fontSize: "0.8rem" }}
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
                {comments.indexOf(comment) < comments.length - 1 && (
                  <Divider component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}
