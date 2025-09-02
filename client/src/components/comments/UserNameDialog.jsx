import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";

export default function UserNameDialog({ open, onClose, onSave, initialName = "" }) {
  const [userName, setUserName] = useState(initialName);

  const handleSave = () => {
    if (userName.trim()) {
      onSave(userName.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PersonIcon color="primary" />
          <Typography variant="h6">Enter Your Name</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please enter your name so the document owner knows who is commenting.
        </Typography>
        <TextField
          fullWidth
          label="Your Name"
          variant="outlined"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your full name"
          autoFocus
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSave();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={!userName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
