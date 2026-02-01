import { DEFAULT_LOCALE } from '../_utils/locales'

function escapeJsStringLiteral(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function LocaleRedirectScript({ originalPathname }: { originalPathname: string }) {
  const path = originalPathname || '/'
  const pathLiteral = escapeJsStringLiteral(path)
  const defaultLocaleLiteral = escapeJsStringLiteral(DEFAULT_LOCALE)

  // Inline script runs immediately on static HTML load (no React hydration needed).
  const js = `(function(){
  function normalizeLocale(input){
    if(!input) return null;
    if(input === 'en-US' || input === 'zh-CN') return input;
    var base = String(input).toLowerCase().split('-')[0];
    if(base === 'zh') return 'zh-CN';
    if(base === 'en') return 'en-US';
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
    return '${defaultLocaleLiteral}';
  }
  function persist(locale){
    var maxAge = 60 * 60 * 24 * 365;
    document.cookie = 'SOFTA_LOCALE=' + encodeURIComponent(locale) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax';
  }

  var locale = detect();
  persist(locale);

  var basePath = '${pathLiteral}';
  var path = (basePath === '/' ? '' : basePath);
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
          <li>
            <a href={`/en-US${path === '/' ? '' : path}`}>English</a>
          </li>
          <li>
            <a href={`/zh-CN${path === '/' ? '' : path}`}>简体中文</a>
          </li>
        </ul>
      </noscript>
      <script dangerouslySetInnerHTML={{ __html: js }} />
    </main>
  )
}

