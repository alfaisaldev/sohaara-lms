export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

export const CONTENT_STATUS = ['draft', 'published', 'archived', 'scheduled'] as const;

export const LESSON_TYPES = [
  'video',
  'text',
  'audio',
  'pdf',
  'presentation',
  'resource',
  'embed',
  'assignment',
  'quiz',
  'live_session',
  'external',
  'scorm',
] as const;

export const QUESTION_TYPES = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'fill_blank',
  'matching',
  'short_answer',
  'essay',
] as const;

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'all'] as const;

export const USER_STATUS = ['active', 'inactive', 'suspended'] as const;

export const ENROLLMENT_STATUS = ['active', 'completed', 'dropped', 'expired'] as const;

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as const;
