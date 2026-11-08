/**
 * PCHelper (ЛР7) — снимок каталога из Supabase.
 *
 * Сформирован автоматически 08.11.2026: по два товара на каждую из восьми
 * категорий и три готовые сборки (дешёвая, средняя, дорогая).
 *
 * Назначение — работа без секретов: юнит-тесты в CI и локальный запуск,
 * когда переменные SUPABASE_URL и ключ не заданы. Боевой режим API читает
 * те же данные напрямую из Supabase, поэтому форма объектов совпадает.
 *
 * Пересобрать: ЛР7/tools/make_fixture.mjs (запускается из каталога backend).
 *
 * @version 1.0
 */

export const FIXTURE_PRODUCTS = [
  {
    id: 'cpu:1',
    category: 'cpu',
    categoryName: 'Процессоры',
    name: 'AMD Ryzen 5 5600',
    price: 368,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/amd_ryzen_5_5600_1.png',
    description: 'Настольные процессоры AMD и Intel',
    specs: [
      {
        label: 'Производитель',
        value: 'AMD',
      },
      {
        label: 'Сокет',
        value: 'AM4',
      },
      {
        label: 'Ядра / потоки',
        value: '6 / 12',
      },
      {
        label: 'Частота',
        value: '3,5–4,4 ГГц',
      },
      {
        label: 'TDP',
        value: '95 Вт',
      },
      {
        label: 'Встроенная графика',
        value: 'нет',
      },
      {
        label: 'Память',
        value: 'DDR4',
      },
    ],
  },
  {
    id: 'cpu:2',
    category: 'cpu',
    categoryName: 'Процессоры',
    name: 'AMD Ryzen 5 5600G',
    price: 457,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/amd_ryzen_5_5600_1.png',
    description: 'Настольные процессоры AMD и Intel',
    specs: [
      {
        label: 'Производитель',
        value: 'AMD',
      },
      {
        label: 'Сокет',
        value: 'AM4',
      },
      {
        label: 'Ядра / потоки',
        value: '6 / 12',
      },
      {
        label: 'Частота',
        value: '3,9–4,4 ГГц',
      },
      {
        label: 'TDP',
        value: '100 Вт',
      },
      {
        label: 'Встроенная графика',
        value: 'AMD Radeon Vega 7 1.9 ГГц',
      },
      {
        label: 'Память',
        value: 'DDR4',
      },
    ],
  },
  {
    id: 'motherboard:1',
    category: 'motherboard',
    categoryName: 'Материнские платы',
    name: 'ASRock B450 Pro4 R2.0',
    price: 288,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/B450%20Pro4%20R2.0(L2).png',
    description: 'Платы для платформ AM5 и LGA1700',
    specs: [
      {
        label: 'Сокет',
        value: 'AM4',
      },
      {
        label: 'Чипсет',
        value: 'B450',
      },
      {
        label: 'Тип памяти',
        value: 'DDR4',
      },
      {
        label: 'Форм-фактор',
        value: 'ATX',
      },
      {
        label: 'Фазы питания',
        value: '10',
      },
      {
        label: 'Максимум памяти',
        value: '128 ГБ',
      },
      {
        label: 'Слоты M.2',
        value: '2',
      },
      {
        label: 'Порты SATA',
        value: '6',
      },
    ],
  },
  {
    id: 'motherboard:2',
    category: 'motherboard',
    categoryName: 'Материнские платы',
    name: 'ASUS TUF Gaming B450-PLUS II',
    price: 377,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/8ae9272ffd5822228fa6a6f70f57b0b9a95565c7393f0366163103d680b531c0.png',
    description: 'Платы для платформ AM5 и LGA1700',
    specs: [
      {
        label: 'Сокет',
        value: 'AM4',
      },
      {
        label: 'Чипсет',
        value: 'B450',
      },
      {
        label: 'Тип памяти',
        value: 'DDR4',
      },
      {
        label: 'Форм-фактор',
        value: 'ATX',
      },
      {
        label: 'Фазы питания',
        value: '8+2',
      },
      {
        label: 'Максимум памяти',
        value: '128 ГБ',
      },
      {
        label: 'Слоты M.2',
        value: '2',
      },
      {
        label: 'Порты SATA',
        value: '6',
      },
    ],
  },
  {
    id: 'ram:1',
    category: 'ram',
    categoryName: 'Оперативная память',
    name: 'Kingston FURY Beast Black 2x8GB DDR4 3200MHz',
    price: 552,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/0.jpg',
    description: 'Модули DDR4 и DDR5',
    specs: [
      {
        label: 'Тип',
        value: 'DDR4',
      },
      {
        label: 'Объём',
        value: '16 ГБ',
      },
      {
        label: 'Частота',
        value: '3200 МГц',
      },
      {
        label: 'Тайминги',
        value: '16-18-18',
      },
      {
        label: 'Профили разгона',
        value: 'есть',
      },
    ],
  },
  {
    id: 'ram:2',
    category: 'ram',
    categoryName: 'Оперативная память',
    name: 'Netac Shadow S 2x8GB DDR4 3200MHz',
    price: 531,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/netac_ntssd4p32dp-16w_189829_1.jpg',
    description: 'Модули DDR4 и DDR5',
    specs: [
      {
        label: 'Тип',
        value: 'DDR4',
      },
      {
        label: 'Объём',
        value: '16 ГБ',
      },
      {
        label: 'Частота',
        value: '3200 МГц',
      },
      {
        label: 'Тайминги',
        value: '16-20-20-40',
      },
      {
        label: 'Профили разгона',
        value: 'есть',
      },
    ],
  },
  {
    id: 'gpu:1',
    category: 'gpu',
    categoryName: 'Видеокарты',
    name: 'Gigabyte GeForce RTX 5060 Eagle OC 8G',
    price: 1123,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/0facea2f2bf9bbca82e81acf55127d162582b2ccb660a0cba80049b47d31d613.jpg',
    description: 'Графические ускорители NVIDIA и AMD',
    specs: [
      {
        label: 'Производитель',
        value: 'NVIDIA',
      },
      {
        label: 'Память',
        value: '8 ГБ',
      },
      {
        label: 'Длина',
        value: '208 мм',
      },
      {
        label: 'TDP',
        value: '145 Вт',
      },
      {
        label: 'Вентиляторы',
        value: '2',
      },
      {
        label: 'Толщина',
        value: '2 слота',
      },
    ],
  },
  {
    id: 'gpu:2',
    category: 'gpu',
    categoryName: 'Видеокарты',
    name: 'Palit GeForce RTX 5060 Ti Infinity 3 16GB',
    price: 1661,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/620fdbce740c626e41078b85ba9695649c4b133f78bbadbaf18658e09b374a2b.jpg',
    description: 'Графические ускорители NVIDIA и AMD',
    specs: [
      {
        label: 'Производитель',
        value: 'NVIDIA',
      },
      {
        label: 'Память',
        value: '16 ГБ',
      },
      {
        label: 'Длина',
        value: '292 мм',
      },
      {
        label: 'TDP',
        value: '180 Вт',
      },
      {
        label: 'Вентиляторы',
        value: '3',
      },
      {
        label: 'Толщина',
        value: '2 слота',
      },
    ],
  },
  {
    id: 'psu:1',
    category: 'psu',
    categoryName: 'Блоки питания',
    name: '1stPlayer FK 600W',
    price: 96,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/1stplayer_ps-600fk_148453_1.jpg',
    description: 'Блоки питания от 450 до 1000 Вт',
    specs: [
      {
        label: 'Мощность',
        value: '600 Вт',
      },
      {
        label: 'Стандарт',
        value: 'ATX12V 2.5',
      },
      {
        label: 'Сертификат 80 PLUS',
        value: 'Простой',
      },
      {
        label: 'Модульный',
        value: 'нет',
      },
      {
        label: 'Разъёмы PCIe',
        value: '2',
      },
      {
        label: 'Разъёмы CPU',
        value: '1',
      },
      {
        label: 'Разъёмы SATA',
        value: '6',
      },
      {
        label: 'PCIe 5.0',
        value: 'нет',
      },
    ],
  },
  {
    id: 'psu:2',
    category: 'psu',
    categoryName: 'Блоки питания',
    name: 'Ocypus Gamma P650',
    price: 112,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/71268cfb8c27e1e91613937b4f7ccc63.png',
    description: 'Блоки питания от 450 до 1000 Вт',
    specs: [
      {
        label: 'Мощность',
        value: '650 Вт',
      },
      {
        label: 'Стандарт',
        value: 'ATX12V 2.53',
      },
      {
        label: 'Сертификат 80 PLUS',
        value: 'Простой',
      },
      {
        label: 'Модульный',
        value: 'нет',
      },
      {
        label: 'Разъёмы PCIe',
        value: '4',
      },
      {
        label: 'Разъёмы CPU',
        value: '2',
      },
      {
        label: 'Разъёмы SATA',
        value: '6',
      },
      {
        label: 'PCIe 5.0',
        value: 'нет',
      },
    ],
  },
  {
    id: 'storage:1',
    category: 'storage',
    categoryName: 'Накопители',
    name: 'Kingston NV3 1TB',
    price: 454,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/1.jpg',
    description: 'NVMe и SATA SSD',
    specs: [
      {
        label: 'Тип',
        value: 'SSD',
      },
      {
        label: 'Объём',
        value: '1000 ГБ',
      },
      {
        label: 'Интерфейс',
        value: 'M.2',
      },
      {
        label: 'Скорость чтения / записи',
        value: '6000 / 4000 МБ/с',
      },
      {
        label: 'DRAM-буфер',
        value: 'нет',
      },
      {
        label: 'Радиатор',
        value: 'нет',
      },
    ],
  },
  {
    id: 'storage:2',
    category: 'storage',
    categoryName: 'Накопители',
    name: 'Kingston Fury Renegade 1TB',
    price: 612,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/SFYRD-2000G-1.jpg',
    description: 'NVMe и SATA SSD',
    specs: [
      {
        label: 'Тип',
        value: 'SSD',
      },
      {
        label: 'Объём',
        value: '1000 ГБ',
      },
      {
        label: 'Интерфейс',
        value: 'M.2',
      },
      {
        label: 'Скорость чтения / записи',
        value: '7300 / 6000 МБ/с',
      },
      {
        label: 'DRAM-буфер',
        value: 'есть',
      },
      {
        label: 'Радиатор',
        value: 'есть',
      },
    ],
  },
  {
    id: 'case:1',
    category: 'case',
    categoryName: 'Корпуса',
    name: 'DeepCool CH360',
    price: 118,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/629677689f038d47a2469b3edb5398dd75567fdeb9768d6bc6f39b9c584a7d51.jpg',
    description: 'Корпуса форматов ATX и mATX',
    specs: [
      {
        label: 'Форм-фактор',
        value: 'mATX',
      },
      {
        label: 'Максимальная длина видеокарты',
        value: '320 мм',
      },
      {
        label: 'Максимальная высота кулера',
        value: '165 мм',
      },
      {
        label: 'Поддержка СЖО',
        value: 'да',
      },
      {
        label: 'Радиатор СЖО',
        value: '360 мм',
      },
      {
        label: 'Вентиляторы в комплекте',
        value: '2x140mm ARGB + 1x120mm ARGB',
      },
    ],
  },
  {
    id: 'case:2',
    category: 'case',
    categoryName: 'Корпуса',
    name: 'Montech AIR 100 Lite',
    price: 126,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/6d98a3cd6c0f48d59aff64b4730ba73328ba714fd502a0a7edfd7f094228087a.jpg',
    description: 'Корпуса форматов ATX и mATX',
    specs: [
      {
        label: 'Форм-фактор',
        value: 'mATX',
      },
      {
        label: 'Максимальная длина видеокарты',
        value: '330 мм',
      },
      {
        label: 'Максимальная высота кулера',
        value: '161 мм',
      },
      {
        label: 'Поддержка СЖО',
        value: 'да',
      },
      {
        label: 'Радиатор СЖО',
        value: '280 мм',
      },
      {
        label: 'Вентиляторы в комплекте',
        value: '2x120mm',
      },
    ],
  },
  {
    id: 'cooling:1',
    category: 'cooling',
    categoryName: 'Системы охлаждения',
    name: 'ID-Cooling SE-214-XT ARGB',
    price: 43,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/37d121955c54dc8581556f60da3e6e8d7e06c9c50d4672033ba174121f164876.jpg',
    description: 'Воздушные кулеры и жидкостные системы',
    specs: [
      {
        label: 'Тип',
        value: 'Воздушное',
      },
      {
        label: 'Рассеиваемая мощность',
        value: '180 Вт',
      },
      {
        label: 'Высота',
        value: '150 мм',
      },
      {
        label: 'Длина радиатора',
        value: '0 мм',
      },
      {
        label: 'Максимальный шум',
        value: '31 дБ',
      },
    ],
  },
  {
    id: 'cooling:2',
    category: 'cooling',
    categoryName: 'Системы охлаждения',
    name: 'ID-Cooling SE-206-XT',
    price: 84,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/fb43664e446b4f93d3c92468913bdddd99349ed8e04148637a3b39f1af6c3a9b.jpg',
    description: 'Воздушные кулеры и жидкостные системы',
    specs: [
      {
        label: 'Тип',
        value: 'Воздушное',
      },
      {
        label: 'Рассеиваемая мощность',
        value: '250 Вт',
      },
      {
        label: 'Высота',
        value: '156 мм',
      },
      {
        label: 'Длина радиатора',
        value: '0 мм',
      },
      {
        label: 'Максимальный шум',
        value: '35 дБ',
      },
    ],
  },
];

export const FIXTURE_PREBUILT = [
  {
    id: 1,
    name: 'Офисный ПК1',
    task: 'Офис, учёба, веб-сёрфинг',
    price: 2025,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/img_rd319142_001.jpg',
    components: [
      {
        category: 'cpu',
        name: 'AMD Ryzen 5 5600G',
        price: 457,
      },
      {
        category: 'motherboard',
        name: 'ASRock B450 Pro4 R2.0',
        price: 288,
      },
      {
        category: 'ram',
        name: 'Netac Shadow S 2x8GB DDR4 3200MHz',
        price: 531,
      },
      {
        category: 'psu',
        name: '1stPlayer FK 600W',
        price: 96,
      },
      {
        category: 'case',
        name: 'XASTRA A407 4ARGB',
        price: 136,
      },
      {
        category: 'cooling',
        name: 'ID-Cooling SE-214-XT ARGB',
        price: 43,
      },
      {
        category: 'storage',
        name: 'Patriot Burst Elite 480GB',
        price: 239,
      },
      {
        category: 'storage',
        name: 'WD Blue 1TB HDD',
        price: 235,
      },
    ],
    componentCount: 8,
  },
  {
    id: 4,
    name: 'Игровой ПК1',
    task: 'Минимально комфортный гейминг 1080p',
    price: 3307,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/AirfaceRGB-01.png',
    components: [
      {
        category: 'cpu',
        name: 'Intel Core i5-12400F',
        price: 407,
      },
      {
        category: 'motherboard',
        name: 'ASRock B760 Pro RS/D4',
        price: 437,
      },
      {
        category: 'ram',
        name: 'Kingston FURY Beast Black 2x8GB DDR4 3200MHz',
        price: 552,
      },
      {
        category: 'gpu',
        name: 'Gigabyte GeForce RTX 5060 Eagle OC 8G',
        price: 1123,
      },
      {
        category: 'psu',
        name: '1stPlayer ACK Bronze 650W',
        price: 141,
      },
      {
        category: 'case',
        name: 'Cougar Airface RGB',
        price: 150,
      },
      {
        category: 'cooling',
        name: 'ID-Cooling SE-214-XT ARGB',
        price: 43,
      },
      {
        category: 'storage',
        name: 'Kingston NV3 1TB',
        price: 454,
      },
    ],
    componentCount: 8,
  },
  {
    id: 7,
    name: 'Игровой ПК4',
    task: 'Топ-жир гейминг 2160p',
    price: 18916,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/lan3-a00.jpg',
    components: [
      {
        category: 'cpu',
        name: 'AMD Ryzen 7 9800X3D',
        price: 1380,
      },
      {
        category: 'motherboard',
        name: 'MSI MAG X870E Tomahawk WiFi',
        price: 1172,
      },
      {
        category: 'ram',
        name: 'Kingston FURY Beast 2x32GB DDR5 6000MHz',
        price: 2579,
      },
      {
        category: 'gpu',
        name: 'Palit GeForce RTX 5090 GameRock OC',
        price: 10764,
      },
      {
        category: 'psu',
        name: 'DeepCool PX1200G',
        price: 408,
      },
      {
        category: 'case',
        name: 'Lian Li Lancool III',
        price: 465,
      },
      {
        category: 'cooling',
        name: 'Arctic Liquid Freezer III Pro 360',
        price: 329,
      },
      {
        category: 'storage',
        name: 'Samsung 9100 Pro 2TB',
        price: 1140,
      },
      {
        category: 'storage',
        name: 'Seagate Barracuda 6TB HDD',
        price: 679,
      },
    ],
    componentCount: 9,
  },
];
