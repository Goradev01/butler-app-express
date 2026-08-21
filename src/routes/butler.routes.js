const express = require('express');
const router = express.Router();
const ollamaService = require('../services/ollama.service');
const jwt = require('jsonwebtoken');
const db = require('../db/store');
const { JWT_SECRET } = require('../middleware/auth.middleware');

/**
 * Helper to optionally extract user context if an Authorization Bearer token is passed
 */
function extractUserContext(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return {};

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(decoded.userId);
    if (!user) return {};
    
    // Find house details if user joined one
    let houseName = '';
    if (user.houseId) {
      const house = db.findHouseById(user.houseId);
      if (house) houseName = house.name;
    }

    return {
      userId: user.id,
      fullName: user.profile?.fullName || user.fullName || '',
      preferredTitle: user.profile?.preferredTitle || user.preferredTitle || '',
      houseId: user.houseId || '',
      houseName: houseName || user.houseId || '',
      city: user.profile?.city || user.city || '',
      hobbies: user.hobbies || []
    };
  } catch (err) {
    return {};
  }
}

/**
 * @openapi
 * /api/butler/status:
 *   get:
 *     summary: Check Ollama connectivity, active model (qwen2.5:0.5b), and health status
 *     tags: [Butler Concierge AI]
 *     responses:
 *       200:
 *         description: Current Ollama server status and model availability
 */
router.get('/status', async (req, res) => {
  try {
    const health = await ollamaService.checkHealth();
    return res.json({
      success: true,
      ...health
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * @openapi
 * /api/butler/concierges:
 *   get:
 *     summary: Retrieve available Butler Concierge personas (e.g. Eaton, Merlin, Galahad)
 *     tags: [Butler Concierge AI]
 *     responses:
 *       200:
 *         description: List of concierge personas with titles, avatars, and specialties
 */
router.get('/concierges', (req, res) => {
  const personas = ollamaService.getPersonas();
  return res.json({
    success: true,
    concierges: personas
  });
});

/**
 * @openapi
 * /api/butler/suggestions:
 *   get:
 *     summary: Get quick prompt starters for Butler chat (e.g. "A table for two tonight")
 *     tags: [Butler Concierge AI]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         example: London
 *     responses:
 *       200:
 *         description: List of suggested prompt pills
 */
router.get('/suggestions', (req, res) => {
  const city = req.query.city || 'London';
  const suggestions = ollamaService.getSuggestions(city);
  return res.json({
    success: true,
    suggestions
  });
});

/**
 * @openapi
 * /api/butler/conversations:
 *   get:
 *     summary: List all persistent chat conversations for the current member / user
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of conversation threads with message count and timestamps
 */
router.get('/conversations', (req, res) => {
  const userContext = extractUserContext(req);
  const userId = userContext.userId || req.query.userId || 'guest';
  const conversations = db.getUserConversations(userId);

  const formatted = conversations.map(c => ({
    id: c.id,
    title: c.title,
    persona: c.persona,
    messagesCount: c.messages.length,
    lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1] : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));

  return res.json({
    success: true,
    count: formatted.length,
    conversations: formatted
  });
});

/**
 * @openapi
 * /api/butler/conversations:
 *   post:
 *     summary: Create a new persistent conversation thread
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               persona:
 *                 type: string
 *                 default: eaton
 *                 example: eaton
 *               title:
 *                 type: string
 *                 example: "Mayfair Dining & House Events"
 *     responses:
 *       201:
 *         description: Newly created conversation object
 */
router.post('/conversations', (req, res) => {
  const userContext = extractUserContext(req);
  const userId = userContext.userId || req.body.userId || 'guest';
  const { persona = 'eaton', title = 'New Inquiry' } = req.body;

  const conv = db.createConversation(userId, persona, title);
  return res.status(201).json({
    success: true,
    conversation: conv
  });
});

/**
 * @openapi
 * /api/butler/conversations/{id}:
 *   get:
 *     summary: Get full chat history for a specific conversation thread
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "conv_1787128000_abc"
 *     responses:
 *       200:
 *         description: Full conversation details and ordered message list
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:id', (req, res) => {
  const userContext = extractUserContext(req);
  const conv = db.getConversation(req.params.id, userContext.userId);
  if (!conv) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  return res.json({
    success: true,
    conversation: conv
  });
});

/**
 * @openapi
 * /api/butler/conversations/{id}:
 *   delete:
 *     summary: Delete an entire conversation thread
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 */
router.delete('/conversations/:id', (req, res) => {
  const userContext = extractUserContext(req);
  const deleted = db.deleteConversation(req.params.id, userContext.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  return res.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
});

/**
 * @openapi
 * /api/butler/conversations/{id}/messages:
 *   delete:
 *     summary: Clear all messages inside a conversation thread while preserving the thread
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation messages cleared
 */
router.delete('/conversations/:id/messages', (req, res) => {
  const userContext = extractUserContext(req);
  const cleared = db.clearConversationMessages(req.params.id, userContext.userId);
  if (!cleared) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  return res.json({
    success: true,
    message: 'Conversation history cleared successfully'
  });
});

/**
 * @openapi
 * /api/butler/chat:
 *   post:
 *     summary: Send a message to Butler / Eaton with persistent chat history support
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hello Eaton, introduce yourself."
 *               persona:
 *                 type: string
 *                 enum: [eaton, merlin, galahad]
 *                 default: eaton
 *                 example: eaton
 *               temperature:
 *                 type: number
 *                 default: 0.7
 *                 example: 0.7
 *               conversationId:
 *                 type: string
 *                 description: Optional conversation ID from a previous message to continue thread
 *               saveHistory:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to persist this exchange in database history
 *     responses:
 *       200:
 *         description: Concierge response generated dynamically by Ollama qwen2.5:0.5b
 */
router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      messages,
      conversationId,
      saveHistory = true,
      persona = 'eaton',
      temperature = 0.7,
      model
    } = req.body;

    const extractedUser = extractUserContext(req);
    const userId = extractedUser.userId || 'guest';
    const userContext = {
      ...extractedUser,
      ...(req.body.userContext || {})
    };

    let activeConversation = null;
    let conversationHistory = [];

    // 1. Resolve or create persistent conversation if requested
    const isValidConvId = conversationId && typeof conversationId === 'string' && conversationId !== 'conv_1787128000_abc' && conversationId !== 'string' && conversationId !== 'asjhasjhas';
    if (isValidConvId) {
      activeConversation = db.getConversation(conversationId, extractedUser.userId);
      if (!activeConversation) {
        activeConversation = db.createConversation(userId, persona, 'Inquiry');
      }
    } else if (saveHistory) {
      // Auto create a fresh conversation thread if none provided
      activeConversation = db.createConversation(userId, persona, 'Inquiry');
    }

    // 2. Build multi-turn context
    if (activeConversation && activeConversation.messages.length > 0 && (!messages || messages.length === 0)) {
      // Take last 12 messages for rolling context buffer (prevents context overflow)
      const recentMessages = activeConversation.messages.slice(-12);
      conversationHistory = recentMessages.map(m => ({ role: m.role, content: m.content }));
    } else if (Array.isArray(messages) && messages.length > 0) {
      // Filter out dummy placeholder messages from Swagger
      const validMessages = messages.filter(m => m && m.content && m.content !== 'string' && m.role && m.role !== 'string');
      conversationHistory = [...validMessages];
    }

    // Append new user message if message string is provided
    let currentUserQuery = '';
    if (typeof message === 'string' && message.trim().length > 0 && message.trim() !== 'string') {
      currentUserQuery = message.trim();
      conversationHistory.push({ role: 'user', content: currentUserQuery });
    }

    if (conversationHistory.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a `message` string or a `messages` array.'
      });
    }

    // 3. Call Ollama Service
    const response = await ollamaService.chat({
      messages: conversationHistory,
      persona: activeConversation ? activeConversation.persona : persona,
      userContext,
      model,
      temperature
    });

    // 4. Save to persistent chat history
    if (activeConversation && saveHistory) {
      if (currentUserQuery) {
        db.addMessageToConversation(activeConversation.id, {
          role: 'user',
          content: currentUserQuery,
          model: response.model
        });
      }
      db.addMessageToConversation(activeConversation.id, {
        role: 'assistant',
        content: response.message?.content || '',
        model: response.model,
        concierge: response.concierge
      });
    }

    return res.json({
      ...response,
      conversationId: activeConversation ? activeConversation.id : null
    });
  } catch (err) {
    console.error('Error in /api/butler/chat:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process Butler chat request'
    });
  }
});

/**
 * @openapi
 * /api/butler/chat/stream:
 *   post:
 *     summary: Stream Butler Concierge response in real-time with conversation tracking
 *     tags: [Butler Concierge AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const {
      message,
      messages,
      conversationId,
      saveHistory = true,
      persona = 'eaton',
      temperature = 0.7,
      model
    } = req.body;

    const extractedUser = extractUserContext(req);
    const userId = extractedUser.userId || 'guest';
    const userContext = {
      ...extractedUser,
      ...(req.body.userContext || {})
    };

    let activeConversation = null;
    let conversationHistory = [];

    const isValidConvId = conversationId && typeof conversationId === 'string' && conversationId !== 'conv_1787128000_abc' && conversationId !== 'string' && conversationId !== 'asjhasjhas';
    if (isValidConvId) {
      activeConversation = db.getConversation(conversationId, extractedUser.userId);
      if (!activeConversation) {
        activeConversation = db.createConversation(userId, persona, 'Inquiry');
      }
    } else if (saveHistory) {
      activeConversation = db.createConversation(userId, persona, 'Inquiry');
    }

    if (activeConversation && activeConversation.messages.length > 0 && (!messages || messages.length === 0)) {
      const recentMessages = activeConversation.messages.slice(-12);
      conversationHistory = recentMessages.map(m => ({ role: m.role, content: m.content }));
    } else if (Array.isArray(messages) && messages.length > 0) {
      const validMessages = messages.filter(m => m && m.content && m.content !== 'string' && m.role && m.role !== 'string');
      conversationHistory = [...validMessages];
    }

    let currentUserQuery = '';
    if (typeof message === 'string' && message.trim().length > 0 && message.trim() !== 'string') {
      currentUserQuery = message.trim();
      conversationHistory.push({ role: 'user', content: currentUserQuery });
    }

    if (conversationHistory.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a `message` string or a `messages` array.'
      });
    }

    // Save user message immediately if persisting
    if (activeConversation && saveHistory && currentUserQuery) {
      db.addMessageToConversation(activeConversation.id, {
        role: 'user',
        content: currentUserQuery,
        model: model || 'qwen2.5:0.5b'
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    let fullAssistantResponse = '';

    await ollamaService.streamChat({
      messages: conversationHistory,
      persona: activeConversation ? activeConversation.persona : persona,
      userContext,
      model,
      temperature,
      onChunk: (chunkText) => {
        fullAssistantResponse += chunkText;
        res.write(`data: ${JSON.stringify({
          content: chunkText,
          conversationId: activeConversation ? activeConversation.id : null
        })}\n\n`);
      },
      onDone: (finalData) => {
        if (activeConversation && saveHistory && fullAssistantResponse) {
          db.addMessageToConversation(activeConversation.id, {
            role: 'assistant',
            content: fullAssistantResponse,
            model: model || 'qwen2.5:0.5b'
          });
        }
        res.write(`data: ${JSON.stringify({
          done: true,
          conversationId: activeConversation ? activeConversation.id : null,
          metrics: finalData
        })}\n\n`);
        res.end();
      },
      onError: (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    });
  } catch (err) {
    console.error('Error in /api/butler/chat/stream:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

/**
 * @openapi
 * /api/butler/models:
 *   get:
 *     summary: List all installed local models & supported cloud model catalog
 *     tags: [Butler Concierge AI]
 *     responses:
 *       200:
 *         description: Catalog of local and cloud models
 */
router.get('/models', async (req, res) => {
  try {
    const data = await ollamaService.listModels();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /api/butler/config:
 *   get:
 *     summary: Get active AI provider configuration
 *     tags: [Butler Concierge AI]
 *   post:
 *     summary: Update active model or cloud API keys at runtime
 *     tags: [Butler Concierge AI]
 */
router.get('/config', (req, res) => {
  return res.json({ success: true, config: ollamaService.getConfig() });
});

router.post('/config', (req, res) => {
  ollamaService.updateConfig(req.body);
  return res.json({
    success: true,
    message: 'AI configuration updated successfully',
    config: ollamaService.getConfig()
  });
});

/**
 * @openapi
 * /api/butler/pull-model:
 *   post:
 *     summary: Trigger pulling a model in Ollama (e.g. qwen2.5:0.5b, llama3.2:1b)
 *     tags: [Butler Concierge AI]
 */
router.post('/pull-model', async (req, res) => {
  try {
    const model = req.body.model || process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
    const result = await ollamaService.pullModel(model);
    return res.json({
      success: true,
      message: `Model ${model} pulled successfully`,
      result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
