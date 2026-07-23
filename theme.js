// Theme switcher — loaded in <head> so the saved theme applies before first paint.
(function(){
  if(localStorage.getItem('theme') === 'light'){
    document.documentElement.dataset.theme = 'light';
  }

  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;

    function render(){
      const light = document.documentElement.dataset.theme === 'light';
      btn.textContent = light ? '☾' : '☀';
      btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    }

    btn.addEventListener('click', function(){
      const light = document.documentElement.dataset.theme === 'light';
      if(light){
        delete document.documentElement.dataset.theme;
        localStorage.setItem('theme', 'dark');
      }else{
        document.documentElement.dataset.theme = 'light';
        localStorage.setItem('theme', 'light');
      }
      render();
    });

    render();
  });
})();
