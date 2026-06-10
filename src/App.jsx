import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LangProvider }  from './context/LangContext'
import { AuthProvider }  from './context/AuthContext'
import { AppProvider }   from './context/AppContext'
import Layout from './components/layout/Layout'
import ScrollToTop from './components/common/ScrollToTop'
import Home from './pages/Home'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Bracket from './pages/Bracket'
import News from './pages/News'
import Trivia from './pages/Trivia'
import AiPredict from './pages/AiPredict'
import Favorites from './pages/Favorites'
import LiveMatch from './pages/LiveMatch'
import FifaRanking from './pages/FifaRanking'
import AccountPage from './pages/AccountPage'
import ResetPassword from './pages/ResetPassword'
import AboutPage from './pages/AboutPage'
import NotFound from './pages/NotFound'
import Quiniela from './pages/Quiniela'

export default function App() {
  return (
    <LangProvider>
      {/* AuthProvider antes de AppProvider para que AppProvider pueda leer useAuth() */}
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="matches" element={<Matches />} />
                <Route path="matches/:id" element={<MatchDetail />} />
                <Route path="live/:id" element={<LiveMatch />} />
                <Route path="teams" element={<Teams />} />
                <Route path="teams/:id" element={<TeamDetail />} />
                <Route path="players" element={<Players />} />
                <Route path="players/:id" element={<PlayerDetail />} />
                <Route path="bracket" element={<Bracket />} />
                <Route path="news" element={<News />} />
                <Route path="trivia" element={<Trivia />} />
                <Route path="predict" element={<AiPredict />} />
                <Route path="favorites" element={<Favorites />} />
                <Route path="ranking" element={<FifaRanking />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="quiniela" element={<Quiniela />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </LangProvider>
  )
}