

import React, { useState } from "react";
import axios from "axios";

const AdminUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState("videos");
  const [uploadStatus, setUploadStatus] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !category) {
      setUploadStatus("Please select a file and a category.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
      const res = await axios.post(`${backendUrl}/admin/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadStatus(`✅ Upload successful: ${res.data.url}`);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStatus("❌ Upload failed. Check console for details.");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "2rem", border: "1px solid #ccc", borderRadius: "6px", background: "#fafafa" }}>
      <h2>Admin Upload</h2>
      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Asset Type:</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginLeft: "0.5rem" }}>
            <option value="videos">Video</option>
            <option value="storyboards">Storyboard</option>
            <option value="voiceovers">Voiceover</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
        </div>

        <button type="submit">Upload to S3</button>
      </form>
      {uploadStatus && <p style={{ marginTop: "1rem" }}>{uploadStatus}</p>}
    </div>
  );
};

export default AdminUpload;