import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Settings, 
  Sun, 
  Moon, 
  Send, 
  RefreshCw, 
  X, 
  AlertCircle,
  HelpCircle, 
  Info, 
  Check, 
  Copy,
  ChevronLeft,
  Menu,
  Terminal,
  Cpu
} from 'lucide-react';
import { marked } from 'marked';
import { sendChatMessage, PROVIDERS, GROQ_API_KEY } from './aiService';
import './App.css';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Add custom marked renderer for premium copyable code blocks
const renderer = new marked.Renderer();
renderer.code = (code, language) => {
  const lang = language || 'code';
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-block-lang">${lang}</span>
        <button class="copy-btn" onclick="
          navigator.clipboard.writeText(this.parentElement.nextElementSibling.firstElementChild.innerText);
          this.classList.add('copied');
          this.innerHTML = '✓ Copied';
          setTimeout(() => {
            this.classList.remove('copied');
            this.innerHTML = 'Copy';
          }, 2000);
        ">Copy</button>
      </div>
      <pre><code class="language-${lang}">${escapedCode}</code></pre>
    </div>
  `;
};
marked.use({ renderer });

const DEFAULT_CHAT_ID = 'welcome-chat';
const DEFAULT_CHATS = [
  {
    id: DEFAULT_CHAT_ID,
    title: 'Getting Started 👋',
    messages: [
      {
        role: 'assistant',
        content: '### 👋 Welcome to AI Chatbot!\n\nHello! I am a highly responsive, custom frontend AI Chatbot. You can start typing below to interact with me.\n\n* **Simulation Mode**: Try asking me to *"write a JavaScript debounce function"* or *"design a glassmorphic card in CSS"* to see rich styled responses, copyable code blocks, and markdown summaries!\n* **Configure API**: Click the **Settings (⚙️)** icon in the top right to configure your own Groq API keys.\n* **Design Aesthetics**: Toggle dark/light modes using the **Sun/Moon** button in the header.\n\nHow can I help you today?',
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_CONFIG = {
  provider: 'groq',
  apiKey: '',
  model: 'llama-3.1-8b-instant',
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant. Provide detailed answers with clean, semantic structure.'
};

function App() {
  // --- Persistent State ---
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('aura_chats');
    return saved ? JSON.parse(saved) : DEFAULT_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return localStorage.getItem('aura_active_chat') || DEFAULT_CHAT_ID;
  });

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('aura_config');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    // Safely enforce Groq if legacy providers are cached in their browser local storage
    if (!parsed || !parsed.provider || !PROVIDERS[parsed.provider.toUpperCase()]) {
      return DEFAULT_CONFIG;
    }
    return parsed;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('aura_theme') || 'dark';
  });

  const isCodeKeyConfigured = GROQ_API_KEY && GROQ_API_KEY !== 'gsk_your_groq_api_key_placeholder';

  // --- UI Interactivity State ---
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Inline editing state for chat history titles
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Custom Modal form fields (buffered copy of config)
  const [modalConfig, setModalConfig] = useState({ ...config });
  
  // Toast notifications state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Ref handles for DOM manipulation
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // --- Persistent Synchronizers ---
  useEffect(() => {
    localStorage.setItem('aura_chats', JSON.stringify(chats));
  }, [chats]);

  // Sync back-compatibility
  useEffect(() => {
    // If old antigravity keys exist, migrate them to keep the user's history!
    const oldChats = localStorage.getItem('antigravity_chats');
    if (oldChats && !localStorage.getItem('aura_chats')) {
      localStorage.setItem('aura_chats', oldChats);
      setChats(JSON.parse(oldChats));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aura_active_chat', activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    localStorage.setItem('aura_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('aura_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-scroll conversation to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeChatId, isGenerating]);

  // Handle auto-resizing textarea as text expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight - 12}px`;
    }
  }, [inputMessage]);

  // Cleanup typewriter interval on teardown
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  // --- Toast Trigger Helper ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // --- Chat Management Handlers ---
  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChatObj = {
      id: newId,
      title: 'New Chat Thread',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setChats(prev => [newChatObj, ...prev]);
    setActiveChatId(newId);
    setIsSidebarOpen(false);
    showToast('New chat created successfully', 'success');
    
    // Focus text input
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleDeleteChat = (id, e) => {
    e.stopPropagation(); // Avoid selecting the chat
    const filtered = chats.filter(c => c.id !== id);
    
    if (filtered.length === 0) {
      // Re-create default if all deleted
      setChats(DEFAULT_CHATS);
      setActiveChatId(DEFAULT_CHAT_ID);
    } else {
      setChats(filtered);
      if (activeChatId === id) {
        setActiveChatId(filtered[0].id);
      }
    }
    showToast('Conversation deleted', 'info');
  };

  const handleStartRename = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitleValue(chat.title);
  };

  const handleSaveRename = (id) => {
    if (!editTitleValue.trim()) return;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: editTitleValue.trim() } : c));
    setEditingChatId(null);
    showToast('Chat renamed', 'success');
  };

  const handleResetHistory = () => {
    if (window.confirm('Are you absolutely sure you want to clear your entire chat history? This cannot be undone.')) {
      setChats(DEFAULT_CHATS);
      setActiveChatId(DEFAULT_CHAT_ID);
      showToast('All conversation history cleared', 'info');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Open settings with latest configuration
  const handleOpenSettings = () => {
    setModalConfig({ ...config });
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setConfig({ ...modalConfig });
    setIsSettingsOpen(false);
    showToast('Settings saved successfully!', 'success');
  };

  // Quick suggestion clicks
  const handleSuggestionClick = (prompt) => {
    setInputMessage(prompt);
    setTimeout(() => {
      // Auto submit
      handleSubmitPrompt(prompt);
    }, 50);
  };

  // --- API Timeout Racer Wrapper ---
  const fetchWithTimeout = (promise, ms = 22000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out. The AI model took too long to respond. Please check your network or try another provider.')), ms)
      )
    ]);
  };

  // --- AI Message Generation Trigger ---
  const handleSubmitPrompt = async (forcedPrompt = null) => {
    const finalPrompt = (forcedPrompt || inputMessage).trim();
    
    // 1. Validation (Empty Prompts)
    if (!finalPrompt) {
      showToast('Please type a question or choose a suggestion.', 'error');
      return;
    }

    if (isGenerating) return;

    // Save user message to chat immediately
    const userMessage = {
      role: 'user',
      content: finalPrompt,
      createdAt: new Date().toISOString()
    };

    let activeChat = chats.find(c => c.id === activeChatId);
    let updatedMessages = [...(activeChat?.messages || []), userMessage];
    
    // Auto update chat title if it was named "New Chat Thread"
    let updatedTitle = activeChat?.title || 'Chat';
    if (updatedTitle === 'New Chat Thread') {
      updatedTitle = finalPrompt.length > 28 ? `${finalPrompt.slice(0, 25)}...` : finalPrompt;
    }

    setChats(prev => prev.map(c => 
      c.id === activeChatId 
        ? { ...c, title: updatedTitle, messages: updatedMessages } 
        : c
    ));
    
    setInputMessage('');
    setIsGenerating(true);

    try {
      // 2. Fetch AI Answer (Timeout Protected)
      const providerModel = config.provider === 'simulator' 
        ? config.model 
        : PROVIDERS[config.provider.toUpperCase()]?.models.find(m => m.id === config.model)?.id || config.model;

      const apiCall = sendChatMessage(updatedMessages, {
        ...config,
        model: providerModel
      });

      const rawAiResponse = await fetchWithTimeout(apiCall, 25000);

      // 3. Setup streaming typewriter effect
      const streamingMsgId = `ai-msg-${Date.now()}`;
      const placeholderMessage = {
        id: streamingMsgId,
        role: 'assistant',
        content: '', // start empty for typewriter stream
        createdAt: new Date().toISOString(),
        isStreaming: true
      };

      setChats(prev => prev.map(c => 
        c.id === activeChatId 
          ? { ...c, messages: [...c.messages, placeholderMessage] } 
          : c
      ));

      // Streaming animation
      let typedCharIndex = 0;
      // Step size (typing speed / chunks)
      const chunkSize = Math.max(1, Math.floor(rawAiResponse.length / 75)); 
      
      typingTimerRef.current = setInterval(() => {
        typedCharIndex += chunkSize;
        
        if (typedCharIndex >= rawAiResponse.length) {
          clearInterval(typingTimerRef.current);
          setIsGenerating(false);
          // Set final complete message
          setChats(prev => prev.map(c => {
            if (c.id !== activeChatId) return c;
            return {
              ...c,
              messages: c.messages.map(m => 
                m.id === streamingMsgId 
                  ? { ...m, content: rawAiResponse, isStreaming: false } 
                  : m
              )
            };
          }));
        } else {
          // Incrementally stream partial text
          const partialText = rawAiResponse.slice(0, typedCharIndex);
          setChats(prev => prev.map(c => {
            if (c.id !== activeChatId) return c;
            return {
              ...c,
              messages: c.messages.map(m => 
                m.id === streamingMsgId 
                  ? { ...m, content: partialText } 
                  : m
              )
            };
          }));
        }
      }, 15);

    } catch (error) {
      console.error(error);
      setIsGenerating(false);
      
      // Inject fallback system warning in message thread for user ease of debugging
      const errorMessage = {
        role: 'assistant',
        content: `### ❌ API Connection Failed

There was an issue processing your prompt with the chosen provider.

**Error Details:** 
> ${error.message}

**Troubleshooting Advice:**
1. **API Key missing/incorrect**: Verify your API credentials inside the top-right settings panel.
2. **Network Connection**: Ensure you are connected to the internet.
3. **CORS limitations**: Anthropic models are subject to direct-browser restrictions. Try changing the AI provider to **Google Gemini** or **Interactive Simulator** which work seamlessly.`,
        createdAt: new Date().toISOString(),
        isError: true
      };

      setChats(prev => prev.map(c => 
        c.id === activeChatId 
          ? { ...c, messages: [...c.messages, errorMessage] } 
          : c
      ));
      
      showToast(error.message || 'API Call failed. Check keys.', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  };

  // Find active chat room details
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];

  return (
    <div className="workspace-container">
      
      {/* 2. Chat Sidebar Drawer */}
      <aside className={`sidebar-panel ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <a href="#" className="app-brand" onClick={(e) => e.preventDefault()}>
            <span className="app-logo">✨</span>
            <span className="app-name">AI Chatbot</span>
          </a>
          <button className="new-room-btn" onClick={handleNewChat} title="Create New Room">
            <Plus size={16} />
          </button>
        </div>

        {/* Saved Chats History List */}
        <div className="sidebar-content">
          {chats.map(chat => {
            const isActive = chat.id === activeChatId;
            const isEditing = chat.id === editingChatId;

            return (
              <div 
                key={chat.id} 
                className={`room-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (!isEditing) {
                    setActiveChatId(chat.id);
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <div className="room-label-container">
                  <span className="room-icon">{isActive ? '💬' : '📁'}</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="room-rename-input" 
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onBlur={() => handleSaveRename(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(chat.id);
                        if (e.key === 'Escape') setEditingChatId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="room-title">{chat.title}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="room-actions">
                    <button 
                      className="room-action-btn" 
                      title="Rename Room"
                      onClick={(e) => handleStartRename(chat, e)}
                    >
                      <Edit3 size={11} />
                    </button>
                    <button 
                      className="room-action-btn delete" 
                      title="Delete Room"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar-tag">U</div>
            <div className="user-details">
              <span className="user-name">Guest</span>
              <span className="user-status">Workspace Active</span>
            </div>
          </div>
          <div className="footer-controls">
            <button className="icon-btn" title="Reset Workspace & Memory" onClick={handleResetHistory}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Main Chat Viewport */}
      <main className="chat-workspace">
        
        {/* Chat Area Header */}
        <header className="chat-header">
          <div className="active-chat-info">
            <span className="active-chat-title">{activeChat?.title}</span>
            <div className="active-chat-model">
              <span className="model-dot"></span>
              <span>
                {config.provider === 'simulator' 
                  ? 'Local Simulator (No Key)' 
                  : `${PROVIDERS[config.provider.toUpperCase()]?.name || config.provider} : ${config.model}`
                }
              </span>
            </div>
          </div>

          <div className="chat-header-actions">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button 
              className="theme-toggle-btn" 
              style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', marginRight: '6px' }}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={15} />
            </button>

            {/* Dark/Light Theme Toggle */}
            <button 
              className="theme-toggle-btn" 
              title={theme === 'dark' ? 'Switch to Slate Light' : 'Switch to Luminous Dark'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            
            {/* Modal Config Settings */}
            <button 
              className="theme-toggle-btn" 
              title="Workspace Settings"
              onClick={handleOpenSettings}
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Scrollable Conversation Bubbles */}
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            
            /* Empty Conversation Splash */
            <div className="empty-chat-splash animate-fade-in">
              <div className="splash-card-inner">
                <span className="splash-icon animate-float">✨</span>
                <h1 className="splash-title">AI Chatbot</h1>
                <p className="splash-subtitle">A breathtaking glassmorphic workspace powered by Groq Cloud. Click a starting suggestion template below to initiate simulated answers instantly.</p>
                
                <div className="suggestion-grid">
                  <div 
                    className="suggest-card" 
                    onClick={() => handleSuggestionClick('Write an optimized JavaScript debounce function')}
                  >
                    <span className="suggest-icon">💻</span>
                    <span className="suggest-headline">Code Optimization</span>
                    <span className="suggest-sub">Write a debounced execution closure with cancel timers.</span>
                  </div>
                  <div 
                    className="suggest-card" 
                    onClick={() => handleSuggestionClick('Design a premium translucent card using glassmorphism in CSS')}
                  >
                    <span className="suggest-icon">✨</span>
                    <span className="suggest-headline">Glassmorphic Cards</span>
                    <span className="suggest-sub">Create crystal borders and saturation filters in modern CSS.</span>
                  </div>
                  <div 
                    className="suggest-card" 
                    onClick={() => handleSuggestionClick('Explain quantum computing to a 6 year old')}
                  >
                    <span className="suggest-icon">🧠</span>
                    <span className="suggest-headline">Complex Superposition</span>
                    <span className="suggest-sub">Deconstruct quantum theory using relatable analogies.</span>
                  </div>
                  <div 
                    className="suggest-card" 
                    onClick={() => handleSuggestionClick('What are the top front-end trends for 2026? Put them in a neat table')}
                  >
                    <span className="suggest-icon">📊</span>
                    <span className="suggest-headline">Neat Structure Matrix</span>
                    <span className="suggest-sub">Review 2026 web standard trends inside an organized table.</span>
                  </div>
                </div>
              </div>
            </div>

          ) : (
            
            /* Conversation Bubble List */
            <div className="messages-list-inner">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                
                return (
                  <div key={index} className={`message-bubble-wrapper ${isUser ? 'user-msg' : 'ai-msg'} animate-slide-up`}>
                    <div className="msg-avatar">
                      {isUser ? 'U' : '✨'}
                    </div>

                    <div className="msg-body-shell">
                      <span className="msg-sender-name">{isUser ? 'You' : 'AI Chatbot'}</span>
                      <div className="msg-card">
                        {isUser ? (
                          <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        ) : (
                          /* Markdown Response Content */
                          <div 
                            className="markdown-content" 
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                          />
                        )}
                        
                        {/* Timestamp & Meta tags */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.isError && <span style={{ color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}><AlertCircle size={10} /> Timeout Error</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shimmer skeleton shown while waiting for API responses */}
          {isGenerating && (
            <div className="messages-list-inner">
              <div className="message-bubble-wrapper ai-msg animate-slide-up">
                <div className="msg-avatar">✨</div>
                <div className="msg-body-shell">
                  <span className="msg-sender-name">AI Chatbot</span>
                  <div className="msg-card" style={{ width: '400px', minHeight: '80px' }}>
                    <div className="shimmer-bubble-wrapper">
                      <div className="shimmer-line short shimmer-bg"></div>
                      <div className="shimmer-line shimmer-bg"></div>
                      <div className="shimmer-line short shimmer-bg"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pinned Input Textarea Area */}
        <div className="floating-input-panel">
          <div className="input-container-glass">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Ask anything... (Use Shift+Enter for new line)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              rows={1}
            />
            
            <div className="input-bar-controls">
              <div className="input-meta-indicator">
                <span>Shift+Enter for newline</span>
                <span>•</span>
                <span 
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={handleOpenSettings}
                >
                  Active Provider: {!config.apiKey && !isCodeKeyConfigured 
                    ? 'AI Chatbot (Simulated Playground)' 
                    : config.apiKey 
                      ? 'Groq Cloud (Custom Override Key)' 
                      : 'Groq Cloud (Code Key Active)'}
                </span>
              </div>

              <div className="input-actions">
                <button 
                  className="send-message-btn" 
                  disabled={isGenerating || !inputMessage.trim()}
                  onClick={() => handleSubmitPrompt()}
                  title="Send Message"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Sleek Config settings modal overlay */}
      {isSettingsOpen && (
        <div className="modal-overlay-frosted" onClick={() => setIsSettingsOpen(false)}>
          <form 
            className="settings-card-glass" 
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveSettings}
          >
            <div className="settings-modal-header">
              <span className="settings-modal-title">⚙️ Workspace Settings</span>
              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="settings-form-content">
              {/* Select AI Provider */}
              <div className="settings-field-group">
                <label className="settings-field-label">AI Model Provider</label>
                <select 
                  className="settings-select"
                  value={modalConfig.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    const defaultModel = PROVIDERS[newProvider.toUpperCase()].defaultModel;
                    setModalConfig(prev => ({
                      ...prev,
                      provider: newProvider,
                      model: defaultModel
                    }));
                  }}
                >
                  {Object.values(PROVIDERS).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* API Key field (Only show if not simulator) */}
              {modalConfig.provider !== 'simulator' && (
                <div className="settings-field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="settings-field-label" style={{ margin: 0 }}>API Access Key</label>
                    {isCodeKeyConfigured && (
                      <span style={{ fontSize: '10px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        ✓ Stored in Code
                      </span>
                    )}
                  </div>
                  <input 
                    type="password"
                    className="settings-input"
                    placeholder={isCodeKeyConfigured ? '•••••••• (Using active key from codebase)' : `Enter your ${PROVIDERS[modalConfig.provider.toUpperCase()]?.name} key`}
                    value={modalConfig.apiKey}
                    onChange={(e) => setModalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    required={!isCodeKeyConfigured}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                    {isCodeKeyConfigured 
                      ? '✨ An API key is already configured in the codebase. Leave this field empty to use it, or enter a temporary one to override it.' 
                      : '🔑 Keys are strictly stored local to your browser storage and never travel to any external server besides direct API requests.'}
                  </span>
                </div>
              )}

              {/* Select specific Provider Models */}
              <div className="settings-field-group">
                <label className="settings-field-label">Model Selector</label>
                <select 
                  className="settings-select"
                  value={modalConfig.model}
                  onChange={(e) => setModalConfig(prev => ({ ...prev, model: e.target.value }))}
                >
                  {PROVIDERS[modalConfig.provider.toUpperCase()]?.models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Temperature & Parameters slider */}
              <div className="settings-field-group">
                <label className="settings-field-label">Temperature: {modalConfig.temperature}</label>
                <input 
                  type="range"
                  min="0"
                  max="1.2"
                  step="0.1"
                  className="settings-range-slider"
                  value={modalConfig.temperature}
                  onChange={(e) => setModalConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                />
                <div className="slider-labels">
                  <span>🎯 Factual</span>
                  <span>⚖️ Balanced</span>
                  <span>🎨 Creative</span>
                </div>
              </div>

              {/* System Instruct Instruction */}
              <div className="settings-field-group">
                <label className="settings-field-label">System Instructions</label>
                <textarea 
                  className="settings-input"
                  rows={2}
                  style={{ resize: 'vertical' }}
                  value={modalConfig.systemPrompt}
                  onChange={(e) => setModalConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Instructs the chatbot on how to act, behave, and structure its thinking.
                </span>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button 
                type="button" 
                className="modal-btn secondary" 
                onClick={() => setIsSettingsOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="modal-btn primary"
              >
                Apply Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Custom Status Toast pop-up alerts */}
      {toast.show && (
        <div className="toast-overlay-container">
          <span>✨</span>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default App;
