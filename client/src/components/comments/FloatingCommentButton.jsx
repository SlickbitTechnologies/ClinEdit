import React from "react";
import { IconButton, Tooltip, Fade } from "@mui/material";
import { Comment as CommentIcon } from "@mui/icons-material";

export default function FloatingCommentButton({ 
  position, 
  visible, 
  onAddComment,
  selectedText 
}) {
  if (!visible || !position) return null;

  return (
    <Fade in={visible}>
      <Tooltip title="Add comment" placement="top">
        <IconButton
          onClick={onAddComment}
          sx={{
            position: "absolute",
            top: position.top,
            left: position.left,
            zIndex: 1000,
            backgroundColor: "#1976d2",
            color: "white",
            width: 32,
            height: 32,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
          size="small"
        >
          <CommentIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Fade>
  );
}
