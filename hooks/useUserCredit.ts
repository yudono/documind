"use client";

import { useState, useEffect } from 'react';

interface UserCredit {
  balance: number;
  dailyLimit: number;
  totalEarned: number;
  totalSpent: number;
  lastResetDate: string;
}

interface UseUserCreditReturn {
  userCredit: UserCredit | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserCredit(): UseUserCreditReturn {
  const [userCredit, setUserCredit] = useState<UserCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCredit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/credits');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user credits: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUserCredit(data);
    } catch (err) {
      console.error('Error fetching user credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCredit();
  }, []);

  return {
    userCredit,
    loading,
    error,
    refetch: fetchUserCredit,
  };
}