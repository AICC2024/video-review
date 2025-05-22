import React, { useEffect, useState } from "react";
import axios from "axios";

const PreviousCommentsPanel = ({ previousVideoId, onClose }) => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchPreviousComments = async () => {
      if (!previousVideoId) return;
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/comments/${previousVideoId}`);
        const sorted = [...(res.data || [])].sort((a, b) => {
          const pageA = a.page ?? -1;
          const pageB = b.page ?? -1;
          if (pageA !== pageB) return pageA - pageB;
          const timeA = parseFloat(a.timestamp) || 0;
          const timeB = parseFloat(b.timestamp) || 0;
          return timeA - timeB;
        });
        setComments(sorted);
      } catch (err) {
        console.error("Failed to load previous comments:", err);
      }
    };
    fetchPreviousComments();
  }, [previousVideoId]);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      width: "350px",
      height: "100vh",
      backgroundColor: "#f3f3f3",
      borderLeft: "1px solid #ccc",
      boxShadow: "-2px 0 6px rgba(0,0,0,0.1)",
      padding: "1rem",
      zIndex: 9998,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>🗂 Previous Comments</h3>
        <button onClick={onClose} style={{ fontSize: "1.25rem", border: "none", background: "none", cursor: "pointer" }}>×</button>
      </div>
      {comments.length === 0 ? (
        <p style={{ color: "#666" }}>No comments found for <strong>{previousVideoId}</strong>.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {comments.map((c) => (
            <li key={c.id} style={{
              marginBottom: "1rem",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "0.75rem"
            }}>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                {c.page ? `📄 Page ${c.page}` : `${c.timestamp} seconds`}
              </strong>
              <div style={{ whiteSpace: "pre-wrap", color: "#333" }}>
                {c.comment}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                — {c.user}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PreviousCommentsPanel;
