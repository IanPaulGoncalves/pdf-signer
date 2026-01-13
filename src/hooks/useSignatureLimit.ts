import { useState, useEffect, useCallback } from 'react';

const FREE_LIMIT = 3;
const STORAGE_KEY = 'pdf_signer_signatures_used';
const PREMIUM_KEY = 'pdf_signer_premium';

export const useSignatureLimit = () => {
  const [usedSignatures, setUsedSignatures] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUsedSignatures(parseInt(stored, 10) || 0);
    }
    
    const premium = localStorage.getItem(PREMIUM_KEY);
    if (premium === 'true') {
      setIsPremium(true);
    }
  }, []);

  // Check if user can sign more documents
  const canSign = useCallback((documentCount: number = 1): boolean => {
    if (isPremium) return true;
    return usedSignatures + documentCount <= FREE_LIMIT;
  }, [usedSignatures, isPremium]);

  // Get remaining free signatures
  const remainingFree = isPremium ? Infinity : Math.max(0, FREE_LIMIT - usedSignatures);

  // Increment usage counter
  const incrementUsage = useCallback((count: number = 1) => {
    if (isPremium) return;
    
    const newCount = usedSignatures + count;
    setUsedSignatures(newCount);
    localStorage.setItem(STORAGE_KEY, newCount.toString());
  }, [usedSignatures, isPremium]);

  // Check and show payment modal if needed
  const checkLimitAndProceed = useCallback((documentCount: number = 1): boolean => {
    if (isPremium) return true;
    
    if (usedSignatures + documentCount > FREE_LIMIT) {
      setShowPaymentModal(true);
      return false;
    }
    
    return true;
  }, [usedSignatures, isPremium]);

  // Set premium status (after payment)
  const setPremiumStatus = useCallback((status: boolean) => {
    setIsPremium(status);
    localStorage.setItem(PREMIUM_KEY, status.toString());
  }, []);

  return {
    usedSignatures,
    isPremium,
    remainingFree,
    freeLimit: FREE_LIMIT,
    canSign,
    incrementUsage,
    checkLimitAndProceed,
    showPaymentModal,
    setShowPaymentModal,
    setPremiumStatus,
  };
};
