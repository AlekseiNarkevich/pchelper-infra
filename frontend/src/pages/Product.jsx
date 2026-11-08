import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getProduct, getProducts, money } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { addToCart } from '../cart.js';
import React from 'react';

/**
 * Карточка товара: фото, цена, характеристики и похожие позиции.
 *
 * Товар запрашивается по составному идентификатору из адреса
 * (/product/cpu:1). Если такого товара нет, показывается понятное
 * сообщение, а не пустой экран.
 */
export default function Product() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setProduct(null);
    setRelated([]);

    getProduct(id)
      .then((data) => {
        if (alive) setProduct(data);
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
  }, [id]);

  useEffect(() => {
    if (!product) return undefined;
    let alive = true;
    getProducts({ category: product.category, limit: 4 })
      .then((data) => {
        if (alive) setRelated(data.items.filter((item) => item.id !== product.id));
      })
      .catch(() => {
        if (alive) setRelated([]);
      });
    return () => {
      alive = false;
    };
  }, [product]);

  function add() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container">
        <div className="state error">
          {error || 'Товар не найден'}
          <br />
          <Link className="btn" to="/catalog">
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>
          <Link to="/catalog">Каталог</Link>
        </span>
        <span>
          <Link to={`/catalog/${product.category}`}>{product.categoryName}</Link>
        </span>
        <span>{product.name}</span>
      </div>

      <div className="product-hero">
        <div className="photo-box">
          {product.imageUrl ? (
            <img alt={product.name} src={product.imageUrl} />
          ) : (
            <span>фото товара</span>
          )}
        </div>
        <div>
          <div className="h1" style={{ fontSize: 26 }}>
            {product.name}
          </div>
          <div className="small faint" style={{ marginTop: 6 }}>
            {product.categoryName}
          </div>
          <div className="price-block">
            <span className="value">{money(product.price)}</span>
          </div>
          <p className="muted" style={{ fontSize: 14 }}>
            {product.description}
          </p>
          <div style={{ display: 'flex', gap: 10, margin: '16px 0 22px' }}>
            <button className="btn" onClick={add} type="button">
              {added ? 'Добавлено ✓' : 'Добавить в корзину'}
            </button>
            <Link className="btn btn-secondary" to="/catalog">
              Продолжить покупки
            </Link>
          </div>

          <div className="h3" style={{ marginBottom: 12 }}>
            Характеристики
          </div>
          <dl className="spec-table">
            {product.specs.map((spec) => (
              <div key={spec.label}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="h3" style={{ marginBottom: 12 }}>
            С этой категорией смотрят
          </div>
          <div className="product-grid">
            {related.slice(0, 3).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
