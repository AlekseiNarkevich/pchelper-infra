import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { getProducts, money } from '../api.js';
import { cartCount, onCartChange } from '../cart.js';

/**
 * Шапка витрины: логотип, разделы, поиск с подсказками и счётчик корзины.
 *
 * Подсказки появляются после двух символов и ждут 300 мс — этого достаточно,
 * чтобы не отправлять запрос на каждую букву. Поиск ищет по названию,
 * категории и характеристикам, поэтому «AM5» и «корпус» тоже работают.
 */
export default function Header() {
  const [count, setCount] = useState(cartCount);
  const [term, setTerm] = useState('');
  const [preview, setPreview] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => onCartChange(() => setCount(cartCount())), []);

  useEffect(() => {
    const value = term.trim();
    if (value.length < 2) {
      setPreview([]);
      setOpen(false);
      return undefined;
    }

    let alive = true;
    const timer = setTimeout(() => {
      getProducts({ search: value, limit: 5 })
        .then((data) => {
          if (!alive) return;
          setPreview(data.items);
          setOpen(true);
        })
        .catch(() => {
          if (alive) setPreview([]);
        });
    }, 300);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [term]);

  function goSearch(event) {
    event.preventDefault();
    const value = term.trim();
    setOpen(false);
    navigate(value ? `/catalog?search=${encodeURIComponent(value)}` : '/catalog');
  }

  function goProduct(product) {
    setOpen(false);
    setTerm('');
    navigate(`/product/${product.id}`);
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
          <NavLink
            className={({ isActive }) => `nav-pill${isActive ? ' is-active' : ''}`}
            to="/prebuilt"
          >
            Готовые ПК
          </NavLink>
        </nav>

        <div className="header-tools">
          <div className="search-wrap">
            <form
              className="search"
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onSubmit={goSearch}
              role="search"
            >
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Поиск по каталогу"
                autoComplete="off"
                onChange={(event) => setTerm(event.target.value)}
                onFocus={() => preview.length > 0 && setOpen(true)}
                placeholder="Поиск: модель, AM5, DDR5…"
                type="search"
                value={term}
              />
            </form>
            {open && preview.length > 0 && (
              <div className="search-drop">
                {preview.map((product) => (
                  <button
                    className="search-item"
                    key={product.id}
                    onClick={() => goProduct(product)}
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    <span className="search-name">{product.name}</span>
                    <span className="search-price">{money(product.price)}</span>
                  </button>
                ))}
                <button
                  className="search-all"
                  onClick={goSearch}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  Все результаты →
                </button>
              </div>
            )}
          </div>

          <Link className="icon-btn" title="Корзина" to="/cart">
            🛒 <span className="badge">{count}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
