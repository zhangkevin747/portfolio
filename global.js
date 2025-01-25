let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'resume/index.html', title: 'Resume' },
    { url: 'https://github.com/zhangkevin747', title: 'Github' },
    { url: 'contact/index.html', title: 'Contact Me' },
  ];
  
  let nav = document.createElement('nav');
  document.body.prepend(nav);
  
  for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    // // Determine if the current page is served from a subdirectory
    // const IS_SUBDIRECTORY = location.pathname.split('/').length > 2;
  
    // // Adjust URL for internal links
    // if (!url.startsWith('http') && IS_SUBDIRECTORY) {
    //   url = '../' + url;
    // }
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
  
    // Highlight the current page link
    if (new URL(a.href, location.origin).pathname === location.pathname) {
      a.classList.add('current');
    }
    
    nav.append(a);
  }
  
// Function to set the color scheme
function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
  }
  
  // Add the switcher
  document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select id="theme-switcher">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );
  
  // Load saved preference or default to "light dark"
  const savedColorScheme = localStorage.getItem('colorScheme') || 'light dark';
  document.getElementById('theme-switcher').value = savedColorScheme;
  setColorScheme(savedColorScheme);
  
  // Add listener to the dropdown
  document.getElementById('theme-switcher').addEventListener('input', (event) => {
    const selectedScheme = event.target.value;
    setColorScheme(selectedScheme);
    localStorage.setItem('colorScheme', selectedScheme); // Save to localStorage
  });
  
  