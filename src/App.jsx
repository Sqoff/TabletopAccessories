import { useState } from 'react'
import MainMenu from './components/MainMenu.jsx'
import TopBar from './components/TopBar.jsx'
import DualDialView from './components/DualDialView.jsx'
import MultiTouchPicker from './components/MultiTouchPicker.jsx'
import DiceRoller from './components/DiceRoller.jsx'
import './App.css'

export default function App() {
  const [currentView, setCurrentView] = useState('menu')

  const getTitle = () => {
    switch (currentView) {
      case 'dial':
        return '이중 회전 다이얼'
      case 'touch-picker':
        return '멀티 터치 선 뽑기'
      case 'dice':
        return 'N면체 주사위 롤러'
      default:
        return '테이블탑 액세서리'
    }
  }

  return (
    <div className="app">
      {currentView !== 'menu' && (
        <TopBar
          title={getTitle()}
          onBack={() => setCurrentView('menu')}
        />
      )}

      <main className="app-content">
        {currentView === 'menu' && (
          <MainMenu onSelectFeature={(featId) => setCurrentView(featId)} />
        )}

        {currentView === 'dial' && <DualDialView />}

        {currentView === 'touch-picker' && <MultiTouchPicker />}

        {currentView === 'dice' && <DiceRoller />}
      </main>
    </div>
  )
}
