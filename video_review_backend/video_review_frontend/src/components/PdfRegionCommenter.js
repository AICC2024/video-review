import React from "react";

const PdfRegionCommenter = ({ url }) => {
  return (
    <div style={{ flexGrow: 1 }}>
      <iframe
        src={`/pdf-viewer/viewer.html?file=${encodeURIComponent(url)}`}
        title="PDF Viewer"
        style={{ width: "100%", height: "650px", border: "none" }}
      />
    </div>
  );
};

export default PdfRegionCommenter;