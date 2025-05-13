import React from "react";

const VideoPlayer = ({ videoUrl }) => {
  if (!videoUrl) return null;
  console.log("📺 Loading video from:", videoUrl);

  let viewer;

  if (videoUrl.endsWith(".mp4")) {
    viewer = (
      <video
        id="review-video"
        key={videoUrl}
        controls
        style={{ width: "100%", maxWidth: "960px", height: "auto", display: "block", margin: "0 auto" }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
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

  return <div>{viewer}</div>;
};

export default VideoPlayer;
