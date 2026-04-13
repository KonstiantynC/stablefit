(() => {
  const DEFAULT_LANG = "ua";
  const SUPPORTED_LANGS = ["ua", "en"];
  const LANGUAGE_STORAGE_KEY = "stablefit-language";
  const LOCALE_CACHE_VERSION = "2";
  const localeCacheKey = (lang) => `stablefit-locale-v${LOCALE_CACHE_VERSION}-${lang}`;

  const scriptEl = document.currentScript || document.querySelector('script[src*="main.js"]');
  const scriptUrl = scriptEl ? new URL(scriptEl.src, window.location.href) : new URL(window.location.href);
  const siteBaseUrl = new URL("../", scriptUrl);

  const languageButtons = Array.from(document.querySelectorAll(".localisation-item[data-lang]"));
  const htmlNode = document.documentElement;

  const dictionaries = {};
  let lastAppliedDictionary = null;
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
      /\/for-clients\/?$/i.test(path) ||
      /\/for-clients\.html$/i.test(path) ||
      /for-clients\.html$/i.test(window.location.pathname) ||
      lastSegment === "for-clients" ||
      /\/client\/?$/i.test(path) || // backward compatibility
      /\/client\.html$/i.test(path) ||
      /client\.html$/i.test(window.location.pathname) ||
      lastSegment === "client";

    const isSupport = /\/support\/?$/i.test(path) || lastSegment === "support";

    document.querySelectorAll(".landing-link[data-landing]").forEach((link) => {
      if (link.closest("footer")) {
        link.classList.remove("is-active");
        return;
      }

      const landing = link.dataset.landing;
      const isActive =
        (landing === "coach" && isCoach) ||
        (landing === "client" && isClient) ||
        (landing === "support" && isSupport);
      link.classList.toggle("is-active", isActive);
    });
  }

  function setI18nTextContent(node, text) {
    if (typeof text !== "string") return;
    if (!text.includes("\n")) {
      node.textContent = text;
      return;
    }
    node.textContent = "";
    const parts = text.split("\n");
    parts.forEach((part, index) => {
      node.appendChild(document.createTextNode(part));
      if (index < parts.length - 1) {
        node.appendChild(document.createElement("br"));
      }
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

      setI18nTextContent(node, translatedText);
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
      if (lastAppliedDictionary !== dictionary) {
        lastAppliedDictionary = dictionary;
        applyTranslations(dictionary);
      }
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

    dictionaries[normalizedLang] = cached;
    lastAppliedDictionary = cached;
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

    requestAnimationFrame(() => {
      runInitialSync();
    });
    window.addEventListener("load", runInitialSync, { once: true });
  }

  function initScrollToDownloadApp() {
    const target = document.getElementById("download-app");
    if (!target) return;

    document.querySelectorAll("a.download-button, a.try-button").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
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
    const MARQUEE_CARD_GAP_PX = 24;
    const MARQUEE_CARD_WIDTH_PX = 400;
    const MARQUEE_MAX_SET_COPIES = 12;
    const marquees = Array.from(document.querySelectorAll(".testimonials-marquee"));
    if (!marquees.length) return () => {};

    const seedMarkupByMarquee = new Map();
    const rafByMarquee = new WeakMap();
    const resizeObserverByMarquee = new WeakMap();

    function flexGapPx(el) {
      const s = getComputedStyle(el);
      const raw = s.columnGap && s.columnGap !== "normal" ? s.columnGap : s.gap;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : MARQUEE_CARD_GAP_PX;
    }

    marquees.forEach((marquee) => {
      const seedSet = marquee.querySelector(".testimonials-marquee-set");
      if (seedSet) {
        seedMarkupByMarquee.set(marquee, seedSet.innerHTML);
      }
    });

    function stopMarqueeRaf(marquee) {
      const id = rafByMarquee.get(marquee);
      if (id != null) {
        cancelAnimationFrame(id);
        rafByMarquee.delete(marquee);
      }
    }

    const rebuildMarquee = (marquee) => {
      stopMarqueeRaf(marquee);
      const oldRo = resizeObserverByMarquee.get(marquee);
      if (oldRo) {
        oldRo.disconnect();
        resizeObserverByMarquee.delete(marquee);
      }

      const track = marquee.querySelector(".testimonials-marquee-track");
      if (!track) return;

      track.style.transform = "";
      track.classList.remove(
        "testimonials-marquee-track--loop",
        "testimonials-marquee-track--flat",
        "testimonials-marquee-track--raf"
      );

      const liveFirstSet = track.querySelector(".testimonials-marquee-set");
      const seedMarkup = liveFirstSet
        ? liveFirstSet.innerHTML
        : seedMarkupByMarquee.get(marquee);
      if (!seedMarkup) return;

      if (liveFirstSet) {
        seedMarkupByMarquee.set(marquee, seedMarkup);
      }

      const seedSet = document.createElement("div");
      seedSet.className = "testimonials-marquee-set";
      seedSet.innerHTML = seedMarkup;

      const seedCards = Array.from(seedSet.querySelectorAll(".testimonial-card"));
      if (!seedCards.length) return;

      const viewportWidth = marquee.clientWidth || window.innerWidth;

      const measureRow = document.createElement("div");
      measureRow.setAttribute("aria-hidden", "true");
      measureRow.style.cssText =
        "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;" +
        "display:flex;flex-direction:row;flex-wrap:nowrap;" +
        `gap:${MARQUEE_CARD_GAP_PX}px;padding:0;box-sizing:border-box;`;
      seedCards.forEach((c) => measureRow.appendChild(c.cloneNode(true)));
      document.body.appendChild(measureRow);
      const measuredW = Math.max(
        measureRow.getBoundingClientRect().width,
        measureRow.scrollWidth
      );
      document.body.removeChild(measureRow);

      const estimatedMinWidth =
        seedCards.length * MARQUEE_CARD_WIDTH_PX +
        Math.max(0, seedCards.length - 1) * MARQUEE_CARD_GAP_PX;
      const baseSetWidth = Math.max(measuredW, estimatedMinWidth, 1);

      const copiesNeeded = Math.min(
        MARQUEE_MAX_SET_COPIES,
        Math.max(2, Math.ceil((viewportWidth + baseSetWidth) / baseSetWidth) + 1)
      );

      const chunkA = document.createElement("div");
      chunkA.className = "testimonials-marquee-chunk";

      for (let copyIndex = 0; copyIndex < copiesNeeded; copyIndex += 1) {
        for (let cardIndex = 0; cardIndex < seedCards.length; cardIndex += 1) {
          chunkA.appendChild(seedCards[cardIndex].cloneNode(true));
        }
      }

      const chunkB = chunkA.cloneNode(true);
      chunkB.setAttribute("aria-hidden", "true");

      track.replaceChildren(chunkA, chunkB);
      track.classList.add("testimonials-marquee-track--raf");
      marquee.classList.add("testimonials-marquee--loop-ready");

      const speedPxPerSec = 70;
      const loopState = { repeatWidth: 1 };

      const syncRepeatWidth = () => {
        if (!track.isConnected || !chunkA.isConnected) return;
        void track.offsetHeight;
        const w = chunkA.getBoundingClientRect().width;
        loopState.repeatWidth = Math.max(1, w + flexGapPx(track));
      };

      const startRaf = () => {
        syncRepeatWidth();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          track.style.transform = "translate3d(0, 0, 0)";
          return;
        }

        const ro = new ResizeObserver(() => {
          syncRepeatWidth();
        });
        ro.observe(chunkA);
        resizeObserverByMarquee.set(marquee, ro);

        let pos = 0;
        let lastTs = null;

        const tick = (ts) => {
          if (!track.isConnected) return;
          if (lastTs == null) lastTs = ts;
          const dt = Math.min((ts - lastTs) / 1000, 0.05);
          lastTs = ts;

          const rw = loopState.repeatWidth;
          pos -= speedPxPerSec * dt;
          while (pos <= -rw) {
            pos += rw;
          }

          track.style.transform = `translate3d(${pos}px, 0, 0)`;
          const nextId = requestAnimationFrame(tick);
          rafByMarquee.set(marquee, nextId);
        };

        const firstId = requestAnimationFrame(tick);
        rafByMarquee.set(marquee, firstId);
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(startRaf);
      });
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
  initScrollToDownloadApp();
  initMobileNav();

  setLanguage(currentLanguage)
    .then(() => {
      refreshTestimonialsMarquee();
    })
    .catch(() => {
      refreshTestimonialsMarquee();
    });

  if ("serviceWorker" in navigator) {
    // sw.js must live at site root (/sw.js), not under /script/, so scope "/" is valid
    // without Service-Worker-Allowed (required if worker script is in a subdirectory).
    const swUrl = new URL("../sw.js", scriptUrl);
    const scopeUrl = new URL("../", scriptUrl).href;
    navigator.serviceWorker
      .register(swUrl, { scope: scopeUrl, updateViaCache: "none" })
      .catch((err) => {
        console.warn("[StableFit] service worker not registered:", err);
      });
  }
})();
