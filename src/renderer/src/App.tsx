import ThreeCanvas from './components/ThreeCanvas';

function App() {
  return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col">
      <header className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
        <span className="text-gray-200 text-sm font-medium">
          3D AI Explainer
        </span>
      </header>
      <main className="flex-1 relative">
        <ThreeCanvas />
      </main>
    </div>
  );
}

export default App;
