import Script from 'next/script'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/config'

/**
 * Pagefind (and some other libs) pick language by reading <html lang="..."> at runtime.
 * Our docs are locale-prefixed (e.g. /en-US/*, /zh-CN/*), so we sync <html lang>
 * as early as possible based on the first path segment.
 */
export function HtmlLangSyncScript() {
  const supportedLiteral = JSON.stringify(SUPPORTED_LOCALES)
  const defaultLocaleLiteral = DEFAULT_LOCALE

  return (
    <Script id="softa-html-lang-sync" strategy="beforeInteractive">
      {`
;(function () {
  try {
    var path = (location && location.pathname) ? location.pathname : "/";
    var first = path.replace(/^\\/+/, "").split("/")[0] || "";
    var supported = ${supportedLiteral};
    var defaultLocale = "${defaultLocaleLiteral}";

    var locale = null;
    for (var i = 0; i < supported.length; i++) {
      if (String(supported[i]).toLowerCase() === String(first).toLowerCase()) {
        locale = supported[i];
        break;
      }
    }
    if (!locale) {
      var base = String(first).toLowerCase().split("-")[0];
      for (var j = 0; j < supported.length; j++) {
        if (String(supported[j]).toLowerCase().split("-")[0] === base) {
          locale = supported[j];
          break;
        }
      }
    }
    if (!locale) locale = defaultLocale;

    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("data-softa-locale", locale);
  } catch (e) {}
})();
      `}
    </Script>
  )
}
