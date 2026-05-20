import Dial from './components/Dial.jsx'

export default function App() {
  return (
    <div className="app">
      <div className="dial-stack">
        <Dial variant="filled" pointIndices={[0, 1, 2, 3, 4]} />
        <Dial variant="cutout" holeIndices={[0, 5, 6, 7, 8, 9]} />
      </div>
    </div>
  )
}
