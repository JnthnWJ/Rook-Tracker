import React, { useState, useEffect } from "react";
import {
  Trophy,
  Plus,
  Trash2,
  Users,
  Target,
  RotateCcw,
  Play,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

type Player = {
  id: string;
  name: string;
};

type Round = {
  id: string;
  bidderId: string;
  bidAmount: number;
  partnerId: string | null;
  pointsLost: number;
  opponentsTookLastTrick?: boolean;
  kittyPoints?: number;
  scores: Record<string, number>;
};

type GameState = {
  players: Player[];
  targetScore: number;
  totalPointsPerRound: number;
  partnerGetsHalfPoints: boolean;
  rounds: Round[];
  isStarted: boolean;
};

const INITIAL_PLAYERS: Player[] = [
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
  { id: "p3", name: "Player 3" },
  { id: "p4", name: "Player 4" },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem("rookGameState");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse game state", e);
      }
    }
    return {
      players: INITIAL_PLAYERS,
      targetScore: 500,
      totalPointsPerRound: 200,
      partnerGetsHalfPoints: false,
      rounds: [],
      isStarted: false,
    };
  });

  useEffect(() => {
    localStorage.setItem("rookGameState", JSON.stringify(gameState));
  }, [gameState]);

  const [newRound, setNewRound] = useState({
    bidderId: "p1",
    bidAmount: "150",
    partnerId: "p2",
    pointsLost: "0",
    opponentsTookLastTrick: false,
    kittyPoints: "0",
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    setGameState((prev) => ({ ...prev, isStarted: true }));
  };

  const handlePlayerNameChange = (id: string, newName: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === id ? { ...p, name: newName } : p,
      ),
    }));
  };

  const calculateRoundScores = (
    bidderId: string,
    bidAmount: number,
    partnerId: string | null,
    pointsLost: number,
    opponentsTookLastTrick: boolean,
    kittyPoints: number,
    totalPoints: number,
    partnerGetsHalfPoints: boolean,
    players: Player[],
  ) => {
    const extraOpponentPoints = opponentsTookLastTrick ? 20 + kittyPoints : 0;
    const totalOpponentPoints = pointsLost + extraOpponentPoints;
    const pointsCaptured = totalPoints - totalOpponentPoints;
    const madeBid = pointsCaptured >= bidAmount;

    const scores: Record<string, number> = {};

    players.forEach((p) => {
      if (p.id === bidderId) {
        scores[p.id] = madeBid ? bidAmount : -bidAmount;
      } else if (p.id === partnerId) {
        scores[p.id] = partnerGetsHalfPoints
          ? (madeBid ? Math.round(bidAmount / 2) : -Math.round(bidAmount / 2))
          : (madeBid ? bidAmount : -bidAmount);
      } else {
        scores[p.id] = totalOpponentPoints;
      }
    });

    return scores;
  };

  const handleAddRound = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedBidAmount = parseInt(newRound.bidAmount) || 0;
    const parsedPointsLost = parseInt(newRound.pointsLost) || 0;
    const parsedKittyPoints = parseInt(newRound.kittyPoints) || 0;

    const scores = calculateRoundScores(
      newRound.bidderId,
      parsedBidAmount,
      newRound.partnerId === "none" ? null : newRound.partnerId,
      parsedPointsLost,
      newRound.opponentsTookLastTrick,
      parsedKittyPoints,
      gameState.totalPointsPerRound,
      gameState.partnerGetsHalfPoints,
      gameState.players,
    );

    const round: Round = {
      id: Date.now().toString(),
      bidderId: newRound.bidderId,
      bidAmount: parsedBidAmount,
      partnerId: newRound.partnerId === "none" ? null : newRound.partnerId,
      pointsLost: parsedPointsLost,
      opponentsTookLastTrick: newRound.opponentsTookLastTrick,
      kittyPoints: parsedKittyPoints,
      scores,
    };

    setGameState((prev) => ({
      ...prev,
      rounds: [...prev.rounds, round],
    }));

    // Reset some fields for convenience, keep bidder/partner to make it easy if they stay same
    setNewRound((prev) => ({
      ...prev,
      pointsLost: "",
      opponentsTookLastTrick: false,
      kittyPoints: "0",
    }));
  };

  const handleDeleteRound = (id: string) => {
    setGameState((prev) => ({
      ...prev,
      rounds: prev.rounds.filter((r) => r.id !== id),
    }));
  };

  const handleResetGame = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = (keepPlayers: boolean) => {
    setGameState((prev) => ({
      ...prev,
      rounds: [],
      isStarted: keepPlayers,
    }));
    setShowResetConfirm(false);
  };

  const handleToggleHalfPoints = (checked: boolean) => {
    setGameState((prev) => {
      const newRounds = prev.rounds.map((round) => {
        const newScores = calculateRoundScores(
          round.bidderId,
          round.bidAmount,
          round.partnerId,
          round.pointsLost,
          round.opponentsTookLastTrick || false,
          round.kittyPoints || 0,
          prev.totalPointsPerRound,
          checked,
          prev.players,
        );
        return { ...round, scores: newScores };
      });

      return {
        ...prev,
        partnerGetsHalfPoints: checked,
        rounds: newRounds,
      };
    });
  };

  const getTotalScores = () => {
    const totals: Record<string, number> = {};
    gameState.players.forEach((p) => {
      totals[p.id] = 0;
    });

    gameState.rounds.forEach((round) => {
      Object.entries(round.scores).forEach(([playerId, score]) => {
        totals[playerId] += score as number;
      });
    });

    return totals;
  };

  const totals = getTotalScores();
  const winners = gameState.players.filter(
    (p) => totals[p.id] >= gameState.targetScore,
  );
  const isGameOver = winners.length > 0;

  if (!gameState.isStarted) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 p-4 md:p-8 font-sans">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-rook-navy p-8 text-white text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-rook-gold" />
            <h1 className="text-3xl font-bold tracking-tight">
              Rook Score Tracker
            </h1>
            <p className="text-stone-400 mt-2">Set up your game to begin</p>
          </div>

          <form onSubmit={handleStartGame} className="p-8 space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-stone-500" />
                Players
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameState.players.map((player, index) => (
                  <div key={player.id}>
                    <label className="block text-sm font-medium text-stone-600 mb-1">
                      Player {index + 1}
                    </label>
                    <input
                      type="text"
                      required
                      value={player.name}
                      onChange={(e) =>
                        handlePlayerNameChange(player.id, e.target.value)
                      }
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none transition-all"
                      placeholder={`Player ${index + 1} Name`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-stone-500" />
                Game Rules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Target Score to Win
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={gameState.targetScore}
                    onChange={(e) =>
                      setGameState({
                        ...gameState,
                        targetScore: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Total Points per Round
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={gameState.totalPointsPerRound}
                    onChange={(e) =>
                      setGameState({
                        ...gameState,
                        totalPointsPerRound: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="halfPoints"
                    checked={gameState.partnerGetsHalfPoints}
                    onChange={(e) =>
                      setGameState({
                        ...gameState,
                        partnerGetsHalfPoints: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-rook-teal rounded border-stone-300 focus:ring-rook-teal"
                  />
                  <label
                    htmlFor="halfPoints"
                    className="text-sm font-medium text-stone-700"
                  >
                    Partner gets half points (bidder takes more risk)
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Scoreboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Rook Score Tracker
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                <p className="text-stone-500 text-sm">
                  Playing to {gameState.targetScore} points
                </p>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-stone-300"></div>
                <label className="flex items-center gap-2 text-sm text-stone-500 cursor-pointer hover:text-stone-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={gameState.partnerGetsHalfPoints}
                    onChange={(e) => handleToggleHalfPoints(e.target.checked)}
                    className="w-4 h-4 text-rook-teal rounded border-stone-300 focus:ring-rook-teal cursor-pointer"
                  />
                  Partner gets half points
                </label>
              </div>
            </div>
            <button
              onClick={handleResetGame}
              className="text-stone-500 hover:text-stone-900 flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </button>
          </div>

          {isGameOver && (
            <div className="mb-8 p-4 bg-rook-teal/10 border border-rook-teal/30 rounded-xl flex items-start gap-3">
              <Trophy className="w-6 h-6 text-rook-teal flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-rook-navy">Game Over!</h3>
                <p className="text-rook-teal-dark text-sm mt-1">
                  {winners.map((w) => w.name).join(" and ")} reached the target
                  score of {gameState.targetScore}!
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gameState.players.map((player) => {
              const score = totals[player.id];
              const progress = Math.max(
                0,
                Math.min(100, (score / gameState.targetScore) * 100),
              );
              const isWinner = winners.some((w) => w.id === player.id);

              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-xl border ${isWinner ? "bg-rook-teal/10 border-rook-teal/30" : "bg-stone-50 border-stone-200"}`}
                >
                  <div className="text-sm font-medium text-stone-500 mb-1 truncate">
                    {player.name}
                  </div>
                  <div
                    className={`text-3xl font-bold tracking-tight mb-3 ${score < 0 ? "text-red-600" : "text-stone-900"}`}
                  >
                    {score}
                  </div>
                  <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${score < 0 ? "bg-red-500" : "bg-rook-teal"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Round Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Record Round</h2>
              <form onSubmit={handleAddRound} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Bidder
                  </label>
                  <select
                    required
                    value={newRound.bidderId}
                    onChange={(e) =>
                      setNewRound({ ...newRound, bidderId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none"
                  >
                    {gameState.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Bid Amount
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5"
                    max={gameState.totalPointsPerRound}
                    value={newRound.bidAmount}
                    onChange={(e) =>
                      setNewRound({
                        ...newRound,
                        bidAmount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Partner
                  </label>
                  <select
                    required
                    value={newRound.partnerId}
                    onChange={(e) =>
                      setNewRound({ ...newRound, partnerId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none"
                  >
                    <option value="none">Going Alone (No Partner)</option>
                    {gameState.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Points Lost by Bidding Team
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="5"
                      max={gameState.totalPointsPerRound}
                      value={newRound.pointsLost}
                      onChange={(e) =>
                        setNewRound({
                          ...newRound,
                          pointsLost: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="lastTrick"
                      checked={newRound.opponentsTookLastTrick}
                      onChange={(e) =>
                        setNewRound({
                          ...newRound,
                          opponentsTookLastTrick: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-rook-teal rounded border-stone-300 focus:ring-rook-teal"
                    />
                    <label
                      htmlFor="lastTrick"
                      className="text-sm font-medium text-stone-700"
                    >
                      Bidding team lost the last hand
                    </label>
                  </div>

                  {newRound.opponentsTookLastTrick && (
                    <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                      <label className="block text-sm font-medium text-stone-600 mb-1">
                        Points in Kitty
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={newRound.kittyPoints}
                        onChange={(e) =>
                          setNewRound({
                            ...newRound,
                            kittyPoints: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-rook-teal focus:border-rook-teal outline-none"
                      />
                      <p className="text-xs text-stone-500 mt-1.5 text-amber-600">
                        Opponents get +20 for last hand and +
                        {parseInt(newRound.kittyPoints) || 0} from kitty.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-stone-500 mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Points captured by bidding team:{" "}
                    {Math.max(
                      0,
                      gameState.totalPointsPerRound -
                        ((parseInt(newRound.pointsLost) || 0) +
                          (newRound.opponentsTookLastTrick
                            ? 20 + (parseInt(newRound.kittyPoints) || 0)
                            : 0)),
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isGameOver}
                  className="w-full mt-2 bg-rook-navy hover:bg-rook-navy-dark text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Round
                </button>
              </form>
            </div>
          </div>

          {/* Spreadsheet View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Round</th>
                      <th className="px-4 py-3 font-medium">Bid Info</th>
                      {gameState.players.map((p) => (
                        <th
                          key={p.id}
                          className="px-4 py-3 font-medium text-right"
                        >
                          {p.name}
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {gameState.rounds.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-stone-500"
                        >
                          No rounds recorded yet. Add a round to start tracking
                          scores.
                        </td>
                      </tr>
                    ) : (
                      gameState.rounds.map((round, index) => {
                        const bidder = gameState.players.find(
                          (p) => p.id === round.bidderId,
                        )?.name;
                        const partner = round.partnerId
                          ? gameState.players.find(
                              (p) => p.id === round.partnerId,
                            )?.name
                          : "Alone";
                        const totalOpponentPoints =
                          round.pointsLost +
                          (round.opponentsTookLastTrick
                            ? 20 + (round.kittyPoints || 0)
                            : 0);
                        const pointsCaptured =
                          gameState.totalPointsPerRound - totalOpponentPoints;
                        const madeBid = pointsCaptured >= round.bidAmount;

                        return (
                          <tr
                            key={round.id}
                            className="hover:bg-stone-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-stone-900">
                              #{index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-stone-900">
                                {bidder} bid {round.bidAmount}
                              </div>
                              <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                                <span className="truncate max-w-[100px]">
                                  w/ {partner}
                                </span>
                                <ChevronRight className="w-3 h-3" />
                                <span
                                  className={
                                    madeBid
                                      ? "text-rook-teal font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {madeBid ? "Made it" : "Set"}
                                </span>
                              </div>
                              {round.opponentsTookLastTrick && (
                                <div className="text-xs text-amber-600 mt-0.5">
                                  Lost last hand (+
                                  {20 + (round.kittyPoints || 0)} to opps)
                                </div>
                              )}
                            </td>
                            {gameState.players.map((p) => {
                              const score = round.scores[p.id];
                              return (
                                <td key={p.id} className="px-4 py-3 text-right">
                                  <span
                                    className={`font-mono font-medium ${score > 0 ? "text-rook-teal" : score < 0 ? "text-red-600" : "text-stone-400"}`}
                                  >
                                    {score > 0 ? "+" : ""}
                                    {score}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteRound(round.id)}
                                className="text-stone-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                title="Delete round"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {gameState.rounds.length > 0 && (
                    <tfoot className="bg-stone-50 border-t border-stone-200 font-bold text-stone-900">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right">
                          Total Score:
                        </td>
                        {gameState.players.map((p) => (
                          <td
                            key={p.id}
                            className="px-4 py-3 text-right font-mono text-base"
                          >
                            {totals[p.id]}
                          </td>
                        ))}
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-2">Reset Game?</h3>
            <p className="text-stone-500 mb-6">
              How would you like to reset the game?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => confirmReset(true)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-rook-teal hover:bg-rook-teal-dark rounded-xl transition-colors"
              >
                Keep Players & Reset Scores
              </button>
              <button
                onClick={() => confirmReset(false)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Full Reset (New Players)
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
