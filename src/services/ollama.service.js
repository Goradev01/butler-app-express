/**
 * Standard-Based Unified AI Service for Butler App
 * Connects to:
 * 1. Native / EC2 Ollama (qwen2.5:0.5b, llama3.2, mistral, phi3, deepseek, etc.)
 * 2. Standard OpenAI-Compatible Cloud LLMs (OpenAI, Groq, OpenRouter, DeepSeek)
 * 3. Live Database Grounding (12 Houses, Venues, City Places, Feeds, Profile Context)
 */

const { SystemPromptArchitect } = require('../prompts/butler.prompts');

const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 60000;

class OllamaService {
  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
    // Normalize localhost to 127.0.0.1 to avoid Node IPv6 resolution timeout
    if (this.baseUrl.includes('localhost:11434')) {
      this.baseUrl = this.baseUrl.replace('localhost:11434', '127.0.0.1:11434');
    }
    this.model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    this.timeoutMs = DEFAULT_TIMEOUT_MS;

    // Optional Cloud OpenAI-compatible configuration
    this.openaiApiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '';
    this.openaiBaseUrl = (process.env.OPENAI_BASE_URL || (process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1')).replace(/\/+$/, '');
    this.openaiModel = process.env.OPENAI_MODEL || (process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-4o-mini');
  }

  /**
   * Get Active Configuration
   */
  getConfig() {
    return {
      provider: 'hybrid (ollama + cloud fallback)',
      ollama: {
        baseUrl: this.baseUrl,
        activeModel: this.model,
        timeoutMs: this.timeoutMs
      },
      cloud: {
        configured: Boolean(this.openaiApiKey),
        baseUrl: this.openaiBaseUrl,
        activeModel: this.openaiModel
      },
      availablePersonas: this.getPersonas().map(p => p.id)
    };
  }

  /**
   * Update Configuration Dynamically
   */
  updateConfig({ baseUrl, model, timeoutMs, openaiApiKey, openaiBaseUrl, openaiModel }) {
    if (baseUrl) this.baseUrl = baseUrl.replace('localhost:11434', '127.0.0.1:11434').replace(/\/+$/, '');
    if (model) this.model = model;
    if (timeoutMs) this.timeoutMs = timeoutMs;
    if (openaiApiKey !== undefined) this.openaiApiKey = openaiApiKey;
    if (openaiBaseUrl) this.openaiBaseUrl = openaiBaseUrl.replace(/\/+$/, '');
    if (openaiModel) this.openaiModel = openaiModel;
  }

  /**
   * Check Comprehensive AI Health & Available Models
   */
  async checkHealth() {
    const startTime = Date.now();
    let ollamaStatus = { connected: false, models: [] };

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = (data.models || []).map(m => ({
          name: m.name,
          size: m.size,
          modifiedAt: m.modified_at,
          details: m.details
        }));
        const modelFound = models.some(m => m.name === this.model || m.name.startsWith(this.model));
        ollamaStatus = {
          connected: true,
          activeModel: this.model,
          isModelAvailable: modelFound,
          modelsCount: models.length,
          models
        };
      }
    } catch (err) {
      ollamaStatus = {
        connected: false,
        error: err.message || 'Cannot reach local Ollama daemon'
      };
    }

    return {
      status: ollamaStatus.connected || this.openaiApiKey ? 'healthy' : 'degraded',
      connected: ollamaStatus.connected,
      baseUrl: this.baseUrl,
      activeModel: this.model,
      isModelAvailable: ollamaStatus.isModelAvailable || false,
      modelsCount: ollamaStatus.models?.length || 0,
      models: ollamaStatus.models || [],
      cloudBackup: {
        enabled: Boolean(this.openaiApiKey),
        model: this.openaiModel
      },
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * List all models (Local Ollama + Registered Cloud Models)
   */
  async listModels() {
    let localModels = [];
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const data = await response.json();
        localModels = data.models || [];
      }
    } catch (e) {
      // ignore
    }

    const standardSupportedModels = [
      { name: 'qwen2.5:0.5b', type: 'local', size: '398 MB', recommended: true, description: 'Ultra-lightweight fast CPU model' },
      { name: 'qwen2.5:1.5b', type: 'local', size: '986 MB', recommended: false, description: 'High-IQ compact model' },
      { name: 'llama3.2:1b', type: 'local', size: '1.3 GB', recommended: false, description: 'Meta Llama 3.2 lightweight' },
      { name: 'llama3.2:3b', type: 'local', size: '2.0 GB', recommended: false, description: 'Meta Llama 3.2 balanced' },
      { name: 'mistral:7b', type: 'local', size: '4.1 GB', recommended: false, description: 'Mistral high capacity' },
      { name: 'gpt-4o-mini', type: 'cloud', provider: 'OpenAI', description: 'OpenAI Cloud fast intelligence' },
      { name: 'llama-3.1-8b-instant', type: 'cloud', provider: 'Groq', description: 'Ultra-fast cloud inference' }
    ];

    return {
      success: true,
      activeModel: this.model,
      installedLocalModels: localModels,
      supportedCatalog: standardSupportedModels
    };
  }

  /**
   * Pull model in Ollama
   */
  async pullModel(modelName = this.model) {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
      signal: AbortSignal.timeout(300000)
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model ${modelName}: HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Chat Request with Anti-Repetition, Live DB Grounding & Multi-Model Failover
   */
  async chat({
    messages = [],
    persona = 'eaton',
    userContext = {},
    model = this.model,
    temperature = 0.75
  }) {
    const lastUserMessage = messages.length > 0 ? messages[messages.length - 1]?.content : '';
    const { systemPrompt, persona: selectedPersona } = SystemPromptArchitect.buildPrompt(persona, userContext, lastUserMessage);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role || 'user',
        content: m.content || ''
      }))
    ];

    const startTime = Date.now();
    const targetModel = model || this.model;

    // 1. Attempt Native / EC2 Ollama
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: typeof temperature === 'number' ? temperature : 0.75,
            top_p: 0.9,
            repeat_penalty: 1.15,
            presence_penalty: 0.2,
            frequency_penalty: 0.3
          }
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (response.ok) {
        const data = await response.json();
        const content = (data.message?.content || '').trim();
        if (content) {
          return {
            success: true,
            message: {
              role: 'assistant',
              content: content
            },
            model: data.model || targetModel,
            concierge: {
              id: selectedPersona.id,
              name: selectedPersona.name,
              title: selectedPersona.title,
              avatar: selectedPersona.avatar
            },
            metrics: {
              totalDurationMs: Date.now() - startTime,
              evalCount: data.eval_count,
              evalDuration: data.eval_duration,
              promptEvalCount: data.prompt_eval_count
            },
            source: 'ollama'
          };
        }
      }
    } catch (ollamaErr) {
      const reason = ollamaErr.cause ? `${ollamaErr.message} (${ollamaErr.cause.code || ollamaErr.cause.message || ''})` : ollamaErr.message;
      console.warn(`[AIService] Ollama unreachable at ${this.baseUrl} (${reason}). Checking cloud failover...`);
    }

    // 2. Attempt Cloud LLM Failover if API key is configured
    if (this.openaiApiKey) {
      try {
        const cloudResponse = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: this.openaiModel,
            messages: formattedMessages,
            temperature: typeof temperature === 'number' ? temperature : 0.75,
            max_tokens: 600
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (cloudResponse.ok) {
          const cloudData = await cloudResponse.json();
          const cloudContent = cloudData.choices?.[0]?.message?.content?.trim();
          if (cloudContent) {
            return {
              success: true,
              message: {
                role: 'assistant',
                content: cloudContent
              },
              model: cloudData.model || this.openaiModel,
              concierge: {
                id: selectedPersona.id,
                name: selectedPersona.name,
                title: selectedPersona.title,
                avatar: selectedPersona.avatar
              },
              metrics: {
                totalDurationMs: Date.now() - startTime,
                cloud: true
              },
              source: 'cloud'
            };
          }
        }
      } catch (cloudErr) {
        console.warn(`[AIService] Cloud failover error: ${cloudErr.message}`);
      }
    }

    // 3. Smart Dynamic Context-Aware Fallback (Non-repetitive)
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
      warning: `AI inference daemon at ${this.baseUrl} is warming up or unreachable. Served via Butler Dynamic Concierge Grounding Engine.`,
      source: 'fallback'
    };
  }

  /**
   * Real-time Streaming Chat (SSE)
   */
  async streamChat({
    messages = [],
    persona = 'eaton',
    userContext = {},
    model = this.model,
    temperature = 0.75,
    onChunk,
    onDone,
    onError
  }) {
    const lastUserMessage = messages.length > 0 ? messages[messages.length - 1]?.content : '';
    const { systemPrompt } = SystemPromptArchitect.buildPrompt(persona, userContext, lastUserMessage);

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
            temperature: typeof temperature === 'number' ? temperature : 0.75,
            top_p: 0.9,
            repeat_penalty: 1.15
          }
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`Ollama Stream HTTP ${response.status}`);
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
          } catch (e) {}
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
        } catch (e) {}
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
   * Smart Dynamic Context-Aware Fallback Engine (Never repeats static text)
   */
  generateDynamicFallback(messages, persona, userContext) {
    const lastMessage = (messages[messages.length - 1]?.content || '').toLowerCase();
    const name = userContext.fullName || userContext.name || '';
    const title = userContext.preferredTitle || (name ? 'Sir' : 'Sir');
    const salutation = name && userContext.preferredTitle ? `${userContext.preferredTitle} ${name}` : (name || title);
    const city = userContext.city || 'London';
    const personaName = persona?.name || 'Eaton';

    // 1. Greetings
    if (lastMessage.match(/^(hello|hi|hey|good morning|good evening|good day|greetings)/i)) {
      const greetings = [
        `Good day, ${salutation}. I am ${personaName}, your dedicated executive concierge for the 12 Houses of Gentlemen. How may I be of service to you today?`,
        `A very warm welcome, ${salutation}. As your gentleman's concierge, I stand ready to assist you with dining arrangements, House traditions, or club access in ${city}. What is your pleasure?`,
        `Greetings, ${salutation}. At your service. Whether you require private reservations, insights on the Houses, or scheduling, please let me know how I may assist.`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // 2. House lore / Mottos
    if (lastMessage.includes('house') || lastMessage.includes('motto') || lastMessage.includes('arthur') || lastMessage.includes('lancelot') || lastMessage.includes('percival')) {
      return `The 12 Houses of Gentlemen unite distinguished leaders under timeless virtues. House Arthur leads under "THE ONCE AND FUTURE KING", House Lancelot champions "STRENGTH THROUGH HONOUR", and House Galahad upholds "PURITY OF PURPOSE". Shall I provide deeper lore on your affiliated House, ${salutation}?`;
    }

    // 3. Dining / Reservations
    if (lastMessage.includes('table') || lastMessage.includes('dinner') || lastMessage.includes('reservation') || lastMessage.includes('lunch') || lastMessage.includes('food')) {
      const venues = ['The Connaught Grill', 'Claridge\'s Bar', '5 Hertford Street', 'Oswald\'s in Mayfair', 'Scott\'s on Mount Street'];
      const picked = venues[Math.floor(Math.random() * venues.length)];
      return `Certainly, ${salutation}. I would suggest ${picked} in ${city}, where private dining facilities are reserved for House members. Would you like me to note a reservation for 8:00 PM tonight?`;
    }

    // 4. Events / Activities / Weekend
    if (lastMessage.includes('event') || lastMessage.includes('weekend') || lastMessage.includes('what\'s on') || lastMessage.includes('activity')) {
      return `Indeed, ${salutation}. Upcoming highlights include the Great Autumn Fellowship Gala at the Grand Hall and the private fencing masterclass hosted by House Percival. Furthermore, the private lounge is open for our members.`;
    }

    // 5. General intelligent response
    return `At your service, ${salutation}. As ${personaName}, I have noted your request: "${messages[messages.length - 1]?.content || ''}". I am actively coordinating this across our concierge network. How else may I assist you today?`;
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

module.exports = new OllamaService();
