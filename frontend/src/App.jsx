import { Route, Routes } from 'react-router-dom';

import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import Catalog from './pages/Catalog.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import Product from './pages/Product.jsx';

/**
 * Каркас витрины: шапка, область страницы, подвал.
 * Тема синяя — та же, что выбрана в ЛР5 по результатам опроса.
 */
export default function App() {
  return (
    <div className="app-shell theme-blue">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/:category" element={<Catalog />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
