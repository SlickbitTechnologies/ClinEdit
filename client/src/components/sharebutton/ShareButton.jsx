import { useState } from "react";
import { shareDocument } from "../../pages/services/services";
import ShareIcon from "@mui/icons-material/Share";
import { Tooltip, IconButton } from "@mui/material";

export default function ShareButton({ docId }) {
  const [shareLink, setShareLink] = useState("");

  const handleShare = async () => {
    try {
      const res = await shareDocument(docId);
      setShareLink(res.share_link);
      await navigator.clipboard.writeText(res.share_link);
      alert("Share link copied to clipboard!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Tooltip title="Share Document">
      <IconButton onClick={handleShare} color="success">
        <ShareIcon />
      </IconButton>
    </Tooltip>
  );
}
