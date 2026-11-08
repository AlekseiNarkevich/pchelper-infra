import { Link } from 'react-router-dom';

import { addToCart } from '../cart.js';
import { money } from '../api.js';

/**
 * Карточка товара в сетке каталога.
 *
 * Фотографии приходят из Supabase Storage; если ссылки нет, показывается
 * подпись «фото» — как в макетах ЛР5.
 */
export default function ProductCard({ product, onAdded }) {
  const vendor =
    product.specs?.find((spec) => spec.label === 'Производитель')?.value ||
    product.categoryName;

  function add() {
    addToCart(product);
    if (onAdded) onAdded(product);
  }

  return (
    <article className="product-card">
      <Link className="photo" to={`/product/${product.id}`}>
        {product.imageUrl ? (
          <img alt={product.name} loading="lazy" src={product.imageUrl} />
        ) : (
          <span>фото</span>
        )}
      </Link>
      <Link className="name" to={`/product/${product.id}`}>
        {product.name}
      </Link>
      <div className="vendor">{vendor}</div>
      <div className="bottom">
        <div className="price">
          {money(product.price)} <small />
        </div>
        <button className="btn btn-sm" onClick={add} type="button">
          + В корзину
        </button>
      </div>
    </article>
  );
}
