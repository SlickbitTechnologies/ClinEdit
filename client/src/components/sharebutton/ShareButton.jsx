import { useState } from "react";
import axios from "axios";
import { shareDocument } from "../../pages/services/services";
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
    <div>
      <button
        onClick={handleShare}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Share Document
      </button>
      {shareLink && (
        <p className="mt-2 text-sm text-gray-600">
          Share this link:{" "}
          <a href={shareLink} target="_blank" rel="noreferrer">
            {shareLink}
          </a>
        </p>
      )}
    </div>
  );
}
