import React from "react";

const VideoPlayer = ({ videoUrl }) => {
  if (!videoUrl) return null;
  console.log("📺 Loading video from:", videoUrl);

  return (
    <div>
      <video
        id="review-video"
        key={videoUrl}
        controls
        style={{ width: "100%", maxWidth: "960px", height: "auto", display: "block", margin: "0 auto" }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
