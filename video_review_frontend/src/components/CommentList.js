import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const CommentList = ({ videoId }) => {
  const [comments, setComments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedTextMap, setEditedTextMap] = useState({});
  const [addToId, setAddToId] = useState(null);

  const [additionalText, setAdditionalText] = useState("");

  // Helper: sort and set comments for video or storyboard
  const sortAndSetComments = (commentsArr) => {
    const isVideo = commentsArr.every(c => c.page == null || c.page === 0 || c.page === "0");

    const sorted = [...commentsArr].sort((a, b) => {
      if (!isVideo) {
        const pageA = parseInt(a.page) || -1;
        const pageB = parseInt(b.page) || -1;
        return pageA - pageB;
      } else {
        const timeA = parseFloat(a.timestamp) || 0;
        const timeB = parseFloat(b.timestamp) || 0;
        return timeA - timeB;
      }
    });

    setComments(sorted);
  };


  // Add reaction and persist to backend, then immediately update UI with latest comments
  const addReaction = async (id, type) => {
    console.log("Sending reaction", type, "for comment", id);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${BACKEND_URL}/comments/${id}/reactions`,
        { [type]: 1 },
        {
          headers: { Authorization: token }
        }
      );
      // Re-fetch comments after successful reaction update
      const res = await axios.get(`${BACKEND_URL}/comments/${videoId}`, {
        headers: { Authorization: token }
      });
      sortAndSetComments(res.data);
    } catch (err) {
      console.error("Failed to update reaction:", err);
    }
  };

  useEffect(() => {
    if (!videoId) return;
    const fetchComments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/comments/${videoId}`, { 
          withCredentials: false,
          headers: { Authorization: token }
        });
        console.log("Fetched updated comments:", res.data);
        window._comments = res.data;
        sortAndSetComments(res.data);
      } catch (err) {
        console.error("Failed to load comments:", err);
      }
    };

    fetchComments();

    const listener = () => fetchComments();
    window.addEventListener("comments-updated", listener);

    return () => {
      window.removeEventListener("comments-updated", listener);
    };
  }, [videoId]);

  const startEditing = (comment) => {
    const id = comment.id ?? `${comment.timestamp}-${comment.comment}`;
    if (!id) {
      console.warn("Invalid comment selected for editing:", comment);
      return;
    }
    console.log("Editing comment ID:", id);
    setEditingId(id);
    setEditedTextMap((prev) => ({ ...prev, [id]: comment.comment }));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedTextMap({});
  };

  const handleTextChange = (id, value) => {
    setEditedTextMap((prev) => ({ ...prev, [id]: value }));
  };

  const saveEdit = async (id, text = null) => {
    const updatedText = text !== null ? text : editedTextMap[id];
    if (typeof id !== "number") {
      console.warn("Skipping save for fallback ID:", id);
      return;
    }

    try {
      console.log(`Saving comment ID ${id}:`, updatedText);
      const token = localStorage.getItem("token");
      await axios.put(`${BACKEND_URL}/comments/${id}`, { comment: updatedText }, {
        headers: { Authorization: token }
      });
      const res = await axios.get(`${BACKEND_URL}/comments/${videoId}`, {
        withCredentials: false,
        headers: { Authorization: token }
      });
      console.log("Fetched updated comments:", res.data);
      sortAndSetComments(res.data);
      setEditingId(null);
      setEditedTextMap({});
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  const deleteComment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/comments/${id}`, {
        headers: { Authorization: token }
      });
      const res = await axios.get(`${BACKEND_URL}/comments/${videoId}`, {
        withCredentials: false,
        headers: { Authorization: token }
      });
      sortAndSetComments(res.data);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Button styles for consistent look
  const buttonStyle = {
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.35rem 0.75rem",
    fontSize: "0.9rem",
    cursor: "pointer"
  };
  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#aaa"
  };
  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#d32f2f"
  };

  if (!videoId) return <p style={{ textAlign: "center" }}>Please upload a video to begin reviewing.</p>;

  return (
    <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
      <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600", color: "#333" }}>
        Comments
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {comments.map((c) => {
          if (!c || !c.timestamp || !c.comment || typeof c.id !== "number") return null;
          const commentId = c.id;
          const reactions = typeof c.reactions === "string" ? JSON.parse(c.reactions) : c.reactions || {};
          console.log("Parsed reactions:", reactions);
          return (
            <li
              key={commentId}
              style={{
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "0.75rem"
              }}
            >
              <strong style={{ display: "block", color: "#555", marginBottom: "0.25rem" }}>
                {c.page != null && c.page !== 0 && c.page !== "0"
                  ? `📄 Page ${c.page}`
                  : (() => {
                      const minutes = Math.floor(c.timestamp / 60);
                      const seconds = Math.floor(c.timestamp % 60).toString().padStart(2, '0');
                      return `${minutes}:${seconds}`;
                    })()}
              </strong>
              {editingId === commentId ? (
                <div>
                  <textarea
                    value={editedTextMap[commentId] || ""}
                    onChange={(e) => handleTextChange(commentId, e.target.value)}
                    rows={2}
                    cols={50}
                    style={{
                      width: "100%",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem"
                    }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button style={buttonStyle} onClick={() => saveEdit(commentId)}>Save</button>
                    <button style={cancelButtonStyle} onClick={cancelEditing}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#333", whiteSpace: "pre-wrap", flex: 1 }}>
                    <div style={{ marginBottom: "0.25rem" }}>
                      {c.comment.split("\n\n--")[0]} <span style={{ color: "#888" }}>({c.user})</span>
                    </div>
                    {c.comment.includes("\n\n--") && (
                      <div style={{ fontSize: "0.9rem", marginTop: "0.25rem", color: "#444" }}>
                        {c.comment
                          .split("\n\n--")
                          .slice(1)
                          .map((part, i) => {
                            const [metaLine, ...textParts] = part.trim().split("\n");
                            return (
                              <div key={i} style={{ marginTop: "0.5rem" }}>
                                <div style={{ fontSize: "0.95rem", color: "#444", marginTop: "0.25rem" }}>
                                  {textParts.join("\n")} <span style={{ color: "#666" }}>({metaLine})</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    {c.image && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <img
                          src={c.image}
                          alt="Annotation"
                          style={{ maxWidth: "100%", maxHeight: "200px", border: "1px solid #ccc", borderRadius: "4px" }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "1rem" }}>
                      <button
                        style={{
                          ...buttonStyle,
                          backgroundColor: "#4caf50"
                        }}
                        onClick={() => {
                          setAddToId(commentId);
                          setAdditionalText("");
                        }}
                      >
                        Add
                      </button>
                      <button style={buttonStyle} onClick={() => startEditing(c)}>Edit</button>
                      <button style={deleteButtonStyle} onClick={() => deleteComment(c.id)}>Delete</button>
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem", fontSize: "1.2rem", minWidth: "70px", justifyContent: "flex-end" }}>
                      {["👍", "❤️", "👎"].map((icon) => {
                        const users = Array.isArray(reactions[icon]) ? reactions[icon] : [];
                        const count = users.length;
                        return (
                          <button
                            key={`${c.id}-${icon}`}
                            onClick={() => typeof c.id === "number" && addReaction(c.id, icon)}
                            title={users.length > 0 ? users.join(", ") : ""}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "1.2rem"
                            }}
                          >
                            {icon} {count > 0 ? count : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {addToId === commentId && (
                <div style={{ marginTop: "0.5rem" }}>
                  <textarea
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    rows={2}
                    cols={50}
                    style={{
                      width: "100%",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem"
                    }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      style={buttonStyle}
                      onClick={async () => {
                        const existing = comments.find(c => c.id === commentId);
                        const username = localStorage.getItem("username");
                        const now = new Date();
                        const timestamp = now.toLocaleString();
                        const formattedAddition = `\n\n-- ${username} (${timestamp})\n${additionalText}`;
                        const updatedText = `${existing.comment}${formattedAddition}`;
                        await saveEdit(commentId, updatedText);
                        setAddToId(null);
                        setAdditionalText("");
                      }}
                    >
                      Save Addition
                    </button>
                    <button style={cancelButtonStyle} onClick={() => setAddToId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CommentList;