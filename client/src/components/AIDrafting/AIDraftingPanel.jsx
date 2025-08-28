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

      // Process all uploaded PDF files
      const allSuggestions = [];
      const totalFiles = uploadedFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = uploadedFiles[i];
        try {
          const result = await ingestPdfForDocument(documentId, file);
          if (result?.suggestions) {
            // Add file identifier to each suggestion for tracking
            const suggestionsWithSource = result.suggestions.map(s => ({
              ...s,
              source_file: file.name,
              file_index: i
            }));
            allSuggestions.push(...suggestionsWithSource);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          toast.warning(`Failed to process ${file.name}, continuing with other files...`);
        }
      }

      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      if (allSuggestions.length === 0) {
        toast.error("No content could be extracted from the uploaded files");
        return;
      }

      setSuggestions(allSuggestions);
      
      // Build a simple map for preview by section id
      const mapped = {};
      allSuggestions.forEach(s => {
        const key = s.subsection_id || s.section_id;
        if (!mapped[key]) mapped[key] = [];
        mapped[key].push(s);
      });
      setGeneratedContent(mapped);
      setShowPreview(true);
      toast.success(`AI drafting completed successfully! Processed ${totalFiles} file(s) with ${allSuggestions.length} suggestions.`);

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
      section_id: s.section_id,  // Single ID representing the most specific level
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
                // Parse the section_id to determine the level and build title
                const sectionId = s.section_id;
                const parts = sectionId.split(".");
                let title = s.title || sectionId;
                
                // Build hierarchical title based on ID format
                if (parts.length === 2) {
                  // Subsection level (e.g., "12.1")
                  const section = sections.find(sec => sec.id === parts[0]);
                  if (section) {
                    title = `${section.title || parts[0]} → ${s.title || sectionId}`;
                  }
                } else if (parts.length === 3) {
                  // Subsubsection level (e.g., "12.1.1")
                  const section = sections.find(sec => sec.id === parts[0]);
                  if (section) {
                    const subsection = section.subsections?.find(sub => sub.id === `${parts[0]}.${parts[1]}`);
                    if (subsection) {
                      title = `${section.title || parts[0]} → ${subsection.title || `${parts[0]}.${parts[1]}`} → ${s.title || sectionId}`;
                    }
                  }
                }
                
                return (
                  <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="h6">{title}</Typography>
                      {s.source?.pages?.length ? (
                        <Chip size="small" label={`Pages: ${s.source.pages.join(',')}`} />
                      ) : null}
                      {s.source_file && (
                        <Chip size="small" label={`From: ${s.source_file}`} color="secondary" />
                      )}
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
