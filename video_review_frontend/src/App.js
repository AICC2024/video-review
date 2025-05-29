import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from "./components/VideoPlayer";
import DocumentViewer from "./components/DocumentViewer";
import CommentForm from "./components/CommentForm";
import CommentList from "./components/CommentList";
import AuthForm from "./components/AuthForm";
import VideoUpload from "./components/VideoUpload";
import AdminUpload from "./components/AdminUpload";
import MediaSelector from "./components/MediaSelector";
import PdfRegionCommenter from "./components/PdfRegionCommenter";
import SilasChatPanel from "./components/SilasChatPanel";
import PreviousCommentsPanel from "./components/PreviousCommentsPanel";

function MainApp() {
  const { videoParamId } = useParams();
  const navigate = useNavigate();
  const [chatImage, setChatImage] = useState(null);
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    return token ? { token, username } : null;
  });
  // --- Video ref and current time state for syncing comments to video ---
  // Transcript state for real-time narration display
  const [transcript, setTranscript] = useState([]);
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Comments state for current video
  const [comments, setComments] = useState([]);

  // Track whether mediaType has been initialized based on videoParamId
  const [mediaTypeInitialized, setMediaTypeInitialized] = useState(false);
  // Prevent [mediaType] useEffect from executing too early and overriding the selected asset
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      setUser({ token, username });
    }
  }, []);

  // Listen for messages from the embedded PDF viewer (PDF_COMMENT_SNAPSHOT)
  const [pdfSnapshot, setPdfSnapshot] = useState(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(null);

  useEffect(() => {
    function handlePdfSnapshot(event) {
      if (
        typeof event.data === "object" &&
        event.data.type === "PDF_COMMENT_SNAPSHOT"
      ) {
        const { page, image } = event.data;
        console.log("📥 Received snapshot from PDF viewer:", { page, image });
        // Future: pre-fill the comment form here
        setPdfSnapshot({ page, image });
      }
      if (event.data.type === "PDF_PAGE_SYNC") {
        // console.log("📥 Received PDF_PAGE_SYNC:", event.data);
        setPdfCurrentPage(event.data.page);
        // Capture total page count if provided
        if (event.data.totalPages) {
          setSilasTotalPages(event.data.totalPages);
        }
      }
    }

    window.addEventListener("message", handlePdfSnapshot);
    return () => {
      window.removeEventListener("message", handlePdfSnapshot);
    };
  }, []);

  // Listen for URL hash changes and post JUMP_TO_PAGE to PDF viewer
  useEffect(() => {
    const handleHashJump = () => {
      const match = window.location.hash.match(/^#slide-(\d+)$/);
      if (match) {
        const page = parseInt(match[1], 10);
        const iframe = document.querySelector("iframe");
        if (iframe) {
          iframe.contentWindow.postMessage({ type: "JUMP_TO_PAGE", page }, "*");
        }
      }
    };

    window.addEventListener("hashchange", handleHashJump);
    handleHashJump(); // catch initial hash

    return () => {
      window.removeEventListener("hashchange", handleHashJump);
    };
  }, []);

  const [videoId, setVideoId] = useState(() => localStorage.getItem("videoId") || videoParamId || null);
  const [videoUrl, setVideoUrl] = useState(() => localStorage.getItem("videoUrl") || null);
  const [showUpload, setShowUpload] = useState(false);
  const [prevVideoState, setPrevVideoState] = useState({ videoId: null, videoUrl: null });
  const [copied, setCopied] = useState(false);

  const [mediaType, setMediaType] = useState(() => localStorage.getItem("mediaType") || "videos");
  const [selectedAsset, setSelectedAsset] = useState(videoUrl || "");
  const [mediaOptions, setMediaOptions] = useState([]);

  const [silasReviewing, setSilasReviewing] = useState(false);
  const [silasProgressPage, setSilasProgressPage] = useState(null);
  const [silasTotalPages, setSilasTotalPages] = useState(null);
  const [showSilasChat, setShowSilasChat] = useState(false);

  const [showPreviousComments, setShowPreviousComments] = useState(false);
  const [previousVideoId, setPreviousVideoId] = useState("");
  const [previousVideoIds, setPreviousVideoIds] = useState([]);

  // Toast message state for SILAS review result
  const [toastMessage, setToastMessage] = useState("");

  // Notify Team Modal state
  const [isTeamNotifyModalOpen, setIsTeamNotifyModalOpen] = useState(false);
  const [teamNotifyMessage, setTeamNotifyMessage] = useState("I’ve completed my review.");
  // Team emails for checkboxes
  const TEAM_EMAILS = [
    "matthew@naveonguides.com",
    "paul@naveonguides.com",
    "ryan@naveonguides.com",
    "mark@naveonguides.com"
  ];
  const [notifyEmailInput, setNotifyEmailInput] = useState([]);
  const [notifyExtraEmails, setNotifyExtraEmails] = useState("");

  // --- PDF/storyboard route initialization logic ---
  // Ensure PDF/storyboard route is respected on initial URL load
  useEffect(() => {
    if (!videoParamId || selectedAsset) return;

    const inferTypeFromId = (id) => {
      const storyboardExtensions = [".pdf", ".html", ".md"];
      const documentExtensions = [".docx", ".doc", ".txt"];
      if (
        id.toLowerCase().includes("storyboard") ||
        storyboardExtensions.some(ext => id.toLowerCase().endsWith(ext))
      ) {
        return "storyboards";
      } else if (documentExtensions.some(ext => id.toLowerCase().endsWith(ext))) {
        return "documents";
      } else if (id.toLowerCase().includes("voice") || id.toLowerCase().endsWith(".mp3")) {
        return "voiceovers";
      } else {
        return "videos";
      }
    };

    const inferredType = inferTypeFromId(videoParamId);
    setMediaType(inferredType);
    localStorage.setItem("mediaType", inferredType);

    // S3 prefix logic for guessed URL
    const prefix = inferredType === "storyboards"
      ? "https://naveon-video-storage.s3.amazonaws.com/storyboards/"
      : inferredType === "voiceovers"
      ? "https://naveon-video-storage.s3.amazonaws.com/voiceovers/"
      : inferredType === "documents"
      ? "https://naveon-video-storage.s3.amazonaws.com/documents/"
      : "https://naveon-video-storage.s3.amazonaws.com/videos/";
    const guessedUrl = `${prefix}${videoParamId}`;
    setSelectedAsset(guessedUrl);
    setVideoUrl(guessedUrl);
  }, []);

  // Fetch unique video_ids for previous review selection
  useEffect(() => {
    const fetchPreviousVideoIds = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/comments/unique_video_ids`);
        // Expecting an array of video ids
        setPreviousVideoIds(res.data);
      } catch (error) {
        console.error("Failed to fetch previous video ids:", error);
      }
    };
    fetchPreviousVideoIds();
  }, [videoId]);

  // Fetch comments for current videoId
  useEffect(() => {
    if (!videoId) return;
    const fetchComments = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/comments/${videoId}`);
        setComments(res.data);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      }
    };
    fetchComments();
  }, [videoId]);

  useEffect(() => {
    if (!initialLoadComplete && videoParamId) return;

    const fetchMedia = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/media?type=${mediaType}`);
        const files = res.data.map((file) => file.url);
        setMediaOptions(files);
        if (files.length > 0) {
          const match = videoParamId
            ? files.find(f => f.includes(videoParamId))
            : null;
          if (match) {
            setSelectedAsset(match);
          } else {
            setSelectedAsset(files[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch media:", error);
      }
    };

    fetchMedia();
  }, [mediaType, initialLoadComplete]);

  useEffect(() => {
    if (videoParamId) {
      setVideoId(videoParamId);

      if (!mediaTypeInitialized) {
        let inferredType = "videos";
        const storyboardExtensions = [".pdf", ".html", ".md"];
        const documentExtensions = [".docx", ".doc", ".txt"];
        if (
          videoParamId.toLowerCase().includes("storyboard") ||
          storyboardExtensions.some(ext => videoParamId.toLowerCase().endsWith(ext))
        ) {
          inferredType = "storyboards";
        } else if (documentExtensions.some(ext => videoParamId.toLowerCase().endsWith(ext))) {
          inferredType = "documents";
        } else if (
          videoParamId.toLowerCase().includes("voice") ||
          videoParamId.toLowerCase().endsWith(".mp3")
        ) {
          inferredType = "voiceovers";
        }

        if (mediaType !== inferredType) {
          setMediaType(inferredType);
        }

        localStorage.setItem("mediaType", inferredType);
        setMediaTypeInitialized(true);
        setInitialLoadComplete(true);
      }

      const storedUrl = localStorage.getItem("videoUrl");
      if (storedUrl && storedUrl.includes(videoParamId)) {
        setVideoUrl(storedUrl);
        setSelectedAsset(storedUrl);
      } else {
        setVideoUrl(null);
        setSelectedAsset("");
      }
      localStorage.setItem("videoId", videoParamId);
    }
  }, [videoParamId]);

useEffect(() => {
  if (selectedAsset) {
    const baseName = selectedAsset.split("/").pop().replace(/\.[^/.]+$/, "");
    setVideoId(baseName);
    setVideoUrl(selectedAsset);
    localStorage.setItem("videoId", baseName);
    localStorage.setItem("videoUrl", selectedAsset);

    if (videoParamId !== baseName) {
      navigate(`/review/${baseName}`);
    }

    // Sync mediaType based on selected asset extension
    const ext = selectedAsset.toLowerCase();
    const storyboardExts = [".pdf", ".html", ".md"];
    const documentExts = [".docx", ".doc", ".txt"];
    if (storyboardExts.some(e => ext.endsWith(e)) && mediaType !== "storyboards") {
      setMediaType("storyboards");
    } else if (documentExts.some(e => ext.endsWith(e)) && mediaType !== "documents") {
      setMediaType("documents");
    } else if (ext.endsWith(".mp3") && mediaType !== "voiceovers") {
      setMediaType("voiceovers");
    } else if (ext.endsWith(".mp4") && mediaType !== "videos") {
      setMediaType("videos");
    }
  }
}, [selectedAsset, navigate, videoParamId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  if (!user) {
    return <AuthForm onAuthSuccess={setUser} />;
  }

  // Handle SILAS review button click (supports PDF and video)
  const handleSilasReview = async () => {
    if (silasReviewing) return; // Prevent duplicate clicks
    setSilasReviewing(true);

    let lastCommentCount = 0;
    let unchangedCount = 0;

    const pollInterval = setInterval(() => {
      const event = new CustomEvent("comments-updated", {
        detail: {
          callback: (commentCount) => {
            if (commentCount === lastCommentCount) {
              unchangedCount += 1;
            } else {
              unchangedCount = 0;
              lastCommentCount = commentCount;
            }
            if (unchangedCount >= 5) {
              clearInterval(pollInterval);
              console.log("🛑 Stopped polling after 15 seconds of no changes");
            }
          }
        }
      });
      window.dispatchEvent(event);
    }, 3000);

    let endpoint = "/silas/review_video_async";
    if (selectedAsset.endsWith(".pdf")) {
      endpoint = "/silas/review_async";
    } else if (selectedAsset.endsWith(".docx")) {
      endpoint = "/silas/review";
    }

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
        file_url: selectedAsset,
        media_type: mediaType,
        video_id: videoId
      });
      setToastMessage("✅ SILAS review started. Comments will appear as they are added.");
      setTimeout(() => setToastMessage(""), 5000);
    } catch (err) {
      setToastMessage("❌ SILAS review failed.");
      setTimeout(() => setToastMessage(""), 5000);
      console.error(err);
    } finally {
      setTimeout(() => {
        setSilasReviewing(false);
        setSilasProgressPage(null);
        setSilasTotalPages(null);
      }, 16000);
    }
  };
  // Fetch transcript for current videoId
  useEffect(() => {
    if (!videoId) return;
    const fetchTranscript = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/transcript_on_demand/${videoId}`);
        setTranscript(res.data);
      } catch (error) {
        console.error("Failed to fetch transcript:", error);
      }
    };
    fetchTranscript();
  }, [videoId]);

  return (
    <div style={{ paddingRight: showSilasChat || showPreviousComments ? "360px" : "0", transition: "padding-right 0.2s ease" }}>
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

      {!videoUrl ? (
        <VideoUpload onUploadSuccess={(filename) => {
          const isUrl = filename.startsWith("http");
          const baseName = isUrl
            ? filename.split("/").pop().replace(/\.[^/.]+$/, "")
            : filename.replace(/\.[^/.]+$/, "");

          // Clear previous state to force refresh
          setVideoId(null);
          setVideoUrl(null);
          setTimeout(() => {
            setVideoId(baseName);
            setVideoUrl(filename);
            setSelectedAsset(filename);
            localStorage.setItem("videoId", baseName);
            localStorage.setItem("videoUrl", filename);
            navigate(`/review/${baseName}`);
            setShowUpload(false);
          }, 0);
        }} />
      ) : (
        <div style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #ccc", borderRadius: "6px", background: "#f9f9f9" }}>
          🎞️ Reviewing: <strong>{videoUrl}</strong>{" "}
          {videoId && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem", marginTop: "1rem", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Media Type:</label><br />
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    style={{ padding: "0.4rem", fontSize: "0.9rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  >
                    <option value="videos">Videos</option>
                    <option value="storyboards">Storyboards</option>
                    <option value="voiceovers">Voiceovers</option>
                    <option value="documents">Documents</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Select Asset:</label><br />
                  <select
                    value={selectedAsset}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setSelectedAsset(selected);
                    }}
                    style={{ padding: "0.4rem", fontSize: "0.9rem", borderRadius: "4px", border: "1px solid #ccc", width: "260px" }}
                  >
                    {mediaOptions.map((url) => (
                      <option key={url} value={url}>
                        {url.split("/").pop()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
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

              <button
                onClick={handleSilasReview}
                disabled={silasReviewing}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  borderRadius: "4px",
                  backgroundColor: silasReviewing ? "#aaa" : "#512da8",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  opacity: silasReviewing ? 0.6 : 1
                }}
              >
                {silasReviewing ? "Reviewing..." : "🧠 SILAS Review"}
              </button>
              {silasReviewing && (
                <div style={{ color: "#512da8", fontWeight: 500, marginTop: "0.25rem", fontSize: "0.95rem" }}>
                  SILAS is processing your review...
                </div>
              )}

              <button
                onClick={() => setShowSilasChat(prev => !prev)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  borderRadius: "4px",
                  backgroundColor: "#0288d1",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                💬 Chat with SILAS
              </button>

              <button
                onClick={() => setIsTeamNotifyModalOpen(true)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  borderRadius: "4px",
                  backgroundColor: "#43a047",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                📣 Notify Team
              </button>


              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <label htmlFor="previousVersion">Previous Review:</label>
                <select
                  id="previousVersion"
                  value={previousVideoId}
                  onChange={(e) => setPreviousVideoId(e.target.value)}
                  style={{ padding: "0.4rem", border: "1px solid #ccc", borderRadius: "4px", minWidth: "180px" }}
                >
                  <option value="">Select previous review...</option>
                  {previousVideoIds.map((vid) => (
                    <option key={vid} value={vid}>
                      {vid}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowPreviousComments((prev) => !prev)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.95rem",
                    borderRadius: "4px",
                    backgroundColor: "#6d4c41",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer"
                  }}
                  disabled={!previousVideoId}
                >
                  🗂 View Previous Comments
                </button>
              </div>
            </div>
          )}
          {showUpload && (
            <div>
              <VideoUpload
                onUploadSuccess={(filename) => {
                  const isUrl = filename.startsWith("http");
                  const baseName = isUrl
                    ? filename.split("/").pop().replace(/\.[^/.]+$/, "")
                    : filename.replace(/\.[^/.]+$/, "");

                  // Clear previous state to force refresh
                  setVideoId(null);
                  setVideoUrl(null);
                  setTimeout(() => {
                    setVideoId(baseName);
                    setVideoUrl(filename);
                    setSelectedAsset(filename);
                    localStorage.setItem("videoId", baseName);
                    localStorage.setItem("videoUrl", filename);
                    navigate(`/review/${baseName}`);
                    setShowUpload(false);
                  }, 0);
                }}
              />
              <button
                onClick={() => {
                  setVideoId(prevVideoState.videoId);
                  setVideoUrl(prevVideoState.videoUrl);
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

      {mediaType === "storyboards" ? (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ flex: 3 }}>
              <PdfRegionCommenter url={videoUrl} key={videoUrl} />
            </div>
            <div style={{
              flex: 1,
              alignSelf: "stretch",
              overflowY: "auto",
              padding: "1rem",
              background: "#f9f9f9",
              border: "1px solid #ddd",
              borderRadius: "6px",
              minWidth: "300px",
              display: "flex",
              flexDirection: "column"
            }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem", fontWeight: "600", color: "#333" }}>
                Current Comments
              </h2>
              <CommentList videoId={videoId} currentPage={pdfCurrentPage} mediaType={mediaType} />
            </div>
          </div>
          <CommentForm videoId={videoId} snapshot={pdfSnapshot} page={pdfCurrentPage} />
        </>
      ) : (
        mediaType === "documents" ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 3 }}>
                <DocumentViewer url={videoUrl} />
              </div>
              <div style={{
                flex: 1,
                alignSelf: "stretch",
                overflowY: "auto",
                padding: "1rem",
                background: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "6px",
                minWidth: "300px",
                display: "flex",
                flexDirection: "column"
              }}>
                <h2 style={{ marginTop: 0, fontSize: "1.2rem", fontWeight: "600", color: "#333" }}>
                  Current Comments
                </h2>
                <CommentList videoId={videoId} />
              </div>
            </div>
            <CommentForm videoId={videoId} />
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 3 }}>
                <VideoPlayer
                  ref={videoRef}
                  videoUrl={videoUrl}
                  key={videoUrl}
                  comments={comments}
                  onTimeUpdate={setCurrentTime}
                  transcript={transcript}
                />
              </div>
              <div style={{
                flex: 1,
                alignSelf: "stretch",
                overflowY: "auto",
                padding: "1rem",
                background: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "6px",
                minWidth: "300px",
                display: "flex",
                flexDirection: "column"
              }}>
                <h2 style={{ marginTop: 0, fontSize: "1.2rem", fontWeight: "600", color: "#333" }}>
                  Current Comments
                </h2>
                <CommentList videoId={videoId} currentTime={currentTime} mediaType={mediaType} />
              </div>
            </div>
            <CommentForm videoId={videoId} snapshot={pdfSnapshot} page={pdfCurrentPage} />
          </>
        )
      )}
        {showSilasChat && (
          <SilasChatPanel
            fileUrl={selectedAsset}
            mediaType={mediaType}
            videoId={videoId}
            onClose={() => setShowSilasChat(false)}
            chatImage={chatImage}
          />
        )}
        {showPreviousComments && previousVideoId && (
          <PreviousCommentsPanel
            previousVideoId={previousVideoId}
            onClose={() => setShowPreviousComments(false)}
          />
        )}
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
        {isTeamNotifyModalOpen && (
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
            <h3 style={{ marginTop: 0 }}>Notify Team</h3>
            <p style={{ marginBottom: "0.25rem" }}>Select Recipients:</p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={notifyEmailInput.length === TEAM_EMAILS.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNotifyEmailInput([...TEAM_EMAILS]);
                    } else {
                      setNotifyEmailInput([]);
                    }
                  }}
                />{" "}
                Select All
              </label>
              {TEAM_EMAILS.map(email => (
                <label key={email} style={{ display: "block", marginBottom: "0.25rem" }}>
                  <input
                    type="checkbox"
                    checked={notifyEmailInput.includes(email)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNotifyEmailInput(prev => [...prev, email]);
                      } else {
                        setNotifyEmailInput(prev => prev.filter(addr => addr !== email));
                      }
                    }}
                  />{" "}
                  {email}
                </label>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add additional email(s), comma separated"
              value={notifyExtraEmails}
              onChange={(e) => setNotifyExtraEmails(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "0.95rem",
                marginBottom: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}
            />
            <textarea
              value={teamNotifyMessage}
              onChange={(e) => setTeamNotifyMessage(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "0.95rem",
                marginBottom: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                style={{
                  backgroundColor: "#aaa",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.4rem 1rem",
                  cursor: "pointer"
                }}
                onClick={() => setIsTeamNotifyModalOpen(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  backgroundColor: "#43a047",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.4rem 1rem",
                  cursor: "pointer"
                }}
                onClick={async () => {
                  try {
                    const extraList = notifyExtraEmails.split(",").map(e => e.trim()).filter(Boolean);
                    const toList = [...notifyEmailInput, ...extraList];
                    if (!toList.length) return;
                    // Ensure the message field is sent to backend
                    await axios.post(`${process.env.REACT_APP_BACKEND_URL}/notify_team`, {
                      video_id: videoId,
                      reviewer: user?.username || "Reviewer",
                      asset_url: `${window.location.origin}/review/${videoId}`,
                      message: teamNotifyMessage,
                      to: toList
                    });
                    setToastMessage("📣 Team notified successfully.");
                  } catch (error) {
                    console.error("Failed to notify team:", error);
                    setToastMessage("❌ Failed to notify team.");
                  } finally {
                    setTimeout(() => setToastMessage(""), 5000);
                    setIsTeamNotifyModalOpen(false);
                    setNotifyExtraEmails("");
                    setNotifyEmailInput([]);
                  }
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/review/:videoParamId" element={<MainApp />} />
      <Route path="/admin-upload" element={<AdminUpload />} />
      <Route
        path="/test-pdf"
        element={
          <div style={{ padding: "2rem" }}>
            <PdfRegionCommenter url="https://naveon-video-storage.s3.amazonaws.com/storyboards/Naveon-storyboard.pdf" />
          </div>
        }
      />
    </Routes>
  );
}

export default App;