/**
 * ========================================
 * АРОМАТ ВОСТОКА — ГЛАВНЫЙ JS-МОДУЛЬ
 * Включает: API, корзина, поиск, UI, формы
 * ========================================
 */

const AromatVostoka = (function() {
  'use strict';

  // ========================================
  // CONFIG — поменяйте URL при подключении бэкенда
  // ========================================
  const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',  // ← ЗАМЕНИТЕ на свой URL
    CART_STORAGE_KEY: 'av_cart',
    WISHLIST_STORAGE_KEY: 'av_wishlist'
  };

  // ========================================
  // STATE
  // ========================================
  const state = {
    cart: JSON.parse(localStorage.getItem(CONFIG.CART_STORAGE_KEY)) || [],
    wishlist: JSON.parse(localStorage.getItem(CONFIG.WISHLIST_STORAGE_KEY)) || [],
    isMenuOpen: false,
    isFilterOpen: false,
    isSearchOpen: false,
    products: [] // для поиска по товарам
  };

  // ========================================
  // SECTION 1: API — готово к подключению бэкенда
  // ========================================

  async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      // Fallback: показываем тост, но не ломаем UI
      showToast('Ошибка соединения с сервером. Работаем в офлайн-режиме.', 'error');
      throw error;
    }
  }

  // API-заготовки — раскомментируйте при подключении бэкенда
  const api = {
    // Корзина (серверная)
    getCart: () => apiRequest('/cart'),
    addToCartServer: (productId, quantity) => apiRequest('/cart', 'POST', { productId, quantity }),
    removeFromCartServer: (productId) => apiRequest(`/cart/${productId}`, 'DELETE'),

    // Заказы
    createOrder: (orderData) => apiRequest('/orders', 'POST', orderData),

    // Формы обратной связи
    sendContactForm: (formData) => apiRequest('/contact', 'POST', formData),
    sendCallbackForm: (formData) => apiRequest('/callback', 'POST', formData),

    // Каталог
    getProducts: (filters = {}) => {
      const query = new URLSearchParams(filters).toString();
      return apiRequest(`/products?${query}`);
    },
    getProduct: (id) => apiRequest(`/products/${id}`),
    searchProducts: (query) => apiRequest(`/products/search?q=${encodeURIComponent(query)}`),
  };

  // ========================================
  // SECTION 2: TOAST NOTIFICATIONS
  // ========================================

  function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.success}</span>
      <span class="toast__text">${message}</span>
      <button class="toast__close">&times;</button>
    `;

    container.appendChild(toast);

    toast.querySelector('.toast__close').addEventListener('click', () => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // ========================================
  // SECTION 3: HEADER & MOBILE MENU
  // ========================================

  function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  function initMobileMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuClose = document.getElementById('menuClose');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');

    if (!menuBtn || !mobileMenu) return;

    function openMenu() {
      mobileMenu.classList.add('active');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      state.isMenuOpen = true;
    }

    function closeMenu() {
      mobileMenu.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
      state.isMenuOpen = false;
    }

    menuBtn.addEventListener('click', openMenu);
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', () => {
      closeMenu();
      closeSearch();
      closeModal();
    });

    document.querySelectorAll('.mobile-menu__nav a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.isMenuOpen) closeMenu();
        if (state.isSearchOpen) closeSearch();
        if (state.isFilterOpen) closeFilterDrawer();
      }
    });
  }

  // ========================================
  // SECTION 4: SEARCH
  // ========================================

  function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchBtn || !searchOverlay) return;

    // Собираем товары для поиска из data-атрибутов на странице
    collectProductsForSearch();

    function openSearch() {
      searchOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      state.isSearchOpen = true;
      setTimeout(() => searchInput?.focus(), 100);
    }

    function closeSearch() {
      searchOverlay.classList.remove('active');
      document.body.style.overflow = '';
      state.isSearchOpen = false;
      if (searchInput) searchInput.value = '';
      if (searchResults) searchResults.innerHTML = '';
    }

    searchBtn.addEventListener('click', openSearch);
    if (searchClose) searchClose.addEventListener('click', closeSearch);

    // Поиск по вводу
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          performSearch(e.target.value.trim());
        }, 300);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch(searchInput.value.trim());
        }
      });
    }

    // Закрытие по клику на результат
    if (searchResults) {
      searchResults.addEventListener('click', (e) => {
        const result = e.target.closest('.search-result');
        if (result) {
          closeSearch();
        }
      });
    }
  }

  function collectProductsForSearch() {
    // Собираем товары из карточек на странице
    document.querySelectorAll('.product-card').forEach(card => {
      const cartBtn = card.querySelector('[data-action="cart"]');
      const titleEl = card.querySelector('.product-card__title');
      const categoryEl = card.querySelector('.product-card__category');
      const imgEl = card.querySelector('.product-card__img');
      const priceEl = card.querySelector('.price--current');

      if (cartBtn && titleEl) {
        state.products.push({
          id: cartBtn.dataset.id,
          name: titleEl.textContent.trim(),
          category: categoryEl ? categoryEl.textContent.trim() : '',
          price: parseInt(cartBtn.dataset.price) || 0,
          image: cartBtn.dataset.image || (imgEl ? imgEl.src : ''),
          priceText: priceEl ? priceEl.textContent.trim() : ''
        });
      }
    });
  }

  function performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    if (!query) {
      searchResults.innerHTML = '';
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = state.products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    );

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="search-overlay__empty">
          <p>Ничего не найдено по запросу «${escapeHtml(query)}»</p>
          <p style="margin-top: 0.5rem; font-size: 0.9rem;">Попробуйте другие ключевые слова</p>
        </div>
      `;
      return;
    }

    let html = '';
    results.forEach(product => {
      html += `
        <a href="catalog.html#product-${product.id}" class="search-result" data-id="${product.id}">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="search-result__img">
          <div class="search-result__info">
            <div class="search-result__title">${escapeHtml(product.name)}</div>
            <div class="search-result__category">${escapeHtml(product.category)}</div>
          </div>
          <div class="search-result__price">${escapeHtml(product.priceText || product.price + ' ₽')}</div>
        </a>
      `;
    });

    searchResults.innerHTML = html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========================================
  // SECTION 5: CART SYSTEM
  // ========================================

  function saveCart() {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(state.cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
      badge.textContent = total;
      badge.style.display = total > 0 ? 'flex' : 'none';
    }
  }

  function addToCart(product) {
    const existing = state.cart.find(item => item.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({ ...product, qty: 1 });
    }
    saveCart();
    showToast(`${product.name} добавлен в корзину`, 'success');

    // При подключении бэкенда — раскомментировать:
    // api.addToCartServer(product.id, 1).catch(() => {});
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();
    showToast('Товар удалён из корзины', 'info');
    if (typeof renderCart === 'function') renderCart();
  }

  function updateCartQty(productId, qty) {
    const item = state.cart.find(item => item.id === productId);
    if (item) {
      if (qty <= 0) {
        removeFromCart(productId);
      } else {
        item.qty = qty;
        saveCart();
        if (typeof renderCart === 'function') renderCart();
      }
    }
  }

  function getCartTotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  function getCartCount() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  // ← ВАЖНО: метод для получения данных перед отправкой на сервер
  function getCartDataForServer() {
    return state.cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty
      // изображение не передаём — бэкенд сам найдёт по id
    }));
  }

  // ========================================
  // SECTION 6: WISHLIST
  // ========================================

  function saveWishlist() {
    localStorage.setItem(CONFIG.WISHLIST_STORAGE_KEY, JSON.stringify(state.wishlist));
  }

  function toggleWishlist(productId) {
    const index = state.wishlist.indexOf(productId);
    if (index > -1) {
      state.wishlist.splice(index, 1);
      saveWishlist();
      showToast('Удалено из избранного', 'info');
      return false;
    } else {
      state.wishlist.push(productId);
      saveWishlist();
      showToast('Добавлено в избранное', 'success');
      return true;
    }
  }

  function isInWishlist(productId) {
    return state.wishlist.includes(productId);
  }

  // ========================================
  // SECTION 7: PRODUCT CARDS
  // ========================================

  function initProductCards() {
    document.querySelectorAll('.product-card').forEach(card => {
      const addBtn = card.querySelector('.action-btn[data-action="cart"]');
      const wishBtn = card.querySelector('.action-btn[data-action="wishlist"]');

      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const product = {
            id: addBtn.dataset.id,
            name: addBtn.dataset.name,
            price: parseInt(addBtn.dataset.price) || 0,
            image: addBtn.dataset.image || ''
          };
          addToCart(product);
        });
      }

      if (wishBtn) {
        wishBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const productId = wishBtn.dataset.id;
          const isActive = toggleWishlist(productId);
          wishBtn.classList.toggle('active', isActive);
          wishBtn.innerHTML = isActive ? '♥' : '♡';
        });

        const productId = wishBtn.dataset.id;
        if (productId && isInWishlist(productId)) {
          wishBtn.classList.add('active');
          wishBtn.innerHTML = '♥';
        }
      }
    });
  }

  // ========================================
  // SECTION 8: QUANTITY SELECTORS
  // ========================================

  function initQtySelectors() {
    document.querySelectorAll('.qty-selector').forEach(selector => {
      const input = selector.querySelector('.qty-input');
      const minus = selector.querySelector('.qty-btn--minus');
      const plus = selector.querySelector('.qty-btn--plus');

      if (!input) return;

      if (minus) {
        minus.addEventListener('click', () => {
          const val = parseInt(input.value) || 1;
          if (val > 1) {
            input.value = val - 1;
            input.dispatchEvent(new Event('change'));
          }
        });
      }

      if (plus) {
        plus.addEventListener('click', () => {
          const val = parseInt(input.value) || 1;
          input.value = val + 1;
          input.dispatchEvent(new Event('change'));
        });
      }
    });
  }

  // ========================================
  // SECTION 9: FILTER DRAWER (Mobile)
  // ========================================

  function initFilterDrawer() {
    const filterToggle = document.getElementById('filterToggle');
    const filterDrawer = document.getElementById('filterDrawer');
    const filterClose = document.getElementById('filterClose');
    const filterOverlay = document.getElementById('filterOverlay');

    if (!filterToggle || !filterDrawer) return;

    function openFilter() {
      filterDrawer.classList.add('active');
      if (filterOverlay) filterOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      state.isFilterOpen = true;
    }

    function closeFilterDrawer() {
      filterDrawer.classList.remove('active');
      if (filterOverlay) filterOverlay.classList.remove('active');
      document.body.style.overflow = '';
      state.isFilterOpen = false;
    }

    filterToggle.addEventListener('click', openFilter);
    if (filterClose) filterClose.addEventListener('click', closeFilterDrawer);
    if (filterOverlay) filterOverlay.addEventListener('click', closeFilterDrawer);
  }

  // ========================================
  // SECTION 10: FORMS — готовы к подключению бэкенда
  // ========================================

  function initForms() {
    // Форма обратной связи (callback)
    const callbackForm = document.getElementById('callback-form');
    if (callbackForm) {
      callbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(callbackForm);
        const data = Object.fromEntries(formData.entries());

        // Валидация
        if (!validateForm(callbackForm)) return;

        try {
          // При подключении бэкенда — раскомментировать:
          // await api.sendCallbackForm(data);
          showToast('Спасибо! Мы свяжемся с вами в ближайшее время.', 'success');
          callbackForm.reset();
          closeModal();
        } catch (err) {
          showToast('Ошибка отправки. Попробуйте позже.', 'error');
        }
      });
    }

    // Форма заказа (в корзине)
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
      // Заполняем скрытое поле с данными корзины
      const cartDataInput = orderForm.querySelector('#cart-data');
      if (cartDataInput) {
        cartDataInput.value = JSON.stringify(getCartDataForServer());
      }

      orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (state.cart.length === 0) {
          showToast('Корзина пуста. Добавьте товары перед оформлением.', 'error');
          return;
        }

        if (!validateForm(orderForm)) return;

        const formData = new FormData(orderForm);
        const data = Object.fromEntries(formData.entries());

        // Добавляем актуальные данные корзины
        data.cart_items = getCartDataForServer();
        data.total = getCartTotal();

        try {
          // При подключении бэкенда — раскомментировать:
          // await api.createOrder(data);
          showToast('Заказ успешно оформлен! Мы свяжемся с вами.', 'success');
          state.cart = [];
          saveCart();
          orderForm.reset();
          if (typeof renderCart === 'function') renderCart();
        } catch (err) {
          showToast('Ошибка оформления заказа. Попробуйте позже.', 'error');
        }
      });
    }

    // Форма подписки (newsletter)
    const newsletterForm = document.querySelector('.newsletter__form');
    if (newsletterForm) {
      newsletterForm.setAttribute('id', 'newsletter-form');
      newsletterForm.setAttribute('action', '/api/subscribe');
      newsletterForm.setAttribute('method', 'POST');

      newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = newsletterForm.querySelector('input[type="email"]');
        if (input && input.value) {
          try {
            // await apiRequest('/subscribe', 'POST', { email: input.value });
            showToast('Спасибо за подписку! Скидка 10% отправлена на ваш email.', 'success');
            input.value = '';
          } catch (err) {
            showToast('Ошибка подписки. Попробуйте позже.', 'error');
          }
        }
      });
    }
  }

  function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
      const group = field.closest('.form-group') || field.parentElement;
      if (!field.value.trim()) {
        isValid = false;
        group.classList.add('form-group--error');
      } else {
        group.classList.remove('form-group--error');
      }
    });

    // Email validation
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const group = emailField.closest('.form-group') || emailField.parentElement;
      if (!emailRegex.test(emailField.value)) {
        isValid = false;
        group.classList.add('form-group--error');
        const errorEl = group.querySelector('.form-error');
        if (errorEl) errorEl.textContent = 'Введите корректный email';
      }
    }

    // Phone validation
    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value) {
      const phoneRegex = /^[\+\d\s\-\(\)]{10,}$/;
      const group = phoneField.closest('.form-group') || phoneField.parentElement;
      if (!phoneRegex.test(phoneField.value)) {
        isValid = false;
        group.classList.add('form-group--error');
        const errorEl = group.querySelector('.form-error');
        if (errorEl) errorEl.textContent = 'Введите корректный телефон';
      }
    }

    if (!isValid) {
      showToast('Пожалуйста, заполните все обязательные поля корректно', 'error');
    }

    return isValid;
  }

  // ========================================
  // SECTION 11: MODALS
  // ========================================

  function initModals() {
    // Callback modal triggers
    document.querySelectorAll('[data-modal="callback"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('callbackModal');
      });
    });

    // Close modal buttons
    document.querySelectorAll('.modal__close').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
    if (!state.isMenuOpen && !state.isSearchOpen && !state.isFilterOpen) {
      document.body.style.overflow = '';
    }
  }

  // ========================================
  // SECTION 12: CART PAGE
  // ========================================

  function initCartPage() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;

    window.renderCart = function() {
      const container = document.getElementById('cartItems');
      const emptyState = document.getElementById('cartEmpty');
      const summary = document.getElementById('cartSummary');
      const orderForm = document.getElementById('order-form');

      if (state.cart.length === 0) {
        if (container) container.style.display = 'none';
        if (summary) summary.style.display = 'none';
        if (orderForm) orderForm.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (container) container.style.display = 'block';
      if (summary) summary.style.display = 'block';
      if (orderForm) orderForm.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';

      let html = `
        <div class="cart-items__header">
          <span>Товар</span>
          <span>Цена</span>
          <span>Количество</span>
          <span>Сумма</span>
          <span></span>
        </div>
      `;

      let subtotal = 0;

      state.cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        html += `
          <div class="cart-item" data-id="${item.id}">
            <div class="cart-item__product">
              <img src="${item.image}" alt="${item.name}" class="cart-item__img">
              <div class="cart-item__info">
                <h4>${item.name}</h4>
                <span>В наличии</span>
              </div>
            </div>
            <div class="cart-item__price">${item.price.toLocaleString('ru-RU')} ₽</div>
            <div class="qty-selector">
              <button class="qty-btn qty-btn--minus" data-id="${item.id}">−</button>
              <input type="number" class="qty-input" value="${item.qty}" min="1" data-id="${item.id}">
              <button class="qty-btn qty-btn--plus" data-id="${item.id}">+</button>
            </div>
            <div class="cart-item__total">${itemTotal.toLocaleString('ru-RU')} ₽</div>
            <button class="cart-item__remove" data-id="${item.id}" aria-label="Удалить">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `;
      });

      container.innerHTML = html;

      // Attach events
      container.querySelectorAll('.qty-btn--minus').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const item = state.cart.find(i => i.id === id);
          if (item && item.qty > 1) {
            updateCartQty(id, item.qty - 1);
          }
        });
      });

      container.querySelectorAll('.qty-btn--plus').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const item = state.cart.find(i => i.id === id);
          if (item) {
            updateCartQty(id, item.qty + 1);
          }
        });
      });

      container.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', () => {
          const id = input.dataset.id;
          const qty = parseInt(input.value) || 1;
          updateCartQty(id, qty);
        });
      });

      container.querySelectorAll('.cart-item__remove').forEach(btn => {
        btn.addEventListener('click', () => {
          removeFromCart(btn.dataset.id);
        });
      });

      // Update summary
      updateCartSummary(subtotal);

      // Update hidden cart-data field
      const cartDataInput = document.getElementById('cart-data');
      if (cartDataInput) {
        cartDataInput.value = JSON.stringify(getCartDataForServer());
      }
    };

    function updateCartSummary(subtotal) {
      const subtotalEl = document.getElementById('cartSubtotal');
      const discountEl = document.getElementById('cartDiscount');
      const deliveryEl = document.getElementById('cartDelivery');
      const totalEl = document.getElementById('cartTotal');

      const discount = 0;
      const delivery = subtotal >= 3000 ? 0 : 350;
      const total = subtotal - discount + delivery;

      if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString('ru-RU')} ₽`;
      if (discountEl) discountEl.textContent = discount > 0 ? `-${discount.toLocaleString('ru-RU')} ₽` : '0 ₽';
      if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'Бесплатно' : `${delivery.toLocaleString('ru-RU')} ₽`;
      if (totalEl) totalEl.textContent = `${total.toLocaleString('ru-RU')} ₽`;
    }

    // Promo code
    const promoForm = document.getElementById('promoForm');
    if (promoForm) {
      promoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = promoForm.querySelector('input');
        if (input.value.toUpperCase() === 'SPICE10') {
          showToast('Промокод применён! Скидка 10%', 'success');
        } else {
          showToast('Неверный промокод', 'error');
        }
      });
    }

    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) {
          showToast('Корзина пуста', 'error');
          return;
        }
        // Scroll to order form
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
          orderForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    renderCart();
  }

  // ========================================
  // SECTION 13: CATALOG PAGE
  // ========================================

  function initCatalogPage() {
    const catalogGrid = document.getElementById('catalogGrid');
    if (!catalogGrid) return;

    document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        showToast('Фильтры применены', 'success');
      });
    });

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        showToast('Сортировка изменена', 'info');
      });
    }

    document.querySelectorAll('.pagination__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!btn.disabled && !btn.classList.contains('active')) {
          document.querySelectorAll('.pagination__btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  // ========================================
  // SECTION 14: SMOOTH SCROLL & ANIMATIONS
  // ========================================

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  function initScrollReveal() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });
  }

  // ========================================
  // SECTION 15: PUBLIC API
  // ========================================

  function init() {
    initHeader();
    initMobileMenu();
    initSearch();
    initSmoothScroll();
    initScrollReveal();
    initProductCards();
    initQtySelectors();
    initFilterDrawer();
    initModals();
    initForms();
    initCartPage();
    initCatalogPage();
    updateCartBadge();

    console.log('🌿 Аромат Востока инициализирован. API_BASE_URL:', CONFIG.API_BASE_URL);
    console.log('💡 Для подключения бэкенда: измените CONFIG.API_BASE_URL в начале js/main.js');
  }

  // Expose globally for debugging and external access
  window.AromatVostoka = {
    init,
    addToCart,
    removeFromCart,
    updateCartQty,
    getCartTotal,
    getCartCount,
    getCartDataForServer,
    toggleWishlist,
    isInWishlist,
    showToast,
    api,          // ← доступ к API для тестирования
    CONFIG,       // ← доступ к конфигу
    state         // ← доступ к состоянию (только для отладки)
  };

  return window.AromatVostoka;
})();

// Run on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AromatVostoka.init);
} else {
  AromatVostoka.init();
}
