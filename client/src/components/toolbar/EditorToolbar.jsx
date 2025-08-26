import React from "react";
import {
  Toolbar,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
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
  Highlight as HighlightIcon,
} from "@mui/icons-material";

const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  return (
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
          H2
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

      <Tooltip title="Font Size">
        <select
          onChange={(e) => {
            if (e.target.value && editor) {
              try {
                console.log("Setting font size:", e.target.value);
                // Try different approaches
                if (editor.can().setFontSize(e.target.value)) {
                  editor
                    .chain()
                    .focus()
                    .setFontSize(e.target.value)
                    .run();
                  console.log("Font size command executed");
                } else {
                  console.log("Font size command not available");
                  // Fallback: try to set inline style
                  editor
                    .chain()
                    .focus()
                    .setMark("textStyle", { fontSize: e.target.value })
                    .run();
                }
              } catch (error) {
                console.warn("Font size not supported:", error);
              }
            }
          }}
          style={{
            padding: "6px 8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "12px",
            background: "white",
            cursor: "pointer",
          }}
        >
          <option value="">Size</option>
          <option value="8px">8px</option>
          <option value="10px">10px</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
          <option value="48px">48px</option>
          <option value="64px">64px</option>
          <option value="72px">72px</option>
          <option value="96px">96px</option>
        </select>
      </Tooltip>

      <Tooltip title="Font Family">
        <select
          onChange={(e) => {
            if (e.target.value && editor) {
              try {
                console.log("Setting font family:", e.target.value);
                // Try different approaches
                if (editor.can().setFontFamily(e.target.value)) {
                  editor
                    .chain()
                    .focus()
                    .setFontFamily(e.target.value)
                    .run();
                  console.log("Font family command executed");
                } else {
                  console.log("Font family command not available");
                  // Fallback: try to set inline style
                  editor
                    .chain()
                    .focus()
                    .setMark("textStyle", { fontFamily: e.target.value })
                    .run();
                }
              } catch (error) {
                console.warn("Font family not supported:", error);
              }
            }
          }}
          style={{
            padding: "6px 8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "12px",
            background: "white",
            cursor: "pointer",
          }}
        >
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
          <option value="Impact">Impact</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Lucida Console">Lucida Console</option>
          <option value="Palatino">Palatino</option>
          <option value="Garamond">Garamond</option>
          <option value="Bookman">Bookman</option>
          <option value="Avant Garde">Avant Garde</option>
        </select>
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
  );
};

export default EditorToolbar;
