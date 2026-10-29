import React, { useState } from "react";
import { 
  MessageSquare, Plus, FileText, Trash2, Globe, Database, 
  Sparkles, Layers, ChevronRight, Upload, Clock, HardDrive
} from "lucide-react";

export default function Sidebar({
  conversations,
  currentConvId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  documents,
  onSelectDocument,
  onUploadDocumentClick,
  isOpen,
  onClose
}) {
  const [activeTab, setActiveTab] = useState("chats"); // "chats" | "docs"

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 40,
            display: "block"
          }}
        />
      )}

      <aside style={{
        width: "300px",
        height: "100%",
        backgroundColor: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 50,
        transition: "transform var(--transition-normal)",
      }}>
        {/* App Header & Branding */}
        <div style={{
          padding: "20px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--primary-500), #ec4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px var(--primary-glow)"
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.1rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              background: "linear-gradient(to right, #fff, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Multimodal AI
            </h1>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--emerald-400)", boxShadow: "0 0 8px var(--emerald-400)" }} />
              Active • PostgreSQL RAG
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <div style={{ padding: "16px 16px 8px 16px" }}>
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) onClose();
            }}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(129, 140, 248, 0.1))",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 600,
              fontSize: "0.88rem",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.15)",
              cursor: "pointer"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--primary-400)";
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(129, 140, 248, 0.2))";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.35)";
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(129, 140, 248, 0.1))";
            }}
          >
            <Plus size={18} color="var(--primary-400)" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Tab Switcher: Chats vs Knowledge Base */}
        <div style={{
          display: "flex",
          margin: "8px 16px",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          padding: "3px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)"
        }}>
          <button
            onClick={() => setActiveTab("chats")}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: activeTab === "chats" ? "#fff" : "var(--text-muted)",
              backgroundColor: activeTab === "chats" ? "var(--bg-tertiary)" : "transparent",
              boxShadow: activeTab === "chats" ? "0 1px 4px rgba(0,0,0,0.3)" : "none"
            }}
          >
            <MessageSquare size={14} />
            <span>Chats ({conversations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: activeTab === "docs" ? "#fff" : "var(--text-muted)",
              backgroundColor: activeTab === "docs" ? "var(--bg-tertiary)" : "transparent",
              boxShadow: activeTab === "docs" ? "0 1px 4px rgba(0,0,0,0.3)" : "none"
            }}
          >
            <FileText size={14} />
            <span>Docs ({documents.length})</span>
          </button>
        </div>

        {/* Scrollable List */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          {activeTab === "chats" ? (
            conversations.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "32px 16px",
                color: "var(--text-muted)",
                fontSize: "0.82rem"
              }}>
                <MessageSquare size={28} style={{ margin: "0 auto 8px auto", opacity: 0.3 }} />
                No conversations yet.<br />Start a conversation above!
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = conv.id === currentConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      if (window.innerWidth < 768) onClose();
                    }}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: isSelected ? "var(--bg-tertiary)" : "transparent",
                      border: isSelected ? "1px solid var(--border-highlight)" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      group: "conv-item"
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      overflow: "hidden",
                      flex: 1
                    }}>
                      <MessageSquare size={15} color={isSelected ? "var(--primary-400)" : "var(--text-muted)"} />
                      <span style={{
                        fontSize: "0.84rem",
                        color: isSelected ? "#fff" : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: isSelected ? 500 : 400
                      }}>
                        {conv.title || "Untitled Conversation"}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      title="Delete conversation"
                      style={{
                        padding: "4px",
                        borderRadius: "4px",
                        color: "var(--text-muted)",
                        opacity: isSelected ? 0.8 : 0.4
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--rose-400)";
                        e.currentTarget.style.opacity = 1;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.opacity = isSelected ? 0.8 : 0.4;
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )
          ) : (
            /* Documents Tab */
            <div>
              <button
                onClick={onUploadDocumentClick}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                  color: "var(--cyan-400)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan-400)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"}
              >
                <Upload size={14} />
                <span>Upload Knowledge Doc</span>
              </button>

              {documents.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem"
                }}>
                  <FileText size={28} style={{ margin: "0 auto 8px auto", opacity: 0.3 }} />
                  No documents in RAG index.<br />Upload a PDF, TXT or DOCX!
                </div>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectDocument(doc.id);
                      if (window.innerWidth < 768) onClose();
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      marginBottom: "6px",
                      transition: "all var(--transition-fast)"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.borderColor = "var(--border-highlight)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <FileText size={15} color="var(--cyan-400)" />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {doc.filename}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {doc.file_type?.toUpperCase()} • v{doc.version || 1}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.65rem",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(34, 211, 238, 0.15)",
                      color: "var(--cyan-400)",
                      fontWeight: 600
                    }}>
                      v{doc.version || 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer Features Info */}
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--border-subtle)",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
              AI Modalities
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--emerald-400)", fontWeight: 600 }}>
              Online
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary-400)" }}>
              Vision
            </span>
            <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(34, 211, 238, 0.15)", color: "var(--cyan-400)" }}>
              RAG Docs
            </span>
            <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(251, 191, 36, 0.15)", color: "var(--amber-400)" }}>
              Audio TTS/STT
            </span>
            <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(52, 211, 153, 0.15)", color: "var(--emerald-400)" }}>
              Web Search
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
