export interface Skill {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  score: number;
  maxScore: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  assessed: boolean;
  assessedBy?: string;
  assessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  recommendedCourses: string[];
}

export interface SkillsFramework {
  categories: SkillCategory[];
  skills: Skill[];
  userSkills: UserSkill[];
  gaps: SkillGap[];
}
