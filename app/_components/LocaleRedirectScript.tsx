import { DEFAULT_LOCALE, ensureTrailingSlash, LOCALE_LABELS, SUPPORTED_LOCALES } from '../_utils/locales'

function escapeJsStringLiteral(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function LocaleRedirectScript({ originalPathname }: { originalPathname: string }) {
  const path = originalPathname || '/'
  const normalizedPath = ensureTrailingSlash(path)
  const pathLiteral = escapeJsStringLiteral(normalizedPath)
  const defaultLocaleLiteral = escapeJsStringLiteral(DEFAULT_LOCALE)
  const supportedLiteral = escapeJsStringLiteral(JSON.stringify(SUPPORTED_LOCALES))

  // Inline script runs immediately on static HTML load (no React hydration needed).
  const js = `(function(){
  var SUPPORTED = JSON.parse('${supportedLiteral}');
  var DEFAULT = '${defaultLocaleLiteral}';
  function normalizeLocale(input){
    if(!input) return null;
    var s = String(input).trim();
    if(!s) return null;
    s = s.replace(/_/g,'-');
    var lower = s.toLowerCase();
    for(var i=0;i<SUPPORTED.length;i++){
      if(String(SUPPORTED[i]).toLowerCase() === lower) return SUPPORTED[i];
    }
    var base = lower.split('-')[0];
    for(var j=0;j<SUPPORTED.length;j++){
      if(String(SUPPORTED[j]).toLowerCase().split('-')[0] === base) return SUPPORTED[j];
    }
    return null;
  }
  function readCookie(){
    var cookie = document.cookie || '';
    var m = cookie.match(/(?:^|;\\s*)(?:SOFTA_LOCALE|NEXT_LOCALE)=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function detect(){
    var fromCookie = normalizeLocale(readCookie());
    if(fromCookie) return fromCookie;
    var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for(var i=0;i<langs.length;i++){
      var l = normalizeLocale(langs[i]);
      if(l) return l;
    }
    return DEFAULT;
  }
  function persist(locale){
    var maxAge = 60 * 60 * 24 * 365;
    document.cookie = 'SOFTA_LOCALE=' + encodeURIComponent(locale) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax';
  }

  var locale = detect();
  persist(locale);

  var basePath = '${pathLiteral}';
  var path = basePath;
  var suffix = (location.search || '') + (location.hash || '');
  location.replace('/' + locale + path + suffix);
})();`

  return (
    <main style={{ padding: 24 }}>
      <p>Redirecting…</p>
      <noscript>
        <p>
          JavaScript is required for automatic locale routing on static hosting. Please choose a
          language:
        </p>
        <ul>
          {SUPPORTED_LOCALES.map((l) => (
            <li key={l}>
              <a href={`/${l}${normalizedPath}`}>{LOCALE_LABELS[l] || l}</a>
            </li>
          ))}
        </ul>
      </noscript>
      <script dangerouslySetInnerHTML={{ __html: js }} />
    </main>
  )
}
