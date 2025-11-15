'use client';

import StartingScreen from '@/components/StartingScreen';

export default function Home() {
  return <StartingScreen onCreateProject={async (prompt: string, images?: File[], targetDuration?: number) => {}} />;
}
