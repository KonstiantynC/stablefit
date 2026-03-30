(() => {
  const DEFAULT_LANG = "ua";
  const SUPPORTED_LANGS = ["ua", "en"];
  const LANGUAGE_STORAGE_KEY = "stablefit-language";
  const LANDING_STORAGE_KEY = "stablefit-landing";
  const LANDING_BY_PATH = {
    "/coach.html": "coach",
    "/client.html": "client"
  };
  const LANDING_TO_PATH = {
    coach: "/coach.html",
    client: "/client.html"
  };

  const languageButtons = Array.from(document.querySelectorAll(".localisation-item[data-lang]"));
  const landingLinks = Array.from(document.querySelectorAll(".landing-link[data-landing]"));
  const htmlNode = document.documentElement;
  const mainNode = document.querySelector("main");
  const footerNode = document.querySelector("footer");
  const titleNode = document.querySelector("title");

  const dictionaries = {};
  const landingMarkupCache = {};
  let currentLanguage = DEFAULT_LANG;
  let currentLanding = "coach";

  function getNestedValue(object, keyPath) {
    return keyPath.split(".").reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), object);
  }

  async function loadDictionary(lang) {
    if (dictionaries[lang]) return dictionaries[lang];

    const response = await fetch(`/locales/${lang}.json`);
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

  function paintActiveLanding(landing) {
    landingLinks.forEach((link) => {
      const isActive = link.dataset.landing === landing;
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
  }

  async function setLanguage(lang) {
    const normalizedLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;

    try {
      const dictionary = await loadDictionary(normalizedLang);
      applyTranslations(dictionary);
      paintActiveLanguage(normalizedLang);
      htmlNode.setAttribute("lang", normalizedLang);
      currentLanguage = normalizedLang;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLang);
    } catch (error) {
      // Keep UI stable if locale file loading fails.
      console.error(error);
    }
  }

  function detectInitialLanguage(preferredLanguage) {
    if (preferredLanguage && SUPPORTED_LANGS.includes(preferredLanguage)) {
      return preferredLanguage;
    }

    const fromStorage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (fromStorage && SUPPORTED_LANGS.includes(fromStorage)) {
      return fromStorage;
    }

    const browserLang = navigator.language ? navigator.language.slice(0, 2).toLowerCase() : DEFAULT_LANG;
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
  }

  function normalizeLanding(landing) {
    return landing in LANDING_TO_PATH ? landing : "coach";
  }

  function detectLandingFromPath(pathname) {
    return LANDING_BY_PATH[pathname] || null;
  }

  function detectInitialLanding() {
    const fromPath = detectLandingFromPath(window.location.pathname);
    if (fromPath) return fromPath;

    const fromStorage = localStorage.getItem(LANDING_STORAGE_KEY);
    return normalizeLanding(fromStorage || "coach");
  }

  async function loadLandingMarkup(landing) {
    const normalizedLanding = normalizeLanding(landing);
    if (landingMarkupCache[normalizedLanding]) {
      return landingMarkupCache[normalizedLanding];
    }

    const path = LANDING_TO_PATH[normalizedLanding];
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load landing ${normalizedLanding}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const payload = {
      main: doc.querySelector("main") ? doc.querySelector("main").innerHTML : "",
      footer: doc.querySelector("footer") ? doc.querySelector("footer").innerHTML : "",
      title: doc.querySelector("title") ? doc.querySelector("title").textContent : ""
    };

    landingMarkupCache[normalizedLanding] = payload;
    return payload;
  }

  async function setLanding(landing, options = {}) {
    const normalizedLanding = normalizeLanding(landing);
    const { pushHistory = false } = options;

    try {
      const payload = await loadLandingMarkup(normalizedLanding);

      if (mainNode) {
        mainNode.innerHTML = payload.main;
      }

      if (footerNode) {
        footerNode.innerHTML = payload.footer;
      }

      if (titleNode && payload.title) {
        titleNode.textContent = payload.title;
      }

      currentLanding = normalizedLanding;
      paintActiveLanding(normalizedLanding);
      localStorage.setItem(LANDING_STORAGE_KEY, normalizedLanding);

      if (pushHistory) {
        const targetPath = LANDING_TO_PATH[normalizedLanding];
        window.history.pushState({ landing: normalizedLanding }, "", targetPath);
      }

      await setLanguage(currentLanguage);
    } catch (error) {
      console.error(error);
    }
  }

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang;
      if (!lang) return;
      setLanguage(lang);
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const lang = button.dataset.lang;
      if (!lang) return;
      setLanguage(lang);
    });
  });

  landingLinks.forEach((link) => {
    const activateLink = (event) => {
      event.preventDefault();
      const landing = link.dataset.landing;
      if (!landing || landing === currentLanding) return;
      setLanding(landing, { pushHistory: true });
    };

    link.addEventListener("click", activateLink);
    link.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      activateLink(event);
    });
  });

  window.addEventListener("popstate", () => {
    const nextLanding = detectLandingFromPath(window.location.pathname) || currentLanding;
    setLanding(nextLanding);
  });

  currentLanguage = detectInitialLanguage();
  const initialLanding = detectInitialLanding();
  setLanding(initialLanding);
})();
