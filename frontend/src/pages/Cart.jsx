import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { money } from '../api.js';
import { onCartChange, readCart, removeItem, setQty } from '../cart.js';

/**
 * Корзина — демонстрационная: позиции хранятся в localStorage.
 *
 * Серверная корзина и оформление заказа входят в курсовую 4 курса.
 * Здесь важно показать сценарий: товар выбран, количество меняется,
 * сумма пересчитывается.
 */
export default function Cart() {
  const [items, setItems] = useState(readCart);
  const [notice, setNotice] = useState('');

  useEffect(() => onCartChange(() => setItems(readCart())), []);

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  function changeQty(id, delta) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setQty(id, item.qty + delta);
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Главная</Link>
          <span>Корзина</span>
        </div>
        <div className="state">
          <div className="h2">Корзина пуста</div>
          <p className="muted">Добавьте товары из каталога или готовую сборку.</p>
          <Link className="btn" to="/catalog">
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>Корзина</span>
      </div>

      <div className="toolbar">
        <div>
          <div className="h1" style={{ fontSize: 26 }}>
            Корзина
          </div>
          <div className="sub">
            {items.length} позиций, {items.reduce((sum, item) => sum + item.qty, 0)}{' '}
            единиц товара
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            items.forEach((item) => removeItem(item.id));
          }}
          type="button"
        >
          Очистить
        </button>
      </div>

      {notice && <div className="state">{notice}</div>}

      <div className="cart-page">
        {items.map((item) => (
          <div className="cart-row" key={item.id}>
            <div className="thumb">
              {item.imageUrl ? (
                <img alt={item.name} src={item.imageUrl} />
              ) : (
                <span>фото</span>
              )}
            </div>
            <div className="cart-name">
              <Link
                to={
                  item.id.startsWith('prebuilt:') ? '/prebuilt' : `/product/${item.id}`
                }
              >
                {item.name}
              </Link>
              <div className="small faint">{money(item.price)} за штуку</div>
            </div>
            <div className="qty">
              <button
                aria-label="Уменьшить количество"
                onClick={() => changeQty(item.id, -1)}
                type="button"
              >
                −
              </button>
              <span>{item.qty}</span>
              <button
                aria-label="Увеличить количество"
                onClick={() => changeQty(item.id, 1)}
                type="button"
              >
                +
              </button>
            </div>
            <div className="cart-sum">{money(item.price * item.qty)}</div>
            <button
              aria-label={`Удалить ${item.name}`}
              className="cart-remove"
              onClick={() => removeItem(item.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}

        <div className="cart-total">
          <span>Итого</span>
          <span>{money(total)}</span>
        </div>
        <div className="cart-checkout">
          <button
            className="btn"
            onClick={() => setNotice('Оформление заказа появится в следующей версии')}
            type="button"
          >
            Оформить заказ
          </button>
          <span className="small faint">
            Оформление и оплата — следующий этап курсовой работы
          </span>
        </div>
      </div>
    </div>
  );
}
