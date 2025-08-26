import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { ingestPdfForDocument, applyExtractionToDocument } from "../../pages/services/services";

const AIDraftingPanel = ({ sections, onContentGenerated, documentId }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const pdfFiles = files.filter(file => file.type === "application/pdf");
    
    if (pdfFiles.length !== files.length) {
      toast.warning("Only PDF files are supported");
    }
    
    setUploadedFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === "application/pdf");
    
    if (pdfFiles.length !== files.length) {
      toast.warning("Only PDF files are supported");
    }
    
    setUploadedFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processWithAI = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one PDF file");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate progress updates while calling backend
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      // For now we only support a single PDF per run; use first file
      const file = uploadedFiles[0];
      const result = await ingestPdfForDocument(documentId, file);
      clearInterval(progressInterval);
      setProcessingProgress(100);
      setSuggestions(result?.suggestions || []);
      // Build a simple map for preview by section id
      const mapped = {};
      (result?.suggestions || []).forEach(s => {
        const key = s.subsection_id || s.section_id;
        if (!mapped[key]) mapped[key] = [];
        mapped[key].push(s);
      });
      setGeneratedContent(mapped);
      setShowPreview(true);
      toast.success("AI drafting completed successfully!");

    } catch (error) {
      console.error('AI processing error:', error);
      toast.error("Failed to process PDFs. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const acceptGeneratedContent = () => {
    if (!suggestions?.length) return;
    // Default apply mode: append
    const accepted = suggestions.map(s => ({
      section_id: s.section_id,
      subsection_id: s.subsection_id || null,
      subsubsection_id: s.subsubsection_id || null,
      content: s.content || "",
      mode: "append",
    }));
    applyExtractionToDocument(documentId, accepted)
      .then(() => {
        if (onContentGenerated) {
          onContentGenerated(accepted);
        }
        setShowPreview(false);
        setGeneratedContent(null);
        setUploadedFiles([]);
        setSuggestions([]);
        toast.success("Applied AI suggestions to document.");
      })
      .catch((e) => {
        console.error(e);
        toast.error("Failed to apply AI suggestions.");
      });
  };

  const rejectGeneratedContent = () => {
    setShowPreview(false);
    setGeneratedContent(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <AutoAwesomeIcon color="primary" />
        AI Drafting Assistant
      </Typography>

      {/* File Upload Area */}
      <Paper
        sx={{
          p: 3,
          mb: 2,
          border: "2px dashed #e0e4e7",
          borderRadius: 2,
          textAlign: "center",
          cursor: "pointer",
          "&:hover": {
            borderColor: "#16a085",
            bgcolor: "rgba(22, 160, 133, 0.05)",
          },
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById("pdf-upload").click()}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: "#16a085", mb: 1 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Upload Clinical PDFs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag & drop PDF files here or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Supported: Protocols, Study Reports, Safety Data, Regulatory Documents
        </Typography>
        <input
          id="pdf-upload"
          type="file"
          multiple
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </Paper>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Uploaded Files ({uploadedFiles.length})
          </Typography>
          <List dense>
            {uploadedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => removeFile(index)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            AI Processing in Progress...
          </Typography>
          <LinearProgress variant="determinate" value={processingProgress} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Extracting and analyzing content from PDFs
          </Typography>
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          onClick={processWithAI}
          disabled={uploadedFiles.length === 0 || isProcessing}
          startIcon={<AutoAwesomeIcon />}
          sx={{
            bgcolor: "#16a085",
            "&:hover": { bgcolor: "#138d75" },
          }}
        >
          {isProcessing ? "Processing..." : "Generate AI Draft"}
        </Button>
        
        {generatedContent && (
          <Button
            variant="outlined"
            onClick={() => setShowPreview(true)}
            startIcon={<PreviewIcon />}
          >
            Preview Generated Content
          </Button>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          AI Generated Content Preview
        </DialogTitle>
        <DialogContent>
          {generatedContent && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Review the AI-generated content below. You can accept it to apply to your document or reject it to try again.
              </Alert>
              
              {suggestions.map((s, idx) => {
                const sec = sections.find(ss => ss.id === s.section_id);
                let title = s.title || sec?.title || s.section_id;
                
                // Build hierarchical title if subsection/subsubsection exists
                if (s.subsection_id) {
                  const subsec = sec?.subsections?.find(sub => sub.id === s.subsection_id);
                  if (subsec) {
                    title = `${title} → ${subsec.title || s.subsection_id}`;
                    
                    if (s.subsubsection_id) {
                      const subsubsec = subsec.subsubsections?.find(subsub => subsub.id === s.subsubsection_id);
                      if (subsubsec) {
                        title = `${title} → ${subsubsec.title || s.subsubsection_id}`;
                      }
                    }
                  }
                }
                
                return (
                  <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="h6">{title}</Typography>
                      {typeof s.confidence === 'number' && (
                        <Chip size="small" label={`Conf: ${(s.confidence * 100).toFixed(0)}%`} />
                      )}
                      {s.source?.pages?.length ? (
                        <Chip size="small" label={`Pages: ${s.source.pages.join(',')}`} />
                      ) : null}
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {s.content || ""}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={rejectGeneratedContent}
            startIcon={<CancelIcon />}
            color="error"
          >
            Reject
          </Button>
          <Button
            onClick={acceptGeneratedContent}
            startIcon={<CheckCircleIcon />}
            variant="contained"
            sx={{
              bgcolor: "#16a085",
              "&:hover": { bgcolor: "#138d75" },
            }}
          >
            Accept & Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIDraftingPanel;
