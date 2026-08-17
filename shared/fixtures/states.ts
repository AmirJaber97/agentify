import type { AgentState } from '../types';
import { hoursAgo, daysAgo } from './time';

export const fixtureStates: Record<string, AgentState> = {
  health: {
    agent_id: 'health',
    stable_facts: {
      height_cm: 178,
      training_style: 'push/pull/legs, 5 days a week',
      dietary_constraints: 'no pork, high protein target',
      gym: 'Basement gym — full rack, dumbbells to 40kg',
    },
    current_state: {
      goal: 'Recomp: hold ~78kg while adding strength',
      plan: 'Hypertrophy block, week 6 of 8',
      next_workout: 'Push day — bench focus',
      diet_adherence_week: 0.86,
      workout_streak_days: 11,
      todays_state: 'Slept 7h, mild shoulder tightness — warm up longer',
    },
    structured_data: {
      workouts: [
        { date: daysAgo(1), type: 'Pull', duration_min: 62, notes: 'Rows felt strong, +2.5kg' },
        { date: daysAgo(2), type: 'Legs', duration_min: 70, notes: 'Squat 3x5 @ 110kg' },
        { date: daysAgo(4), type: 'Push', duration_min: 58, notes: 'Bench 3x5 @ 87.5kg' },
        { date: daysAgo(5), type: 'Pull', duration_min: 60, notes: '' },
        { date: daysAgo(7), type: 'Legs', duration_min: 65, notes: 'Deload squats' },
      ],
      measurements: [
        { date: daysAgo(28), weight_kg: 79.1 },
        { date: daysAgo(21), weight_kg: 78.8 },
        { date: daysAgo(14), weight_kg: 78.5 },
        { date: daysAgo(7), weight_kg: 78.2 },
        { date: daysAgo(1), weight_kg: 78.0 },
      ],
      observations: [
        'Bench progressing again after switching to 3x5',
        'Protein intake dips on weekends — plan Saturday lunch ahead',
      ],
    },
    updated_at: hoursAgo(5),
  },
  media: {
    agent_id: 'media',
    stable_facts: {
      services: ['Netflix', 'Apple TV+', 'Plex'],
      preferences: 'Slow-burn sci-fi, prestige drama, no reality TV',
    },
    current_state: {
      currently_watching: 'The Expanse S3',
      last_action: 'Paused Severance at S2E4',
    },
    structured_data: {
      library: [
        { title: 'The Expanse', type: 'series', status: 'watching', season: 3, episode: 7, rating: null, thoughts: 'Book 3 arc landing well', updated_at: hoursAgo(26) },
        { title: 'Severance', type: 'series', status: 'paused', season: 2, episode: 4, rating: null, thoughts: 'Waiting for a free weekend to binge', updated_at: daysAgo(9) },
        { title: 'Dune: Part Two', type: 'film', status: 'planned', season: null, episode: null, rating: null, thoughts: '', updated_at: daysAgo(12) },
        { title: 'Blue Eye Samurai', type: 'series', status: 'planned', season: 1, episode: null, rating: null, thoughts: 'Recommended by Sam', updated_at: daysAgo(20) },
        { title: 'Shōgun', type: 'series', status: 'completed', season: 1, episode: 10, rating: 9, thoughts: 'Best thing this year', updated_at: daysAgo(30) },
        { title: 'The Bear', type: 'series', status: 'completed', season: 3, episode: 10, rating: 7, thoughts: 'S3 weaker than S2', updated_at: daysAgo(45) },
        { title: 'Rings of Power', type: 'series', status: 'dropped', season: 2, episode: 3, rating: 4, thoughts: 'Not landing', updated_at: daysAgo(50) },
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
    },
    structured_data: {
      places: [
        { name: 'Kavarna Marks', kind: 'café', ordered: 'Flat white', verdict: 'excellent', revisit: true, visited_at: daysAgo(2) },
        { name: 'Botanika', kind: 'café', ordered: 'Cortado + banana bread', verdict: 'good', revisit: true, visited_at: daysAgo(6) },
        { name: 'Trattoria Nino', kind: 'restaurant', ordered: 'Cacio e pepe', verdict: 'mixed', revisit: false, visited_at: daysAgo(11) },
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
