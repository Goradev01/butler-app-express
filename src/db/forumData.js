const FORUM_CATEGORIES = [
  { id: 'relationship', name: 'Relationship', icon: '❤️' },
  { id: 'career', name: 'Career', icon: '💼' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'finance', name: 'Finance', icon: '🏦' },
  { id: 'health', name: 'Health', icon: '🩺' },
  { id: 'personal', name: 'Personal', icon: '🧘' }
];

const INITIAL_DISCUSSIONS = [
  {
    id: 'disc_1',
    category: 'Career',
    categoryId: 'career',
    title: 'Handling a career change in my 20s',
    content: 'I\'m considering switching careers from corporate law into product design, but I\'m worried about starting over at the entry level.',
    author: 'Jonathan W.',
    authorHouse: 'House of Arthur',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    currentSituation: 'What is happening right now? Working long hours, feeling disconnected from creative goals.',
    feelings: ['Frustrated', 'Confused', 'Anxious'],
    biggestChallenge: 'What is the primary blocker you face? Financial security during transition.',
    participantsCount: 24,
    repliesCount: 3,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    replies: [
      {
        id: 'rep_1',
        author: 'Sir Lancelot',
        authorHouse: 'Lancelot',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        content: 'I felt the exact same way 2 years ago when transitioning from finance to tech leadership. What helped me was building side projects on weekends before resigning.',
        outcome: 'Reduced financial risk and built confidence in my portfolio.',
        lessonLearned: 'Skills are more transferable than you think. Courage comes from preparation.',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
      },
      {
        id: 'rep_2',
        author: 'Lord Percival',
        authorHouse: 'Percival',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        content: 'I experienced a similar shift. Networking with leaders in your target field provides mentorship and clarity.',
        outcome: 'Secured a senior role directly without restarting from entry level.',
        lessonLearned: 'Never underestimate the value of mature domain knowledge.',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ]
  },
  {
    id: 'disc_2',
    category: 'Finance',
    categoryId: 'finance',
    title: 'Managing finances after a major life change',
    content: 'Recently went through a divorce and I\'m struggling to manage my finances on a single income while preserving my investments.',
    author: 'Edward C.',
    authorHouse: 'House of Lancelot',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    currentSituation: 'Single income household with multiple financial commitments.',
    feelings: ['Overwhelmed', 'Anxious'],
    biggestChallenge: 'Restructuring budget without selling key long-term assets.',
    participantsCount: 31,
    repliesCount: 4,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    replies: [
      {
        id: 'rep_3',
        author: 'Sir Galahad',
        authorHouse: 'Galahad',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        content: 'I went through this 4 years ago. Focusing first on liquid emergency funds provided immense peace of mind.',
        outcome: 'Kept my core portfolio intact while stabilizing monthly cash flow.',
        lessonLearned: 'Clarity comes from audit. Track every expense for 60 days.',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
      }
    ]
  },
  {
    id: 'disc_3',
    category: 'Family',
    categoryId: 'family',
    title: 'Supporting family needs through tough times',
    content: 'How do you balance demanding executive work and caring for aging parents? Looking for wisdom and support.',
    author: 'Oliver K.',
    authorHouse: 'House of Merlin',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    currentSituation: 'Balancing 60-hour work weeks with family responsibilities.',
    feelings: ['Overwhelmed', 'Inspired'],
    biggestChallenge: 'Maintaining health while supporting loved ones.',
    participantsCount: 22,
    repliesCount: 9,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    replies: []
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'New reply in Handling a career change',
    message: 'Lord Percival shared their experience in your discussion circle.',
    time: '2m ago',
    read: false,
    type: 'reply'
  },
  {
    id: 'notif_2',
    title: 'AI Summary: Rebuilding trust after a break',
    message: 'Butler AI generated key takeaways from the Relationship circle.',
    time: '10m ago',
    read: false,
    type: 'summary'
  },
  {
    id: 'notif_3',
    title: 'New reply in Managing finances',
    message: 'Sir Galahad replied with financial experience insights.',
    time: '1h ago',
    read: true,
    type: 'reply'
  }
];

module.exports = {
  FORUM_CATEGORIES,
  INITIAL_DISCUSSIONS,
  INITIAL_NOTIFICATIONS
};
