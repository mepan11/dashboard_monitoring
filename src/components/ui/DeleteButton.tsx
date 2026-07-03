"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  action: (formData: FormData) => void;
  confirmMessage: string;
  className?: string;
  children?: React.ReactNode;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ 
  action, 
  confirmMessage, 
  className,
  children 
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault();
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="inline">
      {children}
      <button 
        type="submit" 
        className={className || "p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg cursor-pointer inline-flex items-center justify-center"}
        title="Hapus"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
};
