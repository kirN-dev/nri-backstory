import { Link } from 'react-router-dom';

export default function StartPage() {
  return (
    <section>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Конструктор предысторий</h1>
      <p className="text-gray-400 mb-6">
        Каркас приложения (Этап 1). Здесь появится список предысторий.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/quiz" className="block rounded-lg border border-gray-700 p-4 hover:border-indigo-500 transition-colors min-h-[44px]">
          <div className="font-semibold">Пройти анкету</div>
          <div className="text-sm text-gray-400">Процесс определения истории</div>
        </Link>
        <Link to="/map" className="block rounded-lg border border-gray-700 p-4 hover:border-indigo-500 transition-colors min-h-[44px]">
          <div className="font-semibold">Карта мира</div>
          <div className="text-sm text-gray-400">Место происхождения</div>
        </Link>
      </div>
    </section>
  );
}
