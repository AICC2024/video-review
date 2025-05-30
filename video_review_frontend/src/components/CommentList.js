import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const TEAM_EMAILS = [
  "matthew@naveonguides.com",
  "paul@naveonguides.com",
  "ryan@naveonguides.com",
  "mark@naveonguides.com"
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const CommentList = ({ videoId, currentTime, mediaType }) => {
  // Highlight and scroll to active comment during video playback
  const commentRefs = useRef({});
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [comments, setComments] = useState([]);
  // Find and track the active comment based on currentTime
  useEffect(() => {
    if (!Array.isArray(comments)) return;
    const match = comments.find(c =>
      Math.abs(Number(c.timestamp) - currentTime) <= 1
    );
    if (match?.id !== activeCommentId) {
      setActiveCommentId(match?.id || null);
    }
  }, [currentTime, comments]);

  // Scroll to the active comment when it changes or currentTime updates, with logging and slight delay
  useEffect(() => {
    const activeRef = commentRefs.current[activeCommentId];
    if (
      activeRef &&
      typeof activeRef === "object" &&
      activeRef.current &&
      typeof activeRef.current.scrollIntoView === "function"
    ) {
      setTimeout(() => {
        try {
          activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (err) {
          console.warn("Scroll failed:", err);
        }
      }, 100);
    }
  }, [activeCommentId, currentTime]);
  const [editingId, setEditingId] = useState(null);
  const [editedTextMap, setEditedTextMap] = useState({});
  const [addToId, setAddToId] = useState(null);

  const [additionalText, setAdditionalText] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const lastCommentCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  // Notify modal state
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyTargetComment, setNotifyTargetComment] = useState(null);
  const [notifyEmailInput, setNotifyEmailInput] = useState("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState("");

  // Helper: sort and set comments for video or storyboard
  // - If all comments have no page (null/0/"0"), treat as video: sort by timestamp
  // - If any comment has a page (not null/0/"0"), treat as storyboard: sort by page
  const sortAndSetComments = (commentsArr) => {
    // Detect whether this is a storyboard (has any page) or a video (all page null/0/"0")
    const isStoryboard = commentsArr.some(
      c => c.page != null && c.page !== 0 && c.page !== "0"
    );
    const sorted = [...commentsArr].sort((a, b) => {
      if (isStoryboard) {
        // Storyboard: sort by page (page is required)
        const pageA = parseInt(a.page) || -1;
        const pageB = parseInt(b.page) || -1;
        return pageA - pageB;
      } else {
        // Video: sort by timestamp
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
        return res.data;
      } catch (err) {
        console.error("Failed to load comments:", err);
        return [];
      }
    };

    const listener = (e) => {
      fetchComments().then((res) => {
        sortAndSetComments([...res]);
        if (e?.detail?.callback) {
          e.detail.callback(res.length);
        }

        // Show "🟡 Live" briefly when new comment(s) detected
        if (res.length > lastCommentCountRef.current) {
          lastCommentCountRef.current = res.length;
          setIsPolling(true);
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollTimerRef.current = setTimeout(() => {
            setIsPolling(false);
          }, 3000); // show "Live" for 3 seconds after a new comment
        }
      });
    };

    fetchComments().then((res) => {
      sortAndSetComments([...res]);
      lastCommentCountRef.current = Array.isArray(res) ? res.length : 0;
    });

    window.addEventListener("comments-updated", listener);

    // Polling interval for live comment updates (every 3 seconds)
    const pollInterval = setInterval(() => {
      if (!videoId) return;
      const event = new CustomEvent("comments-updated", {
        detail: {
          callback: (commentCount) => {
            console.log("🛑 Polling callback (comments):", commentCount);
          }
        }
      });
      window.dispatchEvent(event);
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
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
    <div
      style={{
        width: "100%",
        maxHeight: "600px",
        overflowY: "auto",
        background: "#f9f9f9",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        boxSizing: "border-box"
      }}
    >
        {isPolling && (
          <div style={{ marginBottom: "1rem", color: "#f9a825", fontWeight: 500 }}>
            🟡 Live
          </div>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {comments.map((c) => {
            if (!c || !c.comment || typeof c.id !== "number") return null;
            const commentId = c.id;
            const reactions = typeof c.reactions === "string" ? JSON.parse(c.reactions) : c.reactions || {};
            // Highlight and ref logic
            if (!commentRefs.current[c.id]) {
              commentRefs.current[c.id] = React.createRef();
            }
            const commentRef = commentRefs.current[c.id];
            const isActive = c.id === activeCommentId;
            return (
              <li
                key={commentId}
                ref={commentRef}
                style={{
                  background: isActive ? "#e3f2fd" : "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  marginBottom: "0.75rem",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                {(mediaType === "videos" || mediaType === "voiceovers") && (
                  <strong style={{ display: "block", color: "#555", marginBottom: "0.25rem" }}>
                    {(() => {
                      const t = parseFloat(c.timestamp);
                      if (!isNaN(t)) {
                        const minutes = Math.floor(t / 60);
                        const seconds = Math.floor(t % 60).toString().padStart(2, '0');
                        return `${minutes}:${seconds}`;
                      }
                      return "0:00";
                    })()}
                  </strong>
                )}
                {mediaType === "storyboards" && c.page && parseInt(c.page) > 0 && (
                  <strong style={{ display: "block", color: "#555", marginBottom: "0.25rem" }}>
                    📄 Page {c.page}
                  </strong>
                )}
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
                  <div>
                    <div>
                      <div style={{ color: "#333", whiteSpace: "pre-wrap", marginBottom: "0.5rem" }}>
                        <div style={{ marginBottom: "0.25rem" }}>
                          {c.comment.split("\n\n--")[0]} <span style={{ color: "#888" }}>({c.user})</span>
                        </div>
                        {c.comment.includes("\n\n--") && (
                          <div style={{ fontSize: "0.9rem", color: "#444" }}>
                            {c.comment
                              .split("\n\n--")
                              .slice(1)
                              .map((part, i) => {
                                const [metaLine, ...textParts] = part.trim().split("\n");
                                return (
                                  <div key={i} style={{ marginTop: "0.5rem" }}>
                                    <div style={{ fontSize: "0.95rem" }}>
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
                              style={{
                                maxWidth: "100%",
                                maxHeight: "200px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button
                          style={{ ...buttonStyle, backgroundColor: "#4caf50" }}
                          onClick={() => {
                            setAddToId(commentId);
                            setAdditionalText("");
                          }}
                        >
                          Add
                        </button>
                        <button style={buttonStyle} onClick={() => startEditing(c)}>Edit</button>
                        <button style={deleteButtonStyle} onClick={() => deleteComment(c.id)}>Delete</button>
                        <button
                          style={{ ...buttonStyle, backgroundColor: "#ff9800" }}
                          onClick={() => {
                            setNotifyTargetComment(c);
                            setNotifyEmailInput("");
                            setIsNotifyModalOpen(true);
                          }}
                        >
                          @Notify
                        </button>
                        <div style={{ display: "flex", gap: "0.25rem", fontSize: "1.2rem" }}>
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

        {/* Notify Modal */}
        {isNotifyModalOpen && notifyTargetComment && (
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "1.5rem",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            width: "400px"
          }}>
            <h3 style={{ marginTop: 0 }}>Notify Teammates</h3>
            <p style={{ marginBottom: "0.5rem" }}>Comment:</p>
            <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
              {notifyTargetComment.comment}
            </p>
            <input
              type="text"
              placeholder="Enter email addresses, comma separated"
              value={notifyEmailInput}
              onChange={(e) => setNotifyEmailInput(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "0.95rem",
                marginBottom: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}
            />
            {/* Email suggestions dropdown */}
            {notifyEmailInput && (
              <div style={{
                backgroundColor: "#f1f1f1",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginTop: "-0.5rem",
                marginBottom: "0.75rem",
                padding: "0.25rem 0.5rem",
                fontSize: "0.9rem"
              }}>
                {TEAM_EMAILS.filter(e => e.includes(notifyEmailInput.toLowerCase())).map(email => (
                  <div
                    key={email}
                    style={{ padding: "0.25rem", cursor: "pointer" }}
                    onClick={() => setNotifyEmailInput(email)}
                  >
                    {email}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                style={cancelButtonStyle}
                onClick={() => {
                  setIsNotifyModalOpen(false);
                  setNotifyEmailInput("");
                  setNotifyTargetComment(null);
                }}
              >
                Cancel
              </button>
              <button
                style={buttonStyle}
                onClick={async () => {
                  const toList = notifyEmailInput.split(",").map(e => e.trim()).filter(Boolean);
                  if (!toList.length) return;
                  const asset_url = `${window.location.origin}/review/${videoId}`;
                  const username = localStorage.getItem("username");
                  await axios.post(`${BACKEND_URL}/notify_comment`, {
                    video_id: videoId,
                    page: notifyTargetComment.page,
                    comment_text: notifyTargetComment.comment,
                    reviewer: username,
                    to: toList,
                    asset_url
                  });
                  setToastMessage("✅ Comment notification sent.");
                  setTimeout(() => setToastMessage(""), 4000);
                  setIsNotifyModalOpen(false);
                  setNotifyEmailInput("");
                  setNotifyTargetComment(null);
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
        {/* Toast message */}
        {toastMessage && (
          <div style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            backgroundColor: "#333",
            color: "#fff",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 9999
          }}>
            {toastMessage}
          </div>
        )}
    </div>
  );
};

export default CommentList;