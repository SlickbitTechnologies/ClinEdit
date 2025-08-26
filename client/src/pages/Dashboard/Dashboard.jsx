import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tooltip,
} from "@mui/material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Description,
  Add,
  Search,
  GridView,
  ViewList,
  Close,
  CalendarToday,
  Person,
  DeleteOutline,
  VisibilityOutlined,
  EditOutlined,
} from "@mui/icons-material";
import { getAuth } from "firebase/auth";
import "./DashboardPage.css";
import { createCSRDocument,getDocuments,deleteDocument } from "../services/services";
import { Bold } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true); // optional loader
  const hasFetched = useRef(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    documentDate: "",
    author: "",
    confidentiality: "",
    protocolNumber: "",
    studyTitle: "",
    indication: "",
    phase: "",
    sponsorName: "",
    sponsorCode: "",
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.meta_data?.author?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      doc.meta_data?.documentType
        ?.toLowerCase()
        .includes(filterType.toLowerCase());

    return matchesSearch && matchesFilter;
  });
  // Sort documents by date descending (recent first)
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = new Date(a.meta_data?.metadata?.documentDate);
    const dateB = new Date(b.meta_data?.metadata?.documentDate);
    return dateB - dateA; // recent first
  });

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleCreateDocument = () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    setFormData({
      documentDate: new Date().toISOString().split("T")[0],
      author: currentUser?.displayName || currentUser?.email || "Unknown User",
      confidentiality: "",
      protocolNumber: "",
      studyTitle: "",
      indication: "",
      phase: "",
      sponsorName: "",
      sponsorCode: "",
    });
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setFormData({
      confidentiality: "",
      protocolNumber: "",
      studyTitle: "",
      indication: "",
      phase: "",
      sponsorName: "",
      sponsorCode: "",
    });
  };

  const handleInputChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async () => {
    try {
      console.log("Creating document with data:", formData);
      const newDoc = await createCSRDocument(formData, handleCloseModal);
      await fetchDocs();
      toast.success("Document created successfully!");
      if (newDoc && newDoc.id) {
        navigate(`/dashboard/editor/${newDoc.id}`);
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document.");
    }
  };
  const handleEdit = (id) => {
    navigate(`/dashboard/editor/${id}`);
  };

  const fetchDocs = async () => {
    try {
      const docs = await getDocuments();
      console.log(docs);
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchDocs();
    }
  }, [fetchDocs]);
  const handleDeleteDocument = (document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        await deleteDocument(documentToDelete.id); // call backend
        setDocuments(documents.filter((doc) => doc.id !== documentToDelete.id)); // update UI
        toast.success("Document deleted successfully!");
      } catch (error) {
        console.error("Failed to delete document:", error);
        toast.error("Failed to delete document.");
      } finally {
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  return (
    <div className="dashboard-wrapper">
      <Container maxWidth="xl" className="dashboard-container">
        <Box className="dashboard-header">
          <div style={{ textAlign: "left" }}>
            <Typography variant="h4" className="dashboard-title">
              My Documents
            </Typography>
            <Typography variant="subtitle1" className="dashboard-subtitle">
              Manage your clinical trial documents and reports
            </Typography>
          </div>

          <Button
            color="inherit"
            startIcon={<Add className="create-doc-icon" />}
            onClick={handleCreateDocument}
            className="doc-btn"
          >
            New Document
          </Button>
        </Box>

        <Paper className="controls-panel" elevation={1}>
          <Box className="search-filters">
            <TextField
              variant="outlined"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              className="search-field"
            />

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              className="view-toggle"
            >
              <ToggleButton value="grid">
                <GridView />
              </ToggleButton>
              <ToggleButton value="list">
                <ViewList />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" className="recent-label" textAlign={"left"} fontWeight={"Bold"}>
            Recent
          </Typography>
        </Box>

        {viewMode === "grid" ? (
          <div className="documents-grid">
            {/* Create New Document Card */}

            {/* Existing Documents */}

            {sortedDocuments.map((doc) => (
              <div className="grid-item" key={doc.id}>
                <Card className="document-card">
                  <CardContent>
                    <Box className="card-header">
                      <Avatar className="doc-icon">
                        <Description />
                      </Avatar>
                    </Box>
                    <Typography variant="h6" className="doc-title">
                      {doc.meta_data?.metadata?.studyTitle}
                    </Typography>
    
                    <Box className="doc-meta">
                      <Box className="meta-item">
                        <CalendarToday fontSize="small" />
           
                      </Box>
                      <Box className="meta-item">
                        <Person fontSize="small" />
                        <Typography variant="caption">
                          {doc.meta_data?.metadata?.author}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions className="doc-actions">
                    <Tooltip title="Edit Document" placement="top">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(doc.id)}
                        className="edit-button"
                        sx={{
                          color: "#3498db",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            color: "#2980b9",
                            transform: "scale(1.1)",
                            backgroundColor: "rgba(52, 152, 219, 0.1)",
                          },
                        }}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Document" placement="top">
                      <IconButton
                        className="delete-button"
                        size="small"
                        onClick={() => handleDeleteDocument(doc)}
                        sx={{
                          color: "#e74c3c",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            color: "#c0392b",
                            transform: "scale(1.1)",
                            backgroundColor: "rgba(231, 76, 60, 0.1)",
                          },
                        }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Paper className="list-view" elevation={1}>
            <List>
              {sortedDocuments.map((doc, index) => (
                <React.Fragment key={doc.id}>
                  <ListItem className="list-item">
                    <ListItemAvatar>
                      <Avatar className="doc-icon">
                        <Description />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="h6" className="list-title">
                          {doc.meta_data?.metadata?.studyTitle}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="textSecondary">
                 
                          {doc.meta_data?.metadata?.author}
                        </Typography>
                      }
                    />
                    <Box className="list-actions">
                      <CardActions className="doc-actions">
                        <Tooltip title="Edit Document" placement="top">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(doc.id)}
                            className="edit-button"
                            sx={{
                              color: "#3498db",
                              transition: "all 0.3s ease",
                              "&:hover": {
                                color: "#2980b9",
                                transform: "scale(1.1)",
                                backgroundColor: "rgba(52, 152, 219, 0.1)",
                              },
                            }}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Document" placement="top">
                          <IconButton
                            className="delete-button"
                            size="small"
                            onClick={() => handleDeleteDocument(doc)}
                            sx={{
                              color: "#e74c3c",
                              transition: "all 0.3s ease",
                              "&:hover": {
                                color: "#c0392b",
                                transform: "scale(1.1)",
                                backgroundColor: "rgba(231, 76, 60, 0.1)",
                              },
                            }}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions> 
                    </Box>
                  </ListItem>
                  {index < sortedDocuments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}

        {/* Create Document Modal */}
        <Dialog
          open={openModal}
          onClose={handleCloseModal}
          maxWidth="md"
          scroll="paper"
          fullWidth
          className="create-modal"
        >
          <DialogTitle className="modal-title">
            <Box className="title-header">
              <Typography variant="h5">Create New Document</Typography>
              <IconButton onClick={handleCloseModal}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent className="modal-content">
            <div className="form-grid">
              <div className="form-item">
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Confidentiality</InputLabel>
                  <Select
                    value={formData.confidentiality}
                    onChange={handleInputChange("confidentiality")}
                    label="Confidentiality"
                  >
                    <MenuItem value="Public">Public</MenuItem>
                    <MenuItem value="Internal">Internal</MenuItem>
                    <MenuItem value="Confidential">Confidential</MenuItem>
                    <MenuItem value="Highly Confidential">
                      Highly Confidential
                    </MenuItem>
                  </Select>
                </FormControl>
              </div>
              <div className="form-item full-width">
                <TextField
                  fullWidth
                  label="Study ID / Protocol Number"
                  value={formData.protocolNumber}
                  onChange={handleInputChange("protocolNumber")}
                  variant="outlined"
                  helperText="Official trial protocol number(s)"
                />
              </div>
              <div className="form-item full-width">
                <TextField
                  fullWidth
                  label="Study Title"
                  value={formData.studyTitle}
                  onChange={handleInputChange("studyTitle")}
                  variant="outlined"
                  helperText="Full protocol title from the CSR header"
                  multiline
                  rows={3}
                />
              </div>
              <div className="form-item">
                <TextField
                  fullWidth
                  label="Indication / Therapeutic Area"
                  value={formData.indication}
                  onChange={handleInputChange("indication")}
                  variant="outlined"
                  helperText="Disease or condition studied"
                />
              </div>
              <div className="form-item">
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Phase of Study</InputLabel>
                  <Select
                    value={formData.phase}
                    onChange={handleInputChange("phase")}
                    label="Phase of Study"
                  >
                    <MenuItem value="Phase I">Phase I</MenuItem>
                    <MenuItem value="Phase II">Phase II</MenuItem>
                    <MenuItem value="Phase III">Phase III</MenuItem>
                    <MenuItem value="Phase IV">Phase IV</MenuItem>
                  </Select>
                </FormControl>
              </div>
              <div className="form-item">
                <TextField
                  fullWidth
                  label="Sponsor Name"
                  value={formData.sponsorName}
                  onChange={handleInputChange("sponsorName")}
                  variant="outlined"
                />
              </div>
              <div className="form-item">
                <TextField
                  fullWidth
                  label="Sponsor Protocol Code"
                  value={formData.sponsorCode}
                  onChange={handleInputChange("sponsorCode")}
                  variant="outlined"
                />
              </div>
            </div>
          </DialogContent>

          <DialogActions className="modal-actions">
            <Button onClick={handleCloseModal} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSubmit} color="primary" variant="contained">
              Create Document
            </Button>
          </DialogActions>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDelete}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            },
          }}
        >
          <DialogTitle
            sx={{
              textAlign: "center",
              fontWeight: 700,
              color: "#2c3e50",
              fontSize: "1.5rem",
              pb: 1,
            }}
          >
            Delete Document
          </DialogTitle>
          <DialogContent sx={{ textAlign: "center", py: 3 }}>
            <Box sx={{ mb: 2 }}>
              <DeleteOutline
                sx={{
                  fontSize: 48,
                  color: "#e74c3c",
                  mb: 2,
                }}
              />
            </Box>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
              Are you sure you want to delete this document?
            </Typography>
            {documentToDelete && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                "{documentToDelete.title}" will be permanently deleted.
              </Typography>
            )}
            <Typography
              variant="caption"
              color="error"
              sx={{ fontStyle: "italic" }}
            >
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              justifyContent: "center",
              gap: 2,
              pb: 3,
              px: 3,
            }}
          >
            <Button
              onClick={cancelDelete}
              variant="outlined"
              sx={{
                borderColor: "#95a5a6",
                color: "#95a5a6",
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "none",
                px: 3,
                "&:hover": {
                  borderColor: "#7f8c8d",
                  backgroundColor: "rgba(149, 165, 166, 0.1)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "none",
                px: 3,
                boxShadow: "0 4px 16px rgba(231, 76, 60, 0.3)",
                "&:hover": {
                  background: "linear-gradient(135deg, #c0392b, #e74c3c)",
                  boxShadow: "0 6px 24px rgba(231, 76, 60, 0.4)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </div>
  );
}
