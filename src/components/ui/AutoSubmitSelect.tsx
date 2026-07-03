"use client";

import React from 'react';

interface AutoSubmitSelectProps {
  name: string;
  defaultValue: string | number;
  options: { value: string | number; label: string }[];
  className?: string;
}

export const AutoSubmitSelect: React.FC<AutoSubmitSelectProps> = ({
  name,
  defaultValue,
  options,
  className
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.target.form?.submit();
  };

  return (
    <select 
      name={name} 
      defaultValue={defaultValue} 
      onChange={handleChange} 
      className={className || "px-3 py-1.5 border border-zinc-205 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium"}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
