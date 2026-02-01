import Script from 'next/script'

/**
 * Pagefind (and some other libs) pick language by reading <html lang="..."> at runtime.
 * Our docs are locale-prefixed (e.g. /en-US/*, /zh-CN/*), so we sync <html lang>
 * as early as possible based on the first path segment.
 */
export function HtmlLangSyncScript() {
  return (
    <Script id="softa-html-lang-sync" strategy="beforeInteractive">
      {`
;(function () {
  try {
    var path = (location && location.pathname) ? location.pathname : "/";
    var first = path.replace(/^\\/+/, "").split("/")[0] || "";

    var locale = null;
    if (first === "en-US" || first === "zh-CN") {
      locale = first;
    } else {
      var base = String(first).toLowerCase().split("-")[0];
      if (base === "en") locale = "en-US";
      if (base === "zh") locale = "zh-CN";
    }
    if (!locale) locale = "en-US";

    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("data-softa-locale", locale);
  } catch (e) {}
})();
      `}
    </Script>
  )
}

