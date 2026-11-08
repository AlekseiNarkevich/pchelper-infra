import { Link } from 'react-router-dom';

/** Подвал: краткая информация о проекте и контакты. */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container inner">
        <div>
          <strong>PCHelper</strong> — подбор комплектующих, готовые сборки и расчёт
          мощности блока питания.
        </div>
        <div>
          <Link to="/catalog">Каталог</Link> · Цены в белорусских рублях · Учебный
          проект, 2026
        </div>
      </div>
    </footer>
  );
}
