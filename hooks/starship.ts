import type { ThemeBackdropGlass, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Starship: a launch site on the coast, drawn smooth. A rocket stands by its tower, ignites,
// and climbs out of the top of the window on a violet flame while its plume boils up behind
// the tower; later its booster falls back in on the other side, brakes, and is caught in
// the arms of a second tower. Around it: stars and a moon (or a sun, clouds and birds by
// day), far hills, hangars and a tank farm, water with reflections, and reeds in the
// corners.

/**
 * Where the two flight lanes run. The backdrop can't tell whether the sidebar and the side
 * panel are open (it fills the whole window either way), so the person picks.
 * `panels`: in the strips right beside the conversation, in view with both panels open.
 * `wide`: out in the window's far margins, the rocket bigger, for when the panels are closed.
 */
export type Layout = 'panels' | 'wide'

export const LAYOUTS: readonly Layout[] = ['panels', 'wide']

/** One look the command can switch to. */
export type Look = {
  /** What you type after the command. */
  name: string
  /** One line for the command's list. */
  summary: string
  /** The window's palette, from makeColors. */
  colors: ThemeSetArgs['colors']
  /** The veil over the backdrop. */
  glass: ThemeBackdropGlass
  /** The backdrop for each layout: one SVG document that animates itself with CSS, sent once and never changed. */
  scenes: Record<Layout, string>
  /** What the backdrop shows, for a screen reader. */
  alt: string
  /** makeColors' contrast notes for this palette. */
  problems: readonly string[]
}

type Point = readonly [number, number]

// Plume cream by day and deep-water steel by night, with the sky's blue as the accent, the
// plume's orange as the warning and the engines' violet as pro.
const { theme, problems } = makeColors({
  label: 'Starship',
  roles: { accent: '#1e78d6', danger: '#d9482f', success: '#4f9a4a', warning: '#e08a2c', pro: '#a86bd6' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#efe7d8',
        'surface-1': '#f5eee1',
        'surface-2': '#faf6ec',
        'text-primary': '#16202c',
        'text-secondary': '#3a4756',
        'text-muted': '#566373',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0c1520',
        'surface-1': '#121d2a',
        'surface-2': '#182534',
        'surface-3': '#1d2b3c',
        'text-primary': '#f2ead9',
        'text-secondary': '#cdc8bb',
        'text-muted': '#a3a59f',
      },
    },
  },
})

/** A small, fixed sequence of pseudo-random numbers, so the scene looks the same each time. */
function seeded(seed: number): () => number {
  let s = seed

  return () => {
    s = (s * 1103515245 + 12345) % 2147483648

    return s / 2147483648
  }
}

/** Where the ground is, where the water begins, and one whole flight, launch to catch, in seconds. */
const PAD = 742
const SHORE = 784
const PERIOD = 60

type Stop = readonly [offset: number, colour: string, opacity?: number]

const stops = (list: readonly Stop[]) =>
  list.map(([offset, colour, opacity]) => `<stop offset="${offset}" stop-color="${colour}"${opacity === undefined ? '' : ` stop-opacity="${opacity}"`}/>`).join('')

// ---- the colours of one time of day ---------------------------------------------------

/** One puff's two flat colours, as a cartoon shades smoke: its body, and the rim of shadow along its underside. */
type Tones = readonly [body: string, rim: string]

/** Which of the three shadings a puff takes: 0 the brightest, 2 the darkest. */
type Tone = 0 | 1 | 2

type Palette = {
  isNight: boolean
  /** The sky, top to horizon. */
  sky: readonly Stop[]
  /** The moon or the sun, and the light round it. */
  orb: string
  halo: string
  /** Long thin clouds low in the sky. */
  streaks: readonly [string, string]
  /** The far hills and the nearer ones, the land, and the buildings on it. */
  hills: readonly [string, string]
  land: string
  site: string
  /** The water, shore to foot, its ripples, and the path of light under the moon or sun. */
  water: readonly Stop[]
  ripple: string
  glitter: string
  /** The towers: their steel, and their edge where the light catches it. */
  tower: readonly [string, string]
  /** The rocket's steel across its width, shadow to highlight to shadow. */
  steel: readonly Stop[]
  /** The lines of its welds and seams, its dark fittings, and the frost on its tanks. */
  seam: string
  trim: string
  frost: string
  puffs: readonly [Tones, Tones, Tones]
  /**
   * The shading of one puff: `depth` is 0 at the top of its bank and 1 at the foot, `near`
   * is 1 at the engines and 0 far from them, `jitter` is a random 0 to 1.
   */
  pick: (depth: number, near: number, jitter: number) => Tone
  /** The flash round the pad while the engines burn there. */
  flash: string
  /** The reeds in the corners: the near ones and the pale ones behind. */
  reeds: readonly [string, string]
}

// At dusk the engines light the plume: glowing at the pad, embers further out, cold blue far away.
const DUSK: Palette = {
  isNight: true,
  sky: [[0, '#040817'], [0.42, '#0a1838'], [0.7, '#22295a'], [0.86, '#463a66'], [0.96, '#7d4f66'], [1, '#b06f5e']],
  orb: '#f6edd4',
  halo: '#c9d6ff',
  streaks: ['#e88b6a', '#a8648c'],
  hills: ['#232a55', '#161c3c'],
  land: '#090e1f',
  site: '#0e142b',
  water: [[0, '#6a4a62'], [0.12, '#2c2a55'], [0.5, '#0d1530'], [1, '#050816']],
  ripple: '#b9c6ee',
  glitter: '#f6edd4',
  tower: ['#2a3560', '#7c8ec2'],
  steel: [[0, '#39455f'], [0.2, '#a9b5ca'], [0.36, '#eef2f8'], [0.62, '#93a0b8'], [1, '#333e57']],
  seam: '#0b1020',
  trim: '#131826',
  frost: '#ffffff',
  puffs: [
    ['#ffd9a0', '#ee9d5c'],
    ['#c98a62', '#935a4a'],
    ['#42537c', '#2a385c'],
  ],
  pick: (_depth, near, jitter) => {
    const lit = near * 1.15 + jitter * 0.1

    return lit > 0.8 ? 0 : lit > 0.42 ? 1 : 2
  },
  flash: '#ff9a4a',
  reeds: ['#03060d', '#111a33'],
}

// By day the sun lights it: white on top, cream beneath, orange in the folds near the pad.
const DAY: Palette = {
  isNight: false,
  sky: [[0, '#4f9fe8'], [0.5, '#8fc6f4'], [0.85, '#cfe6f8'], [1, '#f3e9d6']],
  orb: '#fffbe6',
  halo: '#fff3c4',
  streaks: ['#ffffff', '#ffffff'],
  hills: ['#9cc0dc', '#7fa98c'],
  land: '#6f8f4f',
  site: '#8a8f97',
  water: [[0, '#e6e3d6'], [0.12, '#a9d1f0'], [0.6, '#6fa9de'], [1, '#4a86c8']],
  ripple: '#ffffff',
  glitter: '#fffbe6',
  tower: ['#7a6a5b', '#c2b29e'],
  steel: [[0, '#768292'], [0.2, '#dfe5ec'], [0.36, '#ffffff'], [0.62, '#c3ccd7'], [1, '#737f90']],
  seam: '#3c4654',
  trim: '#2a2f38',
  frost: '#ffffff',
  puffs: [
    ['#ffffff', '#ecdcc0'],
    ['#f9e6c4', '#e6b980'],
    ['#f1c48c', '#d28f52'],
  ],
  pick: (depth, near, jitter) => {
    const t = depth * 0.75 + near * 0.35 + jitter * 0.25

    return t < 0.42 ? 0 : t < 0.8 ? 1 : 2
  },
  flash: '#fff1cf',
  reeds: ['#2c5527', '#5f8f4a'],
}

// ---- the plume ------------------------------------------------------------------------

/** A bank of cloud: puffs fill it from its `profile` (the top edge) down to `base`. */
type Bank = { seed: number; profile: readonly Point[]; base: number; r: readonly [number, number] }

type Puff = { x: number; y: number; r: number; tone: Tone }

/** The height of a bank's top edge at `x`. */
function topAt(profile: readonly Point[], x: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [x0, y0] = profile[i - 1]!
    const [x1, y1] = profile[i]!
    if (x <= x1) {
      return y0 + ((y1 - y0) * Math.max(0, x - x0)) / Math.max(1, x1 - x0)
    }
  }

  return profile.at(-1)![1]
}

/** The puffs of one bank, the highest first, so the lower ones billow over them; `engines` is where the light comes from. */
function puffsOf(bank: Bank, engines: Point, palette: Palette): Puff[] {
  const random = seeded(bank.seed)
  const [min, max] = bank.r
  const size = () => min + random() * (max - min)
  const out: Puff[] = []
  const end = bank.profile.at(-1)![0]
  for (let x = bank.profile[0]![0]; x <= end; ) {
    const top = topAt(bank.profile, x)
    const column = size()
    for (let y = top + column * 0.6; ; ) {
      const r = size()
      const depth = Math.min(1, (y - top) / Math.max(1, bank.base - top))
      const near = Math.max(0, 1 - Math.hypot(x - engines[0], y - engines[1]) / 650)
      out.push({ x: Math.round(x + (random() - 0.5) * r * 0.6), y: Math.round(y), r: Math.round(r), tone: palette.pick(depth, near, random()) })
      y += r * (0.7 + random() * 0.3)
      if (y > bank.base) break
    }
    x += column * (0.75 + random() * 0.3)
  }

  return out.sort((a, b) => a.y - b.y)
}

/**
 * Puffs drawn flat, as a cartoon draws smoke: each is a disc of its rim colour with a
 * slightly smaller disc of its body colour set up and to the left on it, which leaves a
 * crescent of shadow along its underside. No gradients, so nothing looks like a ball.
 */
const drawn = (puffs: readonly Puff[]) =>
  puffs
    .map(p => `<circle class="r${p.tone}" cx="${p.x}" cy="${p.y}" r="${p.r}"/><circle class="m${p.tone}" cx="${Math.round(p.x - p.r * 0.09)}" cy="${Math.round(p.y - p.r * 0.11)}" r="${Math.round(p.r * 0.87)}"/>`)
    .join('')

/** Some puffs in two halves that drift a little against each other, so the cloud works. */
const billowing = (puffs: readonly Puff[]) =>
  `<g class="bil1">${drawn(puffs.filter((_, i) => i % 2 === 0))}</g><g class="bil2">${drawn(puffs.filter((_, i) => i % 2 === 1))}</g>`

// ---- the rocket -----------------------------------------------------------------------
// Drawn with its engines at the origin and up as negative y: the booster is 196 tall and
// 34 wide, the ring between the stages 14, the ship 176 with its nose.

/** The booster: frosted steel with weld rings, a raceway, chines by the engines, grid fins at its top. */
function booster(palette: Palette): string {
  const { seam, trim } = palette
  const fin = (x: number) =>
    `<rect x="${x}" y="-191" width="18" height="13" rx="1.5" fill="${trim}"/>` +
    `<path d="M${x + 4.5} -191v13M${x + 9} -191v13M${x + 13.5} -191v13M${x} -186.7h18M${x} -182.3h18" stroke="#aab6ca" stroke-opacity=".55" stroke-width=".8"/>`

  return (
    // The engine bells under the skirt.
    [-11, 0, 11].map(x => `<path fill="${trim}" d="M${x - 4} -1L${x + 4} -1L${x + 6} 9L${x - 6} 9Z"/>`).join('') +
    fin(-35) + fin(17) +
    `<rect x="-17" y="-196" width="34" height="196" fill="url(#steel)"/>` +
    `<rect x="-17" y="-156" width="34" height="142" fill="url(#frost)"/>` +
    [-40, -66, -92, -118, -144, -170].map(y => `<path d="M-17 ${y}H17" stroke="${seam}" stroke-opacity=".2"/>`).join('') +
    `<path d="M7 -186V-20" stroke="${seam}" stroke-opacity=".28" stroke-width="1.6"/>` +
    // The pins the tower's arms catch it by, under the grid fins.
    `<rect x="-20" y="-176" width="3" height="5" rx="1" fill="${trim}"/><rect x="17" y="-176" width="3" height="5" rx="1" fill="${trim}"/>` +
    // The chines: raised strips either side, by the engines.
    `<path fill="url(#steel)" stroke="${seam}" stroke-opacity=".3" stroke-width=".6" d="M-17 -78C-21 -73 -21.5 -68 -21.5 -62V-12H-17Z"/>` +
    `<path fill="url(#steel)" stroke="${seam}" stroke-opacity=".3" stroke-width=".6" d="M17 -78C21 -73 21.5 -68 21.5 -62V-12H17Z"/>` +
    `<rect x="-17.5" y="-14" width="35" height="14" fill="${trim}"/><rect x="-17.5" y="-14" width="35" height="1.5" fill="#aab6ca" opacity=".5"/>`
  )
}

/** The ship: steel on one side, dark heat tiles on the other, four flaps, a vented ring beneath. */
function ship(palette: Palette): string {
  const { seam, trim } = palette
  const body = 'M-17 -210V-330C-17 -356 -9 -376 0 -386C9 -376 17 -356 17 -330V-210Z'
  const shield = 'M4 -383C11 -373 17 -355 17 -330V-210H-3V-328C-3 -350 0 -368 4 -383Z'

  return (
    // The flaps: steel on the near side, tiled on the far.
    `<path fill="url(#steel)" stroke="${seam}" stroke-opacity=".35" stroke-width=".6" d="M-17 -268C-25 -257 -34 -238 -34 -228V-214H-17Z"/>` +
    `<path fill="url(#tiles)" d="M17 -268C25 -257 34 -238 34 -228V-214H17Z"/>` +
    `<path fill="url(#steel)" stroke="${seam}" stroke-opacity=".35" stroke-width=".6" d="M-16 -354C-22 -346 -27 -334 -27 -326V-314H-17Z"/>` +
    `<path fill="url(#tiles)" d="M16 -354C22 -346 27 -334 27 -326V-314H17Z"/>` +
    `<path fill="url(#steel)" d="${body}"/>` +
    `<path fill="url(#tiles)" d="${shield}"/><path fill="url(#hex)" opacity=".55" d="${shield}"/>` +
    [-234, -258, -282, -306, -330].map(y => `<path d="M-17 ${y}H-3" stroke="${seam}" stroke-opacity=".22"/>`).join('') +
    // The payload door's seam, and a hinge line on each near flap.
    `<path d="M-13.5 -302V-272H-6.5V-302Z" fill="none" stroke="${seam}" stroke-opacity=".3" stroke-width=".8"/>` +
    `<path d="M-17 -262V-216M-17 -350V-316" stroke="${seam}" stroke-opacity=".45" stroke-width="1.2"/>` +
    `<path d="M-10 -338C-9 -354 -5 -369 -1 -379" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>` +
    // The ring between the stages, with its vents.
    `<rect x="-17.5" y="-210" width="35" height="14" fill="${trim}"/>` +
    [-14, -9, -4, 1, 6, 11].map(x => `<rect x="${x}" y="-206" width="3" height="6.5" rx="1" fill="#aab6ca" opacity=".55"/>`).join('')
  )
}

/**
 * The exhaust, `length` long from the engines down: a soft violet glow, a flame that
 * flickers between two shapes, a white core and shock diamonds. `className` times when
 * it shows.
 */
function exhaust(className: string, length: number): string {
  const l = (part: number) => Math.round(length * part)

  return (
    `<g class="${className}">` +
    `<ellipse cx="0" cy="${l(0.45)}" rx="36" ry="${l(0.55)}" fill="#9f7cf5" opacity=".38" filter="url(#soft)"/>` +
    `<g class="poseA"><path fill="url(#flame)" d="M-15 5C-21 ${l(0.35)} -14 ${l(0.75)} -3 ${length}L3 ${length}C14 ${l(0.75)} 21 ${l(0.35)} 15 5Z"/></g>` +
    `<g class="poseB"><path fill="url(#flame)" d="M-15 5C-18 ${l(0.3)} -18 ${l(0.7)} -6 ${l(0.93)}L6 ${l(0.93)}C18 ${l(0.7)} 18 ${l(0.3)} 15 5Z"/></g>` +
    `<path fill="#fff" opacity=".9" d="M-8 5C-9 ${l(0.3)} -5 ${l(0.55)} 0 ${l(0.68)}C5 ${l(0.55)} 9 ${l(0.3)} 8 5Z"/>` +
    [[0.2, 7, 4], [0.36, 5.5, 3.4], [0.5, 4, 3]].map(([at, rx, ry]) => `<ellipse cx="0" cy="${l(at!)}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".85"/>`).join('') +
    `<ellipse cx="0" cy="6" rx="17" ry="6" fill="#fff6e0" opacity=".95"/>` +
    '</g>'
  )
}

/** The engines' own light on the booster's skirt and lower tank, while they burn: `className` times it, as the exhaust's. */
const underglow = (className: string) => `<rect class="${className}" x="-17.5" y="-110" width="35" height="110" fill="url(#under)"/>`

/** How long the exhaust is at full thrust, and on the landing burn. */
const BURN = 250
const BRAKE = 130

// ---- the towers and the site ----------------------------------------------------------

/**
 * A launch tower, drawn with its foot at the origin and 400 tall: a braced lattice under a
 * cap with a jib and a lightning rod, a beacon on top, two catching arms reaching right at
 * 258 up, and lamps down its side at night. `hasFuelArm` adds the short arm that fuels the
 * ship on the pad.
 */
function tower(palette: Palette, hasFuelArm: boolean): string {
  const [steel, edge] = palette.tower
  const braces = Array.from({ length: 10 }, (_, k) => `M-18 ${-40 * k}L18 ${-40 * (k + 1)}M18 ${-40 * k}L-18 ${-40 * (k + 1)}M-18 ${-40 * (k + 1)}H18`).join('')
  const lamps = palette.isNight
    ? [-120, -210, -384].map(y => `<circle cx="22" cy="${y}" r="13" fill="#ffe2a8" opacity=".3" filter="url(#soft)"/><circle cx="22" cy="${y}" r="2.6" fill="#fff2cf"/>`).join('')
    : ''

  return (
    `<rect x="-18" y="-400" width="36" height="400" fill="${steel}" opacity=".5"/>` +
    `<path d="M-18 0V-400M18 0V-400${braces}" fill="none" stroke="${steel}" stroke-width="3"/>` +
    `<path d="M18 0V-400" stroke="${edge}" stroke-width="1.6" opacity=".8"/>` +
    // The cap, its jib and the lightning rod.
    `<rect x="-25" y="-428" width="50" height="28" rx="2" fill="${steel}"/><rect x="-25" y="-428" width="50" height="3" fill="${edge}" opacity=".7"/>` +
    `<path d="M-25 -421H-54L-25 -404M0 -428V-476" fill="none" stroke="${steel}" stroke-width="2.4"/>` +
    `<circle class="beacon" cx="0" cy="-480" r="15" fill="#ff5a4a" opacity=".3" filter="url(#soft)"/><circle class="beacon" cx="0" cy="-480" r="3.6" fill="#ff6a58"/>` +
    // The catching arms on their carriage.
    `<rect x="15" y="-272" width="15" height="36" rx="2" fill="${steel}"/>` +
    `<path d="M26 -258H94M30 -240L74 -256" fill="none" stroke="${steel}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M26 -261H94" stroke="${edge}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>` +
    (hasFuelArm ? `<path d="M18 -344H42" stroke="${steel}" stroke-width="6"/><rect x="38" y="-351" width="8" height="14" rx="1.5" fill="${steel}"/>` : '') +
    lamps
  )
}

/** Where a tower stands beside its lane, how high its arms hold a caught booster, and how high the launch mount is. */
const TOWER_OFFSET = 60
const HELD = 84.5
const MOUNT = 30

/** The launch mount the stack stands on, drawn with the ground at the origin. */
function mount(palette: Palette): string {
  const [steel, edge] = palette.tower

  return (
    [-30, -11, 11, 30].map(x => `<rect x="${x - 3}" y="-${MOUNT - 10}" width="6" height="${MOUNT - 10}" fill="${steel}"/>`).join('') +
    `<path d="M-30 -2L-11 -${MOUNT - 10}M30 -2L11 -${MOUNT - 10}" stroke="${steel}" stroke-width="2"/>` +
    `<rect x="-36" y="-${MOUNT}" width="72" height="11" rx="2" fill="${steel}"/><rect x="-36" y="-${MOUNT}" width="72" height="2" fill="${edge}" opacity=".8"/>`
  )
}

/** The site on the horizon: two hangars with a mast from `hangars` rightward, and a tank farm from `tanks` rightward, lit at night. */
function site(palette: Palette, hangars: number, tanks: number): string {
  const lit = (x: number, y: number, i: number) =>
    palette.isNight ? `<circle class="${i % 2 ? 'lamp b' : 'lamp'}" cx="${x}" cy="${y}" r="1.8" fill="#ffd486"/>` : ''
  const hangar = (x: number, w: number, h: number) => `<path d="M${x} ${PAD}V${PAD - h}Q${x + w / 2} ${PAD - h - 16} ${x + w} ${PAD - h}V${PAD}Z"/>`
  const tank = (x: number, h: number) => `<rect x="${x}" y="${PAD - h}" width="15" height="${h + 4}" rx="7.5"/>`

  return (
    `<g fill="${palette.site}">` +
    hangar(hangars, 96, 22) + hangar(hangars + 108, 70, 16) +
    `<rect x="${hangars + 196}" y="${PAD - 12}" width="46" height="14"/>` +
    `<rect x="${hangars - 30}" y="${PAD - 64}" width="2.4" height="66"/><path d="M${hangars - 40} ${PAD}L${hangars - 28.8} ${PAD - 40}L${hangars - 18} ${PAD}" fill="none" stroke="${palette.site}" stroke-width="1.6"/>` +
    [0, 19, 38, 57].map((dx, i) => tank(tanks + dx, [42, 54, 48, 36][i]!)).join('') +
    `<circle cx="${tanks + 96}" cy="${PAD - 20}" r="15"/><rect x="${tanks + 93}" y="${PAD - 8}" width="6" height="10"/>` +
    `<path d="M${tanks - 14} ${PAD - 9}H${tanks + 118}" stroke="${palette.site}" stroke-width="2.4"/>` +
    '</g>' +
    `<circle class="beacon" cx="${hangars - 28.8}" cy="${PAD - 66}" r="2.2" fill="#ff6a58"/>` +
    [[hangars + 14, 8], [hangars + 44, 8], [hangars + 76, 8], [hangars + 124, 7], [hangars + 158, 7], [hangars + 210, 6], [tanks + 7, 30], [tanks + 45, 34], [tanks + 96, 38], [tanks + 110, 6]]
      .map(([x, up], i) => lit(x!, PAD - up!, i))
      .join('')
  )
}

// ---- the sky, the water and the shore -------------------------------------------------

function stars(): string {
  const random = seeded(19)
  const dots = Array.from({ length: 110 }, (_, i) => {
    const x = Math.round(random() * 1600)
    const y = Math.round(10 + random() * 620)
    const r = (0.5 + random() * 1.1).toFixed(1)

    return `<circle class="${['tw', 'tw b', 'tw c'][i % 3]}" cx="${x}" cy="${y}" r="${r}" style="animation-delay:-${(random() * 11).toFixed(1)}s"/>`
  }).join('')
  // A few brighter ones with a four-point glint.
  const glints = [[150, 96], [520, 60], [860, 210], [1090, 84], [1440, 150], [690, 380], [1300, 330]]
    .map(([x, y], i) => `<path class="${i % 2 ? 'tw b' : 'tw c'}" d="M${x! - 7} ${y}H${x! + 7}M${x} ${y! - 7}V${y! + 7}" stroke="#e8eeff" stroke-width="1.2" stroke-linecap="round" style="animation-delay:-${i * 1.7}s"/>`)
    .join('')

  return `<g fill="#e8eeff">${dots}</g>${glints}`
}

/** The moon, a crescent with a soft halo, or the sun, at `at`. */
function orb(palette: Palette, [x, y]: Point): string {
  if (!palette.isNight) {
    return `<circle cx="${x}" cy="${y}" r="150" fill="url(#halo)"/><circle cx="${x}" cy="${y}" r="34" fill="${palette.orb}"/>`
  }

  return (
    `<circle cx="${x}" cy="${y}" r="120" fill="url(#halo)"/>` +
    `<mask id="crescent" maskUnits="userSpaceOnUse" x="${x - 40}" y="${y - 40}" width="80" height="80"><circle cx="${x}" cy="${y}" r="30" fill="#fff"/><circle cx="${x + 13}" cy="${y - 8}" r="27" fill="#000"/></mask>` +
    `<circle cx="${x}" cy="${y}" r="30" fill="${palette.orb}" opacity=".06"/><circle cx="${x}" cy="${y}" r="30" fill="${palette.orb}" mask="url(#crescent)"/>`
  )
}

/** Long thin clouds low in the sky, drifting slowly. */
function streaks(palette: Palette): string {
  const [a, b] = palette.streaks
  const list = [[260, 560, 300, 7, a, 0.3], [820, 610, 380, 6, b, 0.34], [1320, 540, 280, 8, a, 0.28], [560, 668, 320, 5, a, 0.4], [1130, 676, 300, 5, b, 0.36], [80, 640, 240, 5, b, 0.3]] as const

  return list
    .map(([x, y, rx, ry, fill, opacity], i) => `<ellipse class="${i % 2 ? 'drift b' : 'drift'}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${palette.isNight ? opacity : opacity * 1.5}" filter="url(#haze)"/>`)
    .join('')
}

/** A fair-weather cloud by day, at `x`, `y`, `scale` big. */
function cumulus(x: number, y: number, scale: number, className: string): string {
  const puffs = [[-62, 12, 32], [-28, -10, 42], [18, -22, 50], [64, 0, 36], [0, 16, 44], [42, 18, 34], [-40, 22, 30]]

  const discs = (dy: number) => puffs.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy! + dy}" r="${r}"/>`).join('')

  // Flat, like the plume: a pale blue underside showing below a white top.
  return `<g class="${className}"><g transform="translate(${x} ${y}) scale(${scale})"><g fill="#cfe0f2">${discs(7)}</g><g fill="#fff">${discs(0)}</g></g></g>`
}

/** A few birds by day, drifting across near `at`. */
function birds([x, y]: Point): string {
  const flock = [[0, 0, 1], [26, 14, 0.8], [-22, 20, 0.9], [54, 30, 0.7], [-48, 44, 0.75], [12, 46, 0.6]]

  return `<g class="birds" fill="none" stroke="#33475e" stroke-width="1.8" stroke-linecap="round">${flock
    .map(([dx, dy, s]) => `<path transform="translate(${x + dx!} ${y + dy!}) scale(${s})" d="M-8 -2Q-4 -7 0 0Q4 -7 8 -2"/>`)
    .join('')}</g>`
}

/** Short pale dashes on the water that come and go, and a path of light under the moon or sun at `orbX`. */
function ripples(palette: Palette, orbX: number): string {
  const random = seeded(23)
  const dash = (x: number, y: number, w: number, fill: string, i: number) =>
    `<rect class="${i % 2 ? 'rip b' : 'rip'}" x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="2.4" rx="1.2" fill="${fill}" style="animation-delay:-${(random() * 13).toFixed(1)}s"/>`
  const scattered = Array.from({ length: 46 }, (_, i) => {
    const w = 30 + random() * 120

    return dash(random() * 1600 - w / 2, SHORE + 12 + random() * 200, w, palette.ripple, i)
  }).join('')
  const path = Array.from({ length: 13 }, (_, k) => {
    const w = 18 + k * 6 + random() * 22

    return dash(orbX - w / 2 + (random() - 0.5) * k * 5, SHORE + 12 + k * 15, w, palette.glitter, k)
  }).join('')

  return `${scattered}<g class="path">${path}</g>`
}

/** A small boat at anchor off the shore at `x`, bobbing, with a lamp at its masthead at night and its mirror in the water. */
function boat(palette: Palette, x: number): string {
  const y = SHORE + 34
  const lamp = palette.isNight
    ? `<circle cx="0" cy="-33" r="9" fill="#ffe2a8" opacity=".35" filter="url(#soft)"/><circle class="lamp" cx="0" cy="-33" r="2" fill="#fff2cf"/><rect class="rip" x="-1.2" y="5" width="2.4" height="26" rx="1.2" fill="#ffe2a8"/>`
    : `<path d="M1.5 -30L15 -8H1.5Z" fill="#fff" opacity=".9"/>`

  return (
    `<g transform="translate(${x} ${y})"><g class="bob">` +
    `<path d="M-19 -5H19L13 3H-14Z" fill="${palette.site}"/><path d="M0 -5V-32" stroke="${palette.site}" stroke-width="1.6"/><rect x="-8" y="-10" width="9" height="5" fill="${palette.site}"/>` +
    `<path d="M-14 4H13L9 9H-11Z" fill="${palette.site}" opacity=".3"/>` +
    lamp +
    '</g></g>'
  )
}

/** Reeds from `from` to `to` along the foot of the window, taller toward `tallAt`, some with seed heads. */
function reeds(from: number, to: number, seed: number, [near, far]: readonly [string, string], tallAt: 'left' | 'right'): string {
  const random = seeded(seed)
  const blades = ['', '', '']
  let heads = ''
  for (let x = from; x < to; x += 4 + random() * 6) {
    const edge = tallAt === 'left' ? 1 - (x - from) / (to - from) : (x - from) / (to - from)
    const h = Math.round(26 + edge * 120 * (0.45 + random() * 0.55) + random() * 26)
    const lean = Math.round((random() - 0.5) * 46)
    const px = Math.round(x)
    blades[Math.floor(random() * 3)] += `M${px} 1004Q${Math.round(px + lean * 0.2)} ${Math.round(1000 - h * 0.6)} ${px + lean} ${1000 - h}`
    if (random() < 0.14) heads += `<rect x="${px + lean - 2.5}" y="${1000 - h - 13}" width="5" height="17" rx="2.5"/>`
  }

  return (
    `<g fill="none" stroke-linecap="round" stroke="${near}">${blades.map((d, i) => `<path stroke-width="${(2 + i * 1.2).toFixed(1)}"${i === 0 ? ` stroke="${far}"` : ''} d="${d}"/>`).join('')}</g>` +
    `<g fill="${near}">${heads}</g>`
  )
}

/** Fireflies over the reeds at night. */
function fireflies(): string {
  const random = seeded(31)

  return Array.from({ length: 12 }, (_, i) => {
    const x = Math.round(i % 2 ? 40 + random() * 270 : 1290 + random() * 280)
    const y = Math.round(850 + random() * 120)

    return `<circle class="${i % 3 ? 'fly' : 'fly b'}" cx="${x}" cy="${y}" r="2" fill="#ffe9a0" style="animation-delay:-${(random() * 9).toFixed(1)}s"/>`
  }).join('')
}

// ---- where everything stands ----------------------------------------------------------

/** The two lanes and what decorates the scene, for one layout. */
type Stage = {
  /** The launch lane's x, the return lane's x, and how big the rocket and the towers are drawn. */
  rocketX: number
  boosterX: number
  scale: number
  /** Where the moon or sun hangs, and where the hangars and the tank farm start on the horizon. */
  orb: Point
  hangars: number
  tanks: number
}

const STAGES: Record<Layout, Stage> = {
  // Panels: the lanes run in the two strips right beside the conversation (about x 290 to
  // 376 and 1105 to 1250, for a window about 1000 points wide), in view with the sidebar and
  // the side panel open. The moon hangs over the return lane.
  panels: { rocketX: 1196, boosterX: 334, scale: 0.9, orb: [322, 140], hangars: 470, tanks: 900 },
  // Wide: with the panels closed, the lanes move out into the window's far margins and the
  // rocket is bigger.
  wide: { rocketX: 1350, boosterX: 250, scale: 1.1, orb: [322, 150], hangars: 430, tanks: 1040 },
}

/** `transform` for a keyframe. */
const move = (x: number, y: number) => `transform:translate(${Math.round(x)}px,${Math.round(y)}px)`
const HOLD = ';animation-timing-function:step-end'

/**
 * The stack's flight: it stands on the mount, ignites, climbs ever faster out of the top
 * of the window, and much later fades in on the mount again, stacked for the next flight.
 */
function launchKeyframes(x: number, from: number, climb: number): string {
  const rise = Array.from({ length: 10 }, (_, i) => {
    const u = (i + 1) / 10

    return `${12 + 28 * u}%{${move(x, from - climb * u * u)}${i === 9 ? `;opacity:1${HOLD}` : ''}}`
  }).join('')

  return `@keyframes launch{0%{${move(x, from)};opacity:1}12%{${move(x, from)}}${rise}88%{${move(x, from)};opacity:0}100%{${move(x, from)};opacity:1}}`
}

/**
 * The booster's return: it waits above the window while the stack climbs, falls in, slows
 * on its landing burn into the tower's arms, rests there, and fades before the next flight.
 */
function returnKeyframes(x: number, from: number, to: number): string {
  const fall = Array.from({ length: 10 }, (_, i) => {
    const u = (i + 1) / 10

    return `${46 + 30 * u}%{${move(x, from + (to - from) * (1 - (1 - u) ** 2))}}`
  }).join('')

  return `@keyframes return{0%{${move(x, from)};opacity:1${HOLD}}46%{${move(x, from)}}${fall}90%{${move(x, to)};opacity:1}97%{${move(x, to)};opacity:0${HOLD}}100%{${move(x, from)};opacity:1}}`
}

// ---- the scene ------------------------------------------------------------------------

// Built with only what the official theme-examples scenes use, all of which animate in the
// app: one <style> of translate and opacity keyframes, the reduced-motion rule as its only
// @media, a root at 100%, and a dusk and a day scene instead of a colour-scheme media query.
// Drawn once and never swapped. At rest (reduced motion) the stack stands on its mount.
function scene(palette: Palette, stage: Stage): string {
  const { rocketX, boosterX, scale } = stage
  const engines: Point = [rocketX, PAD - 20]
  const onMount = PAD - MOUNT * scale
  const caught = PAD - HELD * scale
  const climb = onMount + BURN * scale + 40
  const entry = -(BRAKE * scale) - 30
  const launchTower = rocketX - TOWER_OFFSET * scale
  const catchTower = boosterX - TOWER_OFFSET * scale
  const bank = (seed: number, profile: readonly Point[], base: number, r: readonly [number, number], lane: number, light: Point): Puff[] =>
    puffsOf({ seed, profile: profile.map(([x, y]) => [lane + x, y]), base, r }, light, palette)
  // The plume: what boils at the pad, what climbs behind the tower, what runs along the shore, and the landing's dust.
  const boil = bank(11, [[-150, 708], [-80, 668], [0, 646], [80, 664], [150, 704]], 764, [26, 44], rocketX, engines)
  const column = [
    ...bank(7, [[60, 694], [120, 560], [190, 404], [270, 256], [380, 166], [520, 124]], 768, [44, 82], rocketX, engines),
    ...bank(9, [[-250, 706], [-180, 632], [-116, 574], [-62, 612]], 768, [34, 58], rocketX, engines),
  ].sort((a, b) => a.y - b.y)
  const skirt = bank(5, [[-540, 726], [-340, 716], [-150, 704]], 766, [18, 32], rocketX, engines)
  const dust = bank(13, [[-120, 720], [-56, 694], [0, 680], [56, 694], [120, 720]], 766, [20, 36], boosterX, [boosterX, PAD - 20])

  const style = `
${palette.puffs.map(([body, rim], i) => `.m${i}{fill:${body}}.r${i}{fill:${rim}}`).join('')}
.stack{animation:launch ${PERIOD}s linear infinite}
.booster{animation:return ${PERIOD}s linear infinite}
.burn,.brake,.boil,.column,.skirt,.dust,.flash,.glare{opacity:0;animation-duration:${PERIOD}s;animation-timing-function:linear;animation-iteration-count:infinite}
.burn{animation-name:burn}.brake,.glare{animation-name:brake}.boil{animation-name:boil}.column{animation-name:column}.skirt{animation-name:skirt}.dust{animation-name:dust}.flash{animation-name:flash}
.poseA{animation:flipA .5s steps(1) infinite}.poseB{opacity:0;animation:flipB .5s steps(1) infinite}
.bil1{animation:bil1 9s ease-in-out infinite alternate}.bil2{animation:bil2 13s ease-in-out infinite alternate-reverse}
.tw{opacity:.3;animation:tw 7s ease-in-out infinite}.tw.b{animation-duration:11s}.tw.c{animation-duration:15s}
.rip{opacity:0;animation:rip 9s ease-in-out infinite}.rip.b{animation-duration:14s}
.path .rip{animation-name:glit}
.drift{animation:drift 90s ease-in-out infinite alternate}.drift.b{animation-duration:130s;animation-direction:alternate-reverse}
.birds{animation:birds 70s ease-in-out infinite alternate}
.bob{animation:bob 5s ease-in-out infinite alternate}
.beacon{animation:flipA 2.4s steps(1) infinite}
.lamp{animation:lamp 6s ease-in-out infinite alternate}.lamp.b{animation-duration:9s}
.fly{opacity:0;animation:fly 9s ease-in-out infinite}.fly.b{animation-duration:13s}
.meteor{opacity:0;animation:meteor 37s linear infinite}
${launchKeyframes(rocketX, onMount, climb)}
${returnKeyframes(boosterX, entry, caught)}
@keyframes burn{0%{opacity:0${HOLD}}8%{opacity:1${HOLD}}40%{opacity:0${HOLD}}100%{opacity:0}}
@keyframes brake{0%{opacity:0${HOLD}}52%{opacity:1${HOLD}}76%{opacity:0${HOLD}}100%{opacity:0}}
@keyframes boil{0%{opacity:0;${move(0, 40)}${HOLD}}8%{opacity:0;${move(0, 40)}}13%{opacity:1;${move(0, 0)}}60%{opacity:1;${move(0, -14)}}84%{opacity:0;${move(0, -40)}}100%{opacity:0;${move(0, -40)}}}
@keyframes column{0%{opacity:0;${move(0, 150)}${HOLD}}10%{opacity:0;${move(0, 150)}}24%{opacity:1;${move(0, 0)}}62%{opacity:1;${move(26, -24)}}88%{opacity:0;${move(60, -50)}}100%{opacity:0;${move(60, -50)}}}
@keyframes skirt{0%{opacity:0;${move(170, 0)}${HOLD}}10%{opacity:0;${move(170, 0)}}22%{opacity:1;${move(0, 0)}}60%{opacity:1;${move(-30, 0)}}82%{opacity:0;${move(-70, 0)}}100%{opacity:0;${move(-70, 0)}}}
@keyframes dust{0%{opacity:0;${move(0, 30)}${HOLD}}64%{opacity:0;${move(0, 30)}}72%{opacity:1;${move(0, 0)}}84%{opacity:1;${move(0, -8)}}97%{opacity:0;${move(0, -30)}}100%{opacity:0;${move(0, -30)}}}
@keyframes flash{0%{opacity:0${HOLD}}8%{opacity:0}11%{opacity:1}28%{opacity:.6}46%{opacity:0}100%{opacity:0}}
@keyframes flipA{0%{opacity:1}50%{opacity:0}}
@keyframes flipB{0%{opacity:0}50%{opacity:1}}
@keyframes bil1{0%{transform:translate(0,0)}100%{transform:translate(7px,-9px)}}
@keyframes bil2{0%{transform:translate(0,0)}100%{transform:translate(-8px,-6px)}}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:.95}}
@keyframes rip{0%,100%{opacity:0}50%{opacity:.22}}
@keyframes glit{0%,100%{opacity:.12}50%{opacity:.7}}
@keyframes drift{0%{transform:translate(-40px,0)}100%{transform:translate(50px,0)}}
@keyframes birds{0%{transform:translate(0,0)}100%{transform:translate(240px,-46px)}}
@keyframes lamp{0%{opacity:.55}100%{opacity:1}}
@keyframes bob{0%{transform:translate(0,0)}100%{transform:translate(0,3px)}}
@keyframes fly{0%{transform:translate(0,0);opacity:0}20%{opacity:.9}50%{transform:translate(18px,-26px);opacity:.2}80%{opacity:.9}100%{transform:translate(-10px,-46px);opacity:0}}
@keyframes meteor{0%{transform:translate(0,0);opacity:0}0.6%{opacity:.9}2.6%{transform:translate(-250px,140px);opacity:0}100%{transform:translate(-250px,140px);opacity:0}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}.booster,.poseB{opacity:0}}`

  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops(palette.sky)}</linearGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">${stops(palette.water)}</linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">${stops(palette.steel)}</linearGradient>
<linearGradient id="tiles" x1="0" y1="0" x2="1" y2="0">${stops([[0, '#343b49'], [0.45, '#1a1f2a'], [1, '#07090e']])}</linearGradient>
<linearGradient id="frost" x1="0" y1="0" x2="0" y2="1">${stops([[0, palette.frost, 0], [0.35, palette.frost, 0.5], [1, palette.frost, 0.72]])}</linearGradient>
<linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#ffffff'], [0.14, '#eef2ff'], [0.42, '#b9a2ff', 0.92], [0.76, '#f09a6a', 0.5], [1, '#f09a6a', 0]])}</linearGradient>
<linearGradient id="streak" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#e2c4ff', 0.9], [1, '#a877e8', 0]])}</linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#ff6a58', 0.7], [1, '#ff6a58', 0]])}</linearGradient>
<linearGradient id="under" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#ffb070', 0], [1, '#ffb070', 0.7]])}</linearGradient>
<linearGradient id="mirror" x1="0" y1="0" x2="0" y2="1">${stops([[0, palette.tower[0], 0.5], [1, palette.tower[0], 0]])}</linearGradient>
<radialGradient id="flash">${stops([[0, palette.flash, 0.65], [0.45, palette.flash, 0.24], [1, palette.flash, 0]])}</radialGradient>
<radialGradient id="halo">${stops([[0, palette.halo, 0.5], [0.3, palette.halo, 0.16], [1, palette.halo, 0]])}</radialGradient>
<pattern id="hex" width="7" height="6" patternUnits="userSpaceOnUse"><path d="M0 .5H7M0 3.5H7M1.5 .5V3.5M5 3.5V6.5" stroke="#6b7689" stroke-width=".5" fill="none"/></pattern>
<filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="haze" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="5"/></filter>`

  const sky = palette.isNight
    ? stars() + `<g transform="translate(${stage.orb[0] + 720} 110)"><path class="meteor" d="M0 0L52 -29" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`
    : cumulus(stage.orb[0] + 250, 250, 1, 'drift') + cumulus(1460, 190, 0.8, 'drift b') + cumulus(820, 110, 0.5, 'drift') + birds([stage.orb[0] + 150, 330])

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><style>${style}</style><defs>${defs}</defs>
<rect width="1600" height="${SHORE + 6}" fill="url(#sky)"/>
${orb(palette, stage.orb)}
${sky}
${streaks(palette)}
<path fill="${palette.hills[0]}" d="M0 718C150 690 300 700 460 712S760 690 940 706S1300 684 1600 708V${SHORE}H0Z"/>
<path fill="${palette.hills[1]}" d="M0 734C220 716 420 730 640 727S1100 720 1600 730V${SHORE}H0Z"/>
<circle class="flash" cx="${rocketX}" cy="${PAD - 30}" r="560" fill="url(#flash)"/>
<g class="column">${billowing(column)}</g>
${site(palette, stage.hangars, stage.tanks)}
<g transform="translate(${launchTower} ${PAD}) scale(${scale})">${tower(palette, true)}</g>
<g transform="translate(${catchTower} ${PAD}) scale(${scale})">${tower(palette, false)}</g>
<g class="booster" transform="translate(${boosterX} ${caught})"><g transform="scale(${scale})">${exhaust('brake', BRAKE)}${booster(palette)}${underglow('brake')}</g></g>
<g class="stack" transform="translate(${rocketX} ${onMount})"><g transform="scale(${scale})">${exhaust('burn', BURN)}${booster(palette)}${underglow('burn')}${ship(palette)}</g></g>
<g transform="translate(${rocketX} ${PAD}) scale(${scale})">${mount(palette)}</g>
<path fill="${palette.land}" d="M0 ${PAD}C300 ${PAD - 3} 700 ${PAD + 3} 1000 ${PAD}S1400 ${PAD - 2} 1600 ${PAD}V${SHORE + 6}H0Z"/>
<g class="skirt">${billowing(skirt)}</g>
<g class="boil">${billowing(boil)}</g>
<ellipse class="flash" cx="${rocketX}" cy="${PAD - 16}" rx="${78 * scale}" ry="${30 * scale}" fill="#fff" filter="url(#soft)"/>
<g class="dust">${billowing(dust)}</g>
<rect y="${SHORE}" width="1600" height="${1000 - SHORE}" fill="url(#water)"/>
<rect x="${launchTower - 18 * scale}" y="${SHORE}" width="${36 * scale}" height="170" fill="url(#mirror)"/><rect x="${catchTower - 18 * scale}" y="${SHORE}" width="${36 * scale}" height="170" fill="url(#mirror)"/>
${boat(palette, stage.hangars + 330)}
<rect class="beacon" x="${launchTower - 1.5}" y="${SHORE + 2}" width="3" height="46" fill="url(#shine)"/><rect class="beacon" x="${catchTower - 1.5}" y="${SHORE + 2}" width="3" height="46" fill="url(#shine)"/>
<g filter="url(#soft)">
<ellipse class="flash" cx="${rocketX}" cy="${SHORE + 30}" rx="200" ry="26" fill="${palette.puffs[0][1]}"/>
<rect class="flash" x="${rocketX - 9}" y="${SHORE + 4}" width="18" height="190" fill="url(#streak)"/>
<rect class="glare" x="${boosterX - 8}" y="${SHORE + 4}" width="16" height="150" fill="url(#streak)"/>
</g>
${ripples(palette, stage.orb[0])}
${reeds(0, 330, 41, palette.reeds, 'left')}${reeds(1290, 1600, 43, palette.reeds, 'right')}
${palette.isNight ? fireflies() : ''}
</svg>`
}

// No blur, and only a faint veil in the window's own panel colour.
const GLASS = { blur: 0, opacity: 0.12 }

export const dusk: Look = {
  name: 'dusk',
  summary: 'a launch site at dusk: a rocket lifts off on a violet flame and its booster comes back to be caught (for a dark window)',
  colors: theme,
  glass: GLASS,
  scenes: { panels: scene(DUSK, STAGES.panels), wide: scene(DUSK, STAGES.wide) },
  alt: 'A launch site on the coast at dusk under a crescent moon: a rocket lifts off beside its tower on a violet flame, its plume glowing, and its booster comes back down to be caught by a second tower, all mirrored in still water',
  problems,
}

export const day: Look = {
  name: 'day',
  summary: 'the same launch under a blue sky, the plume cream and orange (for a light window)',
  colors: theme,
  glass: GLASS,
  scenes: { panels: scene(DAY, STAGES.panels), wide: scene(DAY, STAGES.wide) },
  alt: 'A launch site on the coast under a blue sky: a rocket lifts off beside its tower on a violet flame, its plume cream and orange, and its booster comes back down to be caught by a second tower, all mirrored in still water',
  problems,
}

/** Every look, the default first. */
export const LOOKS: readonly Look[] = [dusk, day]
