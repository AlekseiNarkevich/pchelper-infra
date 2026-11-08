/**
 * PCHelper (ЛР7) — предметная область каталога.
 *
 * В Supabase комплектующие лежат в восьми отдельных таблицах с кириллическими
 * именами и разным набором столбцов. Клиенту нужен единый товар, поэтому
 * каждая строка приводится к общему виду:
 *
 *   { id, category, categoryName, name, price, currency,
 *     imageUrl, description, specs: [{ label, value }] }
 *
 * Идентификатор товара составной: «cpu:12». Числа в разных таблицах
 * пересекаются, поэтому одного числового id недостаточно.
 *
 * @version 1.0
 */

/** Восемь категорий каталога: код для API, подпись и таблица в Supabase. */
export const CATEGORIES = [
  {
    id: 'cpu',
    name: 'Процессоры',
    table: 'Процессоры',
    description: 'Настольные процессоры AMD и Intel',
  },
  {
    id: 'motherboard',
    name: 'Материнские платы',
    table: 'МатеринскиеПлаты',
    description: 'Платы для платформ AM5 и LGA1700',
  },
  {
    id: 'ram',
    name: 'Оперативная память',
    table: 'ОЗУ',
    description: 'Модули DDR4 и DDR5',
  },
  {
    id: 'gpu',
    name: 'Видеокарты',
    table: 'Видеокарты',
    description: 'Графические ускорители NVIDIA и AMD',
  },
  {
    id: 'psu',
    name: 'Блоки питания',
    table: 'БлокиПитания',
    description: 'Блоки питания от 450 до 1000 Вт',
  },
  {
    id: 'storage',
    name: 'Накопители',
    table: 'Накопители',
    description: 'NVMe и SATA SSD',
  },
  {
    id: 'case',
    name: 'Корпуса',
    table: 'Корпуса',
    description: 'Корпуса форматов ATX и mATX',
  },
  {
    id: 'cooling',
    name: 'Системы охлаждения',
    table: 'СистемыОхлаждения',
    description: 'Воздушные кулеры и жидкостные системы',
  },
];

/** Быстрый доступ к категории по коду. */
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Допустимые варианты сортировки списка товаров. */
export const SORTS = ['price_asc', 'price_desc', 'name_asc'];

/**
 * Приводит значение JSON-столбца к объекту.
 *
 * В базе поля «ядра_потоки» и «частота» хранятся как json. Supabase
 * возвращает их уже разобранными, но при чтении из SQL-дампа или
 * фикстуры может прийти строка — обе формы нужно пережить.
 *
 * @param {unknown} value Значение столбца.
 * @returns {object} Объект или пустой объект.
 */
function asObject(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
}

/**
 * Достаёт первое непустое значение из объекта по списку ключей.
 *
 * @param {object} source Объект.
 * @param {string[]} keys Возможные имена полей.
 * @returns {unknown} Найденное значение или null.
 */
function pick(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return null;
}

/** Форматирует число: целые без изменений, дробные — с запятой. */
function dec(value) {
  if (typeof value !== 'number') return value;
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

/** Форматирует ядра и потоки в строку «6 / 12». */
function formatCores(value) {
  const data = asObject(value);
  const cores = pick(data, ['ядра', 'cores', 'core']);
  const threads = pick(data, ['потоки', 'threads', 'thread']);
  if (cores === null && threads === null) return null;
  return `${dec(cores) ?? '—'} / ${dec(threads) ?? '—'}`;
}

/** Форматирует частоту в строку «3,7–5,0 ГГц». */
function formatFrequency(value) {
  const data = asObject(value);
  const base = pick(data, ['базовая', 'base', 'мин']);
  const boost = pick(data, ['турбо', 'boost', 'макс']);
  if (base === null && boost === null) return null;
  if (boost === null) return `${dec(base)} ГГц`;
  return `${dec(base)}–${dec(boost)} ГГц`;
}

/** Форматирует скорость чтения и записи накопителя. */
function formatSpeed(value) {
  const data = asObject(value);
  const read = pick(data, ['чтение', 'read']);
  const write = pick(data, ['запись', 'write']);
  if (read === null && write === null) return null;
  return `${dec(read) ?? '—'} / ${dec(write) ?? '—'} МБ/с`;
}

/** Добавляет пару «подпись — значение», если значение есть. */
function push(specs, label, value, suffix = '') {
  if (value === null || value === undefined || value === '') return;
  specs.push({ label, value: `${dec(value)}${suffix}` });
}

/**
 * Описание характеристик для каждой категории.
 *
 * Каждый элемент — [подпись, имя столбца] либо [подпись, функция от строки].
 * Наборы повторяют столбцы таблиц Supabase.
 */
const SPEC_BUILDERS = {
  cpu: (row) => {
    const specs = [];
    push(specs, 'Производитель', row['производитель']);
    push(specs, 'Сокет', row['сокет']);
    push(specs, 'Ядра / потоки', formatCores(row['ядра_потоки']));
    push(specs, 'Частота', formatFrequency(row['частота']));
    push(specs, 'TDP', row['tdp'], ' Вт');
    push(specs, 'Встроенная графика', row['встроенная_графика']);
    push(specs, 'Память', row['поддержка_памяти']);
    return specs;
  },
  motherboard: (row) => {
    const specs = [];
    push(specs, 'Сокет', row['сокет']);
    push(specs, 'Чипсет', row['чипсет']);
    push(specs, 'Тип памяти', row['тип_памяти']);
    push(specs, 'Форм-фактор', row['форм_фактор']);
    push(specs, 'Фазы питания', row['фазы_питания']);
    push(specs, 'Максимум памяти', row['макс_объем_памяти'], ' ГБ');
    push(specs, 'Слоты M.2', row['m2_слоты']);
    push(specs, 'Порты SATA', row['sata_порты']);
    return specs;
  },
  ram: (row) => {
    const specs = [];
    push(specs, 'Тип', row['тип']);
    push(specs, 'Объём', row['объем'], ' ГБ');
    push(specs, 'Частота', row['частота'], ' МГц');
    push(specs, 'Тайминги', row['тайминги']);
    push(specs, 'Профили разгона', row['профили_разгона'] ? 'есть' : 'нет');
    return specs;
  },
  gpu: (row) => {
    const specs = [];
    push(specs, 'Производитель', row['производитель']);
    push(specs, 'Память', row['объем_памяти'], ' ГБ');
    push(specs, 'Длина', row['длина'], ' мм');
    push(specs, 'TDP', row['tdp'], ' Вт');
    push(specs, 'Вентиляторы', row['количество_вентиляторов']);
    push(specs, 'Толщина', row['толщина_в_слотах'], ' слота');
    return specs;
  },
  psu: (row) => {
    const specs = [];
    push(specs, 'Мощность', row['мощность_в_ваттах'], ' Вт');
    push(specs, 'Стандарт', row['стандарт_блока_питания']);
    push(specs, 'Сертификат 80 PLUS', row['сертификат_80plus']);
    push(specs, 'Cybenetics', row['сертификат_cybenetics']);
    push(specs, 'Модульный', row['модульный'] ? 'да' : 'нет');
    push(specs, 'Разъёмы PCIe', row['количество_pcie']);
    push(specs, 'Разъёмы CPU', row['количество_cpu']);
    push(specs, 'Разъёмы SATA', row['количество_sata']);
    push(specs, 'PCIe 5.0', row['pcie_gen5'] ? 'да' : 'нет');
    return specs;
  },
  storage: (row) => {
    const specs = [];
    push(specs, 'Тип', row['тип']);
    push(specs, 'Объём', row['объем_в_гб'], ' ГБ');
    push(specs, 'Интерфейс', row['интерфейс']);
    push(specs, 'Скорость чтения / записи', formatSpeed(row['скорость_чтения_записи']));
    push(specs, 'DRAM-буфер', row['драм_буфер'] ? 'есть' : 'нет');
    push(specs, 'Радиатор', row['радиатор_охлаждения'] ? 'есть' : 'нет');
    return specs;
  },
  case: (row) => {
    const specs = [];
    push(specs, 'Форм-фактор', row['форм_фактор']);
    push(specs, 'Максимальная длина видеокарты', row['макс_длина_gpu'], ' мм');
    push(specs, 'Максимальная высота кулера', row['макс_высота_кулера'], ' мм');
    push(specs, 'Поддержка СЖО', row['поддержка_сжо'] ? 'да' : 'нет');
    push(specs, 'Радиатор СЖО', row['макс_длина_радиатора'], ' мм');
    push(specs, 'Вентиляторы в комплекте', row['вентиляторы_в_комплекте']);
    return specs;
  },
  cooling: (row) => {
    const specs = [];
    push(specs, 'Тип', row['тип']);
    push(specs, 'Рассеиваемая мощность', row['tdp'], ' Вт');
    push(specs, 'Высота', row['высота'], ' мм');
    push(specs, 'Длина радиатора', row['длина_радиатора'], ' мм');
    push(specs, 'Максимальный шум', row['шум_макс'], ' дБ');
    return specs;
  },
};

/**
 * Приводит строку таблицы Supabase к товару API.
 *
 * @param {string} categoryId Код категории.
 * @param {object} row Строка таблицы.
 * @returns {object} Товар в едином формате.
 */
export function mapRowToProduct(categoryId, row) {
  const category = CATEGORY_BY_ID.get(categoryId);
  if (!category) throw new Error(`Неизвестная категория: ${categoryId}`);
  const builder = SPEC_BUILDERS[categoryId];
  return {
    id: `${categoryId}:${row.id}`,
    category: categoryId,
    categoryName: category.name,
    name: row['название'] || 'Без названия',
    price: Number(row['цена'] ?? 0),
    currency: 'BYN',
    imageUrl: row['фото_url'] || null,
    description: category.description,
    specs: builder(row),
  };
}

/**
 * Проверяет код категории.
 *
 * @param {string} value Код из запроса.
 * @returns {boolean} true, если категория существует.
 */
export function isCategory(value) {
  return CATEGORY_BY_ID.has(value);
}
