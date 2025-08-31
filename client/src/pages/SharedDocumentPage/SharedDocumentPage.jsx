import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Container,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  IconButton,
  AppBar,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useEditor, EditorContent } from "@tiptap/react";
import SharedDocumentComments from "../../components/comments/comments";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { FontSize } from "@tiptap/extension-font-size";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import "./SharedDocumentPage.css";

export default function SharedDocumentPage() {
  const { docId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionsContent, setSectionsContent] = useState({});
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [openPanels, setOpenPanels] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  const togglePanel = (i) => {
    setOpenPanels((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const getSectionLabel = (sectionIndex) => `${sectionIndex + 1}.`;
  const getSubsectionLabel = (sectionIndex, subsectionIndex) =>
    `${sectionIndex + 1}.${subsectionIndex + 1}`;
  const getUnderSubsectionLabel = (
    sectionIndex,
    subsectionIndex,
    underSubsectionIndex
  ) => `${sectionIndex + 1}.${subsectionIndex + 1}.${underSubsectionIndex + 1}`;

  // Build the full document content from sections and sectionsContent
  const buildFullDoc = (sections, sectionsContent) => {
    return {
      type: "doc",
      content: sections.flatMap((section, secIdx) => {
        const secId = section.id || `${secIdx + 1}`;
        const secContent =
          sectionsContent[secId]?.content &&
          sectionsContent[secId].content.length > 0
            ? sectionsContent[secId].content.map((node) => ({
                ...node,
                attrs: {
                  ...node.attrs,
                  // Preserve existing textAlign if it exists, otherwise default to left
                  textAlign: node.attrs?.textAlign || "left",
                },
              }))
            : [
                {
                  type: "paragraph",
                  attrs: { textAlign: "left" },
                  content: [
                    {
                      type: "text",
                      text: `Enter content for ${getSectionLabel(secIdx)} ${
                        section.title
                      }...`,
                    },
                  ],
                },
              ];

        const sectionNode = [
          {
            type: "heading",
            attrs: { level: 4, textAlign: "left" },
            content: [
              {
                type: "text",
                text: `${getSectionLabel(secIdx)} ${section.title}`,
              },
            ],
          },
          ...secContent,
        ];

        const subsectionsNodes = (section.subsections || []).flatMap(
          (sub, subIdx) => {
            const subTitle = typeof sub === "string" ? sub : sub.title;

            // Skip subsections that are identical to the main section title
            if (subTitle === section.title) {
              return [];
            }

            // Use consistent ID generation
            const subId = sub.id || `${secIdx + 1}.${subIdx + 1}`;

            const subContent =
              sectionsContent[subId]?.content &&
              sectionsContent[subId].content.length > 0
                ? sectionsContent[subId].content.map((node) => ({
                    ...node,
                    attrs: { ...node.attrs, textAlign: "left" },
                  }))
                : [
                    {
                      type: "paragraph",
                      attrs: { textAlign: "left" },
                      content: [
                        {
                          type: "text",
                          text: `Enter content for ${getSubsectionLabel(
                            secIdx,
                            subIdx
                          )} ${subTitle}...`,
                        },
                      ],
                    },
                  ];

            const subsectionNodes = [
              {
                type: "heading",
                attrs: { level: 5, textAlign: "left" },
                content: [
                  {
                    type: "text",
                    text: `${getSubsectionLabel(
                      secIdx,
                      subIdx
                    )} ${subTitle}`,
                  },
                ],
              },
              ...subContent,
            ];

            // Add under-subsections (12.1.1 level)
            const underSubsectionsNodes = (sub.underSubsections || []).flatMap(
              (underSub, underSubIdx) => {
                const underSubTitle =
                  typeof underSub === "string" ? underSub : underSub.title;

                const underSubId =
                  underSub.id || `${secIdx + 1}.${subIdx + 1}.${underSubIdx + 1}`;

                const underSubContent =
                  sectionsContent[underSubId]?.content &&
                  sectionsContent[underSubId].content.length > 0
                    ? sectionsContent[underSubId].content.map((node) => ({
                        ...node,
                        attrs: { ...node.attrs, textAlign: "left" },
                      }))
                    : [
                        {
                          type: "paragraph",
                          attrs: { textAlign: "left" },
                          content: [
                            {
                              type: "text",
                              text: `Enter content for ${getUnderSubsectionLabel(
                                secIdx,
                                subIdx,
                                underSubIdx
                              )} ${underSubTitle}...`,
                            },
                          ],
                        },
                      ];

                return [
                  {
                    type: "heading",
                    attrs: { level: 6, textAlign: "left" },
                    content: [
                      {
                        type: "text",
                        text: `${getUnderSubsectionLabel(
                          secIdx,
                          subIdx,
                          underSubIdx
                        )} ${underSubTitle}`,
                      },
                    ],
                  },
                  ...underSubContent,
                ];
              }
            );

            return [...subsectionNodes, ...underSubsectionsNodes];
          }
        );

        return [...sectionNode, ...subsectionsNodes];
      }),
    };
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Link.configure({ openOnClick: false }),
      Highlight,
      Underline,
      Strike,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle.configure({ types: ["textStyle"] }),
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize.configure({ types: ["textStyle"] }),
    ],
    content: { type: "doc", content: [] }, // Start with empty content
    editable: false, // Make it read-only for shared documents
  });

  useEffect(() => {
    const fetchSharedDocument = async () => {
      try {
        if (!token) {
          setError("Invalid share link: Missing token");
          setLoading(false);
          return;
        }

        // First validate the token with the backend
        const tokenResponse = await axios.get(
          `http://localhost:8000/api/documents/access/${token}`
        );

        if (tokenResponse.data.error) {
          setError("Invalid or expired share link");
          setLoading(false);
          return;
        }

        // If token is valid, fetch the document content using the shared endpoint
        const docResponse = await axios.get(
          `http://localhost:8000/api/documents/${docId}/shared?token=${token}`
        );

        const docData = docResponse.data;
        console.log('Received document data from backend:', docData);
        console.log('Document sections:', docData.sections);
        console.log('Document sectionsContent:', docData.sectionsContent);
        console.log('Document content:', docData.content);
        setDocument(docData);

        // Process sections and content like in EditorPage
        if (docData && Array.isArray(docData.sections) && docData.sections.length) {
          const normalized = docData.sections.map((s, sectionIndex) => {
            let subsections = [];
            if (Array.isArray(s.subsections) && s.subsections.length) {
              subsections = s.subsections.map((ss, idx) => {
                if (typeof ss === "string") {
                  return {
                    id: `${sectionIndex + 1}.${idx + 1}`,
                    title: ss,
                    description: "",
                    underSubsections: [],
                  };
                } else {
                  let underSubsections = [];
                  if (Array.isArray(ss.underSubsections) && ss.underSubsections.length) {
                    underSubsections = ss.underSubsections.map((us, usIdx) => {
                      if (typeof us === "string") {
                        return {
                          id: `${sectionIndex + 1}.${idx + 1}.${usIdx + 1}`,
                          title: us,
                          description: "",
                        };
                      } else {
                        return {
                          id: us.id || `${sectionIndex + 1}.${idx + 1}.${usIdx + 1}`,
                          title: us.title || us.name || String(us),
                          description: us.description || "",
                        };
                      }
                    });
                  }
                  return {
                    id: ss.id || `${sectionIndex + 1}.${idx + 1}`,
                    title: ss.title || ss.name || String(ss),
                    description: ss.description || "",
                    underSubsections,
                  };
                }
              });
            }
            return {
              id: s.id || `${sectionIndex + 1}`,
              title: s.title || s.name || String(s),
              description: s.description || "",
              subsections,
            };
          });
          setSections(normalized);

          // Process sections content like in EditorPage
          const initialContents = {};
          docData.sections.forEach((sec, secIdx) => {
            try {
              if (sec.description) {
                // Check if description is already a JSON object
                if (typeof sec.description === 'object' && sec.description.type === 'doc') {
                  initialContents[sec.id] = sec.description;
                } else if (
                  sec.title.toUpperCase() === "TITLE PAGE" &&
                  sec.description.includes("metadata:")
                ) {
                  try {
                    // Extract the metadata part from the description
                    const metadataMatch = sec.description.match(/metadata:\s*({.*})/);
                    let metadata = {};

                    if (metadataMatch) {
                      // Parse the metadata object
                      const metadataStr = metadataMatch[1].replace(/'/g, '"');
                      metadata = JSON.parse(metadataStr);
                    } else if (docData.meta_data) {
                      // Fallback to document-level metadata
                      metadata = docData.meta_data.metadata || docData.meta_data;
                    }

                    // Create formatted content for title page
                    const metadataContent = [
                      {
                        type: "paragraph",
                        attrs: { textAlign: "center" },
                        content: [{ type: "text", text: " " }],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Protocol Number: ",
                          },
                          {
                            type: "text",
                            text: metadata.protocolNumber || "N/A",
                          },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Study Title: ",
                          },
                          { type: "text", text: metadata.studyTitle || "N/A" },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Indication: ",
                          },
                          { type: "text", text: metadata.indication || "N/A" },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Study Phase: ",
                          },
                          { type: "text", text: metadata.phase || "N/A" },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Confidentiality: ",
                          },
                          {
                            type: "text",
                            text: metadata.confidentiality || "N/A",
                          },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Sponsor Name: ",
                          },
                          { type: "text", text: metadata.sponsorName || "N/A" },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Sponsor Code: ",
                          },
                          { type: "text", text: metadata.sponsorCode || "N/A" },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Author: ",
                          },
                          { type: "text", text: metadata.author || "N/A" },
                        ],
                      },
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Document Date: ",
                          },
                          {
                            type: "text",
                            text: metadata.documentDate || "N/A",
                          },
                        ],
                      },
                    ];

                    initialContents[sec.id] = {
                      type: "doc",
                      content: metadataContent,
                    };
                  } catch (error) {
                    console.error("Error parsing metadata:", error);
                    // Fallback to plain text
                    initialContents[sec.id] = {
                      type: "doc",
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: "left" },
                          content: [{ type: "text", text: sec.description }],
                        },
                      ],
                    };
                  }
                } else {
                  // Normal JSON case
                  const parsed = JSON.parse(sec.description);
                  initialContents[sec.id] = parsed;
                }
              } else {
                initialContents[sec.id] = { type: "doc", content: [] };
              }
            } catch {
              // fallback plain text
              initialContents[sec.id] = {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: "left" },
                    content: [{ type: "text", text: sec.description || "" }],
                  },
                ],
              };
            }

            // Process subsections
            if (sec.subsections && Array.isArray(sec.subsections)) {
              sec.subsections.forEach((sub, subIdx) => {
                const subId = sub.id || `${secIdx + 1}.${subIdx + 1}`;
                try {
                  if (sub.description) {
                    // Check if description is already a JSON object
                    if (typeof sub.description === 'object' && sub.description.type === 'doc') {
                      initialContents[subId] = sub.description;
                    } else {
                      const parsed = JSON.parse(sub.description);
                      initialContents[subId] = parsed;
                    }
                  } else {
                    initialContents[subId] = { type: "doc", content: [] };
                  }
                } catch {
                  initialContents[subId] = {
                    type: "doc",
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [{ type: "text", text: sub.description || "" }],
                      },
                    ],
                  };
                }

                // Process under-subsections
                if (sub.underSubsections && Array.isArray(sub.underSubsections)) {
                  sub.underSubsections.forEach((underSub, underSubIdx) => {
                    const underSubId = underSub.id || `${secIdx + 1}.${subIdx + 1}.${underSubIdx + 1}`;
                    try {
                      if (underSub.description) {
                        // Check if description is already a JSON object
                        if (typeof underSub.description === 'object' && underSub.description.type === 'doc') {
                          initialContents[underSubId] = underSub.description;
                        } else {
                          const parsed = JSON.parse(underSub.description);
                          initialContents[underSubId] = parsed;
                        }
                      } else {
                        initialContents[underSubId] = { type: "doc", content: [] };
                      }
                    } catch {
                      initialContents[underSubId] = {
                        type: "doc",
                        content: [
                          {
                            type: "paragraph",
                            attrs: { textAlign: "left" },
                            content: [{ type: "text", text: underSub.description || "" }],
                          },
                        ],
                      };
                    }
                  });
                }
              });
            }
          });

          // Merge with existing sectionsContent if available
          if (docData.sectionsContent) {
            Object.keys(docData.sectionsContent).forEach(key => {
              if (docData.sectionsContent[key] && docData.sectionsContent[key].content) {
                // Ensure the content has the proper structure
                if (Array.isArray(docData.sectionsContent[key].content)) {
                  initialContents[key] = docData.sectionsContent[key];
                } else if (typeof docData.sectionsContent[key].content === 'string') {
                  // Handle case where content might be a string
                  try {
                    const parsed = JSON.parse(docData.sectionsContent[key].content);
                    initialContents[key] = parsed;
                  } catch {
                    initialContents[key] = {
                      type: "doc",
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: "left" },
                          content: [{ type: "text", text: docData.sectionsContent[key].content }],
                        },
                      ],
                    };
                  }
                }
              }
            });
          }
          
          // Also check for content in the main document structure
          if (docData.content && typeof docData.content === 'object') {
            try {
              if (docData.content.type === 'doc' && Array.isArray(docData.content.content)) {
                // If the document has a main content structure, use it
                console.log('Using main document content structure');
                const fullDoc = docData.content;
                setSectionsContent({});
                // Update editor directly with the main content
                if (editor) {
                  editor.commands.setContent(fullDoc);
                }
                return; // Skip the sections-based approach
              }
            } catch (error) {
              console.error('Error processing main document content:', error);
            }
          }
          
          // Check if we have a direct editorContent field (common in some backends)
          if (docData.editorContent && typeof docData.editorContent === 'object') {
            try {
              if (docData.editorContent.type === 'doc' && Array.isArray(docData.editorContent.content)) {
                console.log('Using editorContent structure');
                const fullDoc = docData.editorContent;
                setSectionsContent({});
                if (editor) {
                  editor.commands.setContent(fullDoc);
                }
                return;
              }
            } catch (error) {
              console.error('Error processing editorContent:', error);
            }
          }

                  setSectionsContent(initialContents);
          console.log('Final processed sections:', normalized);
          console.log('Final processed sectionsContent:', initialContents);
        }
        
        // If we still don't have content, try to extract from any available field
        if (!docData.content && !docData.editorContent) {
          console.log('No structured content found, checking for raw text content');
          
          // Look for any text content in the document
          if (docData.text || docData.content_text || docData.description) {
            const rawContent = docData.text || docData.content_text || docData.description;
            console.log('Found raw text content:', rawContent);
            
            // Create a simple document structure from raw text
            const simpleDoc = {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  attrs: { textAlign: "left" },
                  content: [{ type: "text", text: rawContent }],
                },
              ],
            };
            
            if (editor) {
              editor.commands.setContent(simpleDoc);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching shared document:", err);
        setError("Failed to load shared document");
        setLoading(false);
      }
    };

    fetchSharedDocument();
  }, [docId, token]);

  // Update editor content when sections or sectionsContent change
  useEffect(() => {
    if (editor && sections.length > 0) {
      try {
        const fullDoc = buildFullDoc(sections, sectionsContent);
        console.log('Updating editor with sections-based content:', fullDoc);
        console.log('Sections:', sections);
        console.log('SectionsContent:', sectionsContent);
        
        // Only update if we have meaningful content
        if (fullDoc.content && fullDoc.content.length > 0) {
          editor.commands.setContent(fullDoc);
        } else {
          console.log('No content to display, showing empty document');
          editor.commands.setContent({ type: "doc", content: [] });
        }
      } catch (error) {
        console.error('Error building document content:', error);
        // Fallback to empty content
        editor.commands.setContent({ type: "doc", content: [] });
      }
    }
  }, [sections, sectionsContent, editor]);


  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Please contact the document owner for a valid share link.
        </Typography>
      </Container>
    );
  }

  if (!document) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Document not found or access denied.
        </Alert>
      </Container>
    );
  }


  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: collapsed ? 0 : 250,
          flexShrink: 0,
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
        className="editor-side"
      >
        {!collapsed && (
          <>
            {/* Sidebar Header */}
            <Box sx={{ p: 2, borderBottom: "1px solid #e0e4e7" }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#2c3e50" }}
              >
                {document?.title || "Shared Document"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Read-only view
              </Typography>
            </Box>

            {/* Sections Navigation */}
            <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
              {sections.length === 0 ? (
                <Box
                  sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
                >
                  <Typography variant="body2">No sections found</Typography>
                  <Typography variant="caption">
                    Document may not have structured sections
                  </Typography>
                </Box>
              ) : (
                sections.map((section, i) => (
                  <Accordion
                    key={section.title}
                    expanded={!!openPanels[i]}
                    onChange={() => togglePanel(i)}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      onClick={() => {
                        setSelectedSectionIndex(i);
                        setTimeout(() => {
                          const sectionLabel = `${getSectionLabel(i)} ${
                            section.title
                          }`;
                          const headings =
                            document.querySelectorAll(".ProseMirror h4");
                          let found = false;
                          headings.forEach((h) => {
                            if (h.textContent === sectionLabel) {
                              h.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                              found = true;
                            }
                          });

                          // Fallback: if exact match not found, try to find by section title
                          if (!found) {
                            headings.forEach((h) => {
                              if (
                                h.textContent.includes(section.title) &&
                                h.textContent.includes(getSectionLabel(i))
                              ) {
                                h.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                              }
                            });
                          }
                        }, 100);
                      }}
                      sx={{
                        borderRadius: 3,
                        "&.Mui-expanded": { minHeight: 48 },
                        cursor: "pointer",
                      }}
                    >
                      <Box sx={{ flexGrow: 1, pr: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: selectedSectionIndex === i ? 700 : 600,
                            color:
                              selectedSectionIndex === i
                                ? "#16a085"
                                : "#2c3e50",
                            mb: 0.5,
                          }}
                        >
                          {getSectionLabel(i)}
                          {section.title}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <List dense sx={{ py: 0 }}>
                        {section.subsections
                          ?.map((sub, originalIdx) => {
                            const subTitle =
                              typeof sub === "string" ? sub : sub.title;
                            if (subTitle === section.title) {
                              return null;
                            }
                            return (
                              <Box key={sub.id || `${i}-${originalIdx}`}>
                                <ListItem
                                  button
                                  onClick={() => {
                                    if (!openPanels[i]) togglePanel(i);
                                    setSelectedSectionIndex(i);
                                    setTimeout(() => {
                                      // Find the subsection heading by looking for the specific subsection label
                                      const subsectionLabel = `${getSubsectionLabel(
                                        i,
                                        originalIdx
                                      )} ${subTitle}`;
                                      const headings =
                                        document.querySelectorAll(
                                          ".ProseMirror h5"
                                        );
                                      let found = false;
                                      headings.forEach((h) => {
                                        if (h.textContent === subsectionLabel) {
                                          h.scrollIntoView({
                                            behavior: "smooth",
                                            block: "center",
                                          });
                                          found = true;
                                        }
                                      });

                                      // Fallback: if exact match not found, try to find by subsection title
                                      if (!found) {
                                        headings.forEach((h) => {
                                          if (
                                            h.textContent.includes(subTitle) &&
                                            h.textContent.includes(
                                              `${getSubsectionLabel(
                                                i,
                                                originalIdx
                                              )}`
                                            )
                                          ) {
                                            h.scrollIntoView({
                                              behavior: "smooth",
                                              block: "center",
                                            });
                                          }
                                        });
                                      }
                                    }, 100);
                                  }}
                                  sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    "&:hover": {
                                      bgcolor: "rgba(22,160,133,0.1)",
                                    },
                                  }}
                                >
                                  <ListItemText
                                    primary={`${getSubsectionLabel(
                                      i,
                                      originalIdx
                                    )} ${subTitle}`}
                                    primaryTypographyProps={{
                                      fontSize: "0.85rem",
                                      fontWeight: 500,
                                    }}
                                  />
                                </ListItem>

                                {/* Under-subsections */}
                                {sub.underSubsections &&
                                  sub.underSubsections.map(
                                    (underSub, underSubIdx) => {
                                      const underSubTitle =
                                        typeof underSub === "string"
                                          ? underSub
                                          : underSub.title;
                                      return (
                                        <ListItem
                                          key={
                                            underSub.id ||
                                            `${sub.id}-undersub-${underSubIdx}`
                                          }
                                          button
                                          onClick={() => {
                                            if (!openPanels[i]) togglePanel(i);
                                            setSelectedSectionIndex(i);
                                            setTimeout(() => {
                                              const underSubsectionLabel = `${getUnderSubsectionLabel(
                                                i,
                                                originalIdx,
                                                underSubIdx
                                              )} ${underSubTitle}`;
                                              const headings =
                                                document.querySelectorAll(
                                                  ".ProseMirror h6"
                                                );
                                              let found = false;
                                              headings.forEach((h) => {
                                                if (
                                                  h.textContent ===
                                                  underSubsectionLabel
                                                ) {
                                                  h.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "center",
                                                  });
                                                  found = true;
                                                }
                                              });

                                              // Fallback: if exact match not found, try to find by under-subsection title
                                              if (!found) {
                                                headings.forEach((h) => {
                                                  if (
                                                    h.textContent.includes(
                                                      underSubTitle
                                                    ) &&
                                                    h.textContent.includes(
                                                      `${getUnderSubsectionLabel(
                                                        i,
                                                        originalIdx,
                                                        underSubIdx
                                                      )}`
                                                    )
                                                  ) {
                                                    h.scrollIntoView({
                                                      behavior: "smooth",
                                                      block: "center",
                                                    });
                                                  }
                                                });
                                              }
                                            }, 100);
                                          }}
                                          sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            ml: 3,
                                            "&:hover": {
                                              bgcolor: "rgba(22,160,133,0.1)",
                                            },
                                          }}
                                        >
                                          <ListItemText
                                            primary={`${getUnderSubsectionLabel(
                                              i,
                                              originalIdx,
                                              underSubIdx
                                            )} ${underSubTitle}`}
                                            primaryTypographyProps={{
                                              fontSize: "0.8rem",
                                              fontWeight: 400,
                                              color: "#666",
                                            }}
                                          />
                                        </ListItem>
                                      );
                                    }
                                  )}
                              </Box>
                            );
                          })
                          .filter(Boolean)}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Middle Toggle Arrow on Sidebar Border */}
      <IconButton
        onClick={() => setCollapsed((prev) => !prev)}
        sx={{
          position: "absolute",
          top: "50%",
          left: collapsed ? 0 : 290,
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
            padding: "0",
            borderBottom: "1px solid #e0e4e7",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between", py: 2 }}>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 500, color: "#2c3e50" }}
              >
                {sections[selectedSectionIndex]?.title || "Document"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Shared Document View
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Editor Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: 4,
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: 0, height: 0 },
            "&::-webkit-scrollbar-thumb": { background: "transparent" },
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="editor-content-wrap"
        >
          {editor ? (
            <Box className="editor-cont">
              <EditorContent editor={editor} />
              {sections.length === 0 &&
                Object.keys(sectionsContent).length === 0 && (
                  <Box
                    sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}
                  >
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      No content found in this document.
                    </Typography>
                    <Typography variant="body2">
                      The document may be empty or the content structure is not
                      supported.
                    </Typography>
                  </Box>
                )}
            </Box>
          ) : (
            <Typography>Loading document...</Typography>
          )}
          <SharedDocumentComments documentId={docId} token={token} />
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: "1px solid #e0e4e7", bgcolor: "#f8fafc" }}>
          <Typography variant="body2" color="text.secondary" align="center">
            This is a shared document view. To edit this document, please
            contact the owner.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
