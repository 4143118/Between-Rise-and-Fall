//Pages
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

//Sounds
const storySoundFiles = {
  sea:   { file: "sea.wav",   volume: 0.22 },
  rain:  { file: "rain.wav",  volume: 0.25 },
  birds: { file: "bird.wav",  volume: 0.08 },
  fire:  { file: "fire.wav",  volume: 0.16 },
  paper: { file: "paper.wav", volume: 0.20 }
};

let storyAudioContext;
let storyAudioLoading = false;
let storyPaperPlayed = false;
let storySoundFramePending = false;

const storySounds = {};

const storySoundScenes = [
  { name: "hero", element: document.querySelector(".hero") },
  { name: "journey", element: document.querySelector(".journey") },
  { name: "exile", element: document.querySelector(".exile") },
  { name: "hainan", element: document.querySelector(".hainan") },
  { name: "taste", element: document.querySelector(".first-taste") },
  { name: "secret", element: document.querySelector(".secret") },
  { name: "ending", element: document.querySelector(".ending") }
];

function storySoundClamp(value) {
  return Math.max(0, Math.min(1, value));
}

function storySoundRange(value, start, end) {
  return storySoundClamp((value - start) / (end - start));
}

async function startStoryAudio(event) {

  if (
      event.type === "keydown" &&
      ["Shift", "Control", "Alt", "Meta"].includes(event.key)
  ) {
    return;
  }

  const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    if (!storyAudioContext) {
      storyAudioContext = new AudioContextClass();
    }

    await storyAudioContext.resume();
  } catch {
    return;
  }

  if (storyAudioLoading) {
    updateStoryAudio();
    return;
  }

  storyAudioLoading = true;

  await Promise.all(
      Object.entries(storySoundFiles).map(async ([name, settings]) => {
        try {
          const response = await fetch(`assets/${settings.file}`);

          if (!response.ok) return;

          const fileData = await response.arrayBuffer();

          const buffer =
              await storyAudioContext.decodeAudioData(fileData);


          const gain = storyAudioContext.createGain();
          gain.gain.value = 0;
          gain.connect(storyAudioContext.destination);

          storySounds[name] = {
            buffer,
            gain,
            targetVolume: 0
          };

          if (name !== "paper") {
            const source =
                storyAudioContext.createBufferSource();

            source.buffer = buffer;
            source.loop = true;
            source.connect(gain);
            source.start();

            storySounds[name].source = source;
          }

          updateStoryAudio();
        } catch {
        }
      })
  );
}

function setStorySoundVolume(name, amount, seconds = 0.8) {
  const sound = storySounds[name];

  if (!sound || !storyAudioContext) return;

  const targetVolume =
      storySoundFiles[name].volume * storySoundClamp(amount);

  if (Math.abs(sound.targetVolume - targetVolume) < 0.0001) {
    return;
  }

  sound.targetVolume = targetVolume;

  sound.gain.gain.setTargetAtTime(
      targetVolume,
      storyAudioContext.currentTime,
      seconds
  );
}

function playStoryPaper() {
  const sound = storySounds.paper;

  if (!sound || storyPaperPlayed) return;

  storyPaperPlayed = true;

  const source = storyAudioContext.createBufferSource();
  source.buffer = sound.buffer;
  source.connect(sound.gain);

  sound.gain.gain.setValueAtTime(
      storySoundFiles.paper.volume,
      storyAudioContext.currentTime
  );

  source.start();

  source.onended = () => source.disconnect();
}


function updateStoryAudio() {
  if (
      !storyAudioContext ||
      storyAudioContext.state !== "running"
  ) {
    return;
  }

  const screenMiddle = window.innerHeight * 0.5;

  const current = storySoundScenes.find(scene => {
    if (!scene.element) return false;

    const rect = scene.element.getBoundingClientRect();

    return (
        rect.top <= screenMiddle &&
        rect.bottom > screenMiddle
    );
  });

  const levels = {
    sea: 0,
    rain: 0,
    birds: 0,
    fire: 0
  };

  if (current) {

    if (current.name === "hero") {
      levels.sea = 1;
    }

    if (current.name === "journey") {
      const rect = current.element.getBoundingClientRect();

      const progress = storySoundClamp(
          -rect.top /
          Math.max(
              1,
              current.element.offsetHeight - window.innerHeight
          )
      );

      const rainStart = 0.35;
      const rainEnd = 0.57;


      levels.sea =
          0.25 * (1 - storySoundRange(progress, 0, 0.20));

      levels.rain =
          storySoundRange(progress, rainStart - 0.10, rainEnd);
    }


    if (current.name === "exile") {
      levels.rain = 0.25;
    }

    if (current.name === "hainan") {
      levels.sea = 0.75;
      levels.birds = 1;
    }

    if (current.name === "taste") {
      levels.sea = 0.15;
      levels.fire = 0.75;
    }

    if (current.name === "secret") {
      levels.fire = 0.30;
      playStoryPaper();
    }

    if (current.name === "ending") {
      levels.fire = 1;
      levels.sea = 0.12;
    }
  }

  Object.entries(levels).forEach(([name, amount]) => {
    setStorySoundVolume(name, amount);
  });
}
window.addEventListener("pointerdown", startStoryAudio, {
  passive: true
});

window.addEventListener("keydown", startStoryAudio);


function scheduleStorySoundUpdate() {
  if (storySoundFramePending) return;

  storySoundFramePending = true;

  requestAnimationFrame(() => {
    storySoundFramePending = false;
    updateStoryAudio();
  });
}

window.addEventListener("scroll", scheduleStorySoundUpdate, {
  passive: true
});

window.addEventListener("resize", scheduleStorySoundUpdate);
window.addEventListener("load", scheduleStorySoundUpdate);

document.addEventListener("visibilitychange", async () => {
  if (!storyAudioContext) return;

  try {
    if (document.hidden) {
      await storyAudioContext.suspend();
    } else {
      await storyAudioContext.resume();
      updateStoryAudio();
    }
  } catch {
  }
});