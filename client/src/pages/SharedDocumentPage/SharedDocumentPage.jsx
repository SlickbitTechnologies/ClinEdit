import React, { useState, useEffect, useRef } from "react";
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
  Button,
  TextField,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useEditor, EditorContent } from "@tiptap/react";
import SharedDocumentComments from "../../components/comments/comments";
import GuestAuth from "../../components/auth/GuestAuth";
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
import { onAuthStateChanged,signOut,getAuth } from "firebase/auth";
import { auth } from "../../firebase";
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
  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  // Comment-related state
  const [showComments, setShowComments] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [showInlinePanel, setShowInlinePanel] = useState(false);
  const [comments, setComments] = useState([]);
  const [socket, setSocket] = useState(null);
  const editorRef = useRef(null);
  const storedSelectionRef = useRef(null);

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
                    text: `${getSubsectionLabel(secIdx, subIdx)} ${subTitle}`,
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
                  underSub.id ||
                  `${secIdx + 1}.${subIdx + 1}.${underSubIdx + 1}`;

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

  // Text selection handling - capture selection immediately when made
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim() !== "") {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const selectionData = {
        text: selection.toString().trim(),
        position: {
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
          right: 20,
        }
      };
      
      // Store immediately when selection is made
      setSelectedText(selectionData.text);
      setSelectionPosition(selectionData.position);
      storedSelectionRef.current = selectionData;
      setShowFloatingButton(true);
    }
  };

  // Only clear selection when explicitly clicking outside comment areas
  const handleDocumentClick = (event) => {
    const isCommentArea = event.target.closest('[data-comment-ui]') || 
                         event.target.closest('.comments-container') ||
                         event.target.closest('.MuiPaper-root');
    
    // Don't clear if clicking on comment UI or if comment panels are open
    if (!isCommentArea && !showInlinePanel && !showFloatingButton) {
      setSelectedText("");
      setSelectionPosition(null);
      storedSelectionRef.current = null;
      setShowFloatingButton(false);
    }
  };

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // WebSocket setup for comments - only if user is authenticated
  useEffect(() => {
    if (!docId || !currentUser) return;

    const fullWsUrl = `ws://127.0.0.1:8000/api/documents/${docId}/comments`;
    let ws;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(fullWsUrl);
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        return;
      }
    
      ws.onopen = async () => {
        console.log("WebSocket connected for comments");
        
        // Get Firebase token for authenticated user
        const firebaseToken = await currentUser.getIdToken();
        
        const userInfo = {
          type: "auth",
          user_id: currentUser.uid,
          user_name: currentUser.displayName || currentUser.email || "User",
          user_email: currentUser.email,
          user_display_name: currentUser.displayName,
          firebase_token: firebaseToken,
          share_token: token
        };
        
        try {
          ws.send(JSON.stringify(userInfo));
        } catch (error) {
          console.error("Error sending auth message:", error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code);
      };

      setSocket(ws);
    };
    
    connectWebSocket();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, [docId, token, currentUser]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case "existing_comments":
        setComments(data.comments || []);
        break;
      case "new_comment":
        if (data.comment) {
          setComments(prev => {
            const exists = prev.some(comment => comment.id === data.comment.id);
            if (exists) return prev;
            return [data.comment, ...prev];
          });
        }
        break;
      case "new_reply":
        if (data.comment) {
          setComments(prev => prev.map(comment => 
            comment.id === data.comment.id ? data.comment : comment
          ));
        }
        break;
      case "comment_resolved":
        if (data.comment) {
          setComments(prev => prev.map(comment => 
            comment.id === data.comment.id ? data.comment : comment
          ));
        }
        break;
      default:
        console.log("Unknown message type:", data.type);
    }
  };
 const safeQuerySelectorAll = (selector) => {
   if (
     typeof document !== "undefined" &&
     document &&
     document.querySelectorAll
   ) {
     return document.querySelectorAll(selector);
   }
   return [];
 };

  const handleAddComment = () => {
    if (!currentUser) {
      setShowAuthDialog(true);
      return;
    }
    
    // Ensure we preserve the stored selection when opening comment panel
    if (storedSelectionRef.current) {
      setSelectedText(storedSelectionRef.current.text);
      setSelectionPosition(storedSelectionRef.current.position);
    }
    
    setShowInlinePanel(true);
    setShowFloatingButton(false);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setShowAuthDialog(false);
    
    // If user was trying to comment, restore their selection
    if (storedSelectionRef.current) {
      setSelectedText(storedSelectionRef.current.text);
      setSelectionPosition(storedSelectionRef.current.position);
      setShowInlinePanel(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setShowComments(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSendComment = (content, selectionText) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // Use stored selection data if available
    const finalSelectionText = selectionText || selectedText || storedSelectionRef.current?.text;
    const finalPosition = selectionPosition || storedSelectionRef.current?.position;

    const commentData = {
      type: "new_comment",
      content: content,
      selection_text: finalSelectionText,
      position: finalPosition,
    };

    try {
      socket.send(JSON.stringify(commentData));
      // Clear everything after sending
      setSelectedText("");
      setSelectionPosition(null);
      storedSelectionRef.current = null;
      setShowFloatingButton(false);
      setShowInlinePanel(false);
    } catch (error) {
      console.error("Error sending comment:", error);
    }
  };

  // Remove the old handleUserNameSave function as we now use Firebase Auth


  const handleSendReply = (commentId, content) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const replyData = {
      type: "new_reply",
      comment_id: commentId,
      content: content,
    };

    try {
      socket.send(JSON.stringify(replyData));
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  const handleResolveComment = (commentId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const resolveData = {
      type: "resolve_comment",
      comment_id: commentId,
    };

    try {
      socket.send(JSON.stringify(resolveData));
    } catch (error) {
      console.error("Error resolving comment:", error);
    }
  };

  // Add event listeners for text selection with browser-safe handling
  useEffect(() => {
    if (typeof document !== 'undefined' && document) {
      document.addEventListener("selectionchange", handleSelectionChange);
      document.addEventListener("click", handleDocumentClick);
      
      return () => {
        if (typeof document !== 'undefined' && document) {
          document.removeEventListener("selectionchange", handleSelectionChange);
          document.removeEventListener("click", handleDocumentClick);
        }
      };
    }
  }, []);

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
        console.log("Received document data from backend:", docData);
        console.log("Document sections:", docData.sections);
        console.log("Document sectionsContent:", docData.sectionsContent);
        console.log("Document content:", docData.content);
        setDocument(docData);

        // Process sections and content like in EditorPage
        if (
          docData &&
          Array.isArray(docData.sections) &&
          docData.sections.length
        ) {
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
                  if (
                    Array.isArray(ss.underSubsections) &&
                    ss.underSubsections.length
                  ) {
                    underSubsections = ss.underSubsections.map((us, usIdx) => {
                      if (typeof us === "string") {
                        return {
                          id: `${sectionIndex + 1}.${idx + 1}.${usIdx + 1}`,
                          title: us,
                          description: "",
                        };
                      } else {
                        return {
                          id:
                            us.id ||
                            `${sectionIndex + 1}.${idx + 1}.${usIdx + 1}`,
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
                if (
                  typeof sec.description === "object" &&
                  sec.description.type === "doc"
                ) {
                  initialContents[sec.id] = sec.description;
                } else if (
                  sec.title.toUpperCase() === "TITLE PAGE" &&
                  sec.description.includes("metadata:")
                ) {
                  try {
                    // Extract the metadata part from the description
                    const metadataMatch =
                      sec.description.match(/metadata:\s*({.*})/);
                    let metadata = {};

                    if (metadataMatch) {
                      // Parse the metadata object
                      const metadataStr = metadataMatch[1].replace(/'/g, '"');
                      metadata = JSON.parse(metadataStr);
                    } else if (docData.meta_data) {
                      // Fallback to document-level metadata
                      metadata =
                        docData.meta_data.metadata || docData.meta_data;
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
                    if (
                      typeof sub.description === "object" &&
                      sub.description.type === "doc"
                    ) {
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
                        content: [
                          { type: "text", text: sub.description || "" },
                        ],
                      },
                    ],
                  };
                }

                // Process under-subsections
                if (
                  sub.underSubsections &&
                  Array.isArray(sub.underSubsections)
                ) {
                  sub.underSubsections.forEach((underSub, underSubIdx) => {
                    const underSubId =
                      underSub.id ||
                      `${secIdx + 1}.${subIdx + 1}.${underSubIdx + 1}`;
                    try {
                      if (underSub.description) {
                        // Check if description is already a JSON object
                        if (
                          typeof underSub.description === "object" &&
                          underSub.description.type === "doc"
                        ) {
                          initialContents[underSubId] = underSub.description;
                        } else {
                          const parsed = JSON.parse(underSub.description);
                          initialContents[underSubId] = parsed;
                        }
                      } else {
                        initialContents[underSubId] = {
                          type: "doc",
                          content: [],
                        };
                      }
                    } catch {
                      initialContents[underSubId] = {
                        type: "doc",
                        content: [
                          {
                            type: "paragraph",
                            attrs: { textAlign: "left" },
                            content: [
                              {
                                type: "text",
                                text: underSub.description || "",
                              },
                            ],
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
            Object.keys(docData.sectionsContent).forEach((key) => {
              if (
                docData.sectionsContent[key] &&
                docData.sectionsContent[key].content
              ) {
                // Ensure the content has the proper structure
                if (Array.isArray(docData.sectionsContent[key].content)) {
                  initialContents[key] = docData.sectionsContent[key];
                } else if (
                  typeof docData.sectionsContent[key].content === "string"
                ) {
                  // Handle case where content might be a string
                  try {
                    const parsed = JSON.parse(
                      docData.sectionsContent[key].content
                    );
                    initialContents[key] = parsed;
                  } catch {
                    initialContents[key] = {
                      type: "doc",
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: "left" },
                          content: [
                            {
                              type: "text",
                              text: docData.sectionsContent[key].content,
                            },
                          ],
                        },
                      ],
                    };
                  }
                }
              }
            });
          }

          // Also check for content in the main document structure
          if (docData.content && typeof docData.content === "object") {
            try {
              if (
                docData.content.type === "doc" &&
                Array.isArray(docData.content.content)
              ) {
                // If the document has a main content structure, use it
                console.log("Using main document content structure");
                const fullDoc = docData.content;
                setSectionsContent({});
                // Update editor directly with the main content
                if (editor) {
                  editor.commands.setContent(fullDoc);
                }
                return; // Skip the sections-based approach
              }
            } catch (error) {
              console.error("Error processing main document content:", error);
            }
          }

          // Check if we have a direct editorContent field (common in some backends)
          if (
            docData.editorContent &&
            typeof docData.editorContent === "object"
          ) {
            try {
              if (
                docData.editorContent.type === "doc" &&
                Array.isArray(docData.editorContent.content)
              ) {
                console.log("Using editorContent structure");
                const fullDoc = docData.editorContent;
                setSectionsContent({});
                if (editor) {
                  editor.commands.setContent(fullDoc);
                }
                return;
              }
            } catch (error) {
              console.error("Error processing editorContent:", error);
            }
          }

          setSectionsContent(initialContents);
          console.log("Final processed sections:", normalized);
          console.log("Final processed sectionsContent:", initialContents);
        }

        // If we still don't have content, try to extract from any available field
        if (!docData.content && !docData.editorContent) {
          console.log(
            "No structured content found, checking for raw text content"
          );

          // Look for any text content in the document
          if (docData.text || docData.content_text || docData.description) {
            const rawContent =
              docData.text || docData.content_text || docData.description;
            console.log("Found raw text content:", rawContent);

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
        console.log("Updating editor with sections-based content:", fullDoc);
        console.log("Sections:", sections);
        console.log("SectionsContent:", sectionsContent);

        // Only update if we have meaningful content
        if (fullDoc.content && fullDoc.content.length > 0) {
          editor.commands.setContent(fullDoc);
        } else {
          console.log("No content to display, showing empty document");
          editor.commands.setContent({ type: "doc", content: [] });
        }
      } catch (error) {
        console.error("Error building document content:", error);
        // Fallback to empty content
        editor.commands.setContent({ type: "doc", content: [] });
      }
    }
  }, [sections, sectionsContent, editor]);

  // Show auth loading state
  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Require authentication before showing document
  if (!currentUser) {
    return (
      <GuestAuth
        onAuthSuccess={handleAuthSuccess}
        documentTitle={document?.title || "Clinical Study Report"}
      />
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
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
        <Alert severity="warning">Document not found or access denied.</Alert>
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
                          const headings = safeQuerySelectorAll(".ProseMirror h4");
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
                                       safeQuerySelectorAll(".ProseMirror h5");
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
                                                safeQuerySelectorAll(
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
            <Box display="flex" alignItems="center" gap={2}>
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

              <Button
                variant="outlined"
                startIcon={<CommentIcon />}
                onClick={() => setShowComments(!showComments)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: "#1976d2",
                  color: "#1976d2",
                  "&:hover": {
                    borderColor: "#1565c0",
                    bgcolor: "rgba(25, 118, 210, 0.1)",
                  },
                }}
              >
                Comments ({comments.length})
              </Button>

              {/* User Info and Sign Out */}
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary">
                  Signed in as {currentUser.displayName || currentUser.email}
                </Typography>
                <Button
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={handleSignOut}
                  sx={{ textTransform: "none" }}
                >
                  Sign Out
                </Button>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Editor Content and Comments Container */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Main Editor Content */}
          <Box
            ref={editorRef}
            sx={{
              flex: showComments ? "1 1 70%" : "1 1 100%",
              p: 4,
              overflowY: "auto",
              "&::-webkit-scrollbar": { width: 0, height: 0 },
              "&::-webkit-scrollbar-thumb": { background: "transparent" },
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              transition: "flex 0.3s ease",
            }}
            className="editor-content-wrap"
          >
            {editor ? (
              <Box className="editor-cont">
                <EditorContent editor={editor} />
                {sections.length === 0 &&
                  Object.keys(sectionsContent).length === 0 && (
                    <Box
                      sx={{
                        mt: 4,
                        textAlign: "center",
                        color: "text.secondary",
                      }}
                    >
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        No content found in this document.
                      </Typography>
                      <Typography variant="body2">
                        The document may be empty or the content structure is
                        not supported.
                      </Typography>
                    </Box>
                  )}
              </Box>
            ) : (
              <Typography>Loading document...</Typography>
            )}
            {showComments && (
              <Box
                sx={{
                  flex: "0 0 30%",
                  borderLeft: "1px solid #e0e4e7",
                  bgcolor: "#fafafa",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {/* Comments Panel */}
                <SharedDocumentComments
                  documentId={docId}
                  token={token}
                  currentUser={currentUser}
                  isOwner={true}
                />
              </Box>
            )}
          </Box>

          {/* Comments Side Panel */}
        </Box>

        {/* Floating Comment Button */}
        {/* <FloatingCommentButton
          position={selectionPosition}
          visible={showFloatingButton && !showComments}
          onAddComment={handleAddComment}
          selectedText={selectedText}
        /> */}

        {/* Inline Comment Panel */}
        {/* <InlineCommentPanel
          comments={comments}
          onSendComment={handleSendComment}
          onSendReply={handleSendReply}
          onResolveComment={handleResolveComment}
          onClose={() => {
            setShowInlinePanel(false);
            setSelectedText("");
            setSelectionPosition(null);
            storedSelectionRef.current = null;
            setShowFloatingButton(false);
          }}
          selectedText={selectedText}
          currentUser={{
            uid: `shared_${docId}`,
            displayName: userName || "Anonymous User",
            email: "shared@example.com",
          }}
          position={selectionPosition}
          visible={showInlinePanel && !showComments}
        /> */}

        {/* Remove the auth dialog since auth is now required upfront */}

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: "1px solid #e0e4e7", bgcolor: "#f8fafc" }}>
          <Typography variant="body2" color="text.secondary" align="center">
            This is a shared document view. Select text to add comments.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
