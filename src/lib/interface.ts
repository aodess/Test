import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

let opener: HTMLElement | null = null;
let scrollY = 0;
function openDialog(dialog: HTMLDialogElement, trigger: HTMLElement) {
  opener = trigger;
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('.dialog-close')?.focus();
}
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => {
  dialog.addEventListener('keydown', event => {
    if(event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex="0"]')].filter(el => !el.hasAttribute('disabled'));
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
  });
  dialog.addEventListener('close', () => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    opener?.focus({preventScroll:true});
  });
  dialog.querySelectorAll('button').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
});
document.querySelectorAll<HTMLAnchorElement>('[data-project]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const dialog = document.getElementById(`modal-${link.dataset.project}`) as HTMLDialogElement | null;
    if (!dialog?.showModal) return;
    event.preventDefault();
    openDialog(dialog, link);
  });
});
document.querySelector<HTMLButtonElement>('[data-contact-open]')?.addEventListener('click', event => {
  openDialog(document.getElementById('contact-dialog') as HTMLDialogElement, event.currentTarget as HTMLElement);
});

const media = gsap.matchMedia();
media.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.line-mask > span', { y:30, filter:'blur(7px)', opacity:0, stagger:0.12, duration:0.85, ease:'power3.out', clearProps:'all' });
  gsap.to('.hero-art', { y:26, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top',end:'bottom top',scrub:0.6} });
  gsap.fromTo('.work-section .section-heading', {y:24}, {y:0, ease:'none',scrollTrigger:{trigger:'.work-section',start:'top bottom',end:'top 62%',scrub:0.4}});
});
