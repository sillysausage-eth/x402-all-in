/**
 * Verification Badge Component
 * 
 * Shows a "Verified" badge for games with cryptographic proof.
 * Clicking opens a modal with verification details.
 * 
 * Created: January 20, 2026
 * Updated: January 26, 2026 - Changed text to always show "Verified" instead of "Committed"
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VerificationData {
  commitmentValid: boolean;
  commitment: string;
  computedHash: string;
  salt?: string;
  handsVerified?: number;
  handsTotal?: number;
  error?: string;
}

interface VerificationBadgeProps {
  gameId: string;
  gameNumber: number;
  status: string;
  commitment: string | null;
}

export function VerificationBadge({ 
  gameId, 
  gameNumber,
  status,
  commitment 
}: VerificationBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isResolved = status === 'resolved';
  const hasCommitment = !!commitment;

  const handleClick = async () => {
    if (!hasCommitment) return;
    
    setIsModalOpen(true);
    
    // Fetch verification data if game is resolved
    if (isResolved && !verificationData) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/games/${gameId}/verify`);
        const data = await response.json();
        if (data.verification) {
          setVerificationData(data.verification);
        }
      } catch (error) {
        console.error('Failed to fetch verification:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!hasCommitment) {
    return null;
  }

  return (
    <>
      {/* Badge */}
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
        title="Click to view verification details"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Verified
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 rounded-xl border border-neutral-800 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h2 className="text-lg font-bold text-white">
                  Game #{gameNumber} Verification
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isResolved ? 'bg-emerald-400' : 'bg-blue-400'
                  }`} />
                  <span className="text-sm text-neutral-400">
                    {isResolved ? 'Game completed and verified' : 'Game in progress - salt hidden'}
                  </span>
                </div>

                {/* Commitment Hash */}
                <div className="bg-black rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                    Commitment Hash
                  </div>
                  <code className="text-xs text-emerald-400 break-all font-mono">
                    {commitment}
                  </code>
                  <p className="text-xs text-neutral-500 mt-2">
                    Published before game started. SHA-256 hash of master salt.
                  </p>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400" />
                  </div>
                )}

                {/* Verification Results (resolved games only) */}
                {verificationData && !isLoading && (
                  <>
                    {/* Salt Reveal */}
                    {verificationData.salt && (
                      <div className="bg-black rounded-lg p-3">
                        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                          Revealed Salt
                        </div>
                        <code className="text-xs text-blue-400 break-all font-mono">
                          {verificationData.salt}
                        </code>
                      </div>
                    )}

                    {/* Verification Status */}
                    <div className={`rounded-lg p-3 ${
                      verificationData.commitmentValid 
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {verificationData.commitmentValid ? (
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={`font-medium ${
                          verificationData.commitmentValid ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {verificationData.commitmentValid 
                            ? 'Commitment Verified ✓'
                            : 'Verification Failed'}
                        </span>
                      </div>
                      {verificationData.error && (
                        <p className="text-sm text-red-300 mt-2">{verificationData.error}</p>
                      )}
                    </div>

                    {/* Hands Verified */}
                    {verificationData.handsVerified !== undefined && (
                      <div className="bg-black rounded-lg p-3">
                        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                          Hands Verified
                        </div>
                        <div className="text-lg font-bold text-white">
                          {verificationData.handsVerified} / {verificationData.handsTotal}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          All dealt cards match the deterministic shuffle from the salt.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Explanation (for non-resolved games) */}
                {!isResolved && (
                  <div className="bg-neutral-800/50 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-white mb-2">
                      How Verification Works
                    </h3>
                    <ul className="text-xs text-neutral-400 space-y-1">
                      <li>• A random salt was generated before the game started</li>
                      <li>• The commitment hash (shown above) was published</li>
                      <li>• All card shuffles are determined by: salt + hand number</li>
                      <li>• After the game, the salt is revealed so anyone can verify</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-800">
                <a
                  href="/about#verifiable-games"
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Learn more about verifiable games →
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
