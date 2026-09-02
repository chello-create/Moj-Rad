const menu = document.querySelector('#main-menu');
const menuToggle = document.querySelector('#menu-toggle');
const menuClose = document.querySelector('#menu-close');
const menuBackdrop = document.querySelector('#menu-backdrop');

function setMenuOpen(isOpen) {
  menu.hidden = !isOpen;
  menuBackdrop.hidden = !isOpen;
  menuToggle.setAttribute('aria-expanded', String(isOpen));

  if (isOpen) {
    menuClose.focus();
  } else {
    menuToggle.focus();
  }
}

menuToggle.addEventListener('click', () => setMenuOpen(true));
menuClose.addEventListener('click', () => setMenuOpen(false));
menuBackdrop.addEventListener('click', () => setMenuOpen(false));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) {
    setMenuOpen(false);
  }
});
