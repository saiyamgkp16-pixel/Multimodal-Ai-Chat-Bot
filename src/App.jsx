import React, { useState, useEffect, useRef } from "react";
import { 
  Menu, Plus, Sparkles, FileText, Loader2, RefreshCw, 
  Trash2, ShieldCheck, Heart 
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import QuickPrompts from "./components/QuickPrompts";
import DocumentModal from "./components/DocumentModal";
import { 
  fetchConversations, fetchConversation, deleteConversation, 
  fetchDocuments, sendMessage 
} from "./services/api";

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputHiddenRef = useRef(null);

  // Initial Load: Fetch conversations and documents
  useEffect(() => {
    loadConversations();
    loadDocuments();
  }, []);

  // When selected conversation changes, load messages
  useEffect(() => {
    if (currentConvId) {
      loadMessages(currentConvId);
    } else {
      setMessages([]);
    }
  }, [currentConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadConversations = async () => {
    try {
      const convs = await fetchConversations();
      setConversations(convs);
      if (convs.length > 0 && !currentConvId) {
        setCurrentConvId(convs[0].id);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Error loading documents:", err);
    }
  };

  const loadMessages = async (id) => {
    try {
      const convData = await fetchConversation(id);
      setMessages(convData.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleNewConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    setAttachedDocs([]);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        handleNewConversation();
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const handleSendMessage = async ({ message, image_data, file_ids, enable_web_search }) => {
    // Determine modality tag for immediate optimistic render
    let optimisticModality = "text";
    if (image_data) optimisticModality = "image";
    else if (file_ids && file_ids.length > 0) optimisticModality = "document";

    const userMessageObj = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      modality: optimisticModality,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      const response = await sendMessage({
        message,
        conversation_id: currentConvId,
        image_data,
        file_ids,
        enable_web_search
      });

      const assistantMessageObj = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        modality: response.modality,
        sources: response.sources,
        document_action: response.document_action,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessageObj]);

      // If new conversation was initiated
      if (!currentConvId && response.conversation_id) {
        setCurrentConvId(response.conversation_id);
      }

      // Refresh conversations list to update title & timestamp
      loadConversations();

      // If AI created or updated a document, refresh documents list
      if (response.document_action) {
        loadDocuments();
      }

      // Clear attached docs for the next message
      setAttachedDocs([]);
    } catch (error) {
      const errorMessageObj = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${error.message || "Failed to generate response. Please try again."}`,
        modality: "text",
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentConv = conversations.find(c => c.id === currentConvId);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      backgroundColor: "var(--bg-primary)"
    }}>
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onSelectConversation={id => setCurrentConvId(id)}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        documents={documents}
        onSelectDocument={docId => setSelectedDocId(docId)}
        onUploadDocumentClick={() => fileInputHiddenRef.current?.click()}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Viewport */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Top Navbar */}
        <header style={{
          height: "60px",
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-glass-heavy)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 20
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                borderRadius: "6px",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <Menu size={20} />
            </button>

            <div>
              <h2 style={{
                fontSize: "0.94rem",
                fontWeight: 600,
                color: "#fff",
                maxWidth: "400px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                {currentConv ? currentConv.title : "New Conversation"}
              </h2>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                FastAPI • Multimodal LLM • Vector RAG • Live Web Search
              </span>
            </div>
          </div>

          {/* Right Header Status Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(52, 211, 153, 0.12)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
              color: "var(--emerald-400)",
              fontSize: "0.72rem",
              fontWeight: 500
            }}>
              <ShieldCheck size={13} />
              <span>MVP Local Ready</span>
            </div>

            <button
              onClick={handleNewConversation}
              title="Start New Chat"
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                color: "#fff",
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>
        </header>

        {/* Messages Scroll Area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column"
        }}>
          {messages.length === 0 ? (
            <div style={{ margin: "auto 0" }}>
              <QuickPrompts
                onSelectPrompt={promptText => {
                  handleSendMessage({ message: promptText });
                }}
              />
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: "880px", margin: "0 auto" }}>
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOpenDocument={docId => setSelectedDocId(docId)}
                />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 18px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-glass)",
                  border: "1px solid var(--border-subtle)",
                  width: "fit-content",
                  animation: "fadeIn 0.2s ease"
                }}>
                  <Loader2 size={16} color="var(--primary-400)" style={{ animation: "spinSlow 1s linear infinite" }} />
                  <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                    Processing multimodal context & reasoning...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Chat Input Capsule */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          attachedDocs={attachedDocs}
          onAttachDoc={doc => setAttachedDocs(prev => [...prev, doc])}
          onRemoveDoc={docId => setAttachedDocs(prev => prev.filter(d => d.id !== docId))}
        />
      </main>

      {/* Document Reader / Editor Modal */}
      {selectedDocId && (
        <DocumentModal
          documentId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
          onAttachToChat={doc => {
            setAttachedDocs(prev => [...prev, doc]);
          }}
          onDocumentDeleted={deletedId => {
            setDocuments(prev => prev.filter(d => d.id !== deletedId));
            setSelectedDocId(null);
          }}
          onDocumentUpdated={updatedDoc => {
            setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
          }}
        />
      )}
    </div>
  );
}
