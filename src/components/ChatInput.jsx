import React, { useState, useRef, useEffect } from "react";
import { 
  Send, Paperclip, Image as ImageIcon, Mic, MicOff, 
  Globe, X, Loader2, FileText, AlertCircle 
} from "lucide-react";
import { uploadFile, speechToText } from "../services/api";

export default function ChatInput({
  onSendMessage,
  isLoading,
  attachedDocs,
  onAttachDoc,
  onRemoveDoc
}) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // { file, preview, base64 }
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText(prev => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Toggle Voice Input
  const handleToggleVoice = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
          setErrorMessage("");
        } catch (err) {
          console.error("Speech start error:", err);
          setIsRecording(false);
        }
      } else {
        setErrorMessage("Live speech recognition is not supported in this browser. Please use Chrome/Edge or upload an audio file.");
        setTimeout(() => setErrorMessage(""), 4000);
      }
    }
  };

  // Handle Document Upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage("");
      const result = await uploadFile(file);
      onAttachDoc({
        id: result.file_id,
        filename: result.filename,
        chunk_count: result.chunk_count
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Image Upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage({
        file,
        preview: URL.createObjectURL(file),
        base64: event.target.result
      });
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedImage && attachedDocs.length === 0) return;
    if (isLoading) return;

    onSendMessage({
      message: trimmed || (selectedImage ? "Please analyze this image" : "Analyze the attached document"),
      image_data: selectedImage ? selectedImage.base64 : null,
      file_ids: attachedDocs.map(d => d.id),
      enable_web_search: enableWebSearch ? true : null
    });

    setText("");
    setSelectedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <div style={{
      width: "100%",
      maxWidth: "880px",
      margin: "0 auto",
      padding: "0 16px 20px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }}>
      {/* Error alert toast if any */}
      {errorMessage && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "rgba(244, 63, 94, 0.15)",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          color: "var(--rose-400)",
          fontSize: "0.8rem",
          animation: "fadeIn 0.2s ease"
        }}>
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} style={{ marginLeft: "auto", color: "inherit" }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Media Attachments Preview Bar */}
      {(selectedImage || attachedDocs.length > 0 || isUploading) && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          padding: "6px 12px",
          backgroundColor: "rgba(15, 20, 32, 0.85)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)"
        }}>
          {/* Uploading Spinner Badge */}
          {isUploading && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              color: "var(--primary-400)",
              fontSize: "0.76rem"
            }}>
              <Loader2 size={13} style={{ animation: "spinSlow 1s linear infinite" }} />
              <span>Indexing Document...</span>
            </div>
          )}

          {/* Image Thumbnail Chip */}
          {selectedImage && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(192, 132, 252, 0.15)",
              border: "1px solid rgba(192, 132, 252, 0.3)",
              fontSize: "0.76rem",
              color: "#fff"
            }}>
              <img
                src={selectedImage.preview}
                alt="Upload preview"
                style={{ width: "24px", height: "24px", objectFit: "cover", borderRadius: "4px" }}
              />
              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedImage.file.name}
              </span>
              <button onClick={() => setSelectedImage(null)} style={{ color: "var(--text-muted)" }}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* Attached Document Chips */}
          {attachedDocs.map(doc => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(52, 211, 153, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "var(--emerald-400)",
                fontSize: "0.76rem"
              }}
            >
              <FileText size={13} />
              <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.filename}
              </span>
              <button onClick={() => onRemoveDoc(doc.id)} style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Capsule */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "var(--radius-lg)",
        backgroundColor: "var(--bg-glass-heavy)",
        border: isRecording ? "1px solid var(--rose-400)" : "1px solid var(--border-subtle)",
        backdropFilter: "blur(16px)",
        boxShadow: isRecording ? "0 0 20px var(--rose-glow)" : "0 8px 32px rgba(0,0,0,0.4)",
        transition: "border-color var(--transition-fast)"
      }}>
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />

        {/* Toolbar Buttons: File, Image, Web, Voice */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", paddingBottom: "2px" }}>
          {/* File Attachment */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Document (PDF, DOCX, TXT)"
            disabled={isLoading || isUploading}
            style={{
              padding: "7px",
              borderRadius: "8px",
              color: attachedDocs.length > 0 ? "var(--emerald-400)" : "var(--text-muted)",
              background: attachedDocs.length > 0 ? "rgba(52, 211, 153, 0.15)" : "transparent"
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => {
              if (attachedDocs.length === 0) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Paperclip size={18} />
          </button>

          {/* Image Upload */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            title="Upload Image for Vision Understanding"
            disabled={isLoading}
            style={{
              padding: "7px",
              borderRadius: "8px",
              color: selectedImage ? "var(--purple-400)" : "var(--text-muted)",
              background: selectedImage ? "rgba(192, 132, 252, 0.15)" : "transparent"
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => {
              if (!selectedImage) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <ImageIcon size={18} />
          </button>

          {/* Web Search Toggle */}
          <button
            type="button"
            onClick={() => setEnableWebSearch(!enableWebSearch)}
            title={enableWebSearch ? "Web Search Forced ON" : "Web Search Auto-Detect"}
            style={{
              padding: "7px",
              borderRadius: "8px",
              color: enableWebSearch ? "var(--cyan-400)" : "var(--text-muted)",
              background: enableWebSearch ? "rgba(34, 211, 238, 0.15)" : "transparent"
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => {
              if (!enableWebSearch) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Globe size={18} />
          </button>

          {/* Microphone Voice Input */}
          <button
            type="button"
            onClick={handleToggleVoice}
            title={isRecording ? "Stop voice recording" : "Record voice input"}
            style={{
              padding: "7px",
              borderRadius: "8px",
              color: isRecording ? "#fff" : "var(--text-muted)",
              background: isRecording ? "var(--rose-400)" : "transparent",
              animation: isRecording ? "pulseGlow 1.5s infinite" : "none"
            }}
            onMouseEnter={e => {
              if (!isRecording) e.currentTarget.style.color = "var(--rose-400)";
            }}
            onMouseLeave={e => {
              if (!isRecording) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording 
              ? "Listening to your voice..." 
              : attachedDocs.length > 0 
                ? "Ask anything about your attached document..." 
                : "Ask anything, discuss documents, images, or chat..."
          }
          rows={1}
          style={{
            flex: 1,
            backgroundColor: "transparent",
            color: "#fff",
            fontSize: "0.92rem",
            resize: "none",
            maxHeight: "140px",
            padding: "6px 4px",
            lineHeight: "1.5"
          }}
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!text.trim() && !selectedImage && attachedDocs.length === 0)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: (!text.trim() && !selectedImage && attachedDocs.length === 0) || isLoading
              ? "rgba(255, 255, 255, 0.06)"
              : "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
            color: (!text.trim() && !selectedImage && attachedDocs.length === 0) || isLoading
              ? "var(--text-muted)"
              : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: (!text.trim() && !selectedImage && attachedDocs.length === 0) || isLoading ? "not-allowed" : "pointer",
            boxShadow: (!text.trim() && !selectedImage && attachedDocs.length === 0) || isLoading ? "none" : "0 0 14px var(--primary-glow)",
            transition: "all var(--transition-fast)"
          }}
        >
          {isLoading ? (
            <Loader2 size={16} style={{ animation: "spinSlow 1s linear infinite" }} />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
