import React, { useEffect, useState } from "react";
import mammoth from "mammoth";

const DocumentViewer = ({ url }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const extension = url.split(".").pop().toLowerCase();

  useEffect(() => {
    const fetchDocx = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load .docx file");
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(result.value);
      } catch (err) {
        setContent("⚠️ Failed to render .docx document.");
      } finally {
        setLoading(false);
      }
    };

    const fetchPlainText = async () => {
      try {
        const res = await fetch(url);
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text") && !contentType.includes("html")) {
          throw new Error("Unsupported content type for plain text viewer.");
        }
        const text = await res.text();
        setContent(text);
      } catch (err) {
        setContent("⚠️ Failed to load plain text document.");
      } finally {
        setLoading(false);
      }
    };

    if (extension === "docx") {
      fetchDocx();
    } else if (["txt", "md", "html"].includes(extension)) {
      fetchPlainText();
    } else {
      setContent("⚠️ Unsupported file type.");
      setLoading(false);
    }
  }, [url, extension]);

  if (loading) return <div>Loading document...</div>;

  return (
    <div style={{
      padding: "1rem",
      border: "1px solid #ccc",
      borderRadius: "6px",
      background: "#f9f9f9",
      whiteSpace: "pre-wrap",
      overflowY: "auto",
      maxHeight: "70vh"
    }}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default DocumentViewer;