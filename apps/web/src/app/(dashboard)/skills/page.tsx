'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Zap, TrendingUp, BookOpen } from 'lucide-react';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function SkillsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/skills/categories'),
      api.get<any>('/skills/user/me').catch(() => null),
    ]).then(([cats, skills]) => {
      setCategories(toArray(cats));
      setUserSkills(toArray(skills));
    }).catch(() => { setCategories([]); setUserSkills([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  const skillMap = new Map(userSkills.map((us) => [us.skillId, us]));

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">Skills & Competencies</h2>
        <p className="text-secondary-text text-sm mt-1">Track your skill development across categories</p>
      </div>

      {categories.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
              <Zap size={36} className="text-accent-indigo" />
            </div>
            <p className="text-secondary-text">No skill categories defined yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-stagger">
          {categories.map((cat) => (
            <Card key={cat.id} variant="glass">
              <CardHeader>
                <CardTitle className="text-base text-primary-text">{cat.name}</CardTitle>
                {cat.description && <p className="text-sm text-secondary-text">{cat.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                {cat.skills?.map((skill: any) => {
                  const us = skillMap.get(skill.id);
                  const score = us?.score || 0;
                  const level = us?.level || 'untracked';
                  const levelColors: Record<string, string> = {
                    untracked: 'bg-white/40 text-secondary-text',
                    beginner: 'bg-accent-orange/20 text-accent-orange',
                    intermediate: 'bg-accent-indigo/20 text-accent-indigo',
                    advanced: 'bg-success/20 text-success',
                    expert: 'bg-accent-indigo/30 text-accent-indigo',
                  };
                  return (
                    <div key={skill.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-white/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-primary-text">{skill.name}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-xl ${levelColors[level] || levelColors.untracked}`}>
                            {level}
                          </span>
                        </div>
                        {skill.description && <p className="text-xs text-secondary-text mt-0.5">{skill.description}</p>}
                      </div>
                      {us?.assessed && (
                        <div className="text-right ml-4">
                          <div className="flex items-center gap-1">
                            <TrendingUp size={14} className="text-accent-indigo" />
                            <span className="text-sm font-bold text-primary-text">{score}%</span>
                          </div>
                          <div className="w-20 h-1.5 rounded-full bg-white/30 mt-1">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-teal transition-all" style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
