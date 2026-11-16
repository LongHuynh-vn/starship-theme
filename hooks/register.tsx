import type { EngineInterface, Register } from 'claude-code'

import { LAYOUTS, LOOKS } from './starship'
import type { Layout, Look } from './starship'

// /starship with no name lists the looks; /starship dusk|day switches; /starship off takes
// the theme off; /starship layout panels|wide says where the flight lanes run; /starship
// blur on|off frosts the panel behind the conversation, or not. Every choice is saved, so
// new sessions start with it.
const COMMAND = 'starship'
const DEFAULT = 'dusk'
const DEFAULT_LAYOUT: Layout = 'panels'
const OFF = 'off'
const LOOK_KEY = 'look'
const LAYOUT_KEY = 'layout'
const BLUR_KEY = 'blur'

// With blur on, the app frosts the panel behind the conversation so text reads clearly
// over the scene. The scene outside the panel stays sharp and keeps moving.
const FROSTED = { blur: 12, opacity: 0.38 }

// Each scene is one SVG, drawn once and never swapped (a swap blanks the backdrop for an
// instant), and it animates itself with CSS. The backdrop's scene name carries the layout,
// `<look>--<layout>`, so changing the layout sets a new scene and the app draws it once.
const SEPARATOR = '--'

const LAYOUT_NOTES: Record<Layout, string> = {
  panels: 'right beside the conversation, in view with the sidebar and the side panel open',
  wide: 'out in the far margins, the rocket bigger, for when the panels are closed',
}

const names = () => [...LOOKS.map(look => look.name), OFF].join(', ')

function findLook(name: string): Look | undefined {
  return LOOKS.find(look => look.name === name)
}

const isLayout = (value: unknown): value is Layout => typeof value === 'string' && (LAYOUTS as readonly string[]).includes(value)

// The saved choice, which every new session starts with. Falls back to the default.
async function savedChoice($: EngineInterface): Promise<string> {
  const saved = await $.store.get(LOOK_KEY)

  if (typeof saved === 'string' && (saved === OFF || findLook(saved) !== undefined)) {
    return saved
  }

  return DEFAULT
}

async function savedLayout($: EngineInterface): Promise<Layout> {
  const saved = await $.store.get(LAYOUT_KEY)

  return isLayout(saved) ? saved : DEFAULT_LAYOUT
}

async function isBlurOn($: EngineInterface): Promise<boolean> {
  return (await $.store.get(BLUR_KEY)) === true
}

// Puts a look on the window in the saved layout, or takes the theme off for `off`.
async function apply($: EngineInterface, choice: string): Promise<void> {
  const look = findLook(choice)

  if (look === undefined) {
    await $.theme.clear()

    return
  }
  const unpainted = look.problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(`${look.name}: ${unpainted}`)
  }
  const scene = [look.name, await savedLayout($)].join(SEPARATOR)
  const glass = (await isBlurOn($)) ? FROSTED : look.glass
  await $.theme.set({ colors: look.colors, backdrop: { scene, glass } })
}

// A scene name the theme set, `<look>--<layout>`, back into what to draw.
function sceneOf(scene: string): { look: Look; layout: Layout } | undefined {
  const [name = '', layout = DEFAULT_LAYOUT] = scene.split(SEPARATOR)
  const look = findLook(name)

  return look !== undefined && isLayout(layout) ? { look, layout } : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The theme goes on first, so a problem with the command never leaves the window plain.
    await apply($, await savedChoice($))
    await $.command.register({
      name: COMMAND,
      description: 'Switch the Starship theme: dusk or day, the layout, blur, or off',
      argumentHint: `[${LOOKS.map(look => look.name).join('|')}|${OFF}|layout ${LAYOUTS.join('|')}|blur on|off]`,
      immediate: true,
    })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const current = await savedChoice($)
    const layout = await savedLayout($)

    if (asked === '') {
      const lines = LOOKS.map(look => `  ${look.name === current ? '●' : '○'} ${look.name}: ${look.summary}`)
      lines.push(`  ${current === OFF ? '●' : '○'} ${OFF}: the app's own look`)
      lines.push('', `Layout (switch with /${COMMAND} layout <name>):`)
      lines.push(...LAYOUTS.map(name => `  ${name === layout ? '●' : '○'} ${name}: ${LAYOUT_NOTES[name]}`))
      lines.push('', `Blur behind the conversation (/${COMMAND} blur on|off): ${(await isBlurOn($)) ? 'on' : 'off'}`)

      return { text: `Starship (switch with /${COMMAND} <name>):\n${lines.join('\n')}`, isTextDisplayOnly: true }
    }

    if (asked === 'blur' || asked.startsWith('blur ')) {
      const wanted = asked.slice('blur'.length).trim()

      if (wanted !== 'on' && wanted !== 'off') {
        return { text: `Say /${COMMAND} blur on or /${COMMAND} blur off. Now: ${(await isBlurOn($)) ? 'on' : 'off'}.`, isTextDisplayOnly: true }
      }
      await $.store.set(BLUR_KEY, wanted === 'on')
      if (current !== OFF) {
        await apply($, current)
      }
      const done =
        wanted === 'on'
          ? 'Blur on: the panel behind the conversation is frosted, so text reads more clearly.'
          : 'Blur off: the scene shows clear behind the conversation.'

      return { text: done, isTextDisplayOnly: true }
    }

    if (asked === 'layout' || asked.startsWith('layout ')) {
      const wanted = asked.slice('layout'.length).trim()

      if (!isLayout(wanted)) {
        return { text: `Pick a layout: ${LAYOUTS.join(' or ')}. Now: ${layout}.`, isTextDisplayOnly: true }
      }
      await $.store.set(LAYOUT_KEY, wanted)
      if (current !== OFF) {
        await apply($, current)
      }

      return { text: `Layout set to ${wanted}: the flight lanes run ${LAYOUT_NOTES[wanted]}.`, isTextDisplayOnly: true }
    }

    if (asked !== OFF && findLook(asked) === undefined) {
      return { text: `There's no look called "${asked}". Try one of: ${names()}.`, isTextDisplayOnly: true }
    }
    await $.store.set(LOOK_KEY, asked)
    await apply($, asked)
    const done = asked === OFF ? 'Theme off: back to the app’s own look.' : `Starship set to ${asked}.`

    return { text: `${done} New sessions start with it too.`, isTextDisplayOnly: true }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const found = e.props.plugin === $.plugin.name ? sceneOf(e.props.scene) : undefined

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || found === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    // `isInteractive` draws the SVG in a live frame, where its CSS animation runs.
    return <Svg source={found.look.scenes[found.layout]} alt={found.look.alt} isInteractive />
  })
}
