document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',()=>{
    if(a.origin===location.origin && !a.hash){document.body.style.opacity='.72'}
  }));
});
