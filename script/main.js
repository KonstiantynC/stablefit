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
    const isCoach =
      /\/coach\/?$/i.test(path) ||
      /\/coach\.html$/i.test(path) ||
      /coach\.html$/i.test(window.location.pathname);
    const isClient =
      /\/client\/?$/i.test(path) ||
      /\/client\.html$/i.test(path) ||
      /client\.html$/i.test(window.location.pathname);

    document.querySelectorAll(".landing-link[data-landing]").forEach((link) => {
      const landing = link.dataset.landing;
      const isActive = (landing === "coach" && isCoach) || (landing === "client" && isClient);
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

  currentLanguage = detectInitialLanguage();
  setLanguage(currentLanguage);
})();
