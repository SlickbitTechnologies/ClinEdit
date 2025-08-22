import React, { useState, useRef } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { Add, Upload } from "@mui/icons-material";
import { toast } from "react-toastify";
import "./TemplateConfiguration.css";
import { uploadCSRTemplate } from "../services/services";



export default function TemplateConfiguration() {
  const [documentType, setDocumentType] = useState("report");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const result = await uploadCSRTemplate(file);
      toast.success(" Template uploaded successfully!");
      console.log("Upload response:", result);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(` ${err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  };

  // File input handler
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleUpload(file);
  };

  // Drag & drop handlers
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <div className="csr-template-page">
      <Container maxWidth="md" className="csr-container">
        <Card className="csr-template-card">
          <CardContent>
            <Avatar className="csr-icon">
              <Add />
            </Avatar>

            <Typography variant="h5" className="csr-title">
              Configure Clinical Study Report
            </Typography>

            <Typography variant="body1" className="csr-description">
              Start with a pre-filled CSR template that includes all essential
              regulatory sections for faster setup.
            </Typography>

            <Box className="csr-form">
              <Typography variant="body2" className="csr-label">
                Select Template Type
              </Typography>

              <FormControl fullWidth className="csr-select">
                <Select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <MenuItem value="report">Clinical Study Report</MenuItem>
                </Select>
              </FormControl>

              {/* Hidden file input */}
              <input
                type="file"
                accept=".docx,.pdf"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {/* Drag & Drop Zone */}
              <Box
                className="drag-drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Typography variant="body2" color="textSecondary">
                  Drag & drop your CSR template here, or click below to upload
                </Typography>
              </Box>

              {/* Upload Button */}
              <Button
                className="csr-button"
                variant="contained"
                startIcon={
                  uploading ? <CircularProgress size={20} /> : <Upload />
                }
                fullWidth
                onClick={handleButtonClick}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload CSR Template"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
