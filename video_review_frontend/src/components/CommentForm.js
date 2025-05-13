import React, { useState, useEffect } from "react";
import axios from "axios";

// Helper to detect mobile browsers
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

const CommentForm = ({ videoId, snapshot, page }) => {
  const [comment, setComment] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [pausedTime, setPausedTime] = useState("0.00");
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const video = document.getElementById("review-video");
    if (video) {
      const handlePause = () => {
        setPausedTime(Math.floor(video.currentTime).toString().padStart(2, "0"));
      };
      video.addEventListener("pause", handlePause);
      return () => video.removeEventListener("pause", handlePause);
    }
  }, []);

  const handleSubmit = async () => {
    const video = document.getElementById("review-video");
    let timestamp = "00";
    if (video && !isNaN(video.currentTime) && video.readyState >= 2) {
      timestamp = Math.floor(video.currentTime).toString().padStart(2, "0");
    } else {
      console.warn("Video not ready. Falling back to 00.");
    }

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${backendUrl}/comments`,
        {
          video_id: videoId,
          timestamp,
          comment,
          image: snapshot?.image || null,
          page: page || null
        },
        {
          headers: {
            Authorization: token
          }
        }
      );

      setComment("");

      // Dispatch a custom event to notify comment list to refresh
      window.dispatchEvent(new Event("comments-updated"));
    } catch (err) {
      console.error("Failed to submit comment:", err);
    }
  };

  // Web Speech API voice input (desktop only)
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    setIsRecording(true);

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      if (event.results[event.results.length - 1].isFinal) {
        setComment((prev) => (prev + " " + transcript).trim());
        setLiveTranscript("");
      } else {
        setLiveTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  return (
    <div
      style={{
        background: "#f9f9f9",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        marginBottom: "1rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
        <textarea
          value={comment + (isRecording ? " " + liveTranscript : "")}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter your comment..."
          rows="4"
          cols="60"
          style={{
            borderRadius: "6px",
            border: "1px solid #ccc",
            padding: "0.5rem",
            fontSize: "1rem",
            resize: "vertical",
            minHeight: "60px"
          }}
        />
        {snapshot?.image && (
          <div style={{ marginTop: "0.5rem" }}>
            <img
              src={snapshot.image}
              alt={`Screenshot for page ${snapshot.page}`}
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}
            />
          </div>
        )}
        {!isMobile && (
          <button
            onClick={startVoiceInput}
            style={{
              width: "44px",
              height: "44px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            aria-label="Speak"
            title="Speak"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill={isRecording ? "#e53935" : "#333"} viewBox="0 0 24 24">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm4.3-3c0 2.53-1.84 4.43-4.3 4.9V21h3v2h-8v-2h3v-4.1c-2.46-.47-4.3-2.37-4.3-4.9H4c0 3.53 2.61 6.43 6 6.92V21h4v-2.08c3.39-.49 6-3.39 6-6.92h-2.7z"/>
            </svg>
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!videoId}
          style={{
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "0.4rem 0.75rem",
            fontSize: "0.95rem",
            cursor: "pointer"
          }}
        >
          Add Comment
        </button>
      </div>
    </div>
  );
};

export default CommentForm;
