/**
 * Ollama AI Service for Butler App
 * Connects to Ollama API (local or remote AWS EC2/ECS/ALB instance)
 * Model default: qwen2.5:0.5b
 * Powered by SystemPromptArchitect for high-IQ reasoning & domain grounding
 */

const { SystemPromptArchitect } = require('../prompts/butler.prompts');

const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 60000;

class OllamaService {
  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    this.timeoutMs = DEFAULT_TIMEOUT_MS;
  }

  /**
   * Get the active configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      model: this.model,
      timeoutMs: this.timeoutMs,
      availablePersonas: this.getPersonas().map(p => p.id)
    };
  }

  /**
   * Update base URL or model dynamically at runtime
   */
  updateConfig({ baseUrl, model, timeoutMs }) {
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/+$/, '');
    if (model) this.model = model;
    if (timeoutMs) this.timeoutMs = timeoutMs;
  }

  /**
   * Check Ollama connectivity & health
   */
  async checkHealth() {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          status: 'degraded',
          connected: false,
          error: `Ollama returned HTTP status ${response.status}`,
          baseUrl: this.baseUrl,
          model: this.model,
          latencyMs: Date.now() - startTime
        };
      }

      const data = await response.json();
      const models = (data.models || []).map(m => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
        details: m.details
      }));

      const modelFound = models.some(m => m.name === this.model || m.name.startsWith(this.model));

      return {
        status: 'healthy',
        connected: true,
        baseUrl: this.baseUrl,
        activeModel: this.model,
        isModelAvailable: modelFound,
        modelsCount: models.length,
        models,
        latencyMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        status: 'offline',
        connected: false,
        baseUrl: this.baseUrl,
        activeModel: this.model,
        error: err.message || 'Cannot reach Ollama server',
        latencyMs: Date.now() - startTime,
        tip: 'Ensure Ollama is running (`ollama serve`) or update OLLAMA_BASE_URL to point to your AWS EC2/ECS instance.'
      };
    }
  }

  /**
   * List all models currently installed in Ollama
   */
  async listModels() {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch models from Ollama (${response.status})`);
    }
    return await response.json();
  }

  /**
   * Trigger pulling a model in Ollama (e.g. qwen2.5:0.5b)
   */
  async pullModel(modelName = this.model) {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
      signal: AbortSignal.timeout(180000)
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model ${modelName} from Ollama: HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Build complete system prompt combining cognitive architecture, persona & user context
   */
  buildSystemPrompt(personaKey = 'eaton', userContext = {}) {
    return SystemPromptArchitect.buildPrompt(personaKey, userContext);
  }

  /**
   * Generate Chat Response via Ollama API
   */
  async chat({
    messages = [],
    persona = 'eaton',
    userContext = {},
    model = this.model,
    temperature = 0.7
  }) {
    const { systemPrompt, persona: selectedPersona } = this.buildSystemPrompt(persona, userContext);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role || 'user',
        content: m.content || ''
      }))
    ];

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || this.model,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: typeof temperature === 'number' ? temperature : 0.7
          }
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Chat Error (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const durationMs = Date.now() - startTime;

      return {
        success: true,
        message: {
          role: 'assistant',
          content: data.message?.content || ''
        },
        model: data.model || model,
        concierge: {
          id: selectedPersona.id,
          name: selectedPersona.name,
          title: selectedPersona.title,
          avatar: selectedPersona.avatar
        },
        metrics: {
          totalDurationMs: durationMs,
          evalCount: data.eval_count,
          evalDuration: data.eval_duration,
          promptEvalCount: data.prompt_eval_count
        },
        source: 'ollama'
      };
    } catch (err) {
      console.warn(`[OllamaService] Error contacting Ollama API at ${this.baseUrl}: ${err.message}. Using intelligent fallback concierge response.`);
      
      const fallbackResponse = this.generateFallbackResponse(messages, selectedPersona, userContext);
      return {
        success: true,
        message: {
          role: 'assistant',
          content: fallbackResponse
        },
        model: `${model} (fallback)`,
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
        warning: `Ollama server at ${this.baseUrl} was unreachable (${err.message}). Delivered via Butler Concierge Fallback Engine.`,
        source: 'fallback'
      };
    }
  }

  /**
   * Stream Chat Response via Server-Sent Events / Chunked Stream
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
    const { systemPrompt, persona: selectedPersona } = this.buildSystemPrompt(persona, userContext);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role || 'user',
        content: m.content || ''
      }))
    ];

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || this.model,
          messages: formattedMessages,
          stream: true,
          options: {
            temperature: typeof temperature === 'number' ? temperature : 0.7
          }
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Stream Error (HTTP ${response.status}): ${errorText}`);
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
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (onChunk && parsed.message?.content) {
              onChunk(parsed.message.content, parsed);
            }
            if (parsed.done && onDone) {
              onDone(parsed);
            }
          } catch (e) {
            // Ignore parse errors on partial frames
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (onChunk && parsed.message?.content) {
            onChunk(parsed.message.content, parsed);
          }
          if (parsed.done && onDone) {
            onDone(parsed);
          }
        } catch (e) {
          // ignore
        }
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
   * Generate intelligent fallback response when Ollama backend is offline
   */
  generateFallbackResponse(messages, persona, userContext) {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const name = userContext.fullName || userContext.name || 'Sir';
    const title = userContext.preferredTitle ? `${userContext.preferredTitle} ${name}` : name;

    if (lastMessage.includes('table') || lastMessage.includes('dinner') || lastMessage.includes('reservation') || lastMessage.includes('two')) {
      return `Good evening, ${title}. I would be delighted to arrange a table for two tonight. May I suggest Claridge's Bar or The Connaught Grill in Mayfair? Both offer exemplary private dining for members of the 12 Houses. Shall I proceed with the reservation for 8:00 PM?`;
    }

    if (lastMessage.includes('weekend') || lastMessage.includes('what\'s on') || lastMessage.includes('event')) {
      return `Indeed, ${title}. This weekend features the Great Autumn Fellowship Dinner at the Grand Hall, alongside the Gentlemen's Fencing Masterclass hosted by House Percival. Furthermore, the private lounge at Mayfair Chapter is reserved for our members.`;
    }

    if (lastMessage.includes('house') || lastMessage.includes('arthur') || lastMessage.includes('percival')) {
      return `The 12 Houses of Gentlemen represent our highest ideals of chivalry, leadership, and camaraderie. Each house—from Arthur's noble vision to Percival's passionate pursuit—provides fellowship and distinguished private facilities worldwide.`;
    }

    return `At your service, ${title}. As your dedicated concierge, Eaton, I am at your disposal for dinner reservations, private club access, travel arrangements, or guidance across the 12 Houses. How may I be of assistance today?`;
  }

  /**
   * Get all registered concierge personas
   */
  getPersonas() {
    return SystemPromptArchitect.getPersonas();
  }

  /**
   * Get quick prompt suggestions for the mobile/web UI
   */
  getSuggestions(city = 'London') {
    return [
      { id: 'sugg_1', label: 'A table for two tonight', prompt: 'Please arrange a table for two tonight at a premier dining venue in London.' },
      { id: 'sugg_2', label: 'What\'s on this weekend?', prompt: 'What private events and house activities are scheduled for this weekend?' },
      { id: 'sugg_3', label: 'Private club recommendations', prompt: 'Recommend exclusive private gentlemen clubs and lounges in ' + city + '.' },
      { id: 'sugg_4', label: 'Guide to the 12 Houses', prompt: 'Tell me about the traditions and mottos of the 12 Houses of Gentlemen.' },
      { id: 'sugg_5', label: 'Book spa and wellness', prompt: 'I would like to book a private wellness session at the Aman Spa.' }
    ];
  }
}

module.exports = new OllamaService();
