# shop-spices-of-East
# Аромат Востока — Frontend

Премиум-магазин восточных специй. Готовый фронтенд с корзиной, каталогом, поиском и формами.

---

## Структура проекта

```
├── index.html          ← Главная страница
├── catalog.html        ← Каталог товаров с фильтрами
├── cart.html           ← Корзина + оформление заказа
├── css/
│   └── style.css       ← Все стили (единый файл)
├── js/
│   └── main.js         ← Весь JavaScript (единый файл)
└── img/                ← Изображения товаров
```

---

## Формы (готовы к подключению)

| Страница | ID формы | Action | Method | Поля |
|----------|----------|--------|--------|------|
| index.html | `#newsletter-form` | `/api/subscribe` | POST | `email` |
| index.html, catalog.html, cart.html | `#callback-form` | `/api/callback` | POST | `name`, `phone`, `message` |
| cart.html | `#order-form` | `/api/order` | POST | `name`, `email`, `phone`, `city`, `address`, `comment`, `cart_data` (hidden) |
| cart.html | `#promoForm` | — | — | `promo` (фронтенд-валидация) |

### Правила форм
- У всех форм есть `id` и `name` на полях
- Кнопки — `type="submit"`
- Поля `required` валидируются перед отправкой
- Email и телефон валидируются по regex
- Скрытое поле `#cart-data` автоматически заполняется JSON-массивом товаров

---

## Корзина

### Хранение
- **Ключ localStorage:** `av_cart`
- **Формат:** `[{id, name, price, qty, image}]`

### Методы (доступны глобально)
```js
AromatVostoka.addToCart(product)           // Добавить товар
AromatVostoka.removeFromCart(productId)    // Удалить товар
AromatVostoka.updateCartQty(id, qty)       // Изменить количество
AromatVostoka.getCartTotal()               // Сумма корзины
AromatVostoka.getCartCount()               // Количество товаров
AromatVostoka.getCartDataForServer()       // ← Данные для отправки на сервер
```

### Данные для сервера
```js
AromatVostoka.getCartDataForServer()
// → [{id, name, price, quantity}]
```

---

## API — заготовка для бэкенда

### Настройка
В `js/main.js` измените одну строку:
```js
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',  // ← ВАШ URL
  // ...
};
```

### Готовые эндпоинты (раскомментируйте вызовы в main.js)

```js
// Корзина (серверная синхронизация)
api.getCart()                              // GET  /cart
api.addToCartServer(productId, quantity)   // POST /cart
api.removeFromCartServer(productId)        // DELETE /cart/:id

// Заказы
api.createOrder(orderData)                 // POST /orders

// Формы
api.sendContactForm(formData)              // POST /contact
api.sendCallbackForm(formData)             // POST /callback

// Каталог
api.getProducts(filters)                   // GET  /products?...
api.getProduct(id)                         // GET  /products/:id
api.searchProducts(query)                  // GET  /products/search?q=...
```

### Формат запроса
```js
{
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
}
```

---

## Что нужно от бэкенда

### 1. POST `/api/order` — Оформление заказа
**Тело запроса:**
```json
{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "phone": "+79991234567",
  "city": "Москва",
  "address": "ул. Примерная, 15",
  "comment": "Доставка с 10 до 18",
  "cart_data": [
    {"id": "saffron-1", "name": "Шафран...", "price": 2490, "quantity": 2}
  ],
  "total": 4980
}
```

### 2. POST `/api/callback` — Заказ звонка
**Тело запроса:**
```json
{
  "name": "Иван Иванов",
  "phone": "+79991234567",
  "message": "Интересует шафран"
}
```

### 3. POST `/api/subscribe` — Подписка на рассылку
**Тело запроса:**
```json
{
  "email": "ivan@example.com"
}
```

### 4. GET `/api/products` — Список товаров
**Параметры:** `?category=whole&country=india&sort=popular&page=1`

### 5. GET `/api/products/search?q=шафран` — Поиск

---

## Поиск по товарам

- **Горячая клавиша:** клик по иконке 🔍 в шапке
- **Работает на фронтенде:** ищет по названию и категории среди товаров на странице
- **При подключении бэкенда:** заменить на `api.searchProducts(query)`
- **Закрытие:** Escape, клик по ✕, клик вне области

---

## Модальное окно "Заказать звонок"

- Открывается по клику на ссылки с `data-modal="callback"`
- Присутствует в футере всех страниц
- Форма: `#callback-form`

---

## CSS

- **Единый файл:** `css/style.css`
- **CSS-переменные** в `:root` для быстрой кастомизации цветов
- **Адаптив:** breakpoints 1200px, 992px, 768px, 480px
- **Нет внешних CSS-фреймворков**

---

## JS

- **Единый файл:** `js/main.js`
- **Модульная архитектура** через IIFE
- **Глобальный объект:** `window.AromatVostoka`
- **localStorage** для корзины и избранного
- **IntersectionObserver** для анимаций по скроллу

---

## Быстрый старт для бэкендера

1. Замените `API_BASE_URL` в `js/main.js`
2. Раскомментируйте вызовы `api.*` в обработчиках форм
3. Реализуйте эндпоинты из раздела "Что нужно от бэкенда"


