import { Link } from 'react-router-dom';
import React from 'react';

/** Страница для неизвестного адреса. */
export default function NotFound() {
  return (
    <div className="container">
      <div className="state">
        <div className="h2">Такой страницы нет</div>
        <p className="muted">
          Возможно, ссылка устарела. Каталог начинается с главной страницы.
        </p>
        <Link className="btn" to="/">
          На главную
        </Link>
      </div>
    </div>
  );
}
