import React, { useState, useEffect } from "react";
import { 
  X, FileText, History, Save, Trash2, MessageSquare, 
  Clock, Check, Loader2, ArrowLeft 
} from "lucide-react";
import { 
  fetchDocument, updateDocument, deleteDocument, fetchDocumentVersions 
} from "../services/api";

export default function DocumentModal({
  documentId,
  onClose,
  onAttachToChat,
  onDocumentDeleted,
  onDocumentUpdated
}) {
  const [doc, setDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("editor"); // "editor" | "versions"
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewingVersion, setViewingVersion] = useState(null);

  useEffect(() => {
    if (!documentId) return;
    loadDocumentData();
  }, [documentId]);

  const loadDocumentData = async () => {
    try {
      setIsLoading(true);
      const [docData, versionData] = await Promise.all([
        fetchDocument(documentId),
        fetchDocumentVersions(documentId)
      ]);
      setDoc(docData);
      setContent(docData.content);
      setVersions(versionData);
    } catch (err) {
      console.error("Failed to load document:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!doc) return;
    try {
      setIsSaving(true);
      const updated = await updateDocument(doc.id, { content, filename: doc.filename });
      setDoc(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onDocumentUpdated(updated);
      // Reload versions
      const versionData = await fetchDocumentVersions(doc.id);
      setVersions(versionData);
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document and all its versions?")) return;
    try {
      await deleteDocument(doc.id);
      onDocumentDeleted(doc.id);
      onClose();
    } catch (err) {
      alert("Failed to delete document: " + err.message);
    }
  };

  if (!documentId) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      zIndex: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "800px",
        height: "85vh",
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              padding: "8px",
              borderRadius: "8px",
              backgroundColor: "rgba(34, 211, 238, 0.15)",
              color: "var(--cyan-400)"
            }}>
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>
                {doc?.filename || "Loading document..."}
              </h2>
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                Current Version: v{doc?.version || 1} • {doc?.file_type?.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Attach to Chat shortcut */}
            {doc && (
              <button
                onClick={() => {
                  onAttachToChat(doc);
                  onClose();
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "var(--primary-400)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <MessageSquare size={13} />
                <span>Discuss in Chat</span>
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              style={{ padding: "6px", color: "var(--text-muted)", borderRadius: "6px" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "rgba(0, 0, 0, 0.15)"
        }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                setActiveTab("editor");
                setViewingVersion(null);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: activeTab === "editor" && !viewingVersion ? "#fff" : "var(--text-muted)",
                backgroundColor: activeTab === "editor" && !viewingVersion ? "var(--bg-tertiary)" : "transparent"
              }}
            >
              Document Content
            </button>
            <button
              onClick={() => setActiveTab("versions")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: activeTab === "versions" ? "#fff" : "var(--text-muted)",
                backgroundColor: activeTab === "versions" ? "var(--bg-tertiary)" : "transparent"
              }}
            >
              <History size={14} />
              <span>Version History ({versions.length})</span>
            </button>
          </div>

          {activeTab === "editor" && !viewingVersion && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handleDelete}
                title="Delete document"
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  color: "var(--rose-400)",
                  fontSize: "0.78rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: saveSuccess ? "var(--emerald-400)" : "var(--primary-600)",
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} style={{ animation: "spinSlow 1s linear infinite" }} />
                ) : saveSuccess ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
                <span>{saveSuccess ? "Saved (New Version Created)!" : "Save Changes"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Loader2 size={24} style={{ animation: "spinSlow 1s linear infinite", margin: "0 auto 10px auto" }} />
              Loading document content...
            </div>
          ) : activeTab === "editor" ? (
            viewingVersion ? (
              <div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(251, 191, 36, 0.15)",
                  color: "var(--amber-400)",
                  fontSize: "0.8rem"
                }}>
                  <span>Previewing historical Version v{viewingVersion.version_number}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        setContent(viewingVersion.content);
                        setViewingVersion(null);
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: "var(--amber-400)",
                        color: "#000",
                        fontWeight: 600,
                        fontSize: "0.74rem"
                      }}
                    >
                      Restore This Version
                    </button>
                    <button
                      onClick={() => setViewingVersion(null)}
                      style={{ color: "#fff", fontSize: "0.74rem" }}
                    >
                      Back to Latest
                    </button>
                  </div>
                </div>
                <pre style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.84rem",
                  color: "#cbd5e1",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6"
                }}>
                  {viewingVersion.content}
                </pre>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Document content..."
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "400px",
                  backgroundColor: "transparent",
                  color: "#e2e8f0",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.86rem",
                  lineHeight: "1.65",
                  resize: "none"
                }}
              />
            )
          ) : (
            /* Versions Tab */
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                Every edit or natural-language document update creates an immutable version snapshot.
              </div>
              {versions.map(ver => (
                <div
                  key={ver.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(99, 102, 241, 0.2)",
                        color: "var(--primary-400)",
                        fontWeight: 600,
                        fontSize: "0.76rem"
                      }}>
                        Version {ver.version_number}
                      </span>
                      <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        {new Date(ver.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      marginTop: "6px",
                      maxWidth: "500px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {ver.content.slice(0, 120)}...
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setViewingVersion(ver);
                      setActiveTab("editor");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "#fff",
                      fontSize: "0.76rem",
                      fontWeight: 500
                    }}
                  >
                    Inspect Snapshot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
