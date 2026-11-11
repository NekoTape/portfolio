const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Scroll suave para los links internos (#about, #projects, etc.) ----------
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      // dar foco al destino por accesibilidad
      setTimeout(() => {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 600);
    });
  });
})();

// ---------- Menú móvil ----------
(function () {
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (!toggle || !mobileNav) return;

  function setOpen(open) {
    mobileNav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '✕' : '☰';
  }

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!mobileNav.classList.contains('open'));
  });

  // cerrar al elegir una sección, al tocar fuera o con Escape
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', e => {
    if (!mobileNav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 720) setOpen(false); });
})();

// ---------- Carrusel de proyectos ----------
// Cuántas tarjetas se ven a la vez lo define el CSS (--per-page en .carousel-track),
// así el layout y el JS nunca se desincronizan.
(function () {
  const carousel = document.querySelector('.projects-carousel');
  const viewport = document.getElementById('carousel-viewport');
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const dotsWrap = document.getElementById('carousel-dots');
  if (!carousel || !track) return;

  const slides = Array.from(track.children);
  let perPage = 3;
  let totalPages = 1;
  let currentPage = 0;

  function readPerPage() {
    const value = parseInt(getComputedStyle(track).getPropertyValue('--per-page'), 10);
    perPage = value > 0 ? value : 1;
  }

  function renderDots() {
    dotsWrap.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Go to project page ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function update() {
    // medidas reales (offsetWidth no se ve afectado por el hover/zoom de las tarjetas)
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const slideWidth = slides[0].offsetWidth + gap;
    const maxOffset = Math.max(0, slides.length * slideWidth - gap - track.clientWidth);
    const offset = Math.min(currentPage * perPage * slideWidth, maxOffset);
    track.style.transform = `translateX(-${offset}px)`;

    // puntos
    Array.from(dotsWrap.children).forEach((dot, i) => {
      const active = i === currentPage;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-selected', String(active));
    });

    // flechas
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;

    // las tarjetas fuera de vista no deben recibir foco con Tab
    const start = currentPage * perPage;
    slides.forEach((slide, i) => {
      slide.inert = i < start || i >= start + perPage;
    });
  }

  function goTo(page) {
    currentPage = Math.max(0, Math.min(totalPages - 1, page));
    update();
  }

  function recalc() {
    const firstVisible = currentPage * perPage;
    readPerPage();
    totalPages = Math.ceil(slides.length / perPage);
    // mantiene en pantalla la tarjeta que se estaba viendo al cambiar el tamaño
    currentPage = Math.min(Math.floor(firstVisible / perPage), totalPages - 1);
    renderDots();
    update();
  }

  prevBtn.addEventListener('click', () => goTo(currentPage - 1));
  nextBtn.addEventListener('click', () => goTo(currentPage + 1));

  // teclado: flechas izquierda / derecha dentro del carrusel
  carousel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(currentPage - 1);
    if (e.key === 'ArrowRight') goTo(currentPage + 1);
  });

  // swipe en pantallas táctiles
  let touchStartX = 0;
  let touchStartY = 0;
  viewport.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  viewport.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      goTo(currentPage + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  // seguro: si el navegador desplaza el viewport por un foco, se corrige
  viewport.addEventListener('scroll', () => { viewport.scrollLeft = 0; });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recalc, 100);
  });

  recalc();
})();

// ---------- Aparición suave de las secciones al hacer scroll ----------
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => observer.observe(el));
})();

// ---------- Marcar en el menú la sección que se está viendo ----------
(function () {
  if (!('IntersectionObserver' in window)) return;
  const links = document.querySelectorAll('.main-nav a, .mobile-nav a');
  const sections = document.querySelectorAll('main section[id]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = '#' + entry.target.id;
      links.forEach(link => {
        const active = link.getAttribute('href') === id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' }); // la sección que cruza ~40% de la pantalla

  sections.forEach(section => observer.observe(section));
})();
