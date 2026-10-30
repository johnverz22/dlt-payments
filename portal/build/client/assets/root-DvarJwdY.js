import{w as a,e as n,u as i,j as e,M as c,L as m,S as l,O as h,f as p,i as d}from"./jsx-runtime-DRCE_Dd4.js";import{S as u}from"./button-DU045ZXN.js";import{T as f}from"./toast-j7UMTXsr.js";import{N as g,S as s}from"./error-page-BCe3lez3.js";import"./index-H2aAfvIM.js";import"./index-CyCGn7r-.js";import"./index-CfvV8Wc8.js";import"./x--cczURrU.js";import"./index-CQTAfmns.js";import"./info-FwM2iSpZ.js";import"./clock-DZYawGTz.js";import"./shield-alert-CrEh_Y1B.js";import"./refresh-cw-DxMB9lqJ.js";const N=()=>[{rel:"icon",href:"/favicon.ico",sizes:"any"},{rel:"icon",href:"/favicon-32x32.png",type:"image/png",sizes:"32x32"},{rel:"icon",href:"/favicon-16x16.png",type:"image/png",sizes:"16x16"},{rel:"apple-touch-icon",href:"/apple-touch-icon.png"},{rel:"manifest",href:"/site.webmanifest"},{rel:"preconnect",href:"https://fonts.googleapis.com"},{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"},{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"}],y=`
(function(){
  function apply(theme){
    var dark = theme === 'dark' || (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
  try {
    var m = document.cookie.match(/(?:^|;)\\s*dlt-theme=(light|dark|system)/);
    var theme = m && m[1];
    if (!theme) {
      var legacy = null;
      try { legacy = localStorage.getItem('theme'); } catch(e) {}
      theme = (legacy === 'dark' || legacy === 'light') ? legacy : 'system';
      document.cookie = 'dlt-theme=' + theme + ';path=/;max-age=31536000;SameSite=Lax';
      try { localStorage.removeItem('theme'); } catch(e) {}
    }
    apply(theme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
      var mm = document.cookie.match(/(?:^|;)\\s*dlt-theme=(light|dark|system)/);
      if (!mm || mm[1] === 'system') apply('system');
    });
  } catch(e) {}
})();
`.trim();function O({children:o}){let t="";try{const r=i();r&&r.nonce&&(t=r.nonce)}catch{}return e.jsxs("html",{lang:"en",children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),e.jsx(c,{}),e.jsx(m,{}),e.jsx("script",{nonce:t||void 0,dangerouslySetInnerHTML:{__html:y}})]}),e.jsxs("body",{className:"font-sans antialiased",children:[o,e.jsx(u,{nonce:t||void 0}),e.jsx(l,{nonce:t||void 0})]})]})}const P=a(function(){return e.jsx(f,{children:e.jsx(h,{})})}),T=n(function(){const t=p();return d(t)?t.status===404?e.jsx(g,{}):t.status===401?e.jsx(s,{}):e.jsx(s,{}):e.jsx(s,{})});export{T as ErrorBoundary,O as Layout,P as default,N as links};
