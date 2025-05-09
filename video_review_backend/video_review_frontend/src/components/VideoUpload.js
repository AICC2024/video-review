import React, { useState } from "react";
import axios from "axios";

const VideoUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadStatus("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      const filename = res.data.filename;
      setUploadStatus("Upload successful! Waiting for video to be ready...");

      // Poll until the video is accessible
      const pollForReadiness = async (retries = 10) => {
        for (let i = 0; i < retries; i++) {
          try {
            await axios.head(`${process.env.REACT_APP_BACKEND_URL}/uploads/${filename}`);
            setSelectedFile(null);
            onUploadSuccess(filename);
            setIsUploading(false);
            return;
          } catch {
            await new Promise(res => setTimeout(res, 1500));
          }
        }
        setUploadStatus("Upload saved, but video not ready. Try refreshing.");
        setIsUploading(false);
      };

      pollForReadiness();

    } catch (err) {
      setUploadStatus("Upload failed.");
      setIsUploading(false);
      console.error("Upload error:", err);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        maxWidth: "600px",
        backgroundColor: "#fafafa"
      }}>
        <h3 style={{ marginBottom: "1rem" }}>Select a video to review</h3>

        <label htmlFor="video-file" style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: "500"
        }}>
          Choose a video file:
        </label>

        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          style={{
            marginBottom: "1rem",
            padding: "0.4rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            width: "100%"
          }}
        />

        {selectedFile && (
          <div style={{ marginBottom: "1rem", fontStyle: "italic" }}>
            Selected: {selectedFile.name}
          </div>
        )}

        {isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "1rem" }}>
            <div className="spinner" style={{
              border: "4px solid rgba(0,0,0,0.1)",
              borderTop: "4px solid #1976d2",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ marginTop: "0.5rem", fontWeight: 600 }}>Uploading video...</p>
          </div>
        ) : (
          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            style={{
              backgroundColor: selectedFile ? "#1976d2" : "#aaa",
              color: "#fff",
              border: "none",
              padding: "0.6rem 1.5rem",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: selectedFile ? "pointer" : "not-allowed",
              display: "block",
              margin: "0 auto"
            }}
          >
            Upload Video
          </button>
        )}

        {uploadStatus && <p style={{ marginTop: "1rem", fontWeight: 600 }}>{uploadStatus}</p>}
      </div>
    </>
  );
};

export default VideoUpload;