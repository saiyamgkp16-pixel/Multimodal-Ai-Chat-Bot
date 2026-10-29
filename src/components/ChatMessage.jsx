import React, { useState } from "react";
import { 
  Sparkles, User, Volume2, VolumeX, Copy, Check, 
  ExternalLink, FileText, Globe, Layers, ArrowUpRight, CheckCircle2 
} from "lucide-react";
import { textToSpeech } from "../services/api";

export default function ChatMessage({ message, onOpenDocument }) {
  const isUser = message.role === "user";
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // Play Text-to-Speech
  const handlePlayTTS = async () => {
    if (isPlayingAudio) {
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      setAudioError(null);

      // Prefer backend TTS streaming or fall back to browser Web Speech Synthesis
      try {
        const audioUrl = await textToSpeech(message.content);
        const audio = new Audio(audioUrl);
        window.currentAudio = audio;
        audio.play();
        audio.onended = () => {
          setIsPlayingAudio(false);
          window.currentAudio = null;
        };
        audio.onerror = () => {
          fallbackBrowserTTS();
        };
      } catch (err) {
        fallbackBrowserTTS();
      }
    } catch (error) {
      setIsPlayingAudio(false);
      setAudioError("Could not play speech");
    }
  };

  const fallbackBrowserTTS = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sources = message.sources || [];
  const hasSources = sources.length > 0;

  return (
    <div style={{
      display: "flex",
      gap: "14px",
      padding: "16px 20px",
      borderRadius: "var(--radius-lg)",
      backgroundColor: isUser ? "rgba(99, 102, 241, 0.08)" : "var(--bg-glass)",
      border: isUser ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid var(--border-subtle)",
      backdropFilter: "blur(12px)",
      marginBottom: "16px",
      animation: "fadeIn 0.25s ease-out forwards",
      alignSelf: isUser ? "flex-end" : "flex-start",
      maxWidth: "92%",
      boxShadow: isUser ? "0 4px 16px rgba(99, 102, 241, 0.08)" : "var(--shadow-sm)"
    }}>
      {/* Avatar */}
      <div style={{
        width: "34px",
        height: "34px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: isUser ? "var(--primary-600)" : "var(--bg-tertiary)",
        border: isUser ? "none" : "1px solid var(--border-subtle)",
        boxShadow: isUser ? "0 0 12px var(--primary-glow)" : "none"
      }}>
        {isUser ? (
          <User size={18} color="#fff" />
        ) : (
          <Sparkles size={18} color="var(--primary-400)" />
        )}
      </div>

      {/* Message Content Container */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header with Modality Tags */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: isUser ? "var(--primary-400)" : "#fff"
            }}>
              {isUser ? "You" : "Multimodal AI"}
            </span>

            {/* Modality Badges */}
            {message.modality === "image" && (
              <span style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(192, 132, 252, 0.15)",
                color: "var(--purple-400)",
                border: "1px solid rgba(192, 132, 252, 0.3)",
                fontWeight: 500
              }}>
                🖼️ Vision
              </span>
            )}
            {message.modality === "document" && (
              <span style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(52, 211, 153, 0.15)",
                color: "var(--emerald-400)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                fontWeight: 500
              }}>
                📚 Document RAG
              </span>
            )}
            {message.modality === "web" && (
              <span style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(34, 211, 238, 0.15)",
                color: "var(--cyan-400)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                fontWeight: 500
              }}>
                🌐 Web Search
              </span>
            )}
            {message.modality === "mixed" && (
              <span style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(99, 102, 241, 0.15)",
                color: "var(--primary-400)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                fontWeight: 500
              }}>
                ⚡ Multimodal
              </span>
            )}
          </div>

          {/* Action buttons (TTS & Copy) for Assistant responses */}
          {!isUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={handlePlayTTS}
                title={isPlayingAudio ? "Stop speaking" : "Speak answer (TTS)"}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  color: isPlayingAudio ? "var(--amber-400)" : "var(--text-muted)",
                  background: isPlayingAudio ? "rgba(251, 191, 36, 0.15)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.72rem"
                }}
                onMouseEnter={e => {
                  if (!isPlayingAudio) e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={e => {
                  if (!isPlayingAudio) e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isPlayingAudio ? "Speaking..." : "Speak"}</span>
              </button>

              <button
                onClick={handleCopy}
                title="Copy response"
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  color: copied ? "var(--emerald-400)" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.72rem"
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Body */}
        <div style={{
          fontSize: "0.93rem",
          color: isUser ? "#fff" : "var(--text-primary)",
          lineHeight: "1.65",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }}>
          {message.content}
        </div>

        {/* Document Action Notification Card (Created / Updated via Natural Language) */}
        {message.document_action && (
          <div style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(34, 211, 238, 0.08))",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} color="var(--emerald-400)" />
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>
                  Document {message.document_action.action === "updated" ? "Updated" : "Created"}: {message.document_action.filename}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Version {message.document_action.version} saved with revision history
                </div>
              </div>
            </div>

            {onOpenDocument && (
              <button
                onClick={() => onOpenDocument(message.document_action.document_id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(52, 211, 153, 0.2)",
                  color: "var(--emerald-400)",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>View Doc</span>
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        )}

        {/* Sources & Citations Accordion */}
        {hasSources && (
          <div style={{ marginTop: "12px" }}>
            <button
              onClick={() => setShowSources(!showSources)}
              style={{
                fontSize: "0.76rem",
                color: "var(--cyan-400)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "rgba(34, 211, 238, 0.08)",
                border: "1px solid rgba(34, 211, 238, 0.2)",
                fontWeight: 500
              }}
            >
              <Globe size={13} />
              <span>{showSources ? "Hide Sources" : `View Sources (${sources.length})`}</span>
            </button>

            {showSources && (
              <div style={{
                marginTop: "8px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                {sources.map((src, idx) => (
                  <div key={idx} style={{ fontSize: "0.78rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <span style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                        {src.type === "web" ? <Globe size={13} color="var(--cyan-400)" /> : <FileText size={13} color="var(--emerald-400)" />}
                        {src.title}
                      </span>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--cyan-400)", display: "flex", alignItems: "center", gap: "2px", textDecoration: "none" }}
                        >
                          <span>Open</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                      {src.similarity !== undefined && (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                          Score: {Math.round(src.similarity * 100)}%
                        </span>
                      )}
                    </div>
                    {src.snippet && (
                      <div style={{ color: "var(--text-muted)", marginTop: "2px", fontSize: "0.74rem" }}>
                        "{src.snippet}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
