import { useRef, useState, useEffect } from "react";
import { useSpeech } from "../hooks/useSpeech";
import { RetentionTest } from "./RetentionTest"; // Import the RetentionTest component
import { Flashcards } from "./Flashcards"; // Import the Flashcards component

// Helper function to clean caption text
const cleanCaption = (text) => {
  if (!text) return "";
  let clean = text;
  // Remove markdown code fences
  clean = clean.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  // Remove backticks
  clean = clean.replace(/^`+|`+$/g, '');
  // If it looks like JSON, extract the text field
  if (clean.trim().startsWith('{') && clean.includes('"text"')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.messages?.[0]?.text) return parsed.messages[0].text;
    } catch (e) { }
  }
  return clean;
};

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

export const ChatInterface = ({ hidden, onSessionChange, ...props }) => {
  const input = useRef();
  const fileInput = useRef();
  const { tts, loading, message, startRecording, stopRecording, recording, currentMessageText, displayedCaptionText, stopAudio, messages, currentImages, setCurrentImages, lastUserMessage, setLastUserMessage, selectedLanguage, setSelectedLanguage } = useSpeech();

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adam_token'));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Get logged-in user name from localStorage
  const storedUser = JSON.parse(localStorage.getItem('adam_user') || '{}');
  const userName = storedUser.name || 'User';

  const handleLogout = () => {
    localStorage.removeItem('adam_token');
    localStorage.removeItem('adam_user');
    setIsLoggedIn(false);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = isLoginForm ? '/auth/login' : '/auth/register';
      const body = isLoginForm
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'An error occurred. Please try again.');
        return;
      }

      // Save token and user info
      localStorage.setItem('adam_token', data.token);
      localStorage.setItem('adam_user', JSON.stringify(data.user));
      setIsLoggedIn(true);
      setIsAuthModalOpen(false);
      // Reset form
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthError('');
    } catch (err) {
      setAuthError('Could not connect to server. Please make sure the backend is running.');
    } finally {
      setAuthLoading(false);
    }
  };

  const [chatHistory, setChatHistory] = useState([]); // Store all messages in order

  // ─── ChatGPT-style sessions (persisted in MongoDB per user) ───
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const loadingSessionRef = useRef(false);
  const saveTimerRef = useRef(null);
  const chatHistoryRef = useRef([]);
  chatHistoryRef.current = chatHistory;

  const authHeaders = () => {
    const token = localStorage.getItem('adam_token');
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  const toUiMessages = (msgs) =>
    (msgs || []).filter((m) => m && m.text).map((m) => ({
      id: Date.now() + Math.random(),
      text: m.text,
      sender: m.sender,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    }));

  const toApiMessages = (msgs) =>
    (msgs || []).filter((m) => m && m.text && ['user', 'ai', 'system'].includes(m.sender))
      .map((m) => ({ text: m.text, sender: m.sender, timestamp: m.timestamp || new Date() }));

  const loadSessions = async (openSessionId = null) => {
    if (!localStorage.getItem('adam_token')) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data.sessions || [];
      setSessions(list);
      const targetId = openSessionId || list[0]?._id || null;
      if (targetId) {
        await openSession(targetId, list);
      } else {
        await handleNewChat(true);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  };

  const openSession = async (id, knownList = null) => {
    // Stop any in-progress speech before switching chats
    try { stopAudio(); } catch (e) { /* noop */ }
    try { if (recording) stopRecording(); } catch (e) { /* noop */ }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setLastUserMessage("");
    setCurrentImages([]);
    setIsRetentionTestOpen(false);
    setIsFlashcardsOpen(false);
    loadingSessionRef.current = true;
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveSessionId(data.session._id);
      setChatHistory(toUiMessages(data.session.messages));
      const list = knownList || sessions;
      const found = list.find((s) => s._id === id);
      if (!found) setSessions((prev) => [{ _id: data.session._id, title: data.session.title, updatedAt: data.session.updatedAt }, ...prev]);
    } catch (e) {
      console.error('Failed to open session:', e);
      showToast('Could not load that chat.');
    } finally {
      loadingSessionRef.current = false;
    }
  };

  const handleNewChat = async (silent = false) => {
    // Stop any in-progress speech — New chat cuts the avatar off mid-sentence
    try { stopAudio(); } catch (e) { /* noop */ }
    try { if (recording) stopRecording(); } catch (e) { /* noop */ }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setLastUserMessage("");
    setCurrentImages([]);
    setIsRetentionTestOpen(false);
    setIsFlashcardsOpen(false);
    if (!localStorage.getItem('adam_token')) {
      setChatHistory([]);
      setActiveSessionId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: 'New chat' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      loadingSessionRef.current = true;
      setActiveSessionId(data.session._id);
      setChatHistory([]);
      setSessions((prev) => [{ _id: data.session._id, title: data.session.title, createdAt: data.session.createdAt, updatedAt: data.session.updatedAt, messageCount: 0 }, ...prev]);
      loadingSessionRef.current = false;
    } catch (e) {
      console.error('Failed to create session:', e);
      if (!silent) showToast('Could not start a new chat.');
    }
  };

  const handleDeleteSession = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      if (id === activeSessionId) {
        const remaining = sessions.filter((s) => s._id !== id);
        if (remaining.length > 0) await openSession(remaining[0]._id);
        else await handleNewChat(true);
      }
      showToast('Chat deleted.');
    } catch (err) {
      console.error('Delete session error:', err);
      showToast('Could not delete that chat.');
    }
  };
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documents, setDocuments] = useState([]); // Store uploaded documents
  const [isUploading, setIsUploading] = useState(false); // Track upload status
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false); // Track summary generation status
  const [chatSummary, setChatSummary] = useState(""); // Store chat summary
  const [isRetentionTestOpen, setIsRetentionTestOpen] = useState(false); // Track retention test modal state
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false); // Track flashcards modal state
  const [hiddenImages, setHiddenImages] = useState([]); // Stashed images after panel is closed
  const [zoomedImage, setZoomedImage] = useState(null); // Track which image is zoomed
  const [toast, setToast] = useState(""); // Toast notification message
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };

  // Surface avatar voice-playback + microphone problems as toasts
  useEffect(() => {
    const onBlocked = () => showToast("Browser blocked autoplay — tap anywhere to hear Adam's voice.");
    const onFailed = () => showToast("Voice playback failed for this reply — check your volume and try again.");
    const onMicError = (e) => showToast((e && e.detail) || "Microphone unavailable.");
    const onMicRequesting = () => showToast("Requesting microphone access — allow it in the browser prompt.");
    window.addEventListener("adam:audio-blocked", onBlocked);
    window.addEventListener("adam:audio-failed", onFailed);
    window.addEventListener("adam:mic-error", onMicError);
    window.addEventListener("adam:mic-requesting", onMicRequesting);
    return () => {
      window.removeEventListener("adam:audio-blocked", onBlocked);
      window.removeEventListener("adam:audio-failed", onFailed);
      window.removeEventListener("adam:mic-error", onMicError);
      window.removeEventListener("adam:mic-requesting", onMicRequesting);
    };
  }, []);

  // Debug: Log when currentImages changes
  useEffect(() => {
    console.log("Current images updated:", currentImages);
    if (currentImages && currentImages.length > 0) setHiddenImages([]); // fresh deck, drop stash
  }, [currentImages]);

  // Handle escape key to close zoomed image
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && zoomedImage) {
        setZoomedImage(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [zoomedImage]);

  // ChatGPT-style: load sessions on login, autosave messages to MongoDB
  useEffect(() => {
    if (isLoggedIn) {
      loadSessions();
    } else {
      setSessions([]);
      setActiveSessionId(null);
      setChatHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Autosave chatHistory → PUT /api/sessions/:id (debounced, skips session switches)
  useEffect(() => {
    if (!isLoggedIn || !activeSessionId || loadingSessionRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const msgs = toApiMessages(chatHistoryRef.current);
        // Auto-title from first user message, ChatGPT-style
        const firstUser = msgs.find((m) => m.sender === 'user');
        const current = sessions.find((s) => s._id === activeSessionId);
        const needsTitle = current && (!current.title || current.title === 'New chat') && firstUser;
        const title = needsTitle ? firstUser.text.slice(0, 40) : undefined;
        const res = await fetch(`${API_BASE_URL}/api/sessions/${activeSessionId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(title ? { messages: msgs, title } : { messages: msgs }),
        });
        if (res.ok && title) {
          setSessions((prev) => prev.map((s) => (s._id === activeSessionId ? { ...s, title } : s)));
        }
      } catch (e) {
        console.error('Autosave session failed:', e);
      }
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory, activeSessionId, isLoggedIn]);

  // Tell App to remount the avatar scene whenever the session changes
  useEffect(() => {
    if (onSessionChange) onSessionChange(activeSessionId || 'local');
  }, [activeSessionId, onSessionChange]);

  // Handle incoming AI messages from single message object
  useEffect(() => {
    if (message && message.text) {
      const aiMessage = {
        id: Date.now() + Math.random(), // Add random to avoid duplicate IDs
        text: message.text,
        sender: "ai",
        timestamp: new Date()
      };
      setChatHistory(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(msg =>
          msg.sender === "ai" &&
          msg.text === message.text &&
          Math.abs(new Date(msg.timestamp).getTime() - new Date().getTime()) < 5000
        );
        return exists ? prev : [...prev, aiMessage];
      });
    }
  }, [message]);

  // Handle sending messages
  const sendMessage = async () => {
    const text = input.current.value.trim();
    if (!text) return;

    // Add user message to chat history immediately
    const userMessage = {
      id: Date.now(),
      text: text,
      sender: "user",
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);

    // Clear input and send to TTS
    input.current.value = "";
    tts(text);
  };

  // Handle multiple AI messages from messages array
  useEffect(() => {
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const newMessages = messages
        .filter(msg => msg && msg.text)
        .map(msg => ({
          id: Date.now() + Math.random(),
          text: msg.text,
          sender: "ai",
          timestamp: new Date()
        }));

      if (newMessages.length > 0) {
        setChatHistory(prev => {
          // Filter out duplicates
          const existingTexts = new Set(prev.filter(m => m.sender === "ai").map(m => m.text));
          const uniqueNewMessages = newMessages.filter(msg => !existingTexts.has(msg.text));
          return uniqueNewMessages.length > 0 ? [...prev, ...uniqueNewMessages] : prev;
        });
      }
    }
  }, [messages]);

  // Handle user messages from voice recordings (when backend includes userMessage in response)
  useEffect(() => {
    if (lastUserMessage && lastUserMessage.trim() !== "") {
      setChatHistory(prev => {
        // Check if this message is already in chat history to avoid duplicates
        const messageExists = prev.some(
          msg => msg.sender === "user" && msg.text === lastUserMessage
        );

        if (!messageExists) {
          const userMessage = {
            id: Date.now() + Math.random(),
            text: lastUserMessage,
            sender: "user",
            timestamp: new Date()
          };
          // Clear the lastUserMessage after adding to history
          setLastUserMessage("");
          return [...prev, userMessage];
        }
        return prev;
      });
    }
  }, [lastUserMessage, setLastUserMessage]);

  // Handle document upload
  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', selectedLanguage || 'english'); // Send selected language

      // Use the same backend URL as the speech hook
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.errorMessage || errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      const documentData = await response.json();
      setDocuments(prev => [...prev, documentData]);

      // Add a message to chat history about the uploaded document
      const userMessage = {
        id: Date.now(),
        text: `Uploaded document: ${documentData.filename || file.name}`,
        sender: "user",
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, userMessage]);

      // Add the document summary to chat history
      if (documentData.summary) {
        const summaryMessage = {
          id: Date.now() + 1,
          text: `Document Summary:\n\n${documentData.summary}`,
          sender: "ai",
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, summaryMessage]);
      }

      // Ask the AI to explain what's in the document using the summary
      const aiPrompt = documentData.summary
        ? `I've uploaded a document named "${documentData.filename}". Here's a summary of it:\n\n${documentData.summary}\n\nCan you provide a detailed explanation of what this document is about?`
        : `I've uploaded a document named "${documentData.filename}". Can you explain what this document is about?`;
      tts(aiPrompt);

    } catch (error) {
      console.error('=== Document Upload Error ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Add error message to chat history with more details
      const errorMessage = {
        id: Date.now(),
        text: `Failed to upload document: ${error.message}`,
        sender: "system",
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);

      // Show toast with error details
      showToast(`Document upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInput.current) {
        fileInput.current.value = '';
      }
    }
  };

  // Generate chat summary
  const generateSummary = async () => {
    if (chatHistory.length === 0) {
      setChatSummary("The conversation is empty.");
      return;
    }

    setIsGeneratingSummary(true);
    setChatSummary(""); // Clear previous summary

    try {
      const response = await fetch(`${API_BASE_URL}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatHistory }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setChatSummary(data.summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      setChatSummary("Sorry, I couldn't generate a summary of the conversation. Please try again.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex pointer-events-none">
      {/* Hidden file input for document upload */}
      <input
        type="file"
        ref={fileInput}
        onChange={handleDocumentUpload}
        accept=".pdf,.docx,.txt"
        className="hidden"
        id="documentUpload"
      />

      {/* Language Selection - Centered at Top */}
      <div className="absolute left-1/2 transform -translate-x-1/2 top-4 bg-black bg-opacity-70 backdrop-blur-md text-white px-3 py-2 rounded-lg pointer-events-auto z-20 shadow-lg border border-white/20">
        <label className="text-xs font-semibold mb-1 block text-center">🌐 Language</label>
        <select
          value={selectedLanguage}
          onChange={(e) => {
            setSelectedLanguage(e.target.value);
            console.log("Language changed to:", e.target.value);
          }}
          className="bg-white bg-opacity-30 text-white text-sm font-medium px-2 py-1 rounded border border-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 cursor-pointer hover:bg-opacity-40 transition-all min-w-[100px]"
        >
          <option value="english" className="bg-gray-800 text-white">English</option>
          <option value="hindi" className="bg-gray-800 text-white">Hindi</option>
          <option value="telugu" className="bg-gray-800 text-white">Telugu</option>
        </select>
      </div>

      {/* Auth Buttons - Top Right */}
      <div className="absolute right-4 top-4 flex items-center gap-3 pointer-events-auto z-20">
        {isLoggedIn ? (
          <>
            <span className="text-white text-sm bg-black bg-opacity-50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20 hidden sm:block">
              👤 {userName}
            </span>
            <button
              onClick={() => {
                if (chatHistory.length === 0) {
                  showToast("Have a conversation with Adam first, then revise with flashcards.");
                  return;
                }
                setIsFlashcardsOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg backdrop-blur-md transition-all duration-200 flex items-center gap-2 shadow-lg border border-teal-500"
              title="Revise with flashcards"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-7.5a2.25 2.25 0 012.25-2.25h6z" />
              </svg>
              Flashcards
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg backdrop-blur-md transition-all duration-200 flex items-center gap-2 shadow-lg border border-red-500"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => { setIsAuthModalOpen(true); setIsLoginForm(true); setAuthError(''); }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold px-5 py-2 rounded-lg backdrop-blur-md transition-all duration-200 flex items-center gap-2 shadow-lg border border-purple-500/50"
            title="Sign In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Sign In
          </button>
        )}
      </div>

      {/* Chat Toggle Button - Always visible */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="absolute left-4 top-32 bg-black bg-opacity-50 backdrop-blur-md text-white p-3 rounded-lg pointer-events-auto z-20 hover:bg-opacity-70 transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          />
        </svg>
      </button>

      {/* Document Upload Button - Always visible */}
      <button
        onClick={() => document.getElementById('documentUpload').click()}
        disabled={isUploading}
        className="absolute left-4 top-48 bg-black bg-opacity-50 backdrop-blur-md text-white p-3 rounded-lg pointer-events-auto z-20 hover:bg-opacity-70 transition-all disabled:opacity-50"
      >
        {isUploading ? (
          <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zM15 9h.75a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75v-.75A.75.75 0 0115 9zm-3 3.75a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75h-.75a.75.75 0 01-.75-.75v-.75z"
            />
          </svg>
        )}
      </button>

      {/* Quiz Button - Below document option, opens Gemini-generated session quiz */}
      <button
        onClick={() => {
          if (chatHistory.length === 0) {
            showToast("Have a conversation with Adam first, then take the quiz.");
            return;
          }
          setIsRetentionTestOpen(true);
        }}
        title="Take Quiz"
        className="absolute left-4 top-64 bg-black bg-opacity-50 backdrop-blur-md text-white p-3 rounded-lg pointer-events-auto z-20 hover:bg-opacity-70 transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
      </button>

      {/* Chat History Panel - Collapsible with pop-up animation */}
      {isChatOpen && (
        <div className="absolute left-0 top-0 h-full bg-gray-900 pointer-events-auto z-40 w-1/4 min-w-[320px] max-w-[400px] flex flex-col shadow-2xl border-r border-gray-700">
          {/* Header Section - Fixed */}
          <div className="flex-shrink-0 p-4 border-b border-gray-600 bg-gray-800">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-white">Conversation</h2>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* New Chat + Previous Chats (ChatGPT-style, stored in MongoDB) */}
            {isLoggedIn && (
              <div className="mb-3">
                <button
                  onClick={() => handleNewChat()}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold p-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg leading-none">+</span> New chat
                </button>
                <div className="mt-2 max-h-[160px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {sessionsLoading && (
                    <p className="text-gray-400 text-xs text-center py-2">Loading chats…</p>
                  )}
                  {!sessionsLoading && sessions.length === 0 && (
                    <p className="text-gray-400 text-xs text-center py-2">No previous chats yet.</p>
                  )}
                  {sessions.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => { if (s._id !== activeSessionId) openSession(s._id); }}
                      className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${s._id === activeSessionId ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/60'}`}
                      title={s.title}
                    >
                      <span className="truncate flex-1">{s.title || 'New chat'}</span>
                      <button
                        onClick={(e) => handleDeleteSession(s._id, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all flex-shrink-0"
                        title="Delete chat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summarize Chat Button */}
            {chatHistory.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={generateSummary}
                  disabled={isGeneratingSummary}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white p-2 rounded-lg pointer-events-auto transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeneratingSummary ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating Summary...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      <span>Summarize Chat</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Chat Summary Display - Scrollable */}
            {chatSummary && (
              <div className="mb-4 bg-purple-900 bg-opacity-50 rounded-lg border border-purple-500 flex flex-col max-h-[200px]">
                <div className="flex justify-between items-center p-3 border-b border-purple-600 flex-shrink-0">
                  <h3 className="font-bold text-purple-200">Chat Summary</h3>
                  <button
                    onClick={() => setChatSummary("")}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent">
                  <p className="text-white text-sm whitespace-pre-wrap">{chatSummary}</p>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Chat History Section */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <div className="space-y-4">
              {chatHistory.length > 0 ? (
                [...chatHistory]
                  .sort((a, b) => {
                    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                    return timeA - timeB;
                  })
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg max-w-full ${msg.sender === "user"
                          ? "bg-blue-600 ml-auto"
                          : msg.sender === "system"
                            ? "bg-yellow-600"
                            : "bg-gray-700"
                        }`}
                    >
                      <div className="font-semibold text-sm mb-1 text-white">
                        {msg.sender === "user" ? "You" : msg.sender === "system" ? "System" : "Assistant"}
                      </div>
                      <div className="text-white break-words whitespace-pre-wrap">{msg.text}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        {msg.timestamp instanceof Date
                          ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-gray-300 text-center py-8 px-4">
                  <p className="text-lg mb-2">No conversation yet.</p>
                  <p className="text-sm">Start by typing a message or uploading a document!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Captions Display - Movie/YouTube Style Subtitles */}
      {(currentMessageText || displayedCaptionText) && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none px-4 w-full max-w-3xl">
          <div className="relative animate-cinematicFadeIn">
            {/* Movie/YouTube style subtitle background */}
            <div
              className="inline-block px-4 py-2 rounded-sm"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Caption text - Movie/YouTube style */}
              <p
                className="text-lg md:text-xl font-normal leading-relaxed text-center break-words text-white"
                style={{
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8), 0 0 4px rgba(0, 0, 0, 0.5)',
                  letterSpacing: '0.01em',
                  lineHeight: '1.4',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {cleanCaption(displayedCaptionText || currentMessageText)}
                {displayedCaptionText && displayedCaptionText.length < currentMessageText.length && (
                  <span className="inline-block w-0.5 h-5 bg-white ml-1 animate-pulse align-middle"></span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Main Interface - Right side */}
      <div className="flex-1 flex flex-col justify-between p-4">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <h1 className="font-black text-xl text-gray-700">Adam</h1>
          <p className="text-gray-600">
            {loading ? "Loading..." : "Type a message and press enter to chat with the AI."}
          </p>
          {isUploading && (
            <p className="text-gray-600 mt-2">Uploading document...</p>
          )}
        </div>


        {/* Retention Test Modal — keyed to active session so quiz always builds from current chat */}
        {isRetentionTestOpen && (
          <RetentionTest
            key={`quiz-${activeSessionId || 'local'}`}
            chatHistory={chatHistory}
            onClose={() => setIsRetentionTestOpen(false)}
          />
        )}

        {/* Flashcards Modal — keyed to active session so deck always builds from current chat */}
        {isFlashcardsOpen && (
          <Flashcards
            key={`flash-${activeSessionId || 'local'}`}
            chatHistory={chatHistory}
            onClose={() => setIsFlashcardsOpen(false)}
          />
        )}

        {/* Restore hidden images */}
      {hiddenImages.length > 0 && (!currentImages || currentImages.length === 0) && (
        <button
          onClick={() => { setCurrentImages(hiddenImages); setHiddenImages([]); }}
          title="Show images"
          className="absolute right-4 top-32 bg-black bg-opacity-50 backdrop-blur-md text-white p-3 rounded-lg pointer-events-auto z-20 hover:bg-opacity-70 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </button>
      )}

      {/* Images Display Section - Middle Right, won't overlap controls */}
        {currentImages && currentImages.length > 0 && (
          <div className="absolute right-4 top-32 bg-black bg-opacity-50 backdrop-blur-md p-4 rounded-lg pointer-events-auto z-10" style={{ maxWidth: '350px', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white text-sm font-semibold">Related images</span>
              <button
                onClick={() => { setHiddenImages(currentImages); setCurrentImages([]); }}
                title="Hide images"
                className="text-gray-300 hover:text-white bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full p-1 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {currentImages.map((imageData, index) => {
                // Handle both old format (just URL string) and new format (object with url and label)
                const imageUrl = typeof imageData === 'string' ? imageData : imageData.url;
                const imageLabel = typeof imageData === 'object' && imageData.label ? imageData.label : null;

                return (
                  <div
                    key={`img-${index}-${imageUrl}`}
                    className="relative overflow-hidden rounded-lg shadow-lg cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: '#1a1a1a' }}
                    onClick={() => setZoomedImage({ url: imageUrl, label: imageLabel, index })}
                  >
                    <img
                      src={imageUrl}
                      alt={imageLabel || `Related image ${index + 1}`}
                      className="w-full object-cover"
                      style={{ height: '200px', display: 'block' }}
                      onLoad={(e) => {
                        console.log(`Image ${index + 1} loaded successfully:`, imageUrl);
                      }}
                      onError={(e) => {
                        console.error(`Image ${index + 1} failed to load:`, imageUrl);
                        // Fallback to AI-generated image relevant to the topic
                        const fallbackPrompt = encodeURIComponent(imageLabel || `educational illustration ${index + 1}`);
                        e.target.src = `https://image.pollinations.ai/prompt/${fallbackPrompt}?width=350&height=200&nologo=true&seed=${Date.now()}_${index}`;
                      }}
                    />
                    {imageLabel && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 text-center">
                        {imageLabel}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Zoomed Image Modal */}
        {zoomedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center pointer-events-auto"
            onClick={() => setZoomedImage(null)}
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImage(null);
              }}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all z-50"
              aria-label="Close zoomed image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Zoomed Image Container */}
            <div
              className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={zoomedImage.url}
                alt={zoomedImage.label || `Zoomed image ${zoomedImage.index + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                style={{ cursor: 'zoom-out' }}
              />
              {zoomedImage.label && (
                <div className="mt-4 bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg text-center max-w-2xl">
                  <p className="text-lg font-semibold">{zoomedImage.label}</p>
                </div>
              )}
              {/* Hint text */}
              <div className="mt-2 text-white text-sm opacity-70">
                Press ESC or click outside to close
              </div>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col items-end justify-center gap-4"></div>
        {isLoggedIn ? (
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`bg-gray-500 hover:bg-gray-600 text-white p-4 px-4 font-semibold uppercase rounded-md ${recording ? "bg-red-500 hover:bg-red-600" : ""
              } ${loading || message ? "cursor-not-allowed opacity-30" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
          </button>

          <input
            className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder="Type a message..."
            ref={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`bg-gray-500 hover:bg-gray-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${loading || message ? "cursor-not-allowed opacity-30" : ""
              }`}
          >
            Send
          </button>

          {/* Stop Audio Button - Only shown when there's an active message */}
          {message && (
            <button
              onClick={stopAudio}
              className="bg-red-500 hover:bg-red-600 text-white p-4 px-4 font-semibold uppercase rounded-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                />
              </svg>
            </button>
          )}
        </div>
        ) : (
        <div className="flex items-center gap-3 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <div className="flex-1 p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md text-gray-600 italic text-center">
            Sign in to start chatting with Adam
          </div>
          <button
            onClick={() => { setIsAuthModalOpen(true); setIsLoginForm(true); setAuthError(''); }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-4 px-8 font-semibold rounded-md transition-all duration-200 shadow-lg"
          >
            Sign In
          </button>
        </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-auto px-4 w-full max-w-md">
          <div className="bg-gray-900 border border-teal-500 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-cinematicFadeIn">
            <span className="text-teal-300 text-lg flex-shrink-0">ⓘ</span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 pointer-events-auto">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden border border-gray-700 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {isLoginForm ? 'Welcome Back' : 'Create Account'}
                </h3>
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg">
                  <p className="text-red-200 text-sm">{authError}</p>
                </div>
              )}

              <form onSubmit={handleAuthSubmit}>
                {!isLoginForm && (
                  <div className="mb-4">
                    <label htmlFor="authName" className="block text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      id="authName"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="authEmail" className="block text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    id="authEmail"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="authPassword" className="block text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    id="authPassword"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50"
                >
                  {authLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : isLoginForm ? (
                    'Sign In'
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  {isLoginForm ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => { setIsLoginForm(!isLoginForm); setAuthError(''); }}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {isLoginForm ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};