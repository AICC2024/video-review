import React, { useRef, useEffect } from "react";

const PdfRegionCommenter = ({ url }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "PDF_PAGE_SYNC") {
        window.parent.postMessage(event.data, "*");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ flexGrow: 1 }}>
      <iframe
        ref={iframeRef}
        src={`/pdf-viewer/viewer.html?file=${encodeURIComponent(url)}`}
        title="PDF Viewer"
        style={{ width: "100%", height: "650px", border: "none" }}
      />
    </div>
  );
};

export default PdfRegionCommenter;