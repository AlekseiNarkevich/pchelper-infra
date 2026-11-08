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
    id: 'cpu:8',
    category: 'cpu',
    categoryName: 'Процессоры',
    name: 'Intel Core i3-12100F',
    price: 255,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/intel_core_i3_12100f_1.png',
    description: 'Настольные процессоры AMD и Intel',
    specs: [
      {
        label: 'Производитель',
        value: 'Intel',
      },
      {
        label: 'Сокет',
        value: 'LGA1700',
      },
      {
        label: 'Ядра / потоки',
        value: '4 / 8',
      },
      {
        label: 'Частота',
        value: '3,3–4,3 ГГц',
      },
      {
        label: 'TDP',
        value: '80 Вт',
      },
      {
        label: 'Встроенная графика',
        value: 'нет',
      },
      {
        label: 'Память',
        value: 'DDR4/DDR5',
      },
    ],
  },
  {
    id: 'cpu:6',
    category: 'cpu',
    categoryName: 'Процессоры',
    name: 'AMD Ryzen 7 9800X3D',
    price: 1380,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/amd_ryzen_7_9800x3d_(oem)_1.png',
    description: 'Настольные процессоры AMD и Intel',
    specs: [
      {
        label: 'Производитель',
        value: 'AMD',
      },
      {
        label: 'Сокет',
        value: 'AM5',
      },
      {
        label: 'Ядра / потоки',
        value: '8 / 16',
      },
      {
        label: 'Частота',
        value: '4,7–5,2 ГГц',
      },
      {
        label: 'TDP',
        value: '200 Вт',
      },
      {
        label: 'Встроенная графика',
        value: 'AMD Radeon Graphics',
      },
      {
        label: 'Память',
        value: 'DDR5',
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
    id: 'motherboard:11',
    category: 'motherboard',
    categoryName: 'Материнские платы',
    name: 'MSI MAG X870E Tomahawk WiFi',
    price: 1172,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/0a8c795e58faa098d1a6f32ce18f4df8754ad401d727dc243b8d49b09ad1dd7c.jpg',
    description: 'Платы для платформ AM5 и LGA1700',
    specs: [
      {
        label: 'Сокет',
        value: 'AM5',
      },
      {
        label: 'Чипсет',
        value: 'X870E',
      },
      {
        label: 'Тип памяти',
        value: 'DDR5',
      },
      {
        label: 'Форм-фактор',
        value: 'ATX',
      },
      {
        label: 'Фазы питания',
        value: '14+2+1',
      },
      {
        label: 'Максимум памяти',
        value: '256 ГБ',
      },
      {
        label: 'Слоты M.2',
        value: '4',
      },
      {
        label: 'Порты SATA',
        value: '4',
      },
    ],
  },
  {
    id: 'ram:3',
    category: 'ram',
    categoryName: 'Оперативная память',
    name: 'Team T-Create Expert OC10L 2x8GB DDR4 3200MHz',
    price: 529,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/team_ttced416g3200hc16fdc01_156313_1.jpg',
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
        value: 'нет',
      },
    ],
  },
  {
    id: 'ram:10',
    category: 'ram',
    categoryName: 'Оперативная память',
    name: 'Kingston FURY Beast 2x32GB DDR5 6000MHz',
    price: 2579,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/00740617331721Med1.jpg',
    description: 'Модули DDR4 и DDR5',
    specs: [
      {
        label: 'Тип',
        value: 'DDR5',
      },
      {
        label: 'Объём',
        value: '64 ГБ',
      },
      {
        label: 'Частота',
        value: '6000 МГц',
      },
      {
        label: 'Тайминги',
        value: '30-36-36',
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
    id: 'gpu:6',
    category: 'gpu',
    categoryName: 'Видеокарты',
    name: 'Palit GeForce RTX 5090 GameRock OC',
    price: 10764,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/c12579a8a21ec2041f3ac9de91ba52702fb8ad9bb184d5c1e8a6062b149abcb5.jpg',
    description: 'Графические ускорители NVIDIA и AMD',
    specs: [
      {
        label: 'Производитель',
        value: 'NVIDIA',
      },
      {
        label: 'Память',
        value: '32 ГБ',
      },
      {
        label: 'Длина',
        value: '332 мм',
      },
      {
        label: 'TDP',
        value: '600 Вт',
      },
      {
        label: 'Вентиляторы',
        value: '3',
      },
      {
        label: 'Толщина',
        value: '3,5 слота',
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
    id: 'psu:9',
    category: 'psu',
    categoryName: 'Блоки питания',
    name: '1stPlayer NGDP Platinum 1000W',
    price: 491,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/844ad2fbfdd03b3ba5c70bfbe08eb1114db31a9757fc291dc0377bc49d051277.jpg',
    description: 'Блоки питания от 450 до 1000 Вт',
    specs: [
      {
        label: 'Мощность',
        value: '1000 Вт',
      },
      {
        label: 'Стандарт',
        value: 'ATX12V 3.1',
      },
      {
        label: 'Сертификат 80 PLUS',
        value: 'Платиновый',
      },
      {
        label: 'Cybenetics',
        value: 'Платиновый',
      },
      {
        label: 'Модульный',
        value: 'да',
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
        value: '9',
      },
      {
        label: 'PCIe 5.0',
        value: 'да',
      },
    ],
  },
  {
    id: 'storage:13',
    category: 'storage',
    categoryName: 'Накопители',
    name: 'WD Blue 1TB HDD',
    price: 235,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/531e1e880acf7fac191e35a5d616bb6b920d77fa31e8929909b1d7c5985e3b58.jpg',
    description: 'NVMe и SATA SSD',
    specs: [
      {
        label: 'Тип',
        value: 'HDD',
      },
      {
        label: 'Объём',
        value: '1000 ГБ',
      },
      {
        label: 'Интерфейс',
        value: 'SATA',
      },
      {
        label: 'Скорость чтения / записи',
        value: '150 / 150 МБ/с',
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
    id: 'storage:7',
    category: 'storage',
    categoryName: 'Накопители',
    name: 'A-Data XPG MARS 980 Storm 2TB',
    price: 1180,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/mars_980_storm_pd_2000x2000_011745320953.png',
    description: 'NVMe и SATA SSD',
    specs: [
      {
        label: 'Тип',
        value: 'SSD',
      },
      {
        label: 'Объём',
        value: '2000 ГБ',
      },
      {
        label: 'Интерфейс',
        value: 'M.2',
      },
      {
        label: 'Скорость чтения / записи',
        value: '14000 / 13000 МБ/с',
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
    id: 'case:7',
    category: 'case',
    categoryName: 'Корпуса',
    name: 'Lian Li Lancool III',
    price: 465,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/lan3-a00.jpg',
    description: 'Корпуса форматов ATX и mATX',
    specs: [
      {
        label: 'Форм-фактор',
        value: 'ATX',
      },
      {
        label: 'Максимальная длина видеокарты',
        value: '435 мм',
      },
      {
        label: 'Максимальная высота кулера',
        value: '187 мм',
      },
      {
        label: 'Поддержка СЖО',
        value: 'да',
      },
      {
        label: 'Радиатор СЖО',
        value: '420 мм',
      },
      {
        label: 'Вентиляторы в комплекте',
        value: '3x140mm PWM + 1x140mm PWM',
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
    id: 'cooling:7',
    category: 'cooling',
    categoryName: 'Системы охлаждения',
    name: 'Thermalright Frozen Warframe Pro 360',
    price: 330,
    currency: 'BYN',
    imageUrl:
      'https://odlknontbixwbngsfpmc.supabase.co/storage/v1/object/public/pchelper-images/1%20(2).jpg',
    description: 'Воздушные кулеры и жидкостные системы',
    specs: [
      {
        label: 'Тип',
        value: 'Жидкостное',
      },
      {
        label: 'Рассеиваемая мощность',
        value: '350 Вт',
      },
      {
        label: 'Высота',
        value: '27 мм',
      },
      {
        label: 'Длина радиатора',
        value: '360 мм',
      },
      {
        label: 'Максимальный шум',
        value: '30 дБ',
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
