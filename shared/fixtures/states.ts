import type { AgentState } from '../types';
import { hoursAgo, daysAgo } from './time';

function healthDay(
  ago: number,
  o: { weight: number; change: number; sleep: number; glasses: number; mainC: number; warm: number; stretch: number; done: boolean },
): Record<string, unknown> {
  const at = hoursAgo(ago * 24 + 3);
  const date = daysAgo(ago).slice(0, 10);
  const meals = [
    { breakfast: '2 cooked eggs in coconut oil with half a baked beet', lunch: 'yakhanet fasolia', dinner: 'oven-baked chicken wings, mashed potatoes, salad' },
    { breakfast: '3 сирники and coffee', lunch: 'grilled chicken and rice', dinner: 'lentil soup and bread' },
    { breakfast: '2 eggs cooked in butter', lunch: 'beef stew', dinner: 'salad and yogurt' },
    { breakfast: 'omelette', lunch: 'fish and potatoes', dinner: 'soup' },
    { breakfast: 'skipped', lunch: 'shawarma', dinner: 'pasta' },
  ][ago] ?? { breakfast: 'eggs', lunch: 'chicken', dinner: 'soup' };
  return {
    id: `rec-${ago}`,
    date,
    source: 'telegram',
    created_at: at,
    updated_at: at,
    diet: {
      adherence: null,
      status: 'reported',
      breakfast: meals.breakfast,
      lunch: meals.lunch,
      dinner: meals.dinner,
      calories: null,
      protein_g: null,
      notes: 'Daily report imported.',
      source: 'telegram',
      updated_at: at,
    },
    sleep: { hours: o.sleep, notes: 'Daily report sleep.', source: 'telegram', updated_at: at },
    water: { glasses: o.glasses, target_glasses: 8, notes: `${o.glasses}/8 glasses.`, source: 'telegram', updated_at: at },
    weight: {
      value: o.weight,
      unit: 'kg',
      change_from_start: o.change,
      change_unit: 'kg',
      notes: 'Daily report weight.',
      source: 'telegram',
      updated_at: at,
    },
    workout: {
      type: o.done ? 'Home workout' : 'Rest day',
      status: o.done ? 'completed' : 'skipped',
      planned: true,
      duration_minutes: o.done ? 30 : null,
      exercises: o.done ? ['Bodyweight Squat', 'Push-up', 'Reverse Lunge', 'Glute Bridge', 'Plank'] : [],
      warm_up_completed: o.warm,
      warm_up_total: 5,
      main_completed: o.mainC,
      main_total: 6,
      stretching_completed: o.stretch,
      stretching_total: 5,
      notes: o.done ? 'Home workout completed.' : 'Rest day.',
      source: 'telegram',
      updated_at: at,
    },
    observations: [
      { id: `obs-${ago}`, date, text: 'Daily report imported from Telegram.', source: 'telegram', created_at: at },
    ],
  };
}

export const fixtureStates: Record<string, AgentState> = {
  health: {
    agent_id: 'health',
    stable_facts: {
      height_cm: 178,
      training_style: 'home + basement gym',
      dietary_constraints: 'no pork, high protein target',
      start_weight_kg: 95.8,
    },
    current_state: {
      current_focus: '2026-08-17 report imported: home workout complete, diet reported',
      diet_details_pending: false,
      last_reported_date: daysAgo(0).slice(0, 10),
      last_weight_kg: 95,
      last_workout_completed_at: hoursAgo(3),
    },
    // Real PAOS Health schema: one nested record per day (diet/sleep/water/
    // weight/workout objects). Discovered generically as "Daily Records".
    structured_data: {
      daily_records: [
        healthDay(0, { weight: 95, change: -0.8, sleep: 8, glasses: 7, mainC: 6, warm: 5, stretch: 5, done: true }),
        healthDay(1, { weight: 95.2, change: -0.6, sleep: 8, glasses: 8, mainC: 6, warm: 5, stretch: 5, done: true }),
        healthDay(2, { weight: 95.4, change: -0.4, sleep: 7, glasses: 6, mainC: 4, warm: 5, stretch: 3, done: true }),
        healthDay(3, { weight: 95.5, change: -0.3, sleep: 7, glasses: 8, mainC: 6, warm: 5, stretch: 5, done: true }),
        healthDay(4, { weight: 95.8, change: 0, sleep: 6, glasses: 5, mainC: 0, warm: 0, stretch: 0, done: false }),
      ],
    },
    updated_at: hoursAgo(0.15),
  },
  media: {
    agent_id: 'media',
    stable_facts: {
      services: ['Netflix', 'Apple TV+', 'Plex'],
      preferences: 'Slow-burn sci-fi, prestige drama, no reality TV',
    },
    current_state: {
      current_focus: 'The Expanse — watching S3E7',
      last_updated_at: hoursAgo(26),
    },
    // Real PAOS Media schema: structured_data.items (discovered generically).
    structured_data: {
      items: [
        { title: 'The Expanse', type: 'series', status: 'watching', season: 3, episode: 7, rating: null, reaction: 'hooked', thoughts: 'Book 3 arc landing well', source: 'plex', date_started: daysAgo(20), date_completed: '', updated_at: hoursAgo(26) },
        { title: 'Severance', type: 'series', status: 'paused', season: 2, episode: 4, rating: null, reaction: 'intrigued', thoughts: 'Waiting for a free weekend to binge', source: 'apple tv+', date_started: daysAgo(40), date_completed: '', updated_at: daysAgo(9) },
        { title: 'Dune: Part Two', type: 'movie', status: 'planned', season: null, episode: null, rating: null, reaction: '', thoughts: '', source: 'telegram', date_started: '', date_completed: '', updated_at: daysAgo(12) },
        { title: 'Blue Eye Samurai', type: 'anime', status: 'planned', season: 1, episode: null, rating: null, reaction: '', thoughts: 'Recommended by Sam', source: 'netflix', date_started: '', date_completed: '', updated_at: daysAgo(20) },
        { title: 'Frieren', type: 'anime', status: 'watching', season: 1, episode: 18, rating: null, reaction: 'loving it', thoughts: 'Gorgeous pacing', source: 'crunchyroll', date_started: daysAgo(15), date_completed: '', updated_at: daysAgo(2) },
        { title: 'Shōgun', type: 'series', status: 'completed', season: 1, episode: 10, rating: 9, reaction: 'blown away', thoughts: 'Best thing this year', source: 'disney+', date_started: daysAgo(60), date_completed: daysAgo(30), updated_at: daysAgo(30) },
        { title: 'The Bear', type: 'series', status: 'completed', season: 3, episode: 10, rating: 7, reaction: 'mixed', thoughts: 'S3 weaker than S2', source: 'disney+', date_started: daysAgo(80), date_completed: daysAgo(45), updated_at: daysAgo(45) },
        { title: 'Pentiment', type: 'game', status: 'completed', season: null, episode: null, rating: 8, reaction: 'thoughtful', thoughts: 'Beautiful narrative adventure', source: 'game pass', date_started: daysAgo(70), date_completed: daysAgo(52), updated_at: daysAgo(52) },
        { title: 'Rings of Power', type: 'series', status: 'dropped', season: 2, episode: 3, rating: 4, reaction: 'bored', thoughts: 'Not landing for me', source: 'prime', date_started: daysAgo(58), date_completed: '', updated_at: daysAgo(50) },
      ],
    },
    updated_at: hoursAgo(26),
  },
  apartment: {
    agent_id: 'apartment',
    stable_facts: {
      apartment: '2-bedroom, 84m², moved in 3 months ago',
      style: 'Warm minimal, walnut + black metal',
      total_budget_eur: 12000,
    },
    current_state: {
      focus: 'Living room first, then office',
      budget_spent_eur: 4350,
      pending_decision: 'Sofa — three shortlisted, decision overdue',
    },
    structured_data: {
      board: [
        { item: 'Sofa', category: 'furniture', room: 'living room', priority: 1, status: 'decision_needed', budget_eur: 2500, options: ['Muuto Outline 3-seater', 'HAY Mags Soft', 'IKEA Söderhamn (budget fallback)'], next_action: 'Sit test HAY Mags at showroom Saturday' },
        { item: 'Dining table', category: 'furniture', room: 'dining', priority: 2, status: 'shortlisted', budget_eur: 1200, options: ['Walnut extendable 160→220', 'Oak fixed 180'], next_action: 'Measure rug clearance' },
        { item: 'Office chair', category: 'furniture', room: 'office', priority: 1, status: 'researching', budget_eur: 900, options: [], next_action: 'Compare Aeron remastered vs Steelcase Gesture' },
        { item: 'Washing machine', category: 'appliance', room: 'bathroom', priority: 1, status: 'purchased', budget_eur: 750, options: ['Bosch Serie 6'], next_action: 'Delivery Tuesday' },
        { item: 'Floor lamp', category: 'lighting', room: 'living room', priority: 3, status: 'need_research', budget_eur: 300, options: [], next_action: '' },
        { item: 'TV console', category: 'furniture', room: 'living room', priority: 2, status: 'selected', budget_eur: 800, options: ['String shelving, walnut'], next_action: 'Order this week' },
        { item: 'Curtains', category: 'textiles', room: 'bedroom', priority: 2, status: 'installed', budget_eur: 400, options: [], next_action: '' },
      ],
    },
    updated_at: hoursAgo(49),
  },
  projects: {
    agent_id: 'projects',
    stable_facts: {
      note: 'Work summaries are sanitized status only — no source or repository access.',
    },
    current_state: {
      active_projects: 3,
      blocked_projects: 1,
      last_ingest: hoursAgo(3),
    },
    structured_data: {},
    updated_at: hoursAgo(3),
  },
  coffee: {
    agent_id: 'coffee',
    stable_facts: {
      home_area: 'City center, prefers walkable spots',
      usual_order: 'Flat white; cortado when in a hurry',
    },
    current_state: {
      last_visit: 'Kavarna Marks — flat white, excellent',
      places_logged: 6,
    },
    // Arbitrary custom dataset — proves the workbench needs no per-agent code.
    structured_data: {
      places: [
        { name: 'Kavarna Marks', kind: 'café', ordered: 'Flat white', verdict: 'excellent', rating: 9, revisit: true, price_eur: 3.4, tags: ['quiet', 'wifi'], url: 'https://maps.example.com/kavarna', visited_at: daysAgo(2) },
        { name: 'Botanika', kind: 'café', ordered: 'Cortado + banana bread', verdict: 'good', rating: 7, revisit: true, price_eur: 5.5, tags: ['brunch', 'plants'], url: 'https://maps.example.com/botanika', visited_at: daysAgo(6) },
        { name: 'Trattoria Nino', kind: 'restaurant', ordered: 'Cacio e pepe', verdict: 'mixed', rating: 5, revisit: false, price_eur: 18, tags: ['pasta'], url: '', visited_at: daysAgo(11) },
        { name: 'Roasters Guild', kind: 'café', ordered: 'Pour-over Ethiopia', verdict: 'excellent', rating: 9, revisit: true, price_eur: 4.2, tags: ['specialty', 'no wifi'], url: 'https://maps.example.com/roasters', visited_at: daysAgo(16) },
        { name: 'Corner Diner', kind: 'restaurant', ordered: 'Breakfast burrito', verdict: 'good', rating: 6, revisit: true, price_eur: 11, tags: ['breakfast'], url: '', visited_at: daysAgo(21) },
      ],
    },
    updated_at: daysAgo(2),
  },
  finance: {
    agent_id: 'finance',
    stable_facts: {},
    current_state: {},
    structured_data: {},
    updated_at: daysAgo(21),
  },
};
