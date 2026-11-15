export const REPO_URL = 'https://github.com/nc1b/Predict360';

export const DOWNLOAD_URL = `${REPO_URL}/releases/latest`;

export const MAC_DOWNLOAD_URL = `${REPO_URL}/releases/latest/download/Predict360-macOS.dmg`;

/** Front-page product video (generated with Arcade). Empty src hides the section. */
export const PROJECT_VIDEO = {
  src: '/overview.mp4',
  poster: '/overview-poster.png',
};

// Free-to-use Unsplash photos, shown in greyscale like the Iris Checks hero.
export const HERO_IMAGES = {
  dark: {
    src: 'https://images.unsplash.com/photo-1648757838556-2ca6ec323d55?w=2000&q=80&auto=format&fit=crop',
    alt: 'Two hands typing on a black keyboard in a dark room',
  },
  light: {
    src: 'https://images.unsplash.com/photo-1594398985750-3b54ec074a0a?w=2000&q=80&auto=format&fit=crop',
    alt: 'A person typing on a laptop, in black and white',
  },
};
