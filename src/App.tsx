import { createHashRouter, NavLink, Outlet } from 'react-router-dom';
import StartPage from './pages/StartPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import MapPage from './pages/MapPage';
import AdminPage from './pages/AdminPage';

function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-2 rounded-md text-sm sm:text-base min-h-[44px] flex items-center transition-colors',
      isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800',
    ].join(' ');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 sticky top-0 bg-[#0f1115]/95 backdrop-blur z-10">
        <nav className="max-w-3xl mx-auto px-3 py-2 flex flex-wrap gap-1 items-center">
          <span className="font-semibold mr-2 text-indigo-400">НРИ</span>
          <NavLink to="/" end className={linkClass}>Главная</NavLink>
          <NavLink to="/quiz" className={linkClass}>Анкета</NavLink>
          <NavLink to="/map" className={linkClass}>Карта</NavLink>
          <NavLink to="/result" className={linkClass}>Результат</NavLink>
          <NavLink to="/admin" className={linkClass}>Админ</NavLink>
        </nav>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <StartPage /> },
      { path: 'quiz', element: <QuizPage /> },
      { path: 'result', element: <ResultPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: '*', element: <StartPage /> },
    ],
  },
]);
