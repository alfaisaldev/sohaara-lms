'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@sohaara/ui';
import { Play } from 'lucide-react';

export default function PlayerIndexPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-scale-in">
      <Card variant="glass" className="w-full max-w-md p-8">
        <CardContent className="flex flex-col items-center p-0">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-6">
            <Play size={32} className="text-accent-indigo ml-1" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-primary-text mb-2">Ready to learn?</h2>
          <p className="text-secondary-text text-sm mb-6 max-w-sm">
            Select a lesson from the sidebar to start your journey.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
