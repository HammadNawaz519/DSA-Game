import React, { useState } from 'react';
import { AuthProvider, API_BASE } from './context/AuthContext';
import MainMenu from './components/Menu/MainMenu';
import GameBoard3D from './components/Game/GameBoard3D';
import MatchmakingModal from './components/Matchmaking/MatchmakingModal';
import PrivateRoomModal from './components/Lobby/PrivateRoomModal';
import Lobby from './components/Lobby/Lobby';
import ProfilePage from './components/Profile/ProfilePage';
import LeaderboardPage from './components/Leaderboard/LeaderboardPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import AlmanacPage from './components/Almanac/AlmanacPage';
import AuthModal from './components/Auth/AuthModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'game', 'lobby', 'profile', 'leaderboard', 'admin', 'almanac'
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [isPrivateRoomOpen, setIsPrivateRoomOpen] = useState(false);

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activePlayerRole, setActivePlayerRole] = useState('PLANT');

  const handleStartGame = (roomId, role) => {
    setActiveRoomId(roomId);
    setActivePlayerRole(role);
    setIsMatchmakingOpen(false);
    setIsPrivateRoomOpen(false);
    setCurrentScreen('game');
  };

  const handleStartPracticeAI = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/api/rooms/practice-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 1001,
          username: user?.display_name || user?.username || 'Commander',
          elo: user?.elo || 1000
        })
      });
      const data = await res.json();
      if (data.success) {
        handleStartGame(data.room_id, 'PLANT');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
        {currentScreen === 'menu' && (
          <MainMenu
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenMatchmaking={() => setIsMatchmakingOpen(true)}
            onOpenPrivateRoom={() => setIsPrivateRoomOpen(true)}
            onStartPracticeAI={handleStartPracticeAI}
          />
        )}

        {currentScreen === 'lobby' && (
          <Lobby
            onNavigate={(screen) => setCurrentScreen(screen)}
            onStartGame={handleStartGame}
          />
        )}

        {currentScreen === 'game' && (
          <GameBoard3D
            roomId={activeRoomId}
            playerRole={activePlayerRole}
            onExit={() => setCurrentScreen('menu')}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfilePage onNavigate={(screen) => setCurrentScreen(screen)} />
        )}

        {currentScreen === 'leaderboard' && (
          <LeaderboardPage onNavigate={(screen) => setCurrentScreen(screen)} />
        )}

        {currentScreen === 'admin' && (
          <AdminDashboard onNavigate={(screen) => setCurrentScreen(screen)} />
        )}

        {currentScreen === 'almanac' && (
          <AlmanacPage onNavigate={(screen) => setCurrentScreen(screen)} />
        )}

        {/* Global Modals */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />

        <MatchmakingModal
          isOpen={isMatchmakingOpen}
          onClose={() => setIsMatchmakingOpen(false)}
          onMatchFound={handleStartGame}
        />

        <PrivateRoomModal
          isOpen={isPrivateRoomOpen}
          onClose={() => setIsPrivateRoomOpen(false)}
          onStartGame={handleStartGame}
        />
      </div>
    </AuthProvider>
  );
}
