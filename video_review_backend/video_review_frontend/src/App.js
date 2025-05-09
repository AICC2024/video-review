import axios from "axios";

axios.defaults.baseURL = "https://video-review-backend.onrender.com";
import React, { useState, useEffect } from "react";
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from "./components/VideoPlayer";
import CommentForm from "./components/CommentForm";
import CommentList from "./components/CommentList";
import AuthForm from "./components/AuthForm";
import VideoUpload from "./components/VideoUpload";

function MainApp() {
  const { videoParamId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    return token ? { token, username } : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      setUser({ token, username });
    }
  }, []);

  const [videoId, setVideoId] = useState(() => localStorage.getItem("videoId") || videoParamId || null);
  const [videoFilename, setVideoFilename] = useState(() => localStorage.getItem("videoFilename") || (videoParamId ? `${videoParamId}.mp4` : null));
  const [showUpload, setShowUpload] = useState(false);
  const [prevVideoState, setPrevVideoState] = useState({ videoId: null, videoFilename: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (videoParamId) {
      setVideoId(videoParamId);
      setVideoFilename(`${videoParamId}.mp4`);
      localStorage.setItem("videoId", videoParamId);
      localStorage.setItem("videoFilename", `${videoParamId}.mp4`);
    }
  }, [videoParamId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  if (!user) {
    return <AuthForm onAuthSuccess={setUser} />;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/naveon-logo.png" alt="Naveon Logo" style={{ height: "40px" }} />
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "500" }}>Video Review™</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: "0.5rem 1rem", background: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Logout ({user.username})
        </button>
      </div>

      {!videoFilename ? (
        <VideoUpload onUploadSuccess={(filename) => {
          const baseName = filename.replace(/\.[^/.]+$/, "");

          // Clear previous state to force refresh
          setVideoId(null);
          setVideoFilename(null);
          setTimeout(() => {
            setVideoId(baseName);
            setVideoFilename(filename);
            localStorage.setItem("videoId", baseName);
            localStorage.setItem("videoFilename", filename);
            navigate(`/review/${baseName}`);
            setShowUpload(false);
          }, 0);
        }} />
      ) : (
        <div style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #ccc", borderRadius: "6px", background: "#f9f9f9" }}>
          🎞️ Reviewing: <strong>{videoFilename}</strong>{" "}
          {videoId && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setPrevVideoState({ videoId, videoFilename });
                  setShowUpload(true);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Change
              </button>

              <a
                href={`${process.env.REACT_APP_BACKEND_URL}/export/${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  borderRadius: "4px",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-block"
                }}
              >
                📄 Export Comments (.docx)
              </a>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Shareable Link:</label>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/review/${videoId}`}
                  style={{
                    width: "260px",
                    padding: "0.4rem",
                    fontSize: "0.9rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/review/${videoId}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  style={{
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Copy
                </button>
                {copied && <span style={{ color: "#4caf50", fontSize: "0.85rem" }}>Copied!</span>}
              </div>
            </div>
          )}
          {showUpload && (
            <div>
              <VideoUpload
                onUploadSuccess={(filename) => {
                  const baseName = filename.replace(/\.[^/.]+$/, "");

                  // Clear previous state to force refresh
                  setVideoId(null);
                  setVideoFilename(null);
                  setTimeout(() => {
                    setVideoId(baseName);
                    setVideoFilename(filename);
                    localStorage.setItem("videoId", baseName);
                    localStorage.setItem("videoFilename", filename);
                    navigate(`/review/${baseName}`);
                    setShowUpload(false);
                  }, 0);
                }}
              />
              <button
                onClick={() => {
                  setVideoId(prevVideoState.videoId);
                  setVideoFilename(prevVideoState.videoFilename);
                  setShowUpload(false);
                }}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.4rem 1rem",
                  fontSize: "0.9rem",
                  borderRadius: "4px",
                  border: "1px solid #aaa",
                  backgroundColor: "#aaa",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <VideoPlayer filename={videoFilename} key={videoFilename} />
      <CommentForm videoId={videoId} />
      <CommentList videoId={videoId} />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/review/:videoParamId" element={<MainApp />} />
    </Routes>
  );
}

export default App;
