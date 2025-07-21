const WHITE = [255, 255, 255, 1]
const BLACK = [0, 0, 0, 1]

// Cache for CSS color values to avoid repeated getComputedStyle calls
let colorCache = new Map()
let isCacheInitialized = false

// Known palette colors that can be cached
const PALETTE_COLORS = [
  'white', 'slate', 'infantry-blue',
  'red-dark', 'red-medium', 'red-light',
  'orange-dark', 'orange-medium', 'orange-light',
  'yellow-dark', 'yellow-medium', 'yellow-light',
  'green-dark', 'green-medium', 'green-light',
  'turquoise-dark', 'turquoise-medium', 'turquoise-light',
  'blue-dark', 'blue-medium', 'blue-light',
  'periwinkle-dark', 'periwinkle-medium', 'periwinkle-light',
  'purple-dark', 'purple-medium', 'purple-light',
  'fuchsia-dark', 'fuchsia-medium', 'fuchsia-light',
  'gray-darker', 'gray-dark', 'gray-medium', 'gray-light'
]

/**
 * Initialize the color cache by reading all palette colors once
 */
const initializeColorCache = () => {
  const computedStyle = window.getComputedStyle(document.body)

  PALETTE_COLORS.forEach(color => {
    const cssValue = computedStyle.getPropertyValue(`--palette-color-${color}`).trim()
    if (cssValue) {
      colorCache.set(color, cssValue)
    }
  })

  isCacheInitialized = true
}

/**
 * Clear the color cache and force re-initialization
 */
const clearColorCache = () => {
  colorCache.clear()
  isCacheInitialized = false
}

/*
 * Receives an array of the rgb, returns a hex value
 */
const rgbToHex = rgb => {
  const integer = ((Math.round(rgb[0]) & 0xFF) << 16)
    + ((Math.round(rgb[1]) & 0xFF) << 8)
    + (Math.round(rgb[2]) & 0xFF);

  const string = integer.toString(16).toLowerCase()
  return '#' + '000000'.substring(string.length) + string
}

/*
 * Receives a hex string, returns an array of the rgba
 */
const hexToRgba = hex => {
  const match = hex.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i)

  if (!match) {
    return [0, 0, 0]
  }

  let string = match[0]

  if (match[0].length === 3) {
    string = string.split('').map(char => char + char).join('')
  }

  let integer = parseInt(string, 16)
    , r = (integer >> 16) & 0xFF
    , g = (integer >> 8) & 0xFF
    , b = integer & 0xFF

  return [r, g, b, 1]
}

/*
 * Receives a string color, either hex or rgba and returns an object
 * describing the original color type and the rgba array
 */
const getColor = color => {
  let rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)$/)
    , rgbaToString = ar => `rgba(${rgba.join(',')})`

  if (rgba) {
    rgba = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4]) || 1]
    return {
      type: 'rgba',
      color,
      rgba,
      rgbaString: rgbaToString(rgba)
    }
  } else {
    rgba = hexToRgba(color)
    return {
      type: 'hex',
      color,
      rgba,
      rgbaString: rgbaToString(rgba)
    }
  }
}

/*
 * Receives a named palette color and returns the color object from `getColor`
 */
export const lookup = color => {
  if (!isCacheInitialized) {
    initializeColorCache()
  }

  const cachedColor = colorCache.get(color) ||
    window.getComputedStyle(document.body).getPropertyValue(`--palette-color-${color}`).trim()

  return getColor(cachedColor)
}

/*
 * Returns a string indicating a `light` or `dark` text variation based on the
 * incoming color. The incoming color can be a rgba or hex string. The rgba
 * can have a defined alpha, or an `opacity` can be specified. If the color
 * is opaque, we mix true white w/ the color before we determine its brightness.
 *
 * The brightness is defined by the equation specified:
 *   https://alienryderflex.com/hsp.html
 *
 * The threshold is used to determine if the color is "light" or "dark". The
 * default threshold of .6 seems to work well for our defined palette colors.
 *
 * The general idea and rules of this logic came from the following writeup:
 * https://github.com/SpiderStrategies/Scoreboard/issues/52350#issuecomment-1483907870
 */
const getTextVariation = (color, opacity = 1, threshold = .6) => {
  let rgba = getColor(color).rgba

  if (rgba[3] !== 1) {
    opacity = rgba[3]
  }

  if (opacity !== 1) {
    // Mix white w/ the color
    let p = 1 - opacity
    rgba = mix(WHITE, rgba, p)
  }

  // From https://alienryderflex.com/hsp.html
  const red = 0.299
  const green = 0.587
  const blue = 0.114

  const contrast = Math.sqrt(
    red * (rgba[0] / 255) ** 2 +
    green * (rgba[1] / 255) ** 2 +
    blue * (rgba[2] / 255) ** 2)

  return contrast > threshold ? 'dark' : 'light'
}

/*
 * This adjusts the whiteness and saturation of a *hex* color to be used for gradients. After quite
 * a bit of trial and error, I found that mixing white for brightness and and black darkness works better
 * than calling scale-color on lightness. That's because some of the color like green became blown out
 * when getting lighter, and mixing black gives a smooth smokey color for darkness. We can't increase saturation
 * because that unintentionally colors grays.
 *
 * This function name matches photoshop.
 */
const adjustLightness = (colorString, whitenessAdjustment) => {
  let p = (whitenessAdjustment > 0 ? whitenessAdjustment : -1 * whitenessAdjustment) / 100
    , color = getColor(colorString)
    , mixin = whitenessAdjustment > 0 ? WHITE : BLACK
    , mixed = mix(mixin, color.rgba, p)

  if (color.type === 'rgba') {
    return `rgba(${mixed.join(', ')})`
  } else {
    // Convert back to hex
    return rgbToHex(mixed)
  }
}

/*
 * Receives a *hex* color and adjusts its alpha (opacity)
 */
const changeColor = (colorString, alpha = 1) => {
  let color = getColor(colorString)
  color.rgba[3] = alpha
  return `rgba(${color.rgba.join(', ')})`
}

/*
 * Mixes the `mixin` color with the incoming `color`.
 * Reverse engineered from libsass implementation:
 *   https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209-L228
 */
const mix = (mixin, color, p = .5 /* 50% default */) => {
  let w = 2 * p - 1
    , a = mixin[3] - color[3] // alpha
    , w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2
    , w2 = 1 - w1

  return [
    Math.round(w1 * mixin[0] + w2 * color[0]),
    Math.round(w1 * mixin[1] + w2 * color[1]),
    Math.round(w1 * mixin[2] + w2 * color[2]),
    mixin[3] * p + color[3] * (1 - p)
  ]
}


export {
  hexToRgba,
  rgbToHex,
  getColor,
  getTextVariation,
  adjustLightness,
  changeColor,
  mix,
  clearColorCache,
  BLACK,
  WHITE
}
