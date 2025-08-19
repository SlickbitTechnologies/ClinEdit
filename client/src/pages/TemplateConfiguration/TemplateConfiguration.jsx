import React from "react";
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
import "./TemplateConfiguration.css";
import { uploadCSRTemplate } from "../services/services";

export default function TemplateConfiguration() {
  const [documentType, setDocumentType] = React.useState("report");
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const fileInputRef = React.useRef(null);

  // Trigger file selection
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file upload
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage("");
      const result = await uploadCSRTemplate(file);
      setMessage("✅ Template uploaded successfully!");
      console.log("Upload response:", result);
    } catch (err) {
      console.error("Upload error:", err);
      setMessage(`❌ ${err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
    }
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

              {message && (
                <Typography
                  variant="body2"
                  className="csr-message"
                  style={{ marginTop: "10px" }}
                >
                  {message}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
