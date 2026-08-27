/* v15.0.0 compatibility shim: remove duplicated legacy/new filter-toggle listeners. */
(function(){
  const old=document.getElementById('mobileFilterToggle');
  const controls=document.querySelector('#m7SearchView .controls');
  if(!old||!controls||old.dataset.v15Isolated==='1')return;
  const clean=old.cloneNode(true);
  clean.dataset.v15Isolated='1';
  old.replaceWith(clean);
  clean.addEventListener('click',()=>{
    controls.classList.toggle('mobile-filters-open');
    clean.setAttribute('aria-expanded',controls.classList.contains('mobile-filters-open')?'true':'false');
  });
})();
