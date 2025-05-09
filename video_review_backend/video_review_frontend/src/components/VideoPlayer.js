import React from "react";

const VideoPlayer = ({ filename }) => {
  if (!filename) return null;

  return (
    <div>
      <video
        id="review-video"
        controls
        style={{ width: "100%", maxWidth: "960px", height: "auto", display: "block", margin: "0 auto" }}
      >
        <source src={`${process.env.REACT_APP_BACKEND_URL}/uploads/${filename}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
