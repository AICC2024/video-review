import React, { useState } from "react";
import axios from "axios";

const SilasChatPanel = ({ fileUrl, mediaType, onClose, videoId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/silas/chat`, {
        message: input,
        file_url: fileUrl,
        media_type: mediaType,
        video_id: videoId
      });

      const silasMessage = { sender: "silas", text: res.data.response };
      setMessages((prev) => [...prev, silasMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "silas", text: "❌ Sorry, something went wrong." }
      ]);
      console.error("SILAS chat failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      width: "350px",
      height: "100vh",
      backgroundColor: "#f5f5f5",
      borderLeft: "1px solid #ccc",
      boxShadow: "-2px 0 6px rgba(0,0,0,0.1)",
      padding: "1rem",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>💬 Chat with SILAS</h3>
        <button onClick={onClose} style={{ fontSize: "1.25rem", border: "none", background: "none", cursor: "pointer" }}>×</button>
      </div>
      <div style={{
        flex: 1,
        overflowY: "auto",
        paddingRight: "0.5rem",
        maxHeight: "calc(100vh - 160px)"
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            marginBottom: "0.75rem",
            backgroundColor: msg.sender === "silas" ? "#e3f2fd" : "#fff",
            padding: "0.5rem",
            borderRadius: "4px",
            fontSize: "0.95rem"
          }}>
            <strong>{msg.sender === "silas" ? "SILAS" : "You"}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <div style={{
        flexShrink: 0,
        padding: "0.75rem 0 0.5rem 0",
        backgroundColor: "#f5f5f5",
        borderTop: "1px solid #ccc"
      }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px"
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SilasChatPanel;
