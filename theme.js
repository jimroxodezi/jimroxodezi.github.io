// Theme switcher — loaded in <head> so the saved theme applies before first paint.
(function(){
  var root = document.documentElement;

  function saved(){ try{ return localStorage.getItem('theme'); }catch(e){ return null; } }
  function save(v){ try{ localStorage.setItem('theme', v); }catch(e){} }
  function isLight(){ return root.getAttribute('data-theme') === 'light'; }

  if(saved() === 'light') root.setAttribute('data-theme', 'light');

  function init(){
    var btn = document.getElementById('theme-toggle');
    if(!btn) return;

    function render(){
      // Label shows the mode the button switches TO.
      btn.textContent = isLight() ? 'dark' : 'light';
      btn.setAttribute('aria-label', isLight() ? 'Switch to dark mode' : 'Switch to light mode');
    }

    btn.addEventListener('click', function(){
      if(isLight()){
        root.removeAttribute('data-theme');
        save('dark');
      }else{
        root.setAttribute('data-theme', 'light');
        save('light');
      }
      render();
    });

    render();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
