/**
 * AI Service for communicating with Groq Cloud or fallback simulation.
 */

// Hardcode your Groq API Key here
export const GROQ_API_KEY = "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";

export const PROVIDERS = {
  GROQ: {
    id: 'groq',
    name: 'Groq Cloud',
    models: [
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' }
    ],
    defaultModel: 'llama-3.1-8b-instant',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions'
  }
};

/**
 * Sends a message thread to Groq Cloud.
 * Falls back to local simulation if no active key is provided.
 * 
 * @param {Array} history Array of messages in { role: 'user'|'assistant', content: string } format
 * @param {Object} config Configuration object containing apiKey, provider, model, temperature, systemPrompt
 * @returns {Promise<string>} The generated text response
 */
export async function sendChatMessage(history, config) {
  const { apiKey, model, temperature = 0.7, systemPrompt = '' } = config;

  // Use user-provided API key from settings, or fall back to the hardcoded GROQ_API_KEY in the code
  const key = apiKey || GROQ_API_KEY;

  // If no key is provided, or the placeholder hasn't been replaced, or we are in test mode without an explicit key, trigger the simulator playground
  if (!key || key === 'gsk_your_groq_api_key_placeholder' || key === '' || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' && !apiKey)) {
    return simulateAiResponse(history, model);
  }

  return fetchGroq(history, key, model, temperature, systemPrompt);
}

/**
 * Fetch from Groq Cloud API (compatible with OpenAI Chat Completions endpoint)
 */
async function fetchGroq(history, apiKey, model, temperature, systemPrompt) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  history.forEach(msg => {
    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
  });

  const response = await fetch(PROVIDERS.GROQ.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: parseFloat(temperature),
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Groq API returned status ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data?.choices?.[0]?.message?.content;

  if (!generatedText) {
    throw new Error('Received empty text from Groq. Ensure your API key is valid and has credits.');
  }

  return generatedText;
}

/**
 * Incredibly high-fidelity Conversational Simulator to amaze users immediately
 * without needing to supply API credentials right away.
 */
function simulateAiResponse(history, model) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lastMessage = history[history.length - 1]?.content || '';
      const promptLower = lastMessage.toLowerCase();

      // Code requests
      if (promptLower.includes('code') || promptLower.includes('function') || promptLower.includes('write a program') || promptLower.includes('javascript') || promptLower.includes('python') || promptLower.includes('react') || promptLower.includes('html') || promptLower.includes('css')) {
        resolve(
          `### 🚀 Smart Code Solutions

Here is the clean, optimized implementation you requested:

\`\`\`javascript
/**
 * Executes a debounced function after a specified delay window.
 * Contains cancel controls to clear pending execution runs.
 */
function debounce(func, wait, immediate) {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}
\`\`\`

#### Key Benefits:
- **Zero Layout Thrashing**: Enforces clean call frequency bounding.
- **Microsecond Response**: Fast execution with internal timer cancel.
- **Safe Closures**: Prevents environment scope leaks.`
        );
        return;
      }

      // Design requests
      if (promptLower.includes('design') || promptLower.includes('glass') || promptLower.includes('glassmorphism') || promptLower.includes('aesthetic') || promptLower.includes('card') || promptLower.includes('css')) {
        resolve(
          `### ✨ Premium Glassmorphism Design System

You can create an extremely clean, beautiful glass card using these high-fidelity CSS specifications:

\`\`\`css
.glass-card {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
  color: #ffffff;
}
\`\`\`

#### CSS Parameter Breakdown:
| Parameter | Value | Purpose |
| :--- | :--- | :--- |
| \`background\` | \`rgba(255,255,255,0.07)\` | Keeps frosted sheets translucent and light |
| \`backdrop-filter\` | \`blur(16px) saturate(120%)\` | Creates glossy visual refraction of base layers |
| \`border\` | \`1px solid rgba(255,255,255,0.09)\` | Gives sharp crystal borders |
| \`box-shadow\` | \`0 8px 32px 0 rgba(0,0,0,0.2)\` | Lifts card above colored canvas |

> [!IMPORTANT]
> Glassmorphic elements depend heavily on a vibrant background. If placing them on a flat black or white page, they will appear dull and lose their translucent glass character.`
        );
        return;
      }

      // Greetings & Introductions
      if (promptLower.includes('hello') || promptLower.includes('hi') || promptLower.includes('hey') || promptLower.includes('greet') || promptLower.includes('who are you')) {
        resolve(
          `### 👋 Welcome to AI Chatbot!

Hello! I am **AI Chatbot**, a highly responsive, glassmorphic conversational workspace designed to give you instant, ultra-fast LLM interactions. 

You can interact with me in several ways:
1. **Chat right away**: Use this simulated interface to test my speed and inspect the gorgeous glass layouts.
2. **Add your API Credentials**: Click the **Settings (⚙️)** button in the top right to configure your own Groq API keys.
3. **Toggle Aesthetics**: Use the **Sun/Moon** button in the header to switch between Luminous Dark and Slate Light mode.

#### 💡 Suggested Topics to ask me:
- *"Write a JavaScript debounce function"*
- *"Design a gorgeous CSS glassmorphism card"*
- *"Show me a table of frontend trends"*
- *"Explain quantum computing in simple bullet points"*

What would you like to build or explore today?`
        );
        return;
      }

      // Simple Table layout
      if (promptLower.includes('trend') || promptLower.includes('table') || promptLower.includes('framework') || promptLower.includes('2026')) {
        resolve(
          `### 📊 Modern Web Ecosystem Matrix (2026 Trends)

Here is a summary matrix outlining the modern web ecosystems:

| Tech / Ecosystem | Primary Focus | Adoption Rating | Performance Score |
| :--- | :--- | :---: | :---: |
| **Vite & Rollup** | Fast Module Bundling | 🏆 96% | 🚀 9.8 / 10 |
| **React 19 & Server Actions** | Declarative Core Components | 📈 88% | ⚡ 8.9 / 10 |
| **TailwindCSS v4** | Utility CSS Composability | 📊 82% | ⚡ 9.2 / 10 |
| **Vitest Spec Runners** | Native ESM Unit Testing | 🧪 78% | 🚀 9.6 / 10 |

Let me know if you would like me to unpack any of these frameworks!`
        );
        return;
      }

      // Bullet explanation
      if (promptLower.includes('quantum') || promptLower.includes('superposition') || promptLower.includes('simple') || promptLower.includes('explain')) {
        resolve(
          `### 🧠 Quantum Superposition (Deconstructed)

Here is quantum superposition explained using simple, intuitive bullet points:

- **The Magic Coin**: Imagine spinning a coin on a table. While it is spinning, is it Heads or Tails? It is a *blur of both*. That blur is **Superposition**.
- **The Measurement Collapse**: The moment you slap your hand down on the spinning coin, the blur stops. It collapses into exactly *one* state (Heads or Tails). In quantum mechanics, observing a particle collapses its superposition.
- **Super-Speed Processing**: Traditional computers use transistors that are either 0 (Heads) or 1 (Tails). Quantum computers use qubits that can spin in superposition, allowing them to solve massive complex problems simultaneously.

Let me know if you want to explore quantum entanglement next!`
        );
        return;
      }

      // Default Fallback simulated conversation
      resolve(
        `### ✨ Chatbot Workspace Live Response

I received your prompt: *"${lastMessage}"*

Since this is the simulated playground mode, I can provide fast, high-fidelity formatted summaries. To make me respond using live Groq Cloud models:
1. Hardcode your Groq API Access Token directly in the codebase at [aiService.js](file:///Users/nikhiltinna/Chatbot/src/aiService.js).
2. Or input your Groq token inside the **Workspace Settings (⚙️)** menu in the header.

What would you like to explore next?`
      );
    }, 1500);
  });
}
