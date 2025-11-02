'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

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

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession() as { data: CustomSession | null };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    if (username.length > 20) {
      toast.error('Username must be less than 20 characters');
      return;
    }

    // Check for valid username format (alphanumeric and underscores)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (!session?.wallet) {
      toast.error('Wallet address not found');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/protected/user/update-username', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: session.wallet,
          username: username.toLowerCase(),
        }),
      });

      if (response.ok) {
        toast.success('Username set successfully! Please log in again.');
        
        // Clear session and force re-login
        await signOut({ redirect: false });
        
        // Close modal
        onClose();
        
        // Optionally reload the page to reset all state
        window.location.reload();
      } else {
        const error = await response.json();
        if (response.status === 409) {
          toast.error('Username is already taken. Please choose another one.');
        } else {
          toast.error(error.message || 'Failed to set username');
        }
      }
    } catch (error) {
      console.error('Error setting username:', error);
      toast.error('An error occurred while setting username');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border border-primary rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold gradient-text">Set Your Username</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className=" mb-4 text-xs text-gray-400 mt-2">
          Choose a username that your bidders will recognize. This will help build trust in the auction community.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-primary text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3 py-2 border text-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? 'Setting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};