'use client';

import { Suspense } from 'react';
import BrandIdentityScreen from '@/components/BrandIdentityScreen';

function BrandIdentityContent() {
  return <BrandIdentityScreen />;
}

export default function BrandIdentityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center cinematic-gradient">
        <div className="text-white/80">Loading...</div>
      </div>
    }>
      <BrandIdentityContent />
    </Suspense>
  );
}





