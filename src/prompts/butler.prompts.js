/**
 * High-Level System Prompt Engineering & Database Grounding Architecture
 * Grounded in live Database records (Houses, Venues, Feeds, Profiles)
 * Optimized for high-IQ reasoning, persona integrity, and dynamic responses
 */

const db = require('../db/store');

const PERSONA_BLUEPRINTS = {
  eaton: {
    id: 'eaton',
    name: 'Eaton',
    title: "Senior Gentleman's Butler & Concierge",
    tagline: 'Refined concierge. Responds when asked.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    characterProfile: `You are Eaton, an elite, senior British Butler and executive concierge serving members of "The 12 Houses of Gentlemen".
You possess world-class discernment, flawless etiquette, understated wit, and quiet efficiency.
You speak in a refined British manner: dignified, warm, succinct, and attentive.`
  },

  merlin: {
    id: 'merlin',
    name: 'Merlin',
    title: 'Grand Strategist & Scholar',
    tagline: 'Strategic counsel and philosophical wisdom.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    characterProfile: `You are Merlin, Grand Strategist and Scholar of the 12 Houses.
You guide gentlemen through intellectual deliberation, high-stakes decisions, and philosophical mastery with calm, razor-sharp foresight.`
  },

  galahad: {
    id: 'galahad',
    name: 'Sir Galahad',
    title: 'Master of Culture & Fellowship',
    tagline: 'Arts, culture, and high society galas.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    characterProfile: `You are Sir Galahad, Master of Culture for the 12 Houses of Gentlemen.
You curate fine arts exhibitions, high-society gala dinners, philanthropic initiatives, and cultural masterclasses.`
  }
};

class SystemPromptArchitect {
  /**
   * Fetch Live Context from Database
   */
  static getLiveDatabaseContext(userQuery = '') {
    const queryLower = (userQuery || '').toLowerCase();
    let contextSnippets = [];

    try {
      // 1. Houses Knowledge from DB
      const houses = db.houses || [];
      if (houses.length > 0) {
        const housesSummary = houses.map(h => 
          `- House ${h.name}: Motto "${h.motto}" | Virtues: ${h.description} | Hobbies: ${(h.matchingHobbies || []).join(', ')}`
        ).join('\n');
        contextSnippets.push(`[12 HOUSES DATABASE REGISTRY]:\n${housesSummary}`);
      }

      // 2. City Venues / Places from DB (Relevant if dining, club, place, city is mentioned)
      const places = db.cityPlaces || [];
      if (places.length > 0) {
        const matchingPlaces = places.filter(p => 
          queryLower.includes(p.name?.toLowerCase()) || 
          queryLower.includes(p.city?.toLowerCase()) ||
          queryLower.includes(p.category?.toLowerCase()) ||
          queryLower.includes('dinner') || queryLower.includes('dining') || queryLower.includes('table') || queryLower.includes('club') || queryLower.includes('spa') || queryLower.includes('hotel')
        ).slice(0, 5);

        const placesToUse = matchingPlaces.length > 0 ? matchingPlaces : places.slice(0, 4);
        const placesSummary = placesToUse.map(p => 
          `- ${p.name} (${p.city || 'London'}, ${p.category}): ${p.description || ''} | Address: ${p.address || ''} | Rating: ${p.rating || '5.0'}`
        ).join('\n');
        contextSnippets.push(`[CURATED VENUES & PLACES FROM DATABASE]:\n${placesSummary}`);
      }

      // 3. Activity Feed / Announcements from DB (Relevant if event, gala, or activity mentioned)
      const feeds = db.feeds || [];
      if (feeds.length > 0) {
        const topFeeds = feeds.slice(0, 3).map(f => 
          `- Event: "${f.title}" by ${f.author} (House ${f.authorHouse}): ${f.content}`
        ).join('\n');
        contextSnippets.push(`[LIVE HOUSE EVENTS & ANNOUNCEMENTS]:\n${topFeeds}`);
      }
    } catch (e) {
      console.warn('[SystemPromptArchitect] Database context fetch non-blocking error:', e.message);
    }

    return contextSnippets.join('\n\n');
  }

  /**
   * Build complete contextualized system prompt with Live Database Grounding
   */
  static buildPrompt(personaKey = 'eaton', userContext = {}, userQuery = '') {
    const blueprint = PERSONA_BLUEPRINTS[personaKey.toLowerCase()] || PERSONA_BLUEPRINTS.eaton;

    const hour = new Date().getHours();
    let timeGreeting = 'Good day';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const memberName = userContext.fullName || userContext.name || '';
    const preferredTitle = userContext.preferredTitle || (memberName ? 'Sir' : '');
    const fullSalutation = preferredTitle && memberName
      ? `${preferredTitle} ${memberName}`
      : (memberName || preferredTitle || 'Sir');

    const liveDbContext = this.getLiveDatabaseContext(userQuery);

    const finalSystemPrompt = `
${blueprint.characterProfile}

CURRENT MEMBER CONTEXT:
- Salutation: ${fullSalutation} (Address as "${preferredTitle || 'Sir'}")
- City: ${userContext.city || 'London'}
- House: ${userContext.houseName ? `House ${userContext.houseName}` : '12 Houses of Gentlemen'}
- Current Time: ${new Date().toLocaleTimeString('en-GB')} (${timeGreeting})

LIVE SYSTEM KNOWLEDGE (FROM DATABASE):
${liveDbContext}

CRITICAL EXECUTION DIRECTIVES:
1. Always respond DIRECTLY and SPECIFICALLY to what the user just asked in this turn.
2. If the user greets you ("Hello", "Hi", "Good evening"), greet them warmly by their salutation (${timeGreeting}, ${fullSalutation}), introduce yourself as ${blueprint.name}, and ask how you can be of service today.
3. If the user asks about Houses, Dining, Clubs, or Events, use the real facts from the database above.
4. Keep standard replies concise, elegant, and punchy (2-4 sentences). Do NOT invent food reservations unless asked.
5. Never repeat fixed template phrases or example scripts. Provide fresh, dynamic assistance.
6. Never say you are an AI or computer program. Maintain the persona of ${blueprint.name} flawlessly.
`.trim();

    return {
      systemPrompt: finalSystemPrompt,
      persona: {
        id: blueprint.id,
        name: blueprint.name,
        title: blueprint.title,
        tagline: blueprint.tagline,
        avatar: blueprint.avatar
      },
      salutation: fullSalutation
    };
  }

  static getPersonas() {
    return Object.values(PERSONA_BLUEPRINTS).map(p => ({
      id: p.id,
      name: p.name,
      title: p.title,
      tagline: p.tagline,
      avatar: p.avatar
    }));
  }
}

module.exports = {
  SystemPromptArchitect,
  PERSONA_BLUEPRINTS
};
