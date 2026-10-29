const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")}/api`;

export async function sendMessage(payload) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Chat request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchConversations() {
  const response = await fetch(`${API_BASE}/conversations`);
  if (!response.ok) throw new Error("Failed to load conversations");
  return response.json();
}

export async function fetchConversation(id) {
  const response = await fetch(`${API_BASE}/conversations/${id}`);
  if (!response.ok) throw new Error("Failed to load conversation history");
  return response.json();
}

export async function deleteConversation(id) {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Failed to delete conversation");
  return true;
}

export async function fetchDocuments() {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) throw new Error("Failed to load documents");
  return response.json();
}

export async function fetchDocument(id) {
  const response = await fetch(`${API_BASE}/documents/${id}`);
  if (!response.ok) throw new Error("Failed to load document");
  return response.json();
}

export async function createDocument(docData) {
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(docData)
  });
  if (!response.ok) throw new Error("Failed to create document");
  return response.json();
}

export async function updateDocument(id, docData) {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(docData)
  });
  if (!response.ok) throw new Error("Failed to update document");
  return response.json();
}

export async function deleteDocument(id) {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Failed to delete document");
  return true;
}

export async function fetchDocumentVersions(id) {
  const response = await fetch(`${API_BASE}/documents/${id}/versions`);
  if (!response.ok) throw new Error("Failed to load version history");
  return response.json();
}

export async function textToSpeech(text, voice = "en") {
  const response = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice })
  });
  if (!response.ok) throw new Error("TTS generation failed");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function speechToText(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice_input.wav");

  const response = await fetch(`${API_BASE}/stt`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) throw new Error("STT failed");
  return response.json();
}

export async function searchWeb(query) {
  const response = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, num_results: 4 })
  });
  if (!response.ok) throw new Error("Web search failed");
  return response.json();
}
