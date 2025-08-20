import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  Box,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  IconButton,
  Tooltip,
  AppBar,
  Divider,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon,
  FormatAlignLeft as FormatAlignLeftIcon,
  FormatAlignCenter as FormatAlignCenterIcon,
  FormatAlignRight as FormatAlignRightIcon,
  Link as LinkIcon,
  HMobiledata as HMobiledataIcon,
  Highlight as HighlightIcon,
} from "@mui/icons-material";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { getDocumentById } from "../services/services";
import "./EditorPage.css";

const initialFallbackSections = [
  {
    title: "Protocol Title & Identifiers",
    description: "Study title, protocol number, version",
    subsections: ["Title", "Identifiers"],
  },
  {
    title: "Background & Rationale",
    description: "Scientific background and study rationale",
    subsections: ["Scientific background", "Study rationale"],
  },
  // ... you can keep more fallback sections if you'd like
];
export default function EditorPage() {
  const hasFetched = useRef(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState(null);
  const [openPanels, setOpenPanels] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState([]);
  const { id } = useParams();
  const [sections, setSections] = useState(initialFallbackSections);
  // State to store JSON content for each section or subsection by id
  const [sectionsContent, setSectionsContent] = useState({});

  const togglePanel = (i) => {
    setOpenPanels((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const generateSectionContent = (sectionIndex) => {
    const section = sections[sectionIndex] || { subsections: [] };
    const subs =
      Array.isArray(section.subsections) && section.subsections.length > 0
        ? section.subsections
        : // fallback: use section title as a single subsection
          [section.title || "Untitled section"];

    return subs
      .map(
        (sub, idx) =>
          `<h3 id="sec-${sectionIndex}-sub-${idx}">${escapeHtml(
            String(sub)
          )}</h3><p>Enter content for ${escapeHtml(String(sub))}...</p>`
      )
      .join("");
  };

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3] }),
      Link.configure({ openOnClick: false }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: generateSectionContent(0),
    onUpdate: ({ editor }) => {
      const currentSection = sections[selectedSectionIndex];
      if (selectedSubsectionId) {
        setSectionsContent((prev) => ({
          ...prev,
          [selectedSubsectionId]: editor.getJSON(),
        }));
      } else if (currentSection && currentSection.id) {
        setSectionsContent((prev) => ({
          ...prev,
          [currentSection.id]: editor.getJSON(),
        }));
      }
    },
  });
  useEffect(() => {
    if (!id) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchDoc = async () => {
      setLoading(true);
      try {
        const response = await getDocumentById(id);
        // store original response
        setDoc(response);

        // Normalize sections and subsections from backend
        // Each section: { id, title, description, subsections: [ {id, title, description} ] }
        if (
          response &&
          Array.isArray(response.sections) &&
          response.sections.length
        ) {
          const normalized = response.sections.map((s) => {
            let subsections = [];
            if (Array.isArray(s.subsections) && s.subsections.length) {
              subsections = s.subsections.map((ss, idx) => {
                // Normalize each subsection to have id, title, description
                if (typeof ss === "string") {
                  return {
                    id: s.id + "-sub" + idx,
                    title: ss,
                    description: "",
                  };
                } else {
                  return {
                    id: ss.id || (s.id + "-sub" + idx),
                    title: ss.title || ss.name || String(ss),
                    description: ss.description || "",
                  };
                }
              });
            } else {
              subsections = [
                {
                  id: s.id + "-sub0",
                  title: s.title || "Untitled",
                  description: "",
                },
              ];
            }
            return {
              ...s,
              title: s.title || "Untitled",
              description: s.description || "",
              subsections,
            };
          });
          setSections(normalized);
          setSelectedSectionIndex(0);
          // Initialize sectionsContent from response.sections and normalized subsections
          const initialContents = {};
          response.sections.forEach((sec, secIdx) => {
            // Section content
            try {
              initialContents[sec.id] = sec.description
                ? JSON.parse(sec.description)
                : { type: "doc", content: [] };
            } catch {
              initialContents[sec.id] = { type: "doc", content: [] };
            }
            // Subsections
            if (Array.isArray(sec.subsections)) {
              sec.subsections.forEach((ss, subIdx) => {
                let subId, desc;
                if (typeof ss === "string") {
                  subId = sec.id + "-sub" + subIdx;
                  desc = "";
                } else {
                  subId = ss.id || (sec.id + "-sub" + subIdx);
                  desc = ss.description || "";
                }
                try {
                  initialContents[subId] = desc
                    ? JSON.parse(desc)
                    : { type: "doc", content: [] };
                } catch {
                  initialContents[subId] = { type: "doc", content: [] };
                }
              });
            }
          });
          setSectionsContent(initialContents);
        }
      } catch (error) {
        console.error("Error loading document:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id]);

  useEffect(() => {
    if (!editor) return;
    const currentSection = sections[selectedSectionIndex];
    let targetId = null;
    if (selectedSubsectionId) {
      targetId = selectedSubsectionId;
    } else if (currentSection && currentSection.id) {
      targetId = currentSection.id;
    }
    if (targetId) {
      const json = sectionsContent[targetId] || {
        type: "doc",
        content: [],
      };
      editor.commands.setContent(json);
      editor.chain().focus().run();
    }
    // eslint-disable-next-line
  }, [selectedSectionIndex, selectedSubsectionId, sections, editor, sectionsContent]);

  const saveDraft = () => {
    // Build updated sections with description as stringified JSON
    const updatedSections = sections.map((sec) => {
      // For each subsection, update its description from sectionsContent[sub.id]
      const updatedSubsections = (sec.subsections || []).map((ss) => {
        // ss is normalized: {id, title, description}
        return {
          ...ss,
          description: JSON.stringify(
            sectionsContent[ss.id] || { type: "doc", content: [] }
          ),
        };
      });
      return {
        ...sec,
        description: JSON.stringify(
          sectionsContent[sec.id] || { type: "doc", content: [] }
        ),
        subsections: updatedSubsections,
      };
    });
    const updatedDoc = { ...doc, sections: updatedSections };
    // TODO: call API to save updatedDoc
    console.log("Saving draft:", updatedDoc);
    alert("Draft saved!");
  };
  const exportContent = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const element = document.createElement("a");
    const file = new Blob([html], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = "protocol.html";
    document.body.appendChild(element);
    element.click();
    element.remove();
  };
  const headerTitle =
    doc?.meta_data?.metadata?.studyTitle ||
    (doc && doc.id
      ? `Document ${doc.id}`
      : "Phase III Oncology Study Protocol");

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100vh" }}
      className="editor-page"
    >
      {/* Top Document Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderBottom: "1px solid #e0e4e7",
          bgcolor: "background.paper",
        }}
        className="document-header"
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#2c3e50" }}>
              {headerTitle}
            </Typography>
            {doc?.created_at && (
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(doc.created_at).toLocaleString()}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            className="draft-trial-btn"
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveDraft}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Save Draft
          </Button>
          <Button
            className="start-trial-btn"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportContent}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Main Content: Sidebar + Editor */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: collapsed ? 0 : 250,
            transition: "width 0.3s ease",
            borderRight: collapsed ? "none" : "1px solid #e0e4e7",
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: 0, height: 0 },
            "&::-webkit-scrollbar-thumb": { background: "transparent" },
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            p: collapsed ? 0 : 3,
            background: collapsed
              ? "transparent"
              : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
          className="editor-sidebar"
        >
          {!collapsed && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 700, color: "#2c3e50", mb: 3 }}
              >
                Protocol Sections
              </Typography>

              {sections.map((section, i) => (
                <Accordion
                  key={section.title}
                  expanded={!!openPanels[i]}
                  onChange={() => togglePanel(i)}
                  sx={{
                    marginBottom: 2,
                    borderRadius: 3,
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    border:
                      selectedSectionIndex === i
                        ? "2px solid #16a085"
                        : "1px solid #e0e4e7",
                    "&:before": { display: "none" },
                    "&.Mui-expanded": { marginBottom: 2 },
                    background:
                      selectedSectionIndex === i
                        ? "linear-gradient(135deg, rgba(22,160,133,0.05), rgba(44,62,80,0.05))"
                        : "white",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      borderRadius: 3,
                      "&.Mui-expanded": { minHeight: 48 },
                    }}
                  >
                    <Box sx={{ flexGrow: 1, pr: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: selectedSectionIndex === i ? 700 : 600,
                          color:
                            selectedSectionIndex === i ? "#16a085" : "#2c3e50",
                          mb: 0.5,
                        }}
                      >
                        {section.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        {section.description}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense sx={{ py: 0 }}>
                      {section.subsections.map((sub, idx) => (
                        <ListItem
                          key={sub.id || idx}
                          button
                          onClick={() => {
                            if (!openPanels[i]) togglePanel(i);
                            setSelectedSectionIndex(i);
                            setSelectedSubsectionId(sub.id);
                            setTimeout(() => {
                              const el = document.getElementById(
                                `sec-${i}-sub-${idx}`
                              );
                              if (el)
                                el.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                            }, 100);
                          }}
                          sx={{
                            borderRadius: 1,
                            mb: 0.5,
                            "&:hover": { bgcolor: "rgba(22,160,133,0.1)" },
                          }}
                        >
                          <ListItemText
                            primary={sub.title || sub}
                            primaryTypographyProps={{
                              fontSize: "0.85rem",
                              fontWeight: 500,
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </>
          )}
        </Box>

        {/* Middle Toggle Arrow on Sidebar Border */}
        <IconButton
          onClick={() => setCollapsed((prev) => !prev)}
          sx={{
            position: "absolute",
            top: "50%",
            left: collapsed ? 0 : 300,

            transform: "translateY(-50%)",
            transition: "left 0.3s ease",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "50%",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>

        {/* Main Editor */}
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          {/* Section Header */}
          <AppBar
            position="static"
            color="transparent"
            elevation={0}
            sx={{
              borderBottom: "1px solid #e0e4e7",
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", py: 2 }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#2c3e50" }}
                >
                  {sections[selectedSectionIndex].title}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={saveDraft}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "#16a085",
                    color: "#16a085",
                    "&:hover": {
                      borderColor: "#16a085",
                      bgcolor: "rgba(22, 160, 133, 0.1)",
                    },
                  }}
                >
                  Preview
                </Button>
                <Button
                  variant="outlined"
                  onClick={exportContent}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "#9b59b6",
                    color: "#9b59b6",
                    "&:hover": {
                      borderColor: "#9b59b6",
                      bgcolor: "rgba(155, 89, 182, 0.1)",
                    },
                  }}
                >
                  AI Suggestions
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Editor Toolbar */}
          <Toolbar
            variant="dense"
            sx={{
              gap: 1,
              flexWrap: "wrap",
              background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
              borderBottom: "1px solid #e0e4e7",
              py: 1.5,
            }}
            className="editor-toolbar"
          >
            <Tooltip title="Undo">
              <IconButton
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
                size="small"
                sx={{
                  bgcolor: editor?.can().undo() ? "white" : "transparent",
                  boxShadow: editor?.can().undo()
                    ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                    : "none",
                }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
                size="small"
                sx={{
                  bgcolor: editor?.can().redo() ? "white" : "transparent",
                  boxShadow: editor?.can().redo()
                    ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                    : "none",
                }}
              >
                <RedoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Bold">
              <IconButton
                onClick={() => editor?.chain().focus().toggleBold().run()}
                color={editor?.isActive("bold") ? "primary" : "default"}
                size="small"
                sx={{
                  bgcolor: editor?.isActive("bold")
                    ? "rgba(22, 160, 133, 0.1)"
                    : "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatBoldIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic">
              <IconButton
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                color={editor?.isActive("italic") ? "primary" : "default"}
                size="small"
                sx={{
                  bgcolor: editor?.isActive("italic")
                    ? "rgba(22, 160, 133, 0.1)"
                    : "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatItalicIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Underline">
              <IconButton
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                size="small"
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatUnderlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Highlight">
              <IconButton
                onClick={() => editor?.chain().focus().toggleHighlight().run()}
                color={editor?.isActive("highlight") ? "primary" : "default"}
                size="small"
                sx={{
                  bgcolor: editor?.isActive("highlight")
                    ? "rgba(22, 160, 133, 0.1)"
                    : "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <HighlightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Bullet List">
              <IconButton
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                color={editor?.isActive("bulletList") ? "primary" : "default"}
                size="small"
                sx={{
                  bgcolor: editor?.isActive("bulletList")
                    ? "rgba(22, 160, 133, 0.1)"
                    : "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ordered List">
              <IconButton
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
                color={editor?.isActive("orderedList") ? "primary" : "default"}
                size="small"
                sx={{
                  bgcolor: editor?.isActive("orderedList")
                    ? "rgba(22, 160, 133, 0.1)"
                    : "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatListNumberedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Heading">
              <IconButton
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run()
                }
                color={
                  editor?.isActive("heading", { level: 2 })
                    ? "primary"
                    : "default"
                }
                size="small"
                sx={{
                  bgcolor: editor?.isActive("heading", { level: 2 })
                    ? "rgba(22, 160, 133, 0.1)"
                    : "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <HMobiledataIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Link">
              <IconButton
                onClick={() => {
                  const url = window.prompt("Enter URL:");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }}
                size="small"
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Align Left">
              <IconButton
                onClick={() =>
                  editor?.chain().focus().setTextAlign("left").run()
                }
                size="small"
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatAlignLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Align Center">
              <IconButton
                onClick={() =>
                  editor?.chain().focus().setTextAlign("center").run()
                }
                size="small"
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatAlignCenterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Align Right">
              <IconButton
                onClick={() =>
                  editor?.chain().focus().setTextAlign("right").run()
                }
                size="small"
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FormatAlignRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>

          {/* Editor Content */}
          <Box
            sx={{
              flexGrow: 1,
              p: 4,
              overflowY: "auto",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              "&::-webkit-scrollbar": { width: 0, height: 0 },
              "&::-webkit-scrollbar-thumb": { background: "transparent" },
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="editor-content-wrapper"
          >
            {editor ? (
              <Box className="editor-content">
                <EditorContent editor={editor} />
              </Box>
            ) : (
              <Typography>Loading editor...</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
