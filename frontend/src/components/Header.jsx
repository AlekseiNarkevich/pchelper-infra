import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { cartCount, onCartChange } from '../cart.js';

/**
 * Шапка витрины: логотип, разделы, поиск и счётчик выбранных товаров.
 *
 * Поиск ведёт в каталог с параметром search — отдельной страницы
 * результатов в ЛР7 нет, каталог сам применяет фильтр.
 */
export default function Header() {
  const [count, setCount] = useState(cartCount);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => onCartChange(() => setCount(cartCount())), []);

  function submit(event) {
    event.preventDefault();
    const value = term.trim();
    navigate(value ? `/catalog?search=${encodeURIComponent(value)}` : '/catalog');
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="PCHelper — на главную">
          <span className="brand-mark">PC</span>
          <span>
            <span className="brand-name">PCHelper</span>
            <br />
            <span className="brand-tag">Просто и ясно</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Основная навигация">
          <NavLink
            className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
            end
            to="/"
          >
            Главная
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
            to="/catalog"
          >
            Каталог
          </NavLink>
          <NavLink className="nav-pill" to="/catalog/case">
            Корпуса
          </NavLink>
        </nav>

        <div className="header-tools">
          <form className="search" onSubmit={submit} role="search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Поиск по каталогу"
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Поиск…"
              type="search"
              value={term}
            />
          </form>
          <span className="icon-btn" title="Выбрано товаров">
            🛒 <span className="badge">{count}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
