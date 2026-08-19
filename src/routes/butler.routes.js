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
      fullName: user.fullName || '',
      preferredTitle: user.preferredTitle || '',
      houseId: user.houseId || '',
      houseName: houseName || user.houseId || '',
      city: user.city || '',
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 connected:
 *                   type: boolean
 *                   example: true
 *                 baseUrl:
 *                   type: string
 *                   example: http://localhost:11434
 *                 activeModel:
 *                   type: string
 *                   example: qwen2.5:0.5b
 *                 isModelAvailable:
 *                   type: boolean
 *                   example: true
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
 * /api/butler/chat:
 *   post:
 *     summary: Send a message to Butler / Eaton Concierge powered by Ollama (qwen2.5:0.5b)
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
 *                 example: "A table for two tonight in London please."
 *               messages:
 *                 type: array
 *                 description: Full conversation history array of { role, content }
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *                 example:
 *                   - role: "user"
 *                     content: "A table for two tonight in London please."
 *               persona:
 *                 type: string
 *                 enum: [eaton, merlin, galahad]
 *                 default: eaton
 *                 example: eaton
 *               temperature:
 *                 type: number
 *                 default: 0.7
 *                 example: 0.7
 *     responses:
 *       200:
 *         description: Concierge response generated by Ollama qwen2.5:0.5b
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       example: assistant
 *                     content:
 *                       type: string
 *                       example: "Good evening, Sir. I would be delighted to arrange a table for two tonight..."
 *                 model:
 *                   type: string
 *                   example: qwen2.5:0.5b
 *                 concierge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: eaton
 *                     name:
 *                       type: string
 *                       example: Eaton
 *                     title:
 *                       type: string
 *                       example: Senior Gentleman's Butler & Concierge
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, messages, persona = 'eaton', temperature = 0.7, model } = req.body;

    // Support either single message string or array of messages
    let conversation = [];
    if (Array.isArray(messages) && messages.length > 0) {
      conversation = messages;
    } else if (typeof message === 'string' && message.trim().length > 0) {
      conversation = [{ role: 'user', content: message.trim() }];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a `message` string or a `messages` array.'
      });
    }

    // Extract user context from optional token or payload
    const extractedUser = extractUserContext(req);
    const userContext = {
      ...extractedUser,
      ...(req.body.userContext || {})
    };

    const response = await ollamaService.chat({
      messages: conversation,
      persona,
      userContext,
      model,
      temperature
    });

    return res.json(response);
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
 *     summary: Stream Butler Concierge response in real-time using Server-Sent Events (SSE)
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
 *                 example: "What's on this weekend in London?"
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               persona:
 *                 type: string
 *                 default: eaton
 *     responses:
 *       200:
 *         description: Real-time SSE text stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const { message, messages, persona = 'eaton', temperature = 0.7, model } = req.body;

    let conversation = [];
    if (Array.isArray(messages) && messages.length > 0) {
      conversation = messages;
    } else if (typeof message === 'string' && message.trim().length > 0) {
      conversation = [{ role: 'user', content: message.trim() }];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a `message` string or a `messages` array.'
      });
    }

    const extractedUser = extractUserContext(req);
    const userContext = {
      ...extractedUser,
      ...(req.body.userContext || {})
    };

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    await ollamaService.streamChat({
      messages: conversation,
      persona,
      userContext,
      model,
      temperature,
      onChunk: (chunkText) => {
        res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
      },
      onDone: (finalData) => {
        res.write(`data: ${JSON.stringify({ done: true, metrics: finalData })}\n\n`);
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
 * /api/butler/pull-model:
 *   post:
 *     summary: Trigger pulling a model in Ollama (e.g. qwen2.5:0.5b)
 *     tags: [Butler Concierge AI]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *                 default: qwen2.5:0.5b
 *     responses:
 *       200:
 *         description: Model pull completion status
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
