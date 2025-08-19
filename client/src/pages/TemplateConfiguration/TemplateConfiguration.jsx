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
} from "@mui/material";
import { Add } from "@mui/icons-material";
import "./TemplateConfiguration.css";

export default function TemplateConfiguration() {
  const [documentType, setDocumentType] = React.useState("report");

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

              <Button
                className="csr-button"
                variant="contained"
                startIcon={<Add />}
                fullWidth
              >
                Configure CSR Template
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
