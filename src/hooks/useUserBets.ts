/**
 * useUserBets Hook
 * Fetches the connected user's betting history from the SMART CONTRACT
 * 
 * Created: Jan 14, 2026
 * Updated: Jan 14, 2026 - Switched from Supabase to on-chain data (source of truth)
 * Updated: Jan 14, 2026 - Fixed BigInt comparison bug: contract returns uint8 as BigInt,
 *                         need to convert to Number before comparing to GameStatus enum
 * Updated: Jan 14, 2026 - Fixed 0-indexed game IDs, improved status handling for
 *                         Closed games, calculate payout for already-claimed wins
 * Updated: Jan 16, 2026 - CRITICAL FIX: Corrected getGame return struct field order
 *                         to match ABI (totalPool, agentPools, winnerAgentId, status)
 * Updated: Jan 16, 2026 - Simplified payout calculation using pool ratios to avoid NaN
 * Purpose: Connect Bets page to real on-chain betting data
 * 
 * Features:
 * - Uses wallet address from thirdweb to query bets
 * - Reads from smart contract (source of truth for all betting)
 * - Iterates through all games to find user's bets
 * - Calculates claimable amounts for resolved games
 * - Handles all game states: Open, Closed, Resolved, Cancelled
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react'
import { getContract, readContract } from 'thirdweb'
import { thirdwebClient as client } from '@/lib/thirdweb-client'
import { 
  getContractAddresses,
  GameStatus,
  USDC_DECIMALS,
} from '@/lib/contracts'
import { getSupabaseClient } from '@/lib/supabase/client'

export interface UserBet {
  id: string
  gameId: string
  onChainGameId: number
  gameNumber: number
  agentId: number
  agentName: string
  amount: number
  status: 'pending' | 'won' | 'lost'
  payoutAmount: number | null
  claimed: boolean
  claimedAt: string | null
  placedAt: string
  betTxHash: string
  claimTxHash: string | null
}

interface UseUserBetsReturn {
  bets: UserBet[]
  isLoading: boolean
  error: string | null
  walletAddress: string | null
  isConnected: boolean
  refetch: () => Promise<void>
  stats: {
    totalBets: number
    activeBets: number
    unclaimedWinnings: number
    unclaimedCount: number
    totalWagered: number
    totalWon: number
    winRate: number
  }
}

// Agent names mapping (matches contract indices)
const AGENT_NAMES = ['Chamath', 'Sacks', 'Jason', 'Friedberg']

export function useUserBets(): UseUserBetsReturn {
  const account = useActiveAccount()
  const chain = useActiveWalletChain()
  const walletAddress = account?.address || null
  const isConnected = !!walletAddress

  const [bets, setBets] = useState<UserBet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if on correct network (Base Sepolia for now)
  const isWrongNetwork = chain && chain.id !== 84532 // Base Sepolia chain ID
  
  // Memoize contract to prevent infinite re-renders
  const contract = useMemo(() => {
    if (!chain) {
      console.log('[useUserBets] No chain connected')
      return null
    }
    
    // Only Base Sepolia is supported for now
    if (chain.id !== 84532) {
      console.log(`[useUserBets] Wrong network: ${chain.name} (${chain.id}). Need Base Sepolia (84532)`)
      return null
    }
    
    try {
      console.log(`[useUserBets] Chain connected: ${chain.name} (${chain.id})`)
      const addresses = getContractAddresses(chain.id)
      console.log(`[useUserBets] Contract address: ${addresses.pokerBetting}`)
      return getContract({
        client,
        chain,
        address: addresses.pokerBetting,
      })
    } catch (err) {
      console.error('[useUserBets] Failed to get contract:', err)
      return null
    }
  }, [chain])

  const fetchBets = useCallback(async () => {
    if (!walletAddress) {
      setBets([])
      setIsLoading(false)
      return
    }
    
    if (!contract) {
      setBets([])
      setIsLoading(false)
      if (isWrongNetwork) {
        setError(`Please switch to Base Sepolia network. You are currently on ${chain?.name || 'unknown network'}.`)
      }
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get total number of games from contract
      let totalGamesNum = 0
      try {
        console.log('[useUserBets] Fetching total games from contract...')
        const totalGames = await readContract({
          contract,
          method: "function getTotalGames() view returns (uint256)",
          params: [],
        })
        totalGamesNum = Number(totalGames)
        console.log(`[useUserBets] Found ${totalGamesNum} total games on-chain`)
      } catch (err) {
        console.error('[useUserBets] Failed to get total games:', err)
        const errorMsg = err instanceof Error ? err.message : String(err)
        if (errorMsg.includes('zero data') || errorMsg.includes('0x')) {
          setError('Contract not found. Please switch your wallet to Base Sepolia network.')
        } else {
          setError('Could not connect to the betting contract. Please check your wallet is on the correct network (Base Sepolia).')
        }
        setIsLoading(false)
        return
      }
      
      // Fetch game-to-game_number mapping from Supabase for display
      const supabase = getSupabaseClient()
      const { data: gamesData } = await supabase
        .from('games')
        .select('id, game_number, on_chain_game_id, created_at')
        .not('on_chain_game_id', 'is', null)
        .order('game_number', { ascending: false }) as { data: Array<{ id: string; game_number: number; on_chain_game_id: number | null; created_at: string }> | null }

      // Create lookup for game numbers
      const gameNumberLookup = new Map<number, { gameNumber: number; createdAt: string; gameUuid: string }>()
      for (const g of gamesData || []) {
        if (g.on_chain_game_id !== null) {
          gameNumberLookup.set(g.on_chain_game_id, {
            gameNumber: g.game_number,
            createdAt: g.created_at,
            gameUuid: g.id,
          })
        }
      }

      // Iterate through all games to find user's bets
      // Note: Contract uses 0-indexed game IDs
      const userBets: UserBet[] = []
      
      for (let gameId = 0; gameId < totalGamesNum; gameId++) {
        try {
          // Get user's bets for this game
          let betsResult
          try {
            betsResult = await readContract({
              contract,
              method: "function getUserBets(uint256 gameId, address user) view returns ((uint256[4] agentBets, uint256 totalBet))",
              params: [BigInt(gameId), walletAddress],
            })
          } catch (err) {
            // Skip games where we can't read bet data
            console.warn(`Could not read bets for game ${gameId}:`, err)
            continue
          }

          const totalBet = Number(betsResult.totalBet) / (10 ** USDC_DECIMALS)
          
          // Skip if user has no bets on this game
          if (totalBet === 0) continue

          // Get game info
          // ABI struct order: totalPool, agentPools[4], winnerAgentId, status, createdAt, resolvedAt
          let gameResult
          try {
            gameResult = await readContract({
              contract,
              method: "function getGame(uint256 gameId) view returns ((uint256 totalPool, uint256[4] agentPools, uint8 winnerAgentId, uint8 status, uint48 createdAt, uint48 resolvedAt))",
              params: [BigInt(gameId)],
            })
          } catch (err) {
            console.warn(`Could not read game ${gameId}:`, err)
            continue
          }

          // Convert status to number (contract returns uint8 which may be BigInt)
          const gameStatus = Number(gameResult.status) as GameStatus
          const winnerAgentId = Number(gameResult.winnerAgentId)
          
          console.log(`[useUserBets] Game ${gameId}: status=${gameStatus}, winner=${winnerAgentId}`)

          // Check if user has claimed
          let hasClaimed = false
          if (gameStatus === GameStatus.Resolved || gameStatus === GameStatus.Cancelled) {
            try {
              hasClaimed = await readContract({
                contract,
                method: "function hasClaimed(uint256 gameId, address user) view returns (bool)",
                params: [BigInt(gameId), walletAddress],
              })
            } catch {
              hasClaimed = false
            }
          }

          // Get claimable amount if game is resolved
          let claimableAmount = 0
          if (gameStatus === GameStatus.Resolved && !hasClaimed) {
            try {
              const claimable = await readContract({
                contract,
                method: "function getClaimableAmount(uint256 gameId, address user) view returns (uint256 gross, uint256 fee, uint256 net)",
                params: [BigInt(gameId), walletAddress],
              })
              // claimable is a tuple [gross, fee, net]
              claimableAmount = Number(claimable[2]) / (10 ** USDC_DECIMALS)
            } catch {
              claimableAmount = 0
            }
          }

          // Get game metadata from Supabase
          const gameMeta = gameNumberLookup.get(gameId) || {
            gameNumber: gameId,
            createdAt: new Date().toISOString(),
            gameUuid: `chain-${gameId}`,
          }

          // Create bet entries for each agent the user bet on
          for (let agentIdx = 0; agentIdx < 4; agentIdx++) {
            const agentBetAmount = Number(betsResult.agentBets[agentIdx]) / (10 ** USDC_DECIMALS)
            
            if (agentBetAmount > 0) {
              // Determine bet status
              let status: 'pending' | 'won' | 'lost' = 'pending'
              let payoutAmount: number | null = null
              
              if (gameStatus === GameStatus.Resolved) {
                if (winnerAgentId === agentIdx) {
                  status = 'won'
                  // Calculate payout from pool data (works for both claimed and unclaimed)
                  const totalPool = Number(gameResult.totalPool) / (10 ** USDC_DECIMALS)
                  const winnerPool = Number(gameResult.agentPools[winnerAgentId]) / (10 ** USDC_DECIMALS)
                  
                  if (winnerPool > 0 && totalPool > 0) {
                    // User's share of the winning pool
                    const userShareOfWinnerPool = agentBetAmount / winnerPool
                    const grossPayout = userShareOfWinnerPool * totalPool
                    const profit = grossPayout - agentBetAmount
                    const fee = profit > 0 ? profit * 0.05 : 0
                    payoutAmount = grossPayout - fee
                  } else if (claimableAmount > 0) {
                    // Fallback to claimable amount from contract
                    payoutAmount = claimableAmount
                  }
                  console.log(`[useUserBets] Game ${gameId} agent ${agentIdx}: WON, bet=${agentBetAmount}, payout=${payoutAmount}, claimed=${hasClaimed}`)
                } else {
                  status = 'lost'
                  console.log(`[useUserBets] Game ${gameId} agent ${agentIdx}: LOST (winner was ${winnerAgentId})`)
                }
              } else if (gameStatus === GameStatus.Cancelled) {
                // Cancelled games - can claim refund
                status = 'lost' // Show as lost for cancelled (no winner)
                payoutAmount = agentBetAmount // Refund amount
                console.log(`[useUserBets] Game ${gameId} agent ${agentIdx}: CANCELLED (refundable: ${!hasClaimed})`)
              } else if (gameStatus === GameStatus.Closed) {
                // Game is closed but not yet resolved - betting is over, waiting for resolution
                status = 'pending'
                console.log(`[useUserBets] Game ${gameId} agent ${agentIdx}: CLOSED (awaiting resolution)`)
              } else {
                // Open - betting still active
                console.log(`[useUserBets] Game ${gameId} agent ${agentIdx}: OPEN (status=${gameStatus})`)
              }

              userBets.push({
                id: `${gameId}-${agentIdx}`,
                gameId: gameMeta.gameUuid,
                onChainGameId: gameId,
                gameNumber: gameMeta.gameNumber,
                agentId: agentIdx,
                agentName: AGENT_NAMES[agentIdx],
                amount: agentBetAmount,
                status,
                payoutAmount,
                claimed: hasClaimed,
                claimedAt: hasClaimed ? new Date().toISOString() : null, // We don't have exact time
                placedAt: gameMeta.createdAt,
                betTxHash: '', // Not available from contract read
                claimTxHash: null,
              })
            }
          }
        } catch (err) {
          // Skip games that error (might be deleted or invalid)
          console.warn(`Failed to fetch game ${gameId}:`, err)
        }
      }

      // Sort by game number descending (most recent first)
      userBets.sort((a, b) => b.gameNumber - a.gameNumber)
      
      setBets(userBets)
    } catch (err) {
      console.error('Failed to fetch bets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bets')
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, contract, isWrongNetwork, chain?.name])

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchBets()
  }, [fetchBets])

  // Calculate aggregated stats
  const stats = useMemo(() => ({
    totalBets: bets.length,
    activeBets: bets.filter(b => b.status === 'pending').length,
    unclaimedWinnings: bets
      .filter(b => b.status === 'won' && !b.claimed)
      .reduce((sum, b) => sum + (b.payoutAmount || 0), 0),
    unclaimedCount: bets.filter(b => b.status === 'won' && !b.claimed).length,
    totalWagered: bets.reduce((sum, b) => sum + b.amount, 0),
    totalWon: bets
      .filter(b => b.status === 'won')
      .reduce((sum, b) => sum + (b.payoutAmount || 0), 0),
    winRate: bets.filter(b => b.status !== 'pending').length > 0
      ? (bets.filter(b => b.status === 'won').length / 
         bets.filter(b => b.status !== 'pending').length) * 100
      : 0,
  }), [bets])

  return {
    bets,
    isLoading,
    error,
    walletAddress,
    isConnected,
    refetch: fetchBets,
    stats,
  }
}
