import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState("videos");
  const [uploadStatus, setUploadStatus] = useState("");
  const [fileList, setFileList] = useState([]);

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
      // Optionally refresh file list after upload
      setFileList(prev => prev.concat(selectedFile.name));
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStatus("❌ Upload failed. Check console for details.");
    }
  };

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/admin/list?category=${category}`);
        setFileList(res.data);
      } catch (err) {
        console.error("Failed to fetch file list:", err);
      }
    };
    fetchFiles();
  }, [category]);

  const handleArchive = async (filename) => {
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/admin/archive`, {
        category,
        filename
      });
      setFileList(prev => prev.filter(f => f !== filename));
      setUploadStatus(`✅ Archived: ${filename}`);
    } catch (err) {
      console.error("Failed to archive:", err);
      setUploadStatus("❌ Failed to archive. Check console.");
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
      <div style={{ marginTop: "2rem" }}>
        <h3>Existing {category}</h3>
        <ul>
          {fileList.map((filename) => (
            <li key={filename} style={{ marginBottom: "0.5rem" }}>
              {filename}{" "}
              <button onClick={() => handleArchive(filename)} style={{ marginLeft: "1rem", color: "red" }}>
                Archive
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminUpload;