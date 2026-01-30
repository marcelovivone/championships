'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

// Placeholder for Matches page
// This page will be implemented in a later phase of the project
// according to the project development flow: 
// Sports → Leagues → Seasons → Season_clubs → Sport_clubs → Phases → Groups → Match_events → Matches

export default function MatchesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Matches Management</h1>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              This page is under development and will be implemented in a later phase of the project.
            </p>
          </div>
        </div>
      </div>
      <p className="text-gray-600">
        The Matches page will be developed after the Groups page is completed, 
        following the project's phased development approach.
      </p>
    </div>
  );
}