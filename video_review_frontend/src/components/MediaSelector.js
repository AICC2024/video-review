

import React, { useState, useEffect } from "react";
import axios from "axios";

const MediaSelector = ({ onSelect }) => {
  const [category, setCategory] = useState("videos");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
      const res = await axios.get(`${backendUrl}/media?type=${category}`);
      setMediaFiles(res.data);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [category]);

  return (
    <div style={{ margin: "2rem auto", maxWidth: "600px" }}>
      <h2>Select a {category.slice(0, -1)}</h2>
      <div style={{ marginBottom: "1rem" }}>
        <label>Media Type: </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="videos">Videos</option>
          <option value="storyboards">Storyboards</option>
          <option value="voiceovers">Voiceovers</option>
        </select>
        <button onClick={fetchMedia} style={{ marginLeft: "1rem" }}>
          Refresh
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {mediaFiles.map((file) => (
            <li key={file.url} style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => onSelect(file.url)}
                style={{
                  background: "#1976d2",
                  color: "#fff",
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {file.filename}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MediaSelector;