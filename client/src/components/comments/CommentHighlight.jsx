import React from "react";
import { Box, Tooltip } from "@mui/material";

export default function CommentHighlight({ 
  children, 
  commentId, 
  onClick, 
  isActive = false 
}) {
  return (
    <Tooltip title="Click to view comment" placement="top">
      <Box
        component="span"
        onClick={onClick}
        sx={{
          backgroundColor: isActive ? "#fff3cd" : "#e3f2fd",
          borderBottom: "2px solid #1976d2",
          cursor: "pointer",
          padding: "1px 2px",
          borderRadius: "2px",
          "&:hover": {
            backgroundColor: "#fff3cd",
          },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}
