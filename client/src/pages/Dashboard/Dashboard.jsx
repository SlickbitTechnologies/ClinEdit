import React, { useState } from "react";
import {
  Container,
  Typography,
  Grid,
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
} from "@mui/material";
import {
  Description,
  Add,
  Search,
  FilterList,
  GridView,
  ViewList,
  Close,
  CalendarToday,
  Person,
} from "@mui/icons-material";
import "./DashboardPage.css";
import { createCSRDocument } from "../services/services";
export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    studyId: "",
    documentDate: "",
    documentType: "",
    version: "",
    author: "",
    confidentiality: "",
    protocolNumber: "",
    studyTitle: "",
    indication: "",
    phase: "",
    sponsorName: "",
    sponsorCode: "",
  });

const documents = [
  {
    id: 1,
    title: "Clinical Study Report - Phase 1",
    type: "Clinical Study Report",
    date: "2025-08-05",
    author: "Dr. Smith",
    status: "Draft",
  },
  {
    id: 2,
    title: "Clinical Study Report - Phase 2",
    type: "Clinical Study Report",
    date: "2025-08-12",
    author: "Dr. Johnson",
    status: "Under Review",
  },
  {
    id: 3,
    title: "Clinical Study Report - Phase 3",
    type: "Clinical Study Report",
    date: "2025-08-18",
    author: "Dr. Williams",
    status: "Approved",
  },
  {
    id: 4,
    title: "Clinical Study Report - Extension Study",
    type: "Clinical Study Report",
    date: "2025-08-20",
    author: "Dr. Brown",
    status: "Final",
  },
];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" ||
      doc.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleCreateDocument = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setFormData({
      studyId: "",
      documentDate: "",
      documentType: "",
      version: "",
      author: "",
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

    console.log("New document saved:", newDoc);
    // Optionally update local state to show new doc immediately
    // setDocuments((prev) => [...prev, newDoc]);
  } catch (error) {
    console.error("Failed to create document:", error);
  }
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

        {viewMode === "grid" ? (
          <div className="documents-grid">
            {/* Create New Document Card */}
     

            {/* Existing Documents */}
            {filteredDocuments.map((doc) => (
              <div className="grid-item" key={doc.id}>
                <Card className="document-card">
                  <CardContent>
                    <Box className="card-header">
                      <Avatar className="doc-icon">
                        <Description />
                      </Avatar>
                    </Box>
                    <Typography variant="h6" className="doc-title">
                      {doc.title}
                    </Typography>
                    <Typography variant="body2" className="doc-type">
                      {doc.type}
                    </Typography>
                    <Box className="doc-meta">
                      <Box className="meta-item">
                        <CalendarToday fontSize="small" />
                        <Typography variant="caption">{doc.date}</Typography>
                      </Box>
                      <Box className="meta-item">
                        <Person fontSize="small" />
                        <Typography variant="caption">{doc.author}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions className="doc-actions">
                    <Button size="small" color="primary">
                      View
                    </Button>
                    <Button size="small" color="secondary">
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Paper className="list-view" elevation={1}>
            <List>
              {filteredDocuments.map((doc, index) => (
                <React.Fragment key={doc.id}>
                  <ListItem className="list-item">
                    <ListItemAvatar>
                      <Avatar className="doc-icon">
                        <Description />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box className="list-primary">
                          <Typography variant="h6" className="list-title">
                            {doc.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box className="list-secondary">
                          <Typography variant="body2" color="textSecondary">
                            {doc.type} • {doc.date} • {doc.author}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box className="list-actions">
                      <Button size="small" color="primary">
                        View
                      </Button>
                      <Button size="small" color="secondary">
                        Edit
                      </Button>
                    </Box>
                  </ListItem>
                  {index < filteredDocuments.length - 1 && <Divider />}
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
                <TextField
                  fullWidth
                  label="Study ID"
                  value={formData.studyId}
                  onChange={handleInputChange("studyId")}
                  variant="outlined"
                />
              </div>
              <div className="form-item">
                <TextField
                  fullWidth
                  label="Document Date"
                  type="date"
                  value={formData.documentDate}
                  onChange={handleInputChange("documentDate")}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </div>
              {/* <div className="form-item">
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={formData.documentType}
                    onChange={handleInputChange("documentType")}
                    label="Document Type"
                  >
                    <MenuItem value="Protocol">Protocol</MenuItem>
                    <MenuItem value="Clinical Study Report">
                      Clinical Study Report
                    </MenuItem>
                    <MenuItem value="Brochure">Investigator Brochure</MenuItem>
                    <MenuItem value="SAP">Statistical Analysis Plan</MenuItem>
                    <MenuItem value="Monitoring">Monitoring Report</MenuItem>
                    <MenuItem value="Safety">Safety Report</MenuItem>
                  </Select>
                </FormControl>
              </div> */}
              <div className="form-item">
                <TextField
                  fullWidth
                  label="Version"
                  value={formData.version}
                  onChange={handleInputChange("version")}
                  variant="outlined"
                />
              </div>
              <div className="form-item">
                <TextField
                  fullWidth
                  label="Author"
                  value={formData.author}
                  onChange={handleInputChange("author")}
                  variant="outlined"
                />
              </div>
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
      </Container>
    </div>
  );
}
