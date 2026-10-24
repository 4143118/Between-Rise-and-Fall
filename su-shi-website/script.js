const scenes = [...document.querySelectorAll('.scroll-scene')];
const progressBar = document.querySelector('.reading-progress div');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const range = (value, start, end) => clamp((value - start) / (end - start));

const mix = (start, end, amount) => start + (end - start) * amount;

const smooth = value => value * value * (3 - 2 * value);
const heroCopy = document.querySelector('.hero-copy');
const cue = document.querySelector('.scroll-cue');
const palaceCopy = document.querySelector('.palace-copy');
const rainCopy = document.querySelector('.rain-copy');
const rainImage = document.querySelector('.rain-image');
const letter = document.querySelector('.letter-image');
const secretCopy = document.querySelector('.secret-copy');
const endingCopy = document.querySelector('.ending-copy');

let scheduled = false;

function render() {
  scheduled = false;
  const viewport = window.innerHeight;

  const total = document.documentElement.scrollHeight - viewport;
  progressBar.style.transform = `scaleX(${total > 0 ? clamp(window.scrollY / total) : 0})`;

  if (reducedMotion.matches) return;

  scenes.forEach(section => {
    const rect = section.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > viewport) return;


    const p = clamp(-rect.top / Math.max(1, section.offsetHeight - viewport));

    if (section.classList.contains('hero')) {

      const titleProgress = smooth(range(p, .08, 1));
      heroCopy.style.transform = `translateY(${-titleProgress * 85}px) scale(${mix(1, .48, titleProgress)})`;

      heroCopy.style.opacity = 1 - smooth(range(p, .16, .98));
      cue.style.opacity = 1 - range(p, 0, .2);
    }
    if (section.classList.contains('journey')) {

      const first = range(p, 0, .42);
      palaceCopy.style.transform = `translateY(${mix(viewport * .94, -palaceCopy.offsetHeight - 40, first)}px)`;
      palaceCopy.style.opacity = 1 - range(p, .38, .44);

      const wipe = smooth(range(p, .35, .57));
      rainImage.style.clipPath = `inset(0 ${(1 - wipe) * 100}% 0 0)`;
      const second = range(p, .57, 1);
      rainCopy.style.transform = `translateY(${mix(viewport * .97, -rainCopy.offsetHeight - 30, second)}px)`;
      rainCopy.style.opacity = range(p, .54, .59);
    }
    if (section.classList.contains('secret')) {

      letter.style.transform = `scale(${mix(1, 1.2, p)})`;
      secretCopy.style.transform = `translateY(-50%) scale(${mix(.84, 1.06, p)})`;
    }
    if (section.classList.contains('ending')) {

      endingCopy.style.transform = `scale(${mix(.85, 1.07, p)})`;
    }
  });
}

function scheduleRender() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(render);
  }
}

window.addEventListener('scroll', scheduleRender, { passive: true });

window.addEventListener('resize', scheduleRender);
window.addEventListener('load', scheduleRender);
reducedMotion.addEventListener('change', scheduleRender);
document.fonts.ready.then(scheduleRender);
render();
