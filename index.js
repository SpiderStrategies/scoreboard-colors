// so SASS can find the .scss files
module.exports.includePaths = [ __dirname ]

const WHITE = [255, 255, 255, 1]
const BLACK = [0, 0, 0, 1]

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
  if (rgba) {
    return {
      type: 'rgba',
      color,
      rgba: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4]) || 1]
    }
  } else {
    return {
      type: 'hex',
      color,
      rgba: hexToRgba(color)
    }
  }
}

/*
 * This adjusts the whiteness and saturation of a *hex* color to be used for gradients. After quite
 * a bit of trial and error, I found that mixing white for brightness and and black darkness works better
 * than calling scale-color on lightness. That's because some of the color like green became blown out
 * when getting lighter, and mixing black gives a smooth smokey color for darkness. We can't increase saturation
 *because that unintentionally colors grays.
 */
module.exports.coloredBackgroundAdjust = (colorString, whitenessAdjustment) => {
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
module.exports.changeColor = (colorString, alpha = 1) => {
  let color = getColor(colorString)
  color.rgba[3] = alpha
  return `rgba(${color.rgba.join(', ')})`
}

/*
 * Mixes the `mixin` color with the incoming `color`.
 * Reverse engineered from libsass implementation:
 *   https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209-L228
 */
const mix = module.exports.mix = (mixin, color, p = .5 /* 50% default */) => {
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
