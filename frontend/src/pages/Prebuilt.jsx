import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getPrebuilt, money } from '../api.js';
import { addToCart } from '../cart.js';

/**
 * Готовые сборки: состав, задача и цена из суммы деталей.
 *
 * Отдельная страница, а не блок на главной: сюда ведёт пункт меню
 * «Готовые ПК», и здесь видно весь состав каждой конфигурации.
 */
export default function Prebuilt() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    getPrebuilt()
      .then((data) => {
        if (alive) setItems(data.items);
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
  }, []);

  function add(build) {
    addToCart({ id: `prebuilt:${build.id}`, name: build.name, price: build.price });
    setNotice(`Сборка «${build.name}» добавлена в корзину`);
    setTimeout(() => setNotice(''), 2500);
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>Готовые ПК</span>
      </div>

      <div className="toolbar">
        <div>
          <div className="h1" style={{ fontSize: 26 }}>
            Готовые сборки
          </div>
          <div className="sub">
            {items.length} конфигурации под разные задачи, цены в белорусских рублях
          </div>
        </div>
        <Link className="btn btn-secondary" to="/catalog">
          Собрать самому
        </Link>
      </div>

      {notice && <div className="state">{notice}</div>}
      {error && <div className="state error">Не удалось загрузить сборки: {error}</div>}

      {loading && (
        <div className="product-grid">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}

      {!loading && !error && (
        <div className="product-grid">
          {items.map((build) => (
            <article className="product-card" key={build.id}>
              <div className="photo">
                {build.imageUrl ? (
                  <img alt={build.name} loading="lazy" src={build.imageUrl} />
                ) : (
                  <span>фото</span>
                )}
              </div>
              <div className="name">{build.name}</div>
              <div className="vendor">{build.task}</div>
              <ul className="build-list">
                {build.components.map((component) => (
                  <li key={`${component.category}-${component.name}`}>
                    {component.name}
                  </li>
                ))}
              </ul>
              <div className="bottom">
                <div className="price">{money(build.price)}</div>
                <button className="btn btn-sm" onClick={() => add(build)} type="button">
                  В корзину
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
