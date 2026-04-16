(() => {
  const DEFAULT_LANG = "ua";
  const SUPPORTED_LANGS = ["ua", "en"];
  const LANGUAGE_STORAGE_KEY = "stablefit-language";

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

  async function loadDictionary(lang) {
    if (dictionaries[lang]) return dictionaries[lang];

    const response = await fetch(new URL(`locales/${lang}.json`, siteBaseUrl));
    if (!response.ok) {
      throw new Error(`Failed to load locale ${lang}`);
    }

    const data = await response.json();
    dictionaries[lang] = data;
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
      path === "" ||
      path === "/" ||
      /\/coach\/?$/i.test(path) ||
      /\/coach\.html$/i.test(path) ||
      /coach\.html$/i.test(window.location.pathname) ||
      lastSegment === "coach";

    const isClient =
      /\/for-clients\/?$/i.test(path) ||
      /\/for-clients\.html$/i.test(path) ||
      /for-clients\.html$/i.test(window.location.pathname) ||
      lastSegment === "for-clients" ||
      /\/client\/?$/i.test(path) ||
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
      if (root.dataset.sfAccordionBound === "1") return;
      root.dataset.sfAccordionBound = "1";

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

      setFSliderAccordionIndex(root, 0);
    });
  }

  function initFSliderScrollSync() {
    const row = document.querySelector(".f-slider-item[data-f-slider-scroll-sync]");
    if (!row) return () => {};

    const accordion = row.querySelector("[data-f-slider-accordion]");
    const leftContent = row.querySelector(".content-left");
    const contentRight = row.querySelector(".content-right");
    const wraps = row.querySelectorAll(".content-right-image-wrp");
    const accordionItems = accordion ? accordion.querySelectorAll(".f-slider-accordion-item") : [];
    if (!accordion || !leftContent || !contentRight || wraps.length === 0) return () => {};

    const mq = window.matchMedia("(max-width: 1023px)");
    let lastSyncedIndex = -1;
    let desktopTicking = false;
    let carouselTicking = false;
    let ignoreScrollSync = false;

    function getLeftColumnViewportCenterY() {
      const r = leftContent.getBoundingClientRect();
      const top = Math.max(0, r.top);
      const bottom = Math.min(window.innerHeight, r.bottom);
      if (bottom <= top) return window.innerHeight * 0.45;
      return (top + bottom) / 2;
    }

    function computeActiveSlideIndex() {
      const vh = window.innerHeight;

      const bandMid = vh * 0.3;
      const halfBand = Math.min(120, vh * 0.11);
      const bandTop = bandMid - halfBand;
      const bandBottom = bandMid + halfBand;

      let bestIdx = 0;
      let bestOverlap = -1;

      wraps.forEach((wrap, i) => {
        const r = wrap.getBoundingClientRect();
        const overlap = Math.max(
          0,
          Math.min(r.bottom, bandBottom) - Math.max(r.top, bandTop)
        );
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestIdx = i;
        }
      });

      if (bestOverlap <= 1) {
        let bestDist = Infinity;
        wraps.forEach((wrap, i) => {
          const r = wrap.getBoundingClientRect();
          const cy = (r.top + r.bottom) / 2;
          const d = Math.abs(cy - bandMid);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        });
      }


      const maxTopBeforeAdvance = vh * 0.3;
      while (bestIdx > 0) {
        const r = wraps[bestIdx].getBoundingClientRect();
        if (r.top > maxTopBeforeAdvance) {
          bestIdx -= 1;
        } else {
          break;
        }
      }

      return bestIdx;
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

    function visibleHeightInViewport(rect) {
      const vh = window.innerHeight;
      return Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
    }

    function syncFromScrollDesktop() {
      desktopTicking = false;
      if (ignoreScrollSync || mq.matches) return;

      const rowRect = row.getBoundingClientRect();
      if (rowRect.bottom < 0 || rowRect.top > window.innerHeight) return;

      let bestIdx = computeActiveSlideIndex();

      const r0 = wraps[0].getBoundingClientRect();
      const h0 = r0.height > 0 ? visibleHeightInViewport(r0) / r0.height : 0;
      if (h0 > 0.38) {
        bestIdx = 0;
      }

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

    const accordionClickHandlers = [];
    accordionItems.forEach((item, itemIndex) => {
      const trigger = item.querySelector(".f-slider-accordion-trigger");
      if (!trigger) return;
      const onTriggerClick = () => {
        queueMicrotask(() => {
          if (!item.classList.contains("is-open")) return;
          if (itemIndex >= wraps.length) return;
          if (mq.matches) {
            scrollCarouselToIndex(itemIndex);
          } else {
            scrollToImageForIndex(itemIndex);
          }
        });
      };
      trigger.addEventListener("click", onTriggerClick);
      accordionClickHandlers.push([trigger, onTriggerClick]);
    });

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        requestDesktopSync();
        requestCarouselSync();
      });
      resizeObserver.observe(row);
    }

    let slideIntersectionObserver;
    if (typeof IntersectionObserver !== "undefined") {
      const onIntersect = () => {
        if (ignoreScrollSync || mq.matches) return;
        requestDesktopSync();
      };
      slideIntersectionObserver = new IntersectionObserver(onIntersect, {
        root: null,
        threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
        rootMargin: "-38% 0px -38% 0px",
      });
      wraps.forEach((wrap) => slideIntersectionObserver.observe(wrap));
    }

    function onScrollEndLike() {
      if (!mq.matches) requestDesktopSync();
      else requestCarouselSync();
    }

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEndLike);
    window.addEventListener("resize", runInitialSync);
    contentRight.addEventListener("scroll", requestCarouselSync, { passive: true });
    mq.addEventListener("change", runInitialSync);

    requestAnimationFrame(() => {
      runInitialSync();
    });
    window.addEventListener("load", runInitialSync, { once: true });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (slideIntersectionObserver) slideIntersectionObserver.disconnect();
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("scrollend", onScrollEndLike);
      window.removeEventListener("resize", runInitialSync);
      contentRight.removeEventListener("scroll", requestCarouselSync);
      mq.removeEventListener("change", runInitialSync);
      accordionClickHandlers.forEach(([trigger, handler]) => {
        trigger.removeEventListener("click", handler);
      });
    };
  }

  function initScrollToDownloadApp() {
    const target = document.getElementById("download-app");
    if (!target) return () => {};

    const handlers = [];
    document.querySelectorAll("a.download-button, a.try-button").forEach((link) => {
      const onClick = (event) => {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      link.addEventListener("click", onClick);
      handlers.push([link, onClick]);
    });

    return () => {
      handlers.forEach(([link, onClick]) => link.removeEventListener("click", onClick));
    };
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
    const tracks = Array.from(document.querySelectorAll(".testimonials-marquee-track"));
    if (!tracks.length) return () => {};

    tracks.forEach((track) => {
      if (track.dataset.infinitePrepared === "true") return;
      const marquee = track.closest(".testimonials-marquee");
      const originalCards = Array.from(track.children);
      if (!originalCards.length) return;

      const group = document.createElement("div");
      group.className = "testimonials-marquee-group";
      originalCards.forEach((card) => group.appendChild(card));
      track.appendChild(group);

      const marqueeWidth = marquee?.clientWidth ?? 0;
      if (marqueeWidth > 0) {
        const baseCards = Array.from(group.children);
        let safety = 0;
        while (group.scrollWidth < marqueeWidth && safety < 50) {
          baseCards.forEach((card) => {
            const clone = card.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            group.appendChild(clone);
          });
          safety += 1;
        }
      }

      const groupClone = group.cloneNode(true);
      groupClone.setAttribute("aria-hidden", "true");
      track.appendChild(groupClone);

      track.dataset.infinitePrepared = "true";
    });

    return () => {};
  }

  function initStaggerReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {};
    }

    const parentSections = Array.from(document.querySelectorAll("main > section")).slice(0, 2);
    if (!parentSections.length) return () => {};

    const revealSelectorFirstSection = [
      ".section-name",
      ".section-title",
      ".gradient-title",
      ".gradient_cl-title",
      ".section-description",
      ".content-text",
      ".card",
      ".features-cart",
      ".f-slider-mobile-item",
      ".progress-cart",
      ".how-to-start-card",
      ".automatisation-card",
      ".testimonial-card",
      ".pricing-card",
      ".download-app-card",
      ".try-button",
      ".download-button",
      ".image-wrp",
      ".content-right-image-wrp img",
      ".progress-cart-image img",
      ".automatisation-card-image img",
      ".how-to-start-card img",
      ".download-app-card img",
    ].join(", ");

    const revealSelectorSecondSectionTitlesOnly = [
      ".section-name",
      ".section-title",
      ".gradient-title",
      ".gradient_cl-title",
      ".section-description",
    ].join(", ");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const parent = entry.target;
          parent.classList.add("is-visible");
          observer.unobserve(parent);
        });
      },
      {
        threshold: 0,
        rootMargin: "0px 0px 35% 0px",
      }
    );

    parentSections.forEach((section, sectionIndex) => {
      section.classList.add("stagger-parent");
      const selector =
        sectionIndex === 0 ? revealSelectorFirstSection : revealSelectorSecondSectionTitlesOnly;
      const rawItems = Array.from(section.querySelectorAll(selector));
      const seen = new Set();
      const items = rawItems.filter((item) => {
        if (seen.has(item)) return false;
        if (sectionIndex === 0) {
          const inScrollSync = item.closest("[data-f-slider-scroll-sync]");
          const inMobileStack = item.closest(".f-slider-mobile-layout");
          if (inScrollSync && !inMobileStack) return false;
        }
        seen.add(item);
        return true;
      });

      items.forEach((item, index) => {
        item.classList.add("stagger-item");
        item.style.setProperty("--i", String(index));
      });

      if (sectionIndex === 0 && section.classList.contains("hero")) {
        const heroTitle = section.querySelector(".section-title");
        const heroImageWrp = section.querySelector(".image-wrp");
        if (heroTitle && heroImageWrp) {
          const titleIdx = items.indexOf(heroTitle);
          if (titleIdx >= 0) {
            heroImageWrp.style.setProperty("--i", String(titleIdx));
          }
        }
      }

      observer.observe(section);
    });

    return () => observer.disconnect();
  }

  let teardownMainModules = () => {};

  function initMainModules() {
    teardownMainModules();

    const cleanups = [];
    initFSliderAccordion();

    const cleanupScrollSync = initFSliderScrollSync();
    if (typeof cleanupScrollSync === "function") cleanups.push(cleanupScrollSync);

    const cleanupScrollToDownload = initScrollToDownloadApp();
    if (typeof cleanupScrollToDownload === "function") cleanups.push(cleanupScrollToDownload);

    initTestimonialsMarquee();
    const cleanupStagger = initStaggerReveal();
    if (typeof cleanupStagger === "function") cleanups.push(cleanupStagger);

    teardownMainModules = () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
        }
      });
    };
  }

  function getLandingFromPath(pathname) {
    const path = pathname.replace(/\/index\.html$/i, "");
    if (/\/for-clients\/?$/i.test(path)) return "client";
    if (path === "" || path === "/" || /\/coach\/?$/i.test(path)) return "coach";
    return null;
  }

  function syncBodyPageClass(doc) {
    const body = document.body;
    const incoming = doc.body;
    if (!incoming) return;
    body.classList.toggle("page-client", incoming.classList.contains("page-client"));
    body.classList.toggle("page-coach", incoming.classList.contains("page-coach"));
    body.classList.remove("nav-open");
  }

  function syncHeaderDownloadButtonTheme(doc) {
    const incoming = doc.body;
    if (!incoming) return;
    const isClientTheme = incoming.classList.contains("page-client");
    document.querySelectorAll("header .download-button").forEach((button) => {
      button.classList.toggle("btn-cl", isClientTheme);
      button.classList.toggle("btn", !isClientTheme);
    });
  }

  async function swapLandingMain(url, { push = true } = {}) {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nextMain = doc.querySelector("main");
    const currentMain = document.querySelector("main");
    if (!nextMain || !currentMain) throw new Error("Main not found");

    currentMain.replaceWith(nextMain);
    syncBodyPageClass(doc);
    syncHeaderDownloadButtonTheme(doc);
    if (doc.title) document.title = doc.title;

    if (push) {
      window.history.pushState({ sfLandingSwap: true }, "", url);
    }

    if (lastAppliedDictionary) applyTranslations(lastAppliedDictionary);
    paintActiveLandingNav();
    initMainModules();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function initLandingInstantNavigation() {
    let isNavigating = false;

    document.addEventListener("click", async (event) => {
      const link = event.target.closest("a.landing-link[data-landing]");
      if (!link || link.closest("footer")) return;

      const landing = link.dataset.landing;
      if (landing !== "coach" && landing !== "client") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;
      if (isNavigating) return;
      event.preventDefault();

      const href = link.getAttribute("href");
      if (!href) return;
      const nextUrl = new URL(href, window.location.href);
      const currentLanding = getLandingFromPath(window.location.pathname);
      const nextLanding = getLandingFromPath(nextUrl.pathname);
      if (!nextLanding || currentLanding === nextLanding) return;

      isNavigating = true;
      try {
        await swapLandingMain(nextUrl.href, { push: true });
      } catch {
        window.location.href = nextUrl.href;
      } finally {
        isNavigating = false;
      }
    });

    window.addEventListener("popstate", async () => {
      const landing = getLandingFromPath(window.location.pathname);
      if (!landing) return;
      try {
        await swapLandingMain(window.location.href, { push: false });
      } catch {
      }
    });
  }

  function bootLandingInteractions() {
    initMainModules();
    initLandingInstantNavigation();

    languageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const lang = button.dataset.lang;
        if (!lang) return;
        setLanguage(lang).then(() => {
          initTestimonialsMarquee();
        });
      });

      button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const lang = button.dataset.lang;
        if (!lang) return;
        setLanguage(lang).then(() => {
          initTestimonialsMarquee();
        });
      });
    });

    initMobileNav();

    setLanguage(currentLanguage)
      .then(() => {
        initTestimonialsMarquee();
      })
      .catch(() => {
        initTestimonialsMarquee();
      });
  }

  currentLanguage = detectInitialLanguage();
  bootLandingInteractions();
})();
