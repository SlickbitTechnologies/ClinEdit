import React, { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Modal,
  Button,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/PeopleAltOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import KeyboardArrowLeftOutlinedIcon from "@mui/icons-material/KeyboardArrowLeftOutlined";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Sidebar.css";
import slickbit from "../../assets/image/slickbit.png";

const navItems = [
  { label: "Dashboard", icon: <PeopleIcon />, path: "documents" },
];

const settingsItems = [
  {
    label: "Template Configuration",
    icon: <TuneIcon />,
    path: "templateconfiguration",
  },
];

export default function Sidebar({ onToggle, collapsed }) {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    setLogoutOpen(true);
  };

  const confirmLogout = () => {
    setLogoutOpen(false);
    navigate("/");
  };

  const cancelLogout = () => {
    setLogoutOpen(false);
  };

  return (
    <motion.div
      className={`sidebar-root ${collapsed ? "collapsed" : ""}`}
      initial={{ width: collapsed ? 70 : 280 }}
      animate={{ width: collapsed ? 70 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        boxShadow: "0 8px 32px rgba(22, 160, 133, 0.15)",
        background:
          "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)",
        minHeight: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(224, 228, 231, 0.3)",
      }}
    >
      {/* Header */}
      <motion.div
        className="sidebar-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          justifyContent: collapsed ? "center" : "space-between",
          alignItems: "center",
          display: "flex",
          padding: "24px 20px 16px 20px",
        }}
      >
        {!collapsed && (
          <Box
            onClick={() => navigate("/dashboard/documents")}
            sx={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: "linear-gradient(135deg, #16a085, #2c3e50)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                boxShadow: "0 4px 16px rgba(22, 160, 133, 0.3)",
              }}
            >
              📝
            </Box>
            <Typography className="sidebar-title" variant="h5">
              ClinEdit
            </Typography>
          </Box>
        )}
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <motion.div whileTap={{ scale: 0.9 }}>
            <IconButton onClick={onToggle} className="sidebar-toggle-btn">
              <KeyboardArrowLeftOutlinedIcon
                fontSize="medium"
                style={{
                  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              />
            </IconButton>
          </motion.div>
        </Tooltip>
      </motion.div>

      <Divider className="sidebar-divider" />

      {/* Navigation */}
      <Box className="sidebar-section">
        {!collapsed && (
          <Typography className="sidebar-section-title" variant="subtitle2">
            Navigation
          </Typography>
        )}
        <List sx={{ padding: 0 }}>
          {navItems.map((item, idx) => (
            <NavLink
              key={item.label}
              to={`/dashboard/${item.path}`}
              className={({ isActive }) =>
                `sidebar-list-link ${isActive ? "active" : ""}`
              }
              style={{ textDecoration: "none" }}
            >
              <motion.li
                whileHover={{
                  scale: 1.02,
                  backgroundColor: "rgba(22, 160, 133, 0.08)",
                  borderRadius: "12px",
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="sidebar-list-item"
                style={{
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  margin: "4px 12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <ListItemIcon
                  className="sidebar-list-icon"
                  sx={{ minWidth: 0, mr: collapsed ? 0 : 2 }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      className: "sidebar-list-text",
                      sx: { fontWeight: 600, fontSize: "0.95rem" },
                    }}
                  />
                )}
              </motion.li>
            </NavLink>
          ))}
        </List>
      </Box>

      {/* Settings */}
      <Box className="sidebar-section">
        {!collapsed && (
          <Typography className="sidebar-section-title" variant="subtitle2">
            Settings
          </Typography>
        )}
        <List sx={{ padding: 0 }}>
          {settingsItems.map((item, idx) => (
            <NavLink
              key={item.label}
              to={`/dashboard/${item.path}`}
              className={({ isActive }) =>
                `sidebar-list-link ${isActive ? "active" : ""}`
              }
              style={{ textDecoration: "none" }}
            >
              <motion.li
                whileHover={{
                  scale: 1.02,
                  backgroundColor: "rgba(22, 160, 133, 0.08)",
                  borderRadius: "12px",
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="sidebar-list-item"
                style={{
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  margin: "4px 12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <ListItemIcon
                  className="sidebar-list-icon"
                  sx={{ minWidth: 0, mr: collapsed ? 0 : 2 }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      className: "sidebar-list-text",
                      sx: { fontWeight: 600, fontSize: "0.95rem" },
                    }}
                  />
                )}
              </motion.li>
            </NavLink>
          ))}

          {/* Logout Button */}
          <motion.li
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(231, 76, 60, 0.08)",
              borderRadius: "12px",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="sidebar-list-item sidebar-logout"
            style={{
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              margin: "4px 12px",
              padding: "12px 16px",
              borderRadius: "12px",
              transition: "all 0.3s ease",
            }}
            onClick={handleLogout}
          >
            <ListItemIcon
              className="sidebar-list-icon"
              sx={{ minWidth: 0, mr: collapsed ? 0 : 2 }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  className: "sidebar-list-text",
                  sx: {
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: "#e74c3c",
                  },
                }}
              />
            )}
          </motion.li>
        </List>

        {/* Logout Confirmation Modal */}
        <Modal open={logoutOpen} onClose={cancelLogout}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.2)",
              borderRadius: 4,
              p: 4,
              minWidth: 360,
              textAlign: "center",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, mb: 2, color: "#2c3e50" }}
            >
              Confirm Logout
            </Typography>
            <Typography sx={{ mb: 3, color: "#7f8c8d", fontSize: "1.1rem" }}>
              Are you sure you want to logout?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Button
                variant="contained"
                onClick={confirmLogout}
                sx={{
                  background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                  padding: "10px 24px",
                  "&:hover": {
                    background: "linear-gradient(135deg, #c0392b, #e74c3c)",
                  },
                }}
              >
                Yes, Logout
              </Button>
              <Button
                variant="outlined"
                onClick={cancelLogout}
                sx={{
                  borderColor: "#16a085",
                  color: "#16a085",
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                  padding: "10px 24px",
                  "&:hover": {
                    borderColor: "#16a085",
                    backgroundColor: "rgba(22, 160, 133, 0.1)",
                  },
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Modal>
      </Box>

      {/* Bottom Section */}

      <Box className="sidebar-bottom">
        {!collapsed && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(90deg, #16a085 0%, #1abc9c 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            <motion.img
              src={slickbit}
              alt="Slickbit Logo"
              className="sidebar-slickbit-logo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            />
          </Typography>
        )}
      </Box>
    </motion.div>
  );
}
