(() => {
  const DEFAULT_LANG = "ua";
  const SUPPORTED_LANGS = ["ua", "en"];
  const LANGUAGE_STORAGE_KEY = "stablefit-language";
  /** Bump when locale JSON shape changes so stale cache is not reused. */
  const LOCALE_CACHE_VERSION = "3";
  const localeCacheKey = (lang) => `stablefit-locale-v${LOCALE_CACHE_VERSION}-${lang}`;

  const scriptEl = document.currentScript || document.querySelector('script[src*="main.js"]');
  const scriptUrl = scriptEl ? new URL(scriptEl.src, window.location.href) : new URL(window.location.href);
  const siteBaseUrl = new URL("../", scriptUrl);

  const languageButtons = Array.from(document.querySelectorAll(".localisation-item[data-lang]"));
  const htmlNode = document.documentElement;

  const dictionaries = {};
  let currentLanguage = DEFAULT_LANG;

  function getNestedValue(object, keyPath) {
    return keyPath.split(".").reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), object);
  }

  function readDictionaryFromCache(lang) {
    try {
      const raw = localStorage.getItem(localeCacheKey(lang));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeDictionaryToCache(lang, data) {
    try {
      localStorage.setItem(localeCacheKey(lang), JSON.stringify(data));
    } catch {
      /* ignore quota / private mode */
    }
  }

  async function loadDictionary(lang) {
    if (dictionaries[lang]) return dictionaries[lang];

    const response = await fetch(new URL(`locales/${lang}.json`, siteBaseUrl));
    if (!response.ok) {
      throw new Error(`Failed to load locale ${lang}`);
    }

    const data = await response.json();
    dictionaries[lang] = data;
    writeDictionaryToCache(lang, data);
    return data;
  }

  function paintActiveLanguage(lang) {
    languageButtons.forEach((button) => {
      const isActive = button.dataset.lang === lang;
      button.classList.toggle("is-active", isActive);
    });
  }

  function paintActiveLandingNav() {
    const path = window.location.pathname.replace(/\/index\.html$/i, "");
    const segments = path.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";

    const isCoach =
      /\/coach\/?$/i.test(path) ||
      /\/coach\.html$/i.test(path) ||
      /coach\.html$/i.test(window.location.pathname) ||
      lastSegment === "coach";

    const isClient =
      /\/client\/?$/i.test(path) ||
      /\/client\.html$/i.test(path) ||
      /client\.html$/i.test(window.location.pathname) ||
      lastSegment === "client";

    const isSupport = /\/support\/?$/i.test(path) || lastSegment === "support";

    document.querySelectorAll(".landing-link[data-landing]").forEach((link) => {
      const landing = link.dataset.landing;
      const isActive =
        (landing === "coach" && isCoach) ||
        (landing === "client" && isClient) ||
        (landing === "support" && isSupport);
      link.classList.toggle("is-active", isActive);
    });
  }

  function applyTranslations(dictionary) {
    const translatableNodes = Array.from(document.querySelectorAll("[data-i18n]"));
    translatableNodes.forEach((node) => {
      const key = node.dataset.i18n;
      if (!key) return;

      const translatedText = getNestedValue(dictionary, key);
      if (typeof translatedText !== "string") return;

      if (node.tagName === "TITLE") {
        node.textContent = translatedText;
        return;
      }

      node.textContent = translatedText;
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const key = node.dataset.i18nAria;
      if (!key) return;
      const translatedText = getNestedValue(dictionary, key);
      if (typeof translatedText !== "string") return;
      node.setAttribute("aria-label", translatedText);
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
      const key = node.dataset.i18nAlt;
      if (!key) return;
      const translatedText = getNestedValue(dictionary, key);
      if (typeof translatedText !== "string") return;
      node.setAttribute("alt", translatedText);
    });

    document.querySelectorAll("[data-i18n-content]").forEach((node) => {
      const key = node.dataset.i18nContent;
      if (!key) return;
      const translatedText = getNestedValue(dictionary, key);
      if (typeof translatedText !== "string") return;
      node.setAttribute("content", translatedText);
    });
  }

  async function setLanguage(lang) {
    const normalizedLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;

    try {
      const dictionary = await loadDictionary(normalizedLang);
      applyTranslations(dictionary);
      paintActiveLanguage(normalizedLang);
      paintActiveLandingNav();
      htmlNode.setAttribute("lang", normalizedLang);
      currentLanguage = normalizedLang;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLang);
    } catch (error) {
      console.error(error);
    }
  }

  function detectInitialLanguage() {
    const fromStorage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (fromStorage && SUPPORTED_LANGS.includes(fromStorage)) {
      return fromStorage;
    }

    const browserLang = navigator.language ? navigator.language.slice(0, 2).toLowerCase() : DEFAULT_LANG;
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
  }


  function applyCachedDictionaryIfAvailable(lang) {
    const normalizedLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
    const cached = readDictionaryFromCache(normalizedLang);
    if (!cached || typeof cached !== "object") return;

    applyTranslations(cached);
    paintActiveLanguage(normalizedLang);
    paintActiveLandingNav();
    htmlNode.setAttribute("lang", normalizedLang);
  }

  function setFSliderAccordionIndex(root, activeIndex) {
    const items = root.querySelectorAll(".f-slider-accordion-item");
    items.forEach((other, i) => {
      const t = other.querySelector(".f-slider-accordion-trigger");
      const isActive = i === activeIndex;
      other.classList.toggle("is-open", isActive);
      if (t) t.setAttribute("aria-expanded", isActive ? "true" : "false");
    });
  }

  function initFSliderAccordion() {
    document.querySelectorAll("[data-f-slider-accordion]").forEach((root) => {
      const items = root.querySelectorAll(".f-slider-accordion-item");
      items.forEach((item, itemIndex) => {
        const trigger = item.querySelector(".f-slider-accordion-trigger");
        if (!trigger) return;

        trigger.addEventListener("click", () => {
          const opening = !item.classList.contains("is-open");
          if (opening) {
            setFSliderAccordionIndex(root, itemIndex);
          } else {
            item.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
          }
        });
      });
    });
  }

  function initFSliderScrollSync() {
    const row = document.querySelector(".f-slider-item[data-f-slider-scroll-sync]");
    if (!row) return;

    const accordion = row.querySelector("[data-f-slider-accordion]");
    const leftContent = row.querySelector(".content-left");
    const contentRight = row.querySelector(".content-right");
    const wraps = row.querySelectorAll(".content-right-image-wrp");
    const accordionItems = accordion ? accordion.querySelectorAll(".f-slider-accordion-item") : [];
    if (!accordion || !leftContent || !contentRight || wraps.length === 0) return;

    const mq = window.matchMedia("(max-width: 1023px)");
    let lastSyncedIndex = -1;
    let desktopTicking = false;
    let carouselTicking = false;
    let ignoreScrollSync = false;

    function getLeftColumnViewportCenterY() {
      const r = leftContent.getBoundingClientRect();
      const top = Math.max(0, r.top);
      const bottom = Math.min(window.innerHeight, r.bottom);
      if (bottom <= top) return window.innerHeight / 2;
      return (top + bottom) / 2;
    }

    function scrollToImageForIndex(index) {
      const wrap = wraps[index];
      if (!wrap || index < 0 || index >= wraps.length) return;

      const refY = getLeftColumnViewportCenterY();
      const r = wrap.getBoundingClientRect();
      const cy = r.top + r.height / 2;
      const delta = cy - refY;
      if (Math.abs(delta) < 3) return;

      lastSyncedIndex = index;
      ignoreScrollSync = true;
      window.scrollBy({ top: delta, behavior: "smooth" });

      const unlock = () => {
        ignoreScrollSync = false;
      };
      window.addEventListener("scrollend", unlock, { once: true });
      setTimeout(unlock, 750);
    }

    function scrollCarouselToIndex(index) {
      const wrap = wraps[index];
      if (!wrap) return;
      ignoreScrollSync = true;
      lastSyncedIndex = index;
      contentRight.scrollTo({ left: wrap.offsetLeft, behavior: "smooth" });
      const unlock = () => {
        ignoreScrollSync = false;
      };
      setTimeout(unlock, 500);
    }

    function getCarouselActiveIndex() {
      const cr = contentRight.getBoundingClientRect();
      const mid = cr.left + cr.width / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      wraps.forEach((wrap, i) => {
        const r = wrap.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(c - mid);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      return bestIdx;
    }

    function syncFromScrollDesktop() {
      desktopTicking = false;
      if (ignoreScrollSync || mq.matches) return;

      const rowRect = row.getBoundingClientRect();
      if (rowRect.bottom < 0 || rowRect.top > window.innerHeight) return;

      const refY = getLeftColumnViewportCenterY();
      let bestIdx = 0;
      let bestDist = Infinity;

      wraps.forEach((wrap, i) => {
        const r = wrap.getBoundingClientRect();
        const cy = r.top + r.height / 2;
        const d = Math.abs(cy - refY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });

      if (bestIdx === lastSyncedIndex) return;
      lastSyncedIndex = bestIdx;
      setFSliderAccordionIndex(accordion, bestIdx);
    }

    function syncFromCarouselScroll() {
      carouselTicking = false;
      if (ignoreScrollSync || !mq.matches) return;

      const idx = getCarouselActiveIndex();
      if (idx === lastSyncedIndex) return;
      lastSyncedIndex = idx;
      setFSliderAccordionIndex(accordion, idx);
    }

    function requestDesktopSync() {
      if (mq.matches) return;
      if (desktopTicking) return;
      desktopTicking = true;
      requestAnimationFrame(syncFromScrollDesktop);
    }

    function requestCarouselSync() {
      if (!mq.matches) return;
      if (carouselTicking) return;
      carouselTicking = true;
      requestAnimationFrame(syncFromCarouselScroll);
    }

    function onWindowScroll() {
      if (!mq.matches) requestDesktopSync();
    }

    function runInitialSync() {
      lastSyncedIndex = -1;
      if (mq.matches) syncFromCarouselScroll();
      else syncFromScrollDesktop();
    }

    accordionItems.forEach((item, itemIndex) => {
      const trigger = item.querySelector(".f-slider-accordion-trigger");
      if (!trigger) return;
      trigger.addEventListener("click", () => {
        queueMicrotask(() => {
          if (!item.classList.contains("is-open")) return;
          if (itemIndex >= wraps.length) return;
          if (mq.matches) {
            scrollCarouselToIndex(itemIndex);
          } else {
            scrollToImageForIndex(itemIndex);
          }
        });
      });
    });

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("resize", runInitialSync);
    contentRight.addEventListener("scroll", requestCarouselSync, { passive: true });
    mq.addEventListener("change", runInitialSync);

    runInitialSync();
  }

  function initMobileNav() {
    const burger = document.querySelector(".header-burger");
    const drawer = document.querySelector(".header-drawer");
    const closeBtn = document.querySelector(".header-drawer-close");
    if (!burger || !drawer) return;

    function open() {
      document.body.classList.add("nav-open");
      burger.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");
    }

    function closeNav() {
      document.body.classList.remove("nav-open");
      burger.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
    }

    function toggle() {
      if (document.body.classList.contains("nav-open")) closeNav();
      else open();
    }

    burger.addEventListener("click", toggle);
    closeBtn?.addEventListener("click", closeNav);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("nav-open")) closeNav();
    });

    drawer.querySelectorAll("a[href]").forEach((anchor) => {
      anchor.addEventListener("click", () => {
        closeNav();
      });
    });

    drawer.querySelectorAll(".localisation-item[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeNav();
      });
    });
  }

  function initTestimonialsMarquee() {
    const marquees = Array.from(document.querySelectorAll(".testimonials-marquee"));
    if (!marquees.length) return () => {};

    const seedMarkupByMarquee = new Map();

    marquees.forEach((marquee) => {
      const seedSet = marquee.querySelector(".testimonials-marquee-set");
      if (seedSet) {
        seedMarkupByMarquee.set(marquee, seedSet.innerHTML);
      }
    });

    const rebuildMarquee = (marquee) => {
      const track = marquee.querySelector(".testimonials-marquee-track");
      const seedMarkup = seedMarkupByMarquee.get(marquee);
      if (!track || !seedMarkup) return;

      const seedSet = document.createElement("div");
      seedSet.className = "testimonials-marquee-set";
      seedSet.innerHTML = seedMarkup;

      const seedCards = Array.from(seedSet.children);
      if (!seedCards.length) return;

      const viewportWidth = marquee.clientWidth || window.innerWidth;

      const measureSet = seedSet.cloneNode(true);
      track.replaceChildren(measureSet);
      const baseSetWidth = Math.max(measureSet.scrollWidth, 1);

      const copiesNeeded = Math.max(1, Math.ceil((viewportWidth + baseSetWidth) / baseSetWidth));

      const buildRepeatedSet = () => {
        const repeatedSet = document.createElement("div");
        repeatedSet.className = "testimonials-marquee-set";

        for (let copyIndex = 0; copyIndex < copiesNeeded; copyIndex += 1) {
          for (let cardIndex = 0; cardIndex < seedCards.length; cardIndex += 1) {
            repeatedSet.appendChild(seedCards[cardIndex].cloneNode(true));
          }
        }
        return repeatedSet;
      };

      const firstSet = buildRepeatedSet();
      const secondSet = firstSet.cloneNode(true);
      secondSet.setAttribute("aria-hidden", "true");

      track.replaceChildren(firstSet, secondSet);

      const shift = Math.max(firstSet.scrollWidth, 1);
      const speedPxPerSec = 70;
      const durationSec = Math.max(shift / speedPxPerSec, 18);

      track.style.setProperty("--testimonials-marquee-shift", `${shift}px`);
      track.style.setProperty("--testimonials-marquee-duration", `${durationSec}s`);
    };

    const rebuildAll = () => {
      marquees.forEach((marquee) => rebuildMarquee(marquee));
    };

    let resizeTimer = null;
    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuildAll, 120);
    };

    window.addEventListener("resize", onResize);
    rebuildAll();
    return rebuildAll;
  }

  currentLanguage = detectInitialLanguage();
  applyCachedDictionaryIfAvailable(currentLanguage);
  const refreshTestimonialsMarquee = initTestimonialsMarquee();

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang;
      if (!lang) return;
      setLanguage(lang).then(() => {
        refreshTestimonialsMarquee();
      });
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const lang = button.dataset.lang;
      if (!lang) return;
      setLanguage(lang).then(() => {
        refreshTestimonialsMarquee();
      });
    });
  });

  initFSliderAccordion();
  initFSliderScrollSync();
  initMobileNav();

  setLanguage(currentLanguage).then(() => {
    refreshTestimonialsMarquee();
  });
})();
