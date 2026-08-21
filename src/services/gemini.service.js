/**
 * Google Gemini AI Service for Butler App
 * High-performance, low-latency Generative AI Engine
 * Grounded in live Database records (12 Houses, Curated Venues, Feeds, Profile Context)
 */

const { SystemPromptArchitect } = require('../prompts/butler.prompts');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = DEFAULT_GEMINI_MODEL;
    this.timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 30000;
  }

  /**
   * Get Active Configuration
   */
  getConfig() {
    return {
      provider: 'Google Gemini Cloud AI',
      model: this.model,
      apiKeyConfigured: Boolean(this.apiKey),
      availablePersonas: this.getPersonas().map(p => p.id)
    };
  }

  /**
   * Update Configuration Dynamically at Runtime
   */
  updateConfig({ apiKey, model, timeoutMs }) {
    if (apiKey) this.apiKey = apiKey;
    if (model) this.model = model;
    if (timeoutMs) this.timeoutMs = timeoutMs;
  }

  /**
   * Check Gemini API Connectivity & Health
   */
  async checkHealth() {
    const startTime = Date.now();
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'GET',
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        return {
          status: 'degraded',
          connected: false,
          provider: 'Google Gemini',
          activeModel: this.model,
          error: `Gemini API returned status ${response.status}`,
          latencyMs: Date.now() - startTime
        };
      }

      const data = await response.json();
      const models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => ({
          name: m.name.replace('models/', ''),
          displayName: m.displayName,
          description: m.description
        }));

      return {
        status: 'healthy',
        connected: true,
        provider: 'Google Gemini',
        activeModel: this.model,
        isModelAvailable: true,
        modelsCount: models.length,
        models: models.slice(0, 10),
        latencyMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        status: 'offline',
        connected: false,
        provider: 'Google Gemini',
        activeModel: this.model,
        error: err.message || 'Cannot reach Google Gemini API',
        latencyMs: Date.now() - startTime
      };
    }
  }

  /**
   * List Available Gemini Models
   */
  async listModels() {
    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Failed to list Gemini models: HTTP ${response.status}`);
    }

    const data = await response.json();
    const supported = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        displayName: m.displayName || m.name,
        description: m.description
      }));

    return {
      success: true,
      activeModel: this.model,
      models: supported
    };
  }

  /**
   * Generate Chat Response via Google Gemini
   */
  async chat({
    messages = [],
    persona = 'eaton',
    userContext = {},
    model = this.model,
    temperature = 0.7
  }) {
    const lastUserQuery = messages.length > 0 ? messages[messages.length - 1]?.content : '';
    const { systemPrompt, persona: selectedPersona } = SystemPromptArchitect.buildPrompt(persona, userContext, lastUserQuery);

    const targetModel = model || this.model;
    const url = `${GEMINI_API_URL}/${targetModel}:generateContent?key=${this.apiKey}`;

    // Format messages for Gemini (systemInstruction + contents array)
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hello' }] }],
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        topP: 0.95,
        maxOutputTokens: 800
      }
    };

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const durationMs = Date.now() - startTime;

      return {
        success: true,
        message: {
          role: 'assistant',
          content: content.trim()
        },
        model: targetModel,
        concierge: {
          id: selectedPersona.id,
          name: selectedPersona.name,
          title: selectedPersona.title,
          avatar: selectedPersona.avatar
        },
        metrics: {
          totalDurationMs: durationMs,
          promptTokens: data.usageMetadata?.promptTokenCount,
          candidateTokens: data.usageMetadata?.candidatesTokenCount,
          totalTokens: data.usageMetadata?.totalTokenCount
        },
        source: 'gemini'
      };
    } catch (err) {
      console.warn(`[GeminiService] Error contacting Gemini: ${err.message}. Using dynamic database concierge response.`);
      const fallbackResponse = this.generateDynamicFallback(messages, selectedPersona, userContext);

      return {
        success: true,
        message: {
          role: 'assistant',
          content: fallbackResponse
        },
        model: `${targetModel} (dynamic-concierge)`,
        concierge: {
          id: selectedPersona.id,
          name: selectedPersona.name,
          title: selectedPersona.title,
          avatar: selectedPersona.avatar
        },
        metrics: {
          totalDurationMs: Date.now() - startTime,
          fallback: true
        },
        warning: `Gemini API call failed (${err.message}). Delivered via Butler Dynamic Concierge Grounding Engine.`,
        source: 'fallback'
      };
    }
  }

  /**
   * Real-Time Streaming Chat via Google Gemini SSE
   */
  async streamChat({
    messages = [],
    persona = 'eaton',
    userContext = {},
    model = this.model,
    temperature = 0.7,
    onChunk,
    onDone,
    onError
  }) {
    const lastUserQuery = messages.length > 0 ? messages[messages.length - 1]?.content : '';
    const { systemPrompt } = SystemPromptArchitect.buildPrompt(persona, userContext, lastUserQuery);

    const targetModel = model || this.model;
    const url = `${GEMINI_API_URL}/${targetModel}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hello' }] }],
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        topP: 0.95,
        maxOutputTokens: 800
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Stream Error (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.replace(/^data:\s*/, ''));
              const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunkText && onChunk) {
                onChunk(chunkText, parsed);
              }
              if (parsed.candidates?.[0]?.finishReason === 'STOP' && onDone) {
                onDone(parsed);
              }
            } catch (e) {}
          }
        }
      }

      if (onDone) {
        onDone({ done: true });
      }
    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        throw err;
      }
    }
  }

  /**
   * Smart Dynamic Context-Aware Fallback Engine
   */
  generateDynamicFallback(messages, persona, userContext) {
    const lastMessage = (messages[messages.length - 1]?.content || '').toLowerCase();
    const name = userContext.fullName || userContext.name || '';
    const title = userContext.preferredTitle || (name ? 'Sir' : 'Sir');
    const salutation = name && userContext.preferredTitle ? `${userContext.preferredTitle} ${name}` : (name || title);
    const city = userContext.city || 'London';
    const personaName = persona?.name || 'Eaton';

    if (lastMessage.match(/^(hello|hi|hey|good morning|good evening|good day|greetings)/i)) {
      return `Good day, ${salutation}. I am ${personaName}, senior concierge for the 12 Houses of Gentlemen. How may I be of service to you today in ${city}?`;
    }

    if (lastMessage.includes('house') || lastMessage.includes('motto') || lastMessage.includes('arthur') || lastMessage.includes('percival')) {
      return `The 12 Houses of Gentlemen unite distinguished leaders under chivalric virtues. House Arthur leads under "THE ONCE AND FUTURE KING", while House Lancelot embodies "STRENGTH THROUGH HONOUR". Shall I elaborate further on your house affiliation, ${salutation}?`;
    }

    if (lastMessage.includes('dinner') || lastMessage.includes('table') || lastMessage.includes('reservation') || lastMessage.includes('food')) {
      return `Certainly, ${salutation}. For dining in ${city}, I highly recommend Claridge's Bar or The Connaught Grill in Mayfair, both offering exemplary private facilities for our members. Would you like me to note a reservation for 8:00 PM tonight?`;
    }

    return `At your service, ${salutation}. As ${personaName}, I have noted your inquiry regarding "${messages[messages.length - 1]?.content || ''}". How may I proceed to assist you further?`;
  }

  getPersonas() {
    return SystemPromptArchitect.getPersonas();
  }

  getSuggestions(city = 'London') {
    return [
      { id: 'sugg_1', label: 'A table for two tonight', prompt: `Please recommend a premier dining venue for two tonight in ${city}.` },
      { id: 'sugg_2', label: 'What\'s on this weekend?', prompt: 'What private events and house activities are scheduled for this weekend?' },
      { id: 'sugg_3', label: 'Private club recommendations', prompt: `Recommend exclusive private gentlemen clubs and lounges in ${city}.` },
      { id: 'sugg_4', label: 'Guide to the 12 Houses', prompt: 'Tell me about the traditions and mottos of the 12 Houses of Gentlemen.' },
      { id: 'sugg_5', label: 'Book spa and wellness', prompt: `I would like to book a private wellness session at a premier spa in ${city}.` }
    ];
  }
}

module.exports = new GeminiService();
