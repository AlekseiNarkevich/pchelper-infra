/**
 * Демонстрационная корзина на localStorage.
 *
 * Полноценная корзина с серверным хранением входит в курсовую 4 курса;
 * на этапе ЛР7 нужно показать сценарий «товар выбран», поэтому выбранные
 * позиции живут в браузере. Формат намеренно простой: массив
 * { id, name, price, qty }.
 */

const KEY = 'pchelper-cart';
const EVENT = 'pchelper-cart-change';

/** Читает корзину, переживая испорченное значение в localStorage. */
export function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Сохраняет корзину и сообщает об изменении подписчикам. */
function writeCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

/** Добавляет товар или увеличивает количество уже выбранного. */
export function addToCart(product) {
  const items = readCart();
  const found = items.find((item) => item.id === product.id);
  if (found) {
    found.qty += 1;
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
    });
  }
  writeCart(items);
}

/** Общее количество единиц товара. */
export function cartCount() {
  return readCart().reduce((sum, item) => sum + item.qty, 0);
}

/** Подписка на изменение корзины; возвращает функцию отписки. */
export function onCartChange(listener) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
