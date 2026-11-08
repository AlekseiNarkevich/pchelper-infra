import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { getCategories, getProducts } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

const PAGE_SIZE = 12;

/**
 * Каталог: категории, поиск, сортировка, фильтр по цене и страницы.
 *
 * Категория хранится в адресе (/catalog/cpu), поисковый запрос — в query
 * (?search=ryzen), остальные фильтры — в состоянии страницы. Так ссылку
 * на категорию можно отправить коллеге, а сортировку не обязательно
 * тащить в адрес.
 */
export default function Catalog() {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState('price_asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    getProducts({
      category,
      search,
      sort,
      minPrice,
      maxPrice,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        if (!alive) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((reason) => {
        if (alive) setError(reason.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [category, search, sort, minPrice, maxPrice, offset]);

  const current = categories.find((item) => item.id === category);
  const title = category ? current?.name || 'Категория' : 'Все комплектующие';
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  function resetAnd(update) {
    setOffset(0);
    update();
  }

  function handleAdded(product) {
    setNotice(`«${product.name}» добавлен в корзину`);
    setTimeout(() => setNotice(''), 2500);
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>Каталог</span>
        {current && <span>{current.name}</span>}
      </div>

      <div className="chips">
        <Link className={`chip${!category ? ' is-on' : ''}`} to="/catalog">
          Все
        </Link>
        {categories.map((item) => (
          <Link
            className={`chip${category === item.id ? ' is-on' : ''}`}
            key={item.id}
            to={`/catalog/${item.id}`}
          >
            {item.name} · {item.count}
          </Link>
        ))}
      </div>

      <div className="toolbar">
        <div>
          <div className="h1" style={{ fontSize: 26 }}>
            {title}
          </div>
          <div className="sub">
            {search ? `Поиск: «${search}». ` : ''}
            {total} товаров, цены в белорусских рублях
          </div>
        </div>
        <div className="controls">
          <label className="small faint" htmlFor="price-from">
            Цена от
          </label>
          <input
            className="input-price"
            id="price-from"
            min="0"
            onChange={(event) =>
              resetAnd(() => setMinPrice(event.target.value.replace(/\D/g, '')))
            }
            placeholder="0"
            type="number"
            value={minPrice}
          />
          <label className="small faint" htmlFor="price-to">
            до
          </label>
          <input
            className="input-price"
            id="price-to"
            min="0"
            onChange={(event) =>
              resetAnd(() => setMaxPrice(event.target.value.replace(/\D/g, '')))
            }
            placeholder="∞"
            type="number"
            value={maxPrice}
          />
          <select
            className="select"
            onChange={(event) => resetAnd(() => setSort(event.target.value))}
            value={sort}
          >
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="name_asc">По названию</option>
          </select>
        </div>
      </div>

      {notice && <div className="state">{notice}</div>}

      {error && (
        <div className="state error">
          Не удалось загрузить товары: {error}
          <br />
          <button
            className="btn"
            onClick={() => window.location.reload()}
            type="button"
          >
            Повторить
          </button>
        </div>
      )}

      {loading && (
        <div className="product-grid">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div className="skeleton" key={key} />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="state">
          Ничего не найдено. Попробуйте изменить цену или категорию.
          <br />
          <Link className="btn" to="/catalog">
            Сбросить фильтры
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="product-grid">
            {items.map((product) => (
              <ProductCard key={product.id} onAdded={handleAdded} product={product} />
            ))}
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                type="button"
              >
                ← Назад
              </button>
              <span className="small muted">
                Страница {page} из {pages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === pages}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                type="button"
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
