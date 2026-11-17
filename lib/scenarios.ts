/**
 * Speaking scenarios, their preloaded practice questions, and the delivery
 * benchmarks the AI coach uses to give scenario-specific recommendations.
 *
 * Names are stored on saved sessions, so keep existing names stable.
 */

export interface DeliveryProfile {
  /** Comfortable words-per-minute range for this context. */
  idealWpm: [number, number];
  /** Typical answer length in seconds for a single practice run. */
  idealSeconds: [number, number];
  tone: string;
  pacing: string;
  pauses: string;
  structure: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  delivery: DeliveryProfile;
  questions: string[];
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "job-interview",
    name: "Job Interview",
    description: "Answer common interview questions with clear, confident, specific stories.",
    delivery: {
      idealWpm: [130, 160],
      idealSeconds: [60, 120],
      tone: "Confident, warm, and conversational. Sound engaged, not rehearsed.",
      pacing: "Steady and unhurried. Slow down slightly when stating results and numbers.",
      pauses: "A brief pause to gather your thoughts before answering is fine. Pause just before your key result so it lands.",
      structure: "STAR: Situation, Task, Action, Result. Finish by tying the answer back to the role.",
    },
    questions: [
      "Tell me about yourself.",
      "Why do you want this role?",
      "Tell me about a time you handled a difficult stakeholder or coworker.",
      "Describe a time you failed and what you learned from it.",
      "What is your greatest strength, and how has it helped you at work?",
      "Tell me about a time you led a project under a tight deadline.",
      "Where do you see yourself in five years?",
    ],
  },
  {
    id: "sales-pitch",
    name: "Sales Pitch",
    description: "Pitch a product, handle objections, and ask for the next step.",
    delivery: {
      idealWpm: [140, 170],
      idealSeconds: [60, 180],
      tone: "Energetic, empathetic, and assured. Enthusiastic without sounding pushy.",
      pacing: "Lively overall, but slow down for the customer's pain point and your value claim.",
      pauses: "Pause after naming the customer's problem and after stating price or value, and let it sink in.",
      structure: "Customer pain, your solution, proof (results or a customer story), then a clear ask.",
    },
    questions: [
      "Pitch your product to a busy decision-maker in two minutes.",
      "A prospect says, \"Your price is too high.\" How do you respond?",
      "Open a cold call with a new prospect.",
      "Explain how your product solves this customer's biggest problem.",
      "A prospect says they're happy with their current vendor. Respond.",
      "Close the meeting by asking for a clear next step.",
    ],
  },
  {
    id: "keynote-presentation",
    name: "Keynote Presentation",
    description: "Deliver an inspiring talk to a large audience with a memorable message.",
    delivery: {
      idealWpm: [120, 150],
      idealSeconds: [120, 300],
      tone: "Authoritative and inspiring, with wide pitch variation and emotional range.",
      pacing: "Measured. Vary speed deliberately: faster for stories, slower for big ideas.",
      pauses: "Use long, intentional pauses of 2 to 3 seconds after key ideas and before your call to action.",
      structure: "A hook, one core idea supported by a story, then a memorable call to action.",
    },
    questions: [
      "Open your keynote with a hook that grabs the audience in the first 30 seconds.",
      "Share a personal story that illustrates the core message of your talk.",
      "Explain the one big idea you want your audience to remember.",
      "Deliver the closing call to action for your keynote.",
      "Describe a trend that will change your industry in the next five years.",
      "Tell the audience about a moment that changed how you think about your work.",
    ],
  },
  {
    id: "elevator-pitch",
    name: "Elevator Pitch / Networking",
    description: "Introduce yourself or your idea in under a minute and leave people wanting more.",
    delivery: {
      idealWpm: [140, 160],
      idealSeconds: [30, 60],
      tone: "Friendly, crisp, and memorable. Sound genuinely curious about the other person.",
      pacing: "Brisk but clear. Every sentence should earn its place.",
      pauses: "Short pauses between who you are, what you do, and why it matters.",
      structure: "Who you are, the value you bring, one memorable detail, then an invitation to continue the conversation.",
    },
    questions: [
      "Introduce yourself at a networking event in 30 seconds.",
      "Explain what you do to someone outside your industry.",
      "Pitch your startup idea in under a minute.",
      "Introduce yourself to a hiring manager at a career fair.",
      "Describe what makes you different from others in your field.",
      "Ask a senior leader for a follow-up conversation after a brief introduction.",
    ],
  },
  {
    id: "investor-pitch",
    name: "Investor Pitch",
    description: "Make a credible, data-backed case for your company and your ask.",
    delivery: {
      idealWpm: [130, 150],
      idealSeconds: [120, 300],
      tone: "Confident and credible. Passionate about the mission, grounded in data.",
      pacing: "Controlled. Slow down for metrics, market size, and the ask.",
      pauses: "Pause after each key metric and after stating your ask. Silence signals confidence.",
      structure: "Problem, solution, market, traction, business model, team, then the ask.",
    },
    questions: [
      "Give your two-minute investor pitch, from the problem to the ask.",
      "Why is now the right time for your company?",
      "How big is the market, and how will you capture it?",
      "Walk us through your traction and key metrics.",
      "Why is your team the right one to win this market?",
      "An investor asks, \"What happens if a big competitor copies you?\" Respond.",
      "How will you use this funding, and what milestones will it reach?",
    ],
  },
  {
    id: "team-meeting",
    name: "Team Meeting Update",
    description: "Give a clear, efficient update and make your asks obvious.",
    delivery: {
      idealWpm: [140, 160],
      idealSeconds: [60, 120],
      tone: "Clear, calm, and direct. Collaborative rather than defensive.",
      pacing: "Efficient. Respect people's time without rushing the important parts.",
      pauses: "Pause between agenda items and after any request so people can respond.",
      structure: "Bottom line first, then progress, blockers, and next steps or asks.",
    },
    questions: [
      "Give a weekly status update on your current project.",
      "Explain a delay to your team and propose a new timeline.",
      "Present a process change and explain why the team should adopt it.",
      "Summarize the results of a recent project in under two minutes.",
      "Ask your team for help removing a blocker.",
      "Kick off a new project and set expectations for the team.",
    ],
  },
  {
    id: "academic-presentation",
    name: "Class / Academic Presentation",
    description: "Present research or coursework clearly and handle tough questions.",
    delivery: {
      idealWpm: [120, 150],
      idealSeconds: [120, 300],
      tone: "Clear, curious, and credible. Show interest in your own topic.",
      pacing: "Moderate. Slow down for definitions, data, and complex ideas.",
      pauses: "Pause after definitions and before transitions so the audience can keep up.",
      structure: "Thesis, evidence, analysis, then conclusion. Signpost each section out loud.",
    },
    questions: [
      "Introduce your research topic and explain why it matters.",
      "Explain a complex concept from your field to classmates who are new to it.",
      "Summarize your methodology and key findings.",
      "Defend your thesis against a strong counterargument.",
      "Present the conclusion and implications of your project.",
      "Answer a professor's question about a limitation of your study.",
    ],
  },
  {
    id: "toast",
    name: "Wedding / Special Occasion Toast",
    description: "Give a heartfelt, well-timed toast or tribute.",
    delivery: {
      idealWpm: [120, 140],
      idealSeconds: [120, 240],
      tone: "Warm, heartfelt, and personal, with light, kind humor.",
      pacing: "Relaxed. Slower for emotional moments, a little quicker when building to a joke.",
      pauses: "Pause for laughter and emotion. Don't talk over the room's reaction.",
      structure: "Introduce yourself and your relationship, tell one story, share a sincere wish, then raise a glass.",
    },
    questions: [
      "Give a toast at your best friend's wedding.",
      "Deliver a toast at a retirement party for a mentor.",
      "Say a few words at a milestone birthday celebration.",
      "Give a toast at a graduation dinner.",
      "Share a farewell tribute to a colleague who is leaving the company.",
      "Welcome guests at a family reunion or holiday gathering.",
    ],
  },
  {
    id: "difficult-conversation",
    name: "Difficult Conversation",
    description: "Handle feedback, disagreement, and bad news with calm and empathy.",
    delivery: {
      idealWpm: [110, 140],
      idealSeconds: [60, 180],
      tone: "Calm, empathetic, and steady. Firm where needed, never defensive or sharp.",
      pacing: "Slower than usual. Rushing reads as nervousness or avoidance.",
      pauses: "Pause before sensitive points and leave room for the other person to respond.",
      structure: "State your intent, describe the specific situation, explain the impact, invite their view, then agree on next steps.",
    },
    questions: [
      "Give constructive feedback to a teammate who keeps missing deadlines.",
      "Tell your manager you disagree with a decision.",
      "Decline a request from a colleague without damaging the relationship.",
      "Apologize to a client for a mistake your team made.",
      "Ask your manager for a raise or promotion.",
      "Address a conflict between two members of your team.",
      "Tell your team that a project they worked hard on has been canceled.",
    ],
  },
  {
    id: "general-public-speaking",
    name: "General Public Speaking",
    description: "Practice impromptu speaking on everyday topics with clear structure.",
    delivery: {
      idealWpm: [130, 160],
      idealSeconds: [60, 120],
      tone: "Engaging and natural, like talking to an interested friend.",
      pacing: "Comfortable and conversational, with deliberate emphasis on your main point.",
      pauses: "Pause silently to think instead of filling the gap with \"um\" or \"so\".",
      structure: "PREP: Point, Reason, Example, then restate your Point.",
    },
    questions: [
      "Talk about a book, movie, or podcast that changed your perspective.",
      "Describe a challenge you overcame and what it taught you.",
      "Is remote work better than working in an office? Take a position.",
      "Tell a story about a memorable trip.",
      "What is one skill everyone should learn, and why?",
      "Describe a person who inspires you.",
    ],
  },
];

export const DEFAULT_SCENARIO = SCENARIOS[0];

/** Look up a scenario by id or display name (saved sessions store the name). */
export function getScenario(idOrName: string | undefined | null): ScenarioDefinition | undefined {
  if (!idOrName) return undefined;
  const key = idOrName.trim().toLowerCase();
  return SCENARIOS.find((s) => s.id === key || s.name.toLowerCase() === key);
}

export function formatSecondsRange([min, max]: [number, number]): string {
  const fmt = (s: number) => (s < 60 ? `${s} sec` : s % 60 === 0 ? `${s / 60} min` : `${(s / 60).toFixed(1)} min`);
  if (min < 60 && max <= 60) return `${min}–${max} sec`;
  if (min % 60 === 0 && max % 60 === 0) return `${min / 60}–${max / 60} min`;
  return `${fmt(min)} – ${fmt(max)}`;
}
