function mobileNavToogle() {
  document.querySelector('body').classList.toggle('mobile-nav-active');
  document.querySelector('.mobile-nav-toggle')?.classList.toggle('bi-list');
  document.querySelector('.mobile-nav-toggle')?.classList.toggle('bi-x');
}

(function() {
  "use strict";

  function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) return;
      lastCall = now;
      return func(...args);
    };
  }

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  // [패치] 스크롤 이벤트가 캐시나 렌더링 타이밍에 씹히는 현상 완화 위해 throttle 시간 증가
  document.addEventListener('scroll', throttle(toggleScrolled, 100));
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  if (mobileNavToggleBtn) {
    mobileNavToggleBtn.addEventListener('click', mobileNavToogle);
  }

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
      navmenu.addEventListener('click', (e) => {
        // 드롭다운 열기 버튼은 무시
        if (e.target.classList.contains('toggle-dropdown') || e.target.closest('.dropdown')) return;

        if (document.querySelector('.mobile-nav-active')) {
          mobileNavToogle();
        }
      });
    });

  /**
   * Toggle mobile nav dropdowns (텍스트+화살표 전체 클릭 가능, 중복 방지)
   */
  document.querySelectorAll('.navmenu .dropdown > a').forEach(toggle => {
  toggle.addEventListener('click', function(e) {
    e.preventDefault();

    const parent = this.parentNode;
    const submenu = parent.querySelector('ul');
    if (!submenu) return;

    // 모바일에서만 토글
    if (window.innerWidth <= 1199) {
      // 🔥 다른 드롭다운은 모두 닫기
      document.querySelectorAll('.navmenu .dropdown').forEach(item => {
        if (item !== parent) {
          item.classList.remove('active');
          const sub = item.querySelector('ul');
          if (sub) sub.classList.remove('dropdown-active');
        }
      });

      parent.classList.toggle('active');
      submenu.classList.toggle('dropdown-active');
    }

    e.stopImmediatePropagation();
  });
});

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  window.addEventListener('load', toggleScrollTop);
  // [패치] 스크롤 이벤트가 캐시나 렌더링 타이밍에 씹히는 현상 완화 위해 throttle 시간 증가
  document.addEventListener('scroll', throttle(toggleScrollTop, 100));

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Initiate Pure Counter
   */
  new PureCounter();

  /**
   * Frequently Asked Questions Toggle
   */
  document.querySelectorAll('.faq-item h3, .faq-item .faq-toggle').forEach((faqItem) => {
    faqItem.addEventListener('click', () => {
      faqItem.parentNode.classList.toggle('faq-active');
    });
  });

  /**
   * Init isotope layout and filters
   */
  document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
    let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
    let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
    let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

    let initIsotope;
    imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
      initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
        itemSelector: '.isotope-item',
        layoutMode: layout,
        filter: filter,
        sortBy: sort
      });
    });

    isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
      filters.addEventListener('click', function() {
        isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
        this.classList.add('filter-active');
        initIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        if (typeof aosInit === 'function') {
          aosInit();
        }
      }, false);
    });

  });

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener('load', function(e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy
   */
  let navmenulinks = document.querySelectorAll('.navmenu a');

  function navmenuScrollspy() {
    navmenulinks.forEach(navmenulink => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        document.querySelectorAll('.navmenu a.active').forEach(link => link.classList.remove('active'));
        navmenulink.classList.add('active');
      } else {
        navmenulink.classList.remove('active');
      }
    })
  }
  window.addEventListener('load', navmenuScrollspy);
  // [패치] 스크롤 이벤트가 캐시나 렌더링 타이밍에 씹히는 현상 완화 위해 throttle 시간 증가
  document.addEventListener('scroll', throttle(navmenuScrollspy, 100));

  /**
   * Smooth scroll to section with scroll-marginTop consideration on navmenu click
   */
  document.querySelectorAll('.navmenu a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const target = this.hash && document.querySelector(this.hash);
      if (target) {
        e.preventDefault();
        const scrollMarginTop = getComputedStyle(target).scrollMarginTop;
        window.scrollTo({
          top: target.offsetTop - parseInt(scrollMarginTop),
          behavior: 'smooth'
        });

        // [패치] AOS.refresh() 중복 호출 방지 및 스크롤 간섭 줄이기
        setTimeout(() => {
          if (
            typeof AOS !== 'undefined' &&
            AOS.refresh &&
            !window._aosRefreshed
          ) {
            AOS.refresh();
            window._aosRefreshed = true; // [패치] AOS.refresh() 중복 호출 방지 플래그
          }
        }, 700); // allow scroll to complete before refreshing AOS
      }
    });
  });

  /**
   * 모바일에서 언어 선택 시 메뉴 닫기
   */
  document.querySelectorAll('.language-link').forEach(link => {
    link.addEventListener('click', function(e) {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });
  });

})();