import React, { createContext, useContext, useState } from 'react'

const translations = {
  en: {
    nav: {
      home: 'Home', matches: 'Matches', teams: 'Teams', players: 'Players',
      bracket: 'Groups', news: 'News', trivia: 'Trivia',
      predict: 'AI Predict', favorites: 'Favorites', ranking: 'Ranking', about: 'About', quiniela: 'Quiniela',
    },
    home: {
      hero_sub: 'Your ultimate companion for the greatest football tournament on Earth',
      live_today: 'Live & Today', top_players: 'Top Players',
      latest_news: 'Latest News', group_stage: 'Group Stage', ranking: 'Ranking',
      no_live: 'No live matches right now.', highlights: 'Highlights',
    },
    stats: {
      goals: 'Top Scorers', assists: 'Top Assists',
      yellow: 'Most Yellow Cards', red: 'Most Red Cards', injuries: 'Injuries',
      no_data: 'No data available yet. Check back after the first matches.',
      no_injuries: 'No injuries reported for this tournament yet.',
      out: 'Out', questionable: 'Questionable', doubtful: 'Doubtful', highlights: 'Highlights',
    },
    common: {
      see_all: 'See all', teams: 'Teams', matches: 'Matches',
      venues: 'Venues', countries: 'Countries', loading: 'Loading...',
      goals: 'Goals', assists: 'Assists', rating: 'Rating',
      goals_abbr: 'Goals', assists_abbr: 'Ast', rating_abbr: 'Rtg',
      pts: 'Pts', coach: 'Coach', rank: 'Rank', titles: 'Titles',
      add_fav: 'Add to Favorites', favorited: 'Favorited',
      live: 'LIVE', full_time: 'Full Time', upcoming: 'Upcoming',
      search_placeholder: 'Search teams, players, matches...',
      back: 'Back', team: 'Team', value: 'Value',
      all_countries: 'All Countries', founded: 'Founded',
      filter_country: 'Filter by country',
    },
    favorites: {
      no_favs: 'No favorites yet',
      no_favs_sub: 'Tap the heart button on any team, player or match to save them here.',
      browse_teams: 'Browse Teams', browse_players: 'Browse Players',
      tab_teams: 'Teams', tab_players: 'Players', tab_matches: 'Matches',
      no_teams: 'No favorite teams yet.',
      no_players: 'No favorite players yet.',
      no_matches: 'No favorite matches yet.',
      remove: 'Remove',
      login_required:     'Sign in to use Favorites',
      login_required_sub: 'Create an account or sign in to save teams, players, matches and news.',
      sign_in:            'Sign In',
      create_account:     'Create Account',
    },
    player: {
      not_found: 'Player not found',
      info: 'Player Info',
      nationality: 'Nationality', club: 'Club', position: 'Position',
      age: 'Age', height: 'Height', weight: 'Weight',
      caps: "Int'l Caps", intl_goals: "Int'l Goals",
      performance: 'Performance', scoring: 'Scoring',
      creativity: 'Creativity', overall_rating: 'Overall Rating',
      market_value: 'Market Value', view_team: 'View', yrs: 'yrs',
    },
    match: {
      not_found: 'Match not found',
      statistics: 'Statistics', timeline: 'Timeline', venue: 'Venue', referee: 'Referee',
      saved: '♥ Saved', save: '♡ Save', ai_predict: 'AI Prediction',
      stats_upcoming: 'Statistics will be available once the match starts.',
      timeline_upcoming: 'Timeline will appear once the match kicks off.',
      no_events: 'No events recorded.',
    },
    bracket: {
      r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals',
      sf: 'Semi-finals', third: '3rd Place', final: 'Final',
    },
    predict: {
      title: 'AI Match Predictor', label: 'Select two teams for AI match prediction',
      generate: 'Generate Prediction', team1: 'Team 1', team2: 'Team 2',
      win_prob: 'Win Probability', analysis: 'AI Analysis',
      predicted_score: 'Predicted Score', winner: 'Winner', confidence: 'confidence',
      strengths: 'Strengths', key_players: 'Key Players', tactics: 'Tactics',
      draw: 'Draw', new_prediction: 'New Prediction', copy: 'Copy Prediction', copied: 'Copied',
      analyzing: 'Analyzing...', same_team: 'Select two different teams.',
      comparison: 'Comparison',
    },
    trivia: {
      title: 'Football Trivia', fun_facts: 'Fun Facts', next: 'Next Question',
      generating: 'Generating question with AI...',
      correct: 'Correct!', incorrect: 'Incorrect',
      score: 'Your score', genius: "You're a football genius!",
      not_bad: 'Not bad!', keep_learning: 'Keep learning!',
    },
    news: {
      tab_all: 'All', tab_breaking: 'Breaking', tab_match_report: 'Match Report',
      tab_injury: 'Injury', tab_transfer: 'Transfer', tab_trending: 'Trending',
      read_full: 'Read Full Article', open_source: 'Open source',
      preview_note: 'Preview — full article on source site',
    },
  },
  es: {
    nav: {
      home: 'Inicio', matches: 'Partidos', teams: 'Equipos', players: 'Jugadores',
      bracket: 'Grupos', news: 'Noticias', trivia: 'Trivia',
      predict: 'IA Predictor', favorites: 'Favoritos', ranking: 'Ranking', about: 'Acerca', quiniela: 'Quiniela',
    },
    home: {
      hero_sub: 'Tu compañero definitivo para el torneo de fútbol más grande del planeta',
      live_today: 'En Vivo & Hoy', top_players: 'Mejores Jugadores',
      latest_news: 'Últimas Noticias', group_stage: 'Fase de Grupos', ranking: 'Ranking',
      no_live: 'No hay partidos en vivo ahora.', highlights: 'Resúmenes',
    },
    stats: {
      goals: 'Goleadores', assists: 'Asistidores',
      yellow: 'Más Tarjetas Amarillas', red: 'Más Tarjetas Rojas', injuries: 'Lesiones',
      no_data: 'Aún no hay datos. Vuelve después de los primeros partidos.',
      no_injuries: 'No hay lesiones reportadas para este torneo todavía.',
      out: 'Fuera', questionable: 'Cuestionable', doubtful: 'Dudoso', highlights: 'Resúmenes',
    },
    common: {
      see_all: 'Ver todo', teams: 'Equipos', matches: 'Partidos',
      venues: 'Estadios', countries: 'Países', loading: 'Cargando...',
      goals: 'Goles', assists: 'Asistencias', rating: 'Rating',
      goals_abbr: 'Goles', assists_abbr: 'Asis', rating_abbr: 'Cal',
      pts: 'Pts', coach: 'Técnico', rank: 'Ranking', titles: 'Títulos',
      add_fav: 'Agregar a Favoritos', favorited: 'En Favoritos',
      live: 'EN VIVO', full_time: 'Tiempo completo', upcoming: 'Próximo',
      search_placeholder: 'Buscar equipos, jugadores, partidos...',
      back: 'Volver', team: 'Equipo', value: 'Valor',
      all_countries: 'Todos los Países', founded: 'Fundado',
      filter_country: 'Filtrar por país',
    },
    favorites: {
      no_favs: 'Aún no hay favoritos',
      no_favs_sub: 'Toca el botón de corazón en cualquier equipo, jugador o partido para guardarlo aquí.',
      browse_teams: 'Ver Equipos', browse_players: 'Ver Jugadores',
      tab_teams: 'Equipos', tab_players: 'Jugadores', tab_matches: 'Partidos',
      no_teams: 'Sin equipos favoritos.',
      no_players: 'Sin jugadores favoritos.',
      no_matches: 'Sin partidos favoritos.',
      remove: 'Eliminar',
      login_required:     'Inicia sesión para usar Favoritos',
      login_required_sub: 'Crea una cuenta o inicia sesión para guardar equipos, jugadores, partidos y noticias.',
      sign_in:            'Iniciar sesión',
      create_account:     'Crear cuenta',
    },
    player: {
      not_found: 'Jugador no encontrado',
      info: 'Información',
      nationality: 'Nacionalidad', club: 'Club', position: 'Posición',
      age: 'Edad', height: 'Altura', weight: 'Peso',
      caps: 'Partidos Int.', intl_goals: 'Goles Int.',
      performance: 'Rendimiento', scoring: 'Goleador',
      creativity: 'Creatividad', overall_rating: 'Rating Global',
      market_value: 'Valor de Mercado', view_team: 'Ver', yrs: 'años',
    },
    match: {
      not_found: 'Partido no encontrado',
      statistics: 'Estadísticas', timeline: 'Timeline', venue: 'Estadio', referee: 'Árbitro',
      saved: '♥ Guardado', save: '♡ Guardar', ai_predict: 'Predicción IA',
      stats_upcoming: 'Las estadísticas estarán disponibles cuando comience el partido.',
      timeline_upcoming: 'El timeline aparecerá cuando empiece el partido.',
      no_events: 'Sin eventos registrados.',
    },
    bracket: {
      r32: 'Ronda de 32', r16: 'Ronda de 16', qf: 'Cuartos de Final',
      sf: 'Semifinales', third: '3er Puesto', final: 'Final',
    },
    predict: {
      title: 'Predictor IA', label: 'Selecciona dos equipos para predicción de IA',
      generate: 'Generar Predicción', team1: 'Equipo 1', team2: 'Equipo 2',
      win_prob: 'Probabilidad de Victoria', analysis: 'Análisis IA',
      predicted_score: 'Marcador Predicho', winner: 'Ganador', confidence: 'confianza',
      strengths: 'Fortalezas', key_players: 'Jugadores Clave', tactics: 'Táctica',
      draw: 'Empate', new_prediction: 'Nueva Predicción', copy: 'Copiar Predicción', copied: 'Copiado',
      analyzing: 'Analizando...', same_team: 'Selecciona dos equipos distintos.',
      comparison: 'Comparativa',
    },
    trivia: {
      title: 'Trivia de Fútbol', fun_facts: 'Datos Curiosos', next: 'Siguiente Pregunta',
      generating: 'Generando pregunta con IA...',
      correct: '¡Correcto!', incorrect: 'Incorrecto',
      score: 'Tu puntuación', genius: '¡Eres un genio del fútbol!',
      not_bad: '¡No está mal!', keep_learning: '¡Sigue aprendiendo!',
    },
    news: {
      tab_all: 'Todas', tab_breaking: 'Urgente', tab_match_report: 'Crónica',
      tab_injury: 'Lesión', tab_transfer: 'Fichaje', tab_trending: 'Tendencia',
      read_full: 'Leer artículo completo', open_source: 'Abrir fuente',
      preview_note: 'Vista previa — artículo completo en la fuente',
    },
  },
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mwc_lang') || 'en')

  const toggleLang = () => {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
    localStorage.setItem('mwc_lang', next)
  }

  const t = (section, key) => translations[lang]?.[section]?.[key] || key

  return (
    <LangContext.Provider value={{ lang, toggleLang, t, translations: translations[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}