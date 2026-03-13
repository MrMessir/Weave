// Weave theme.js — backup apply after DOM ready (inline script handles FOUC prevention)
(function(){
  function applyAll(){
    try{
      var p=JSON.parse(localStorage.getItem('weave_prefs')||'{}');
      var t=p.theme||'light';
      document.body.classList.remove('light','amoled');
      if(t==='light')  document.body.classList.add('light');
      if(t==='amoled') document.body.classList.add('amoled');
      var ac={purple:{v:'#7C3AED',vl:'#A78BFA',vd:'#4C1D95',b:'#2563EB',bl:'#60A5FA'},pink:{v:'#DB2777',vl:'#F472B6',vd:'#831843',b:'#9333EA',bl:'#C084FC'},teal:{v:'#059669',vl:'#34D399',vd:'#064E3B',b:'#0EA5E9',bl:'#38BDF8'},orange:{v:'#D97706',vl:'#FBBF24',vd:'#78350F',b:'#DC2626',bl:'#F87171'},blue:{v:'#2563EB',vl:'#60A5FA',vd:'#1E3A8A',b:'#06B6D4',bl:'#22D3EE'},green:{v:'#16A34A',vl:'#4ADE80',vd:'#14532D',b:'#84CC16',bl:'#BEF264'},red:{v:'#DC2626',vl:'#F87171',vd:'#7F1D1D',b:'#F97316',bl:'#FDBA74'}};
      var a=ac[p.accent]||ac.purple;
      var r=document.documentElement;
      r.style.setProperty('--v',a.v);r.style.setProperty('--vl',a.vl);r.style.setProperty('--vd',a.vd);r.style.setProperty('--b',a.b);r.style.setProperty('--bl',a.bl);
      if(p.fontSize)document.body.style.fontSize=p.fontSize+'px';
    }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',applyAll);
  window.__weaveApplyTheme=applyAll;
})();
