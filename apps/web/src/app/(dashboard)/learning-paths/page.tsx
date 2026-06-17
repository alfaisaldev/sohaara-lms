'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Route, BookOpen, Clock, AlertCircle, CheckCircle, Target, Search, Send, UserPlus, Check, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [requests, setRequests] = useState<Record<string, string>>({});
  const [discoverable, setDiscoverable] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);

  const fetchAssigned = useCallback(() => {
    api.get<any>('/learning-paths/my')
      .then((res) => setPaths(toArray(res)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchDiscoverable = useCallback(() => {
    setDiscoverLoading(true);
    api.get<any>('/learning-paths/search?q=')
      .then((res) => setDiscoverable(toArray(res)))
      .finally(() => setDiscoverLoading(false));
  }, []);

  useEffect(() => { fetchAssigned(); fetchDiscoverable(); }, [fetchAssigned, fetchDiscoverable]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get<any>(`/learning-paths/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(toArray(res));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleRequestJoin = async (pathId: string) => {
    try {
      await api.post(`/learning-paths/${pathId}/join-request`);
      setRequests((prev) => ({ ...prev, [pathId]: 'pending' }));
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  const assignedIds = new Set(paths.map((p) => p.id));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-danger" />
      </div>
      <p className="text-secondary-text text-sm">Failed to load learning paths</p>
      <p className="text-xs text-danger/60 mt-1">{error}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">Learning Paths</h2>
        <p className="text-secondary-text text-sm mt-1">Discover curated learning journeys or view your assigned paths</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 animate-fade-in-up">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search learning paths..."
            className="w-full rounded-xl border border-border/60 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-secondary-text/50 outline-none focus:border-accent-indigo/50 transition-all"
          />
        </div>
        <Button onClick={handleSearch} loading={searching} variant="primary" size="sm" className="rounded-xl cursor-pointer">
          <Search size={14} /> Search
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3 animate-fade-in-up">
          <h3 className="text-lg font-bold text-primary-text">Search Results</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {searchResults.map((sp) => {
              const isAssigned = assignedIds.has(sp.id);
              const reqStatus = requests[sp.id];
              const total = sp.coursesRelation?.length || 0;
              return (
                <Card key={sp.id} variant="glass" className="border-white/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0">
                        <Route size={18} className="text-accent-indigo" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-primary-text">{sp.title}</p>
                          {sp.isMandatory && <Target size={12} className="text-amber-400 shrink-0" />}
                        </div>
                        {sp.description && <p className="text-xs text-secondary-text mt-0.5 line-clamp-1">{sp.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-secondary-text mt-2">
                          <span className="flex items-center gap-1"><BookOpen size={11} /> {total} courses</span>
                          {sp.estimatedHours && <span className="flex items-center gap-1"><Clock size={11} /> {sp.estimatedHours}h</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/learning-paths/${sp.id}`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full rounded-xl cursor-pointer">
                          <ExternalLink size={12} /> View
                        </Button>
                      </Link>
                      {isAssigned ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 px-3 py-1.5">
                          <Check size={12} /> Assigned
                        </span>
                      ) : reqStatus === 'pending' ? (
                        <span className="flex items-center gap-1 text-xs text-amber-400 px-3 py-1.5">
                          <Clock size={12} /> Pending
                        </span>
                      ) : (
                        <Button onClick={() => handleRequestJoin(sp.id)} variant="primary" size="sm" className="rounded-xl cursor-pointer">
                          <UserPlus size={12} /> Request
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Discoverable Paths */}
      {!discoverLoading && discoverable.length > 0 && (
        <div className="space-y-4 animate-fade-in-up">
          <h3 className="text-lg font-bold text-primary-text flex items-center gap-2">
            <Route size={18} className="text-accent-indigo" /> Discover Paths
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {discoverable.filter((dp) => !assignedIds.has(dp.id)).map((dp) => {
              const total = dp.coursesRelation?.length || 0;
              const reqStatus = requests[dp.id];
              return (
                <Card key={dp.id} variant="glass" className="border-white/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0">
                        <Route size={18} className="text-accent-indigo" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-primary-text">{dp.title}</p>
                          {dp.isMandatory && <Target size={12} className="text-amber-400 shrink-0" />}
                        </div>
                        {dp.description && <p className="text-xs text-secondary-text mt-0.5 line-clamp-1">{dp.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-secondary-text mt-2">
                          <span className="flex items-center gap-1"><BookOpen size={11} /> {total} courses</span>
                          {dp.estimatedHours && <span className="flex items-center gap-1"><Clock size={11} /> {dp.estimatedHours}h</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/learning-paths/${dp.id}`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full rounded-xl cursor-pointer">
                          <ExternalLink size={12} /> View
                        </Button>
                      </Link>
                      {reqStatus === 'pending' ? (
                        <span className="flex items-center gap-1 text-xs text-amber-400 px-3 py-1.5">
                          <Clock size={12} /> Pending
                        </span>
                      ) : (
                        <Button onClick={() => handleRequestJoin(dp.id)} variant="primary" size="sm" className="rounded-xl cursor-pointer">
                          <UserPlus size={12} /> Request
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* My Learning Paths */}
      <div className="space-y-4 animate-fade-in-up">
        <h3 className="text-lg font-bold text-primary-text flex items-center gap-2">
          <Route size={18} className="text-accent-indigo" /> My Assigned Paths
        </h3>

        {paths.length === 0 ? (
          <Card variant="glass" className="animate-scale-in">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
                <Route size={30} className="text-accent-indigo" />
              </div>
              <p className="text-secondary-text text-sm">No learning paths assigned to you yet</p>
              <p className="text-xs text-secondary-text/60 mt-1">Search above to discover and request paths</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {paths.map((path) => {
              const total = path.courses?.length || path.coursesRelation?.length || 0;
              const progress = path.progress?.[0]?.progress || 0;
              const completed = path.progress?.[0]?.completedCourses?.length || 0;
              return (
                <Link key={path.id} href={`/learning-paths/${path.id}`}>
                  <Card variant="glass" className="cursor-pointer border-white/30 hover:border-accent-indigo/30 transition-all duration-300 h-full hover-lift">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0">
                          <Route size={20} className="text-accent-indigo" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm text-primary-text">{path.title}</CardTitle>
                          {path.description && <p className="text-sm text-secondary-text mt-1 line-clamp-2">{path.description}</p>}
                        </div>
                        {path.isMandatory && (
                          <Target size={16} className="text-amber-400 shrink-0" aria-label="Mandatory" />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-secondary-text">
                          <span>Progress</span>
                          <span>{completed}/{total} courses</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-indigo-light transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-secondary-text pt-1">
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {total} courses</span>
                        {path.estimatedHours && <span className="flex items-center gap-1"><Clock size={12} /> {path.estimatedHours}h</span>}
                        {progress >= 100 && (
                          <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={12} /> Completed</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
