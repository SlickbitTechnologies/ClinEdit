import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
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
  AppBar,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  Add as AddIcon,
} from "@mui/icons-material";

import { useEditor, EditorContent } from "@tiptap/react";
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

import { getDocumentById, updateDocument } from "../services/services";
import EditorToolbar from "../../components/toolbar/EditorToolbar";
import AIDraftingPanel from "../../components/AIDrafting/AIDraftingPanel";
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
  const [openPanels, setOpenPanels] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState([]);
  const { id } = useParams();
  const [sections, setSections] = useState(initialFallbackSections);
  const [sectionsContent, setSectionsContent] = useState({});
  const [showAIDrafting, setShowAIDrafting] = useState(false);

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
        const secId = section.id || `sec-${secIdx}`;
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

            // Use consistent ID generation that matches saveDraft function
            const subId =
              sub.id || `${secId}-sub-${section.subsections.indexOf(sub)}`;

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
                            section.subsections.indexOf(sub)
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
                      section.subsections.indexOf(sub)
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
                  underSub.id || `${subId}-undersub-${underSubIdx}`;

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
                                section.subsections.indexOf(sub),
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
                          section.subsections.indexOf(sub),
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
    content: buildFullDoc(sections, sectionsContent),
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
                // Normalize each subsection to have id, title, description, and underSubsections
                // Get section index for consistent ID generation
                const sectionIndex = response.sections.indexOf(s);

                if (typeof ss === "string") {
                  return {
                    id: `sec-${sectionIndex}-sub-${idx}`,
                    title: ss,
                    description: "",
                    underSubsections: [],
                  };
                } else {
                  // Handle under-subsections
                  let underSubsections = [];
                  if (
                    Array.isArray(ss.underSubsections) &&
                    ss.underSubsections.length
                  ) {
                    underSubsections = ss.underSubsections.map((us, usIdx) => {
                      if (typeof us === "string") {
                        return {
                          id: `sec-${sectionIndex}-sub-${idx}-undersub-${usIdx}`,
                          title: us,
                          description: "",
                        };
                      } else {
                        return {
                          id: `sec-${sectionIndex}-sub-${idx}-undersub-${usIdx}`,
                          title: us.title || us.name || String(us),
                          description: us.description || "",
                        };
                      }
                    });
                  }

                  return {
                    id: `sec-${sectionIndex}-sub-${idx}`,
                    title: ss.title || ss.name || String(ss),
                    description: ss.description || "",
                    underSubsections,
                  };
                }
              });
            } else {
              // Don't create subsections if none exist - this prevents duplication
              subsections = [];
            }
            return {
              ...s,
              id: s.id || `sec-${response.sections.indexOf(s)}`,
              title: s.title || "Untitled",
              description: s.description || "",
              subsections,
            };
          });
          setSections(normalized);
          setSelectedSectionIndex(0);
          const initialContents = {};
          response.sections.forEach((sec, secIdx) => {
            try {
              if (sec.description) {
                if (
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
                    } else if (response.meta_data) {
                      // Fallback to document-level metadata
                      metadata =
                        response.meta_data.metadata || response.meta_data;
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
                    content: [{ type: "text", text: sec.description }],
                  },
                ],
              };
            }
            // Subsections
            if (Array.isArray(sec.subsections)) {
              sec.subsections.forEach((ss, subIdx) => {
                let subId, desc;
                if (typeof ss === "string") {
                  subId = sec.id + "-sub" + subIdx;
                  desc = "";
                } else {
                  subId = ss.id || sec.id + "-sub" + subIdx;
                  desc = ss.description || "";
                }
                try {
                  if (desc) {
                    const parsed = JSON.parse(desc);
                    initialContents[subId] = parsed;
                  } else {
                    initialContents[subId] = { type: "doc", content: [] };
                  }
                } catch {
                  // fallback if description is plain text
                  initialContents[subId] = {
                    type: "doc",
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left" },
                        content: [{ type: "text", text: desc }],
                      },
                    ],
                  };
                }

                // Handle under-subsections
                if (ss.underSubsections && Array.isArray(ss.underSubsections)) {
                  ss.underSubsections.forEach((us, usIdx) => {
                    let underSubId, underSubDesc;
                    if (typeof us === "string") {
                      underSubId = `${subId}-undersub-${usIdx}`;
                      underSubDesc = "";
                    } else {
                      underSubId = us.id || `${subId}-undersub-${usIdx}`;
                      underSubDesc = us.description || "";
                    }
                    try {
                      if (underSubDesc) {
                        const parsed = JSON.parse(underSubDesc);
                        initialContents[underSubId] = parsed;
                      } else {
                        initialContents[underSubId] = {
                          type: "doc",
                          content: [],
                        };
                      }
                    } catch {
                      // fallback if description is plain text
                      initialContents[underSubId] = {
                        type: "doc",
                        content: [
                          {
                            type: "paragraph",
                            attrs: { textAlign: "left" },
                            content: [{ type: "text", text: underSubDesc }],
                          },
                        ],
                      };
                    }
                  });
                }
              });
            }
          });
          setSectionsContent(initialContents);
          if (editor) {
            editor.commands.setContent(
              buildFullDoc(normalized, initialContents)
            );
          }
        }
      } catch (error) {
        console.error("Error loading document:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id]);

  const saveDraft = async () => {
    if (!editor) return;
    const json = editor.getJSON();

    // Extract sections and subsections with updated titles from editor content
    const extractedSections = [];
    let currentSection = null;
    let currentSectionIndex = -1;

    for (const node of json.content) {
      if (node.type === "heading" && node.attrs?.level === 4) {
        // This is a section heading
        const headingText = node.content?.[0]?.text || "";
        const titleWithoutNumber = headingText.replace(/^\d+\.\s*/, ""); // Remove "1. " prefix

        currentSectionIndex++;
        currentSection = {
          ...sections[currentSectionIndex],
          title: titleWithoutNumber,
          content: [],
          subsections: [],
        };
        extractedSections.push(currentSection);
        continue;
      }

      if (
        node.type === "heading" &&
        node.attrs?.level === 5 &&
        currentSection
      ) {
        // This is a subsection heading
        const headingText = node.content?.[0]?.text || "";
        const titleWithoutNumber = headingText.replace(/^\d+\.\d+\s*/, ""); // Remove "1.1 " prefix

        const subsectionIndex = currentSection.subsections.length;
        const originalSubsection =
          sections[currentSectionIndex]?.subsections[subsectionIndex];

        currentSection.subsections.push({
          ...originalSubsection,
          title: titleWithoutNumber,
          content: [],
          underSubsections: [],
        });
        continue;
      }

      if (
        node.type === "heading" &&
        node.attrs?.level === 6 &&
        currentSection &&
        currentSection.subsections.length > 0
      ) {
        // This is an under-subsection heading
        const headingText = node.content?.[0]?.text || "";
        const titleWithoutNumber = headingText.replace(/^\d+\.\d+\.\d+\s*/, ""); // Remove "1.1.1 " prefix

        const currentSubsection =
          currentSection.subsections[currentSection.subsections.length - 1];
        const underSubsectionIndex = currentSubsection.underSubsections.length;
        const originalUnderSubsection =
          sections[currentSectionIndex]?.subsections[
            currentSection.subsections.length - 1
          ]?.underSubsections?.[underSubsectionIndex];

        currentSubsection.underSubsections.push({
          ...originalUnderSubsection,
          title: titleWithoutNumber,
          content: [],
        });
        continue;
      }

      // Add content to current section, subsection, or under-subsection
      if (currentSection) {
        if (currentSection.subsections.length > 0) {
          const lastSubsection =
            currentSection.subsections[currentSection.subsections.length - 1];
          if (lastSubsection.underSubsections.length > 0) {
            // Add to current under-subsection
            const lastUnderSubsection =
              lastSubsection.underSubsections[
                lastSubsection.underSubsections.length - 1
              ];
            lastUnderSubsection.content.push(node);
          } else {
            // Add to current subsection
            lastSubsection.content.push(node);
          }
        } else {
          // Add to current section
          currentSection.content.push(node);
        }
      }
    }

    // Build updated sections for database
    const updatedSections = extractedSections.map(
      (extractedSection, secIdx) => {
        const originalSection = sections[secIdx];
        const secId = originalSection?.id || `sec-${secIdx}`;

        // Special handling for TITLE PAGE to preserve metadata format
        let description;
        if (
          originalSection?.title?.toUpperCase() === "TITLE PAGE" &&
          doc.meta_data
        ) {
          // Preserve the original metadata format for TITLE PAGE
          description = `metadata: {${Object.entries(
            doc.meta_data.metadata || doc.meta_data
          )
            .map(([k, v]) => `'${k}': '${v}'`)
            .join(", ")}}`;
        } else {
          description = JSON.stringify({
            type: "doc",
            content: extractedSection.content,
          });
        }

        return {
          ...originalSection,
          title: extractedSection.title,
          description,
          subsections: extractedSection.subsections.map(
            (extractedSub, subIdx) => {
              const originalSub = originalSection?.subsections[subIdx];
              const subId = originalSub?.id || `${secId}-sub-${subIdx}`;

              return {
                ...originalSub,
                id: subId,
                title: extractedSub.title,
                description: JSON.stringify({
                  type: "doc",
                  content: extractedSub.content || [],
                }),
                underSubsections: (extractedSub.underSubsections || []).map(
                  (extractedUnderSub, underSubIdx) => {
                    const originalUnderSub =
                      originalSub?.underSubsections?.[underSubIdx];
                    const underSubId =
                      originalUnderSub?.id ||
                      `${subId}-undersub-${underSubIdx}`;

                    return {
                      ...originalUnderSub,
                      id: underSubId,
                      title: extractedUnderSub.title,
                      description: JSON.stringify({
                        type: "doc",
                        content: extractedUnderSub.content || [],
                      }),
                    };
                  }
                ),
              };
            }
          ),
        };
      }
    );

    const updatedDoc = { ...doc, sections: updatedSections };

    try {
      await updateDocument(doc.id, updatedDoc); // 🔹 API call here
      toast.success("Draft saved successfully!");

      // Update local state to reflect the saved content
      setSectionsContent((prev) => {
        const updated = { ...prev };
        updatedSections.forEach((section) => {
          const secId = section.id || `sec-${sections.indexOf(section)}`;

          // Special handling for TITLE PAGE - don't parse as JSON
          if (
            section.title?.toUpperCase() === "TITLE PAGE" &&
            section.description.includes("metadata:")
          ) {
            // Keep the existing content for TITLE PAGE
            updated[secId] = prev[secId] || { type: "doc", content: [] };
          } else {
            updated[secId] = JSON.parse(section.description);
          }

          section.subsections.forEach((sub, idx) => {
            const subId =
              typeof sub === "string" ? `${secId}-sub-${idx}` : sub.id;
            updated[subId] = JSON.parse(sub.description);

            // Handle under-subsections
            if (sub.underSubsections) {
              sub.underSubsections.forEach((underSub, underIdx) => {
                const underSubId =
                  typeof underSub === "string"
                    ? `${subId}-undersub-${underIdx}`
                    : underSub.id;
                updated[underSubId] = JSON.parse(underSub.description);
              });
            }
          });
        });
        return updated;
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft. Please try again.");
    }
  };
  const exportContent = () => {
    if (!editor) return;

    // Create a temporary container with the editor's HTML
    const element = document.createElement("div");
    element.innerHTML = editor.getHTML();
    element.style.padding = "20px"; // Optional: add padding for PDF

    const options = {
      margin: 10,
      filename: `${headerTitle}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    // Generate and download PDF
    html2pdf().set(options).from(element).save();
  };

  // Subsection creation function
  // Handle AI-generated content
  const handleAIContentGenerated = (generatedContent) => {
    const updatedSectionsContent = { ...sectionsContent };
    
    // Apply AI-generated content to sections
    Object.entries(generatedContent).forEach(([sectionId, content]) => {
      if (content && typeof content === 'object' && content.type === 'doc') {
        updatedSectionsContent[sectionId] = content;
      } else if (typeof content === 'string') {
        // Convert string content to TipTap format
        updatedSectionsContent[sectionId] = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "left" },
              content: [{ type: "text", text: content }],
            },
          ],
        };
      }
    });

    setSectionsContent(updatedSectionsContent);
    
    // Update editor with new content
    if (editor) {
      const newFullDoc = buildFullDoc(sections, updatedSectionsContent);
      editor.commands.setContent(newFullDoc);
    }
  };

  const createSubsection = (sectionIndex = selectedSectionIndex) => {
    if (!editor) return;

    const currentSection = sections[sectionIndex];
    if (!currentSection) return;

    // Create new subsection heading
    const newSubsectionTitle = `New Subsection ${
      currentSection.subsections.length + 1
    }`;
    const subsectionNumber = `${getSectionLabel(sectionIndex)}.${
      currentSection.subsections.length + 1
    }`;

    // Update local sections state to include the new subsection
    const updatedSections = [...sections];
    const newSubsection = {
      id: `sec-${sectionIndex}-sub-${currentSection.subsections.length}`,
      title: newSubsectionTitle,
      description: "",
      underSubsections: [],
    };

    updatedSections[sectionIndex].subsections.push(newSubsection);
    setSections(updatedSections);

    // Update sectionsContent for the new subsection
    setSectionsContent((prev) => ({
      ...prev,
      [newSubsection.id]: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: [
              { type: "text", text: "Enter content for new subsection..." },
            ],
          },
        ],
      },
    }));

    // Rebuild and update editor content
    setTimeout(() => {
      const newFullDoc = buildFullDoc(updatedSections, {
        ...sectionsContent,
        [newSubsection.id]: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "left" },
              content: [
                { type: "text", text: "Enter content for new subsection..." },
              ],
            },
          ],
        },
      });
      editor.commands.setContent(newFullDoc);
    }, 100);
  };

  // Under-subsection creation function
  const createUnderSubsection = (sectionIndex, subsectionIndex) => {
    const updatedSections = [...sections];
    const currentSection = updatedSections[sectionIndex];
    const currentSubsection = currentSection.subsections[subsectionIndex];

    // Limit to maximum 2 levels of subsections
    if (!currentSubsection.underSubsections) {
      currentSubsection.underSubsections = [];
    }

    // Check if we've reached the limit (2 under-subsections max)
    if (currentSubsection.underSubsections.length >= 2) {
      toast.warning("Maximum 2 under-subsections allowed per subsection");
      return;
    }

    const newUnderSubsectionTitle = `New Under-subsection ${
      currentSubsection.underSubsections.length + 1
    }`;

    const newUnderSubsection = {
      id: `sec-${sectionIndex}-sub-${subsectionIndex}-undersub-${currentSubsection.underSubsections.length}`,
      title: newUnderSubsectionTitle,
      description: "",
    };

    currentSubsection.underSubsections.push(newUnderSubsection);
    setSections(updatedSections);

    // Update sectionsContent for the new under-subsection
    setSectionsContent((prev) => ({
      ...prev,
      [newUnderSubsection.id]: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: [
              {
                type: "text",
                text: "Enter content for new under-subsection...",
              },
            ],
          },
        ],
      },
    }));

    // Rebuild and update editor content
    setTimeout(() => {
      const newFullDoc = buildFullDoc(updatedSections, {
        ...sectionsContent,
        [newUnderSubsection.id]: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "text",
                  text: "Enter content for new under-subsection...",
                },
              ],
            },
          ],
        },
      });
      editor.commands.setContent(newFullDoc);
    }, 100);
  };

  // Section creation function
  const createSection = () => {
    if (!editor) return;

    const newSectionTitle = `New Section ${sections.length + 1}`;
    const newSectionId = `sec-${sections.length}`;

    // Create new section object
    const newSection = {
      id: newSectionId,
      title: newSectionTitle,
      description: "",
      subsections: [],
    };

    // Update sections state
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);

    // Update sectionsContent for the new section
    const newSectionContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "left" },
          content: [{ type: "text", text: "Enter content for new section..." }],
        },
      ],
    };

    setSectionsContent((prev) => ({
      ...prev,
      [newSectionId]: newSectionContent,
    }));

    // Rebuild and update editor content
    setTimeout(() => {
      const newFullDoc = buildFullDoc(updatedSections, {
        ...sectionsContent,
        [newSectionId]: newSectionContent,
      });
      editor.commands.setContent(newFullDoc);
    }, 100);

    // Select the new section
    setSelectedSectionIndex(sections.length);
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
          px: 1,
          py: 1,
          borderBottom: "1px solid #e0e4e7",
          bgcolor: "background.paper",
        }}
        className="document-header"
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2c3e50" }}>
              {headerTitle}
            </Typography>
 
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
            Save
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
          className="editor-sidebar"
        >
          {!collapsed && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 700, color: "#2c3e50", mb: 3 }}
              >
                Sections
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
                    onClick={() => {
                      setSelectedSectionIndex(i);
                                        setTimeout(() => {
                        // Find the main section heading
                        const sectionLabel = `${getSectionLabel(i)} ${
                          section.title
                        }`;
                        const headings = document.querySelectorAll(
                          ".ProseMirror h4, .ProseMirror h5"
                        );
                        headings.forEach((h) => {
                          if (h.textContent === sectionLabel) {
                            h.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        });
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
                            selectedSectionIndex === i ? "#16a085" : "#2c3e50",
                          mb: 0.5,
                        }}
                      >
                        {getSectionLabel(i)}
                        {section.title}
                      </Typography>
                      {/* Description removed from sidebar */}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense sx={{ py: 0 }}>
                      {section.subsections
                        .map((sub, originalIdx) => {
                          const subTitle =
                            typeof sub === "string" ? sub : sub.title;
                          // Skip subsections that are identical to the main section title
                          if (subTitle === section.title) {
                            return null;
                          }
                          return (
                            <Box
                              key={
                                sub.id ||
                                `${section.id || `sec-${i}`}-sub-${originalIdx}`
                              }
                            >
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
                                    const headings = document.querySelectorAll(
                                      ".ProseMirror h4, .ProseMirror h5"
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
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    createUnderSubsection(i, originalIdx);
                                  }}
                                  sx={{
                                    ml: 1,
                                    color: "#16a085",
                                    "&:hover": {
                                      bgcolor: "rgba(22,160,133,0.1)",
                                    },
                                  }}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
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
                                            headings.forEach((h) => {
                                              if (
                                                h.textContent ===
                                                underSubsectionLabel
                                              ) {
                                                h.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "center",
                                                });
                                              }
                                            });
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

                      {/* Add Subsection Button */}
                      <Box sx={{ mt: 1, px: 1 }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            createSubsection(i);
                          }}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            color: "#16a085",
                            "&:hover": {
                              bgcolor: "rgba(22,160,133,0.1)",
                            },
                          }}
                        >
                          Add Subsection
                        </Button>
                      </Box>
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* Add Section Button */}
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={createSection}
                  sx={{
                    textTransform: "none",
                    borderColor: "#16a085",
                    color: "#16a085",
                    "&:hover": {
                      borderColor: "#16a085",
                      bgcolor: "rgba(22,160,133,0.1)",
                    },
                  }}
                >
                  Add Section
                </Button>
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
                  {sections[selectedSectionIndex].title}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowAIDrafting(!showAIDrafting)}
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
                  {showAIDrafting ? "Hide AI Drafting" : "AI Drafting"}
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Editor Toolbar */}
          <EditorToolbar editor={editor} />

          {/* AI Drafting Panel */}
          {showAIDrafting && (
            <Box sx={{ borderBottom: "1px solid #e0e4e7" }}>
              <AIDraftingPanel
                sections={sections}
                onContentGenerated={handleAIContentGenerated}
                documentId={id}
              />
            </Box>
          )}

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
