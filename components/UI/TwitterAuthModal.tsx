"use client";

import { useState, useRef } from "react";
import { useLoginWithOAuth } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { FaTwitter } from "react-icons/fa";
import { RiLoader5Fill } from "react-icons/ri";
import toast from "react-hot-toast";
import { useGlobalContext } from "@/utils/providers/globalContext";

interface TwitterAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwitterAuthModal({ isOpen, onClose, onSuccess }: TwitterAuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const hasProcessedRef = useRef(false);
  const { refreshTwitterProfile } = useGlobalContext();

  const { initOAuth } = useLoginWithOAuth({
    onComplete: async ({ user, isNewUser }) => {
      // Prevent duplicate processing
      if (hasProcessedRef.current) {
        console.log('Twitter profile already processed, skipping...');
        return;
      }
      
      hasProcessedRef.current = true;
      console.log('OAuth complete:', { user, isNewUser });
      
      // Check if user has Twitter account linked
      if (user?.twitter) {
        const twitterProfile = {
          id: user.twitter.subject,
          username: user.twitter.username,
          name: user.twitter.name,
          profileImageUrl: user.twitter.profilePictureUrl
        };

        try {
          // Save Twitter profile to database
          const response = await fetch('/api/protected/user/save-twitter-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ twitterProfile }),
          });

          if (response.ok) {
            toast.success('Twitter profile linked successfully!');
            // Refresh the Twitter profile status in global context
            await refreshTwitterProfile();
            // Don't call onSuccess immediately to prevent context refresh loops
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 500);
          } else {
            throw new Error('Failed to save Twitter profile');
          }
        } catch (error) {
          console.error('Error saving Twitter profile:', error);
          toast.error('Failed to save Twitter profile');
          hasProcessedRef.current = false; // Reset on error
        }
      } else {
        toast.error('Twitter authentication was not completed');
        hasProcessedRef.current = false; // Reset on error
      }
      
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('OAuth error:', error);
      toast.error('Failed to authenticate with Twitter');
      setIsLoading(false);
      hasProcessedRef.current = false; // Reset on error
    }
  });

  const handleTwitterAuth = async () => {
    setIsLoading(true);
    
    try {
      console.log("Starting Twitter OAuth flow...");
      await initOAuth({ provider: 'twitter' });
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast.error('Failed to start Twitter authentication');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTwitter className="w-8 h-8 text-blue-500" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Link Your Twitter Account
          </h3>
          
          <p className="text-gray-600 mb-6">
            To create auctions from your desktop wallet, we need to verify your identity through Twitter.
            This helps us know who you are and prevents spam.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleTwitterAuth}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RiLoader5Fill className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <FaTwitter />
                  Link Twitter
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}