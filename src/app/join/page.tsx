import { Suspense } from 'react';
import { JoinContent } from './join-content';

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-600">Loading...</p></div>}>
      <JoinContent />
    </Suspense>
  );
}
