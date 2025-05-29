import React, { useEffect, useRef, useState } from "react";

const VideoPlayer = ({ videoUrl, comments = [], onTimeUpdate, transcript = [] }) => {
  const [activeComment, setActiveComment] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [hoveredCommentGroup, setHoveredCommentGroup] = useState([]);
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeTranscript, setActiveTranscript] = useState("");
  const videoRef = useRef(null);

  let relevantComments = comments;
  if (filterType === "silas") {
    relevantComments = comments.filter(c => c.user && c.user.toLowerCase().includes("silas"));
  } else if (filterType === "human") {
    relevantComments = comments.filter(c => !c.user || !c.user.toLowerCase().includes("silas"));
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = Math.floor(video.currentTime);
      const match = relevantComments.find(c => Math.abs(Number(c.timestamp) - current) <= 1);
      setActiveComment(match || null);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [comments, filterType]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = videoRef.current?.currentTime || 0;
      const match = transcript.find(line =>
        current >= line.start && current <= line.end
      );
      setActiveTranscript(match?.text || "");
    }, 200);
    return () => clearInterval(interval);
  }, [transcript]);

  if (!videoUrl) return null;
  console.log("📺 Loading video from:", videoUrl);

  let viewer;

  if (videoUrl.endsWith(".mp4")) {
    viewer = (
      <>
        <div style={{ textAlign: "right", marginBottom: "8px", maxWidth: "960px", margin: "0 auto" }}>
          <label style={{ fontSize: "0.85rem", marginRight: "0.5rem" }}>Filter:</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ fontSize: "0.85rem", padding: "0.2rem" }}
          >
            <option value="all">All Comments</option>
            <option value="silas">SILAS Only</option>
            <option value="human">Human Reviewers Only</option>
          </select>
        </div>
        <div
          style={{ position: "relative", width: "100%", maxWidth: "960px", margin: "0 auto" }}
          onMouseEnter={() => setShowMarkers(true)}
          onMouseLeave={() => setShowMarkers(false)}
        >
          <div style={{
            position: "absolute",
            top: "8px",
            right: "12px",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.85rem",
            zIndex: 5
          }}>
            {(() => {
              const secs = Math.floor(videoRef.current?.currentTime || 0);
              const minutes = Math.floor(secs / 60);
              const seconds = secs % 60;
              return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
            })()}
          </div>
          <video
            id="review-video"
            ref={videoRef}
            key={videoUrl}
            controls
            style={{ width: "100%", height: "auto", display: "block" }}
            onTimeUpdate={(e) => {
              if (onTimeUpdate) onTimeUpdate(e.target.currentTime);
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {showMarkers && (
            <div style={{ position: "absolute", bottom: "28px", width: "100%", height: "20px", pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {relevantComments.map((c, index) => {
                  const percent = videoRef.current && videoRef.current.duration ? (Number(c.timestamp) / videoRef.current.duration) * 100 : 0;
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = Number(c.timestamp);
                      }}
                      onMouseEnter={() => {
                        const time = Number(c.timestamp);
                        const matches = relevantComments.filter(x => Math.abs(Number(x.timestamp) - time) <= 1);
                        setHoveredCommentGroup(matches.map(m => ({ ...m, _x: percent })));
                      }}
                      onMouseLeave={() => setHoveredCommentGroup([])}
                      style={{
                        position: "absolute",
                        left: `${percent}%`,
                        transform: "translateX(-50%) translateY(-6px)",
                        pointerEvents: "auto",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        lineHeight: "1",
                        transition: "transform 0.2s ease-in-out"
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = "translateX(-50%) translateY(-10px) scale(1.15)"; }}
                      onMouseOut={e => { e.currentTarget.style.transform = "translateX(-50%) translateY(-6px)"; }}
                    >
                      {(() => {
                        const time = Number(c.timestamp);
                        const count = relevantComments.filter(x => Math.abs(Number(x.timestamp) - time) <= 1).length;
                        const iconColor =
                          count > 3 ? "#8e44ad" :  // purple
                          count > 1 ? "#ff9800" :   // orange
                          "#bbb";                  // light gray
                        return (
                          <span style={{ color: iconColor }}>
                            💬
                          </span>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {showMarkers && hoveredCommentGroup.length > 0 && (
            <div style={{
              position: "absolute",
              bottom: "50px",
              left: hoveredCommentGroup[0]._x < 5 ? "5%" : `${hoveredCommentGroup[0]._x}%`,
              transform: "translateX(-50%) translateY(-10px)",
              background: "rgba(255,255,255,0.95)",
              color: "#000",
              padding: "10px 12px",
              borderRadius: "10px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              fontSize: "0.85rem",
              maxWidth: "320px",
              zIndex: 20,
              opacity: 1,
              transition: "opacity 0.3s ease-in-out"
            }}>
              {hoveredCommentGroup.map((c, i) => (
                <div key={i} style={{ marginBottom: "8px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                    {c.user || "Reviewer"} @ {c.timestamp}s
                  </div>
                  <div>{c.comment}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  } else if (videoUrl.endsWith(".mp3") || videoUrl.endsWith(".wav")) {
    viewer = (
      <audio
        key={videoUrl}
        controls
        style={{ width: "100%", maxWidth: "960px", display: "block", margin: "0 auto" }}
      >
        <source src={videoUrl} />
        Your browser does not support the audio tag.
      </audio>
    );
  } else if (videoUrl.endsWith(".pdf")) {
    viewer = (
      <iframe
        src={videoUrl}
        title="PDF viewer"
        width="100%"
        height="600px"
        style={{ display: "block", margin: "0 auto", border: "1px solid #ccc" }}
      />
    );
  } else {
    viewer = <p style={{ textAlign: "center", marginTop: "2rem" }}>Unsupported file type.</p>;
  }

  return (
    <div>
      {viewer}
      {activeTranscript && (
        <div style={{
          marginTop: "10px",
          fontSize: "1rem",
          fontStyle: "italic",
          color: "#444",
          textAlign: "center"
        }}>
          {activeTranscript}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
