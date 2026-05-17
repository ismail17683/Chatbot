import { describe, it, expect } from 'vitest';
import { sendChatMessage, PROVIDERS } from './aiService';

describe('AI Service Providers Schema (Groq-Only)', () => {
  it('should list only Groq Cloud as the active AI provider', () => {
    expect(PROVIDERS).toHaveProperty('GROQ');
    expect(Object.keys(PROVIDERS)).toHaveLength(1);
  });

  it('should default to the Llama 3.1 8B Instant model', () => {
    expect(PROVIDERS.GROQ.defaultModel).toBe('llama-3.1-8b-instant');
    expect(PROVIDERS.GROQ.models[0].id).toBe('llama-3.1-8b-instant');
  });
});

describe('AI Service Request Router & Fallbacks', () => {
  it('should fall back to Simulator when no API key is provided', async () => {
    const history = [{ role: 'user', content: 'hello' }];
    const config = {
      provider: 'groq',
      apiKey: '',
      model: 'llama-3.1-8b-instant'
    };

    const response = await sendChatMessage(history, config);
    expect(response).toContain('Welcome to AI Chatbot!');
  });

  it('should fall back to Simulator when key is default placeholder', async () => {
    const history = [{ role: 'user', content: 'hello' }];
    const config = {
      provider: 'groq',
      apiKey: 'gsk_your_groq_api_key_placeholder',
      model: 'llama-3.1-8b-instant'
    };

    const response = await sendChatMessage(history, config);
    expect(response).toContain('Welcome to AI Chatbot!');
  });
});

describe('High-Fidelity Simulator Content Engines', () => {
  it('should return premium code snippets when keywords match developer code triggers', async () => {
    const history = [{ role: 'user', content: 'Write a JavaScript debounce function' }];
    const config = {
      provider: 'groq',
      apiKey: '',
      model: 'llama-3.1-8b-instant'
    };

    const response = await sendChatMessage(history, config);
    expect(response).toContain('### 🚀 Smart Code Solutions');
    expect(response).toContain('function debounce');
    expect(response).toContain('```javascript');
  });

  it('should return glassmorphic designs when design words match triggers', async () => {
    const history = [{ role: 'user', content: 'Create a glassmorphism card' }];
    const config = {
      provider: 'groq',
      apiKey: '',
      model: 'llama-3.1-8b-instant'
    };

    const response = await sendChatMessage(history, config);
    expect(response).toContain('### ✨ Premium Glassmorphism Design System');
    expect(response).toContain('.glass-card');
    expect(response).toContain('backdrop-filter: blur(16px)');
  });
});
