'use client';

import React, { useState } from 'react';
import { UsernamePrompt } from './UsernamePrompt';
import { UsernameModal } from './UsernameModal';

export const UsernameManager: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSetUsername = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <UsernamePrompt onSetUsername={handleSetUsername} />
      <UsernameModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
};