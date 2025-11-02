'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

// Custom session interface to include wallet and fid
interface CustomSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    wallet?: string;
    fid?: string;
    token?: string;
    username?: string;
  };
  wallet?: string;
  fid?: string;
  token?: string;
  expires: string;
}

interface UsernamePromptProps {
  onSetUsername: () => void;
}

export const UsernamePrompt: React.FC<UsernamePromptProps> = ({ onSetUsername }) => {
  const { data: session } = useSession() as { data: CustomSession | null };

  console.log('UsernamePrompt session:', session);

  // Only show for users with FID starting with "none-" and no username set
  if (!session || session?.user?.username || session?.fid?.startsWith('none-') === false) {
    return null;
  } 
  return (
    <div className="bg-yellow-50 border w-full border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-yellow-600 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Create a username so your bidders know you better
            </p>
          </div>
        </div>
        <button
          onClick={onSetUsername}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Set
        </button>
      </div>
    </div>
  );
};