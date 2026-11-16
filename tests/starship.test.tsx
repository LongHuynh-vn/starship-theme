import { expect, mock, test } from 'claude-code/testing'
import type { On, ThemeSetArgs } from 'claude-code'

import { day, dusk, LAYOUTS, LOOKS } from '../hooks/starship'

const count = (text: string, part: string) => text.split(part).length - 1
const SCENES = LOOKS.flatMap(look => LAYOUTS.map(layout => ({ look, layout, scene: look.scenes[layout] })))

// Stands in for the engine beneath the mod, and records each theme the mod sets or clears.
function engine(on: On) {
  const calls: Array<{ set?: ThemeSetArgs; clear?: true }> = []

  on('command.register', () => ({ value: { command: 'starship' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('theme.set', (_, e) => {
    calls.push({ set: e })

    return { value: { isDrawn: true, requestId: 'r1' } }
  })
  on('theme.clear', () => {
    calls.push({ clear: true })

    return { value: { isDrawn: false, reason: 'the theme is cleared' } }
  })

  return calls
}

// `/starship <args>` as if typed at the prompt.
const typed = (args: string) => ({
  command: 'starship',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

const backdropOf = (call: { set?: ThemeSetArgs } | undefined) => {
  const backdrop = call?.set?.backdrop

  return backdrop !== undefined && 'scene' in backdrop ? backdrop : undefined
}

test('every scene keeps to what the app animates, and fits the size limit', () => {
  for (const { scene } of SCENES) {
    expect(scene.length).toBeLessThan(131072)
    expect(scene).toMatch(/^<svg[^>]* width="100%" height="100%"/)
    // With any of these the app showed scenes frozen.
    expect(scene).not.toContain('<animate')
    expect(scene).not.toContain('transform-box')
    expect(scene).not.toContain('shape-rendering')
    expect(scene).not.toContain('prefers-color-scheme')
    expect(scene).not.toContain('aspect-ratio:')
    expect(count(scene, '<style')).toBe(1)
    expect(count(scene, '@media')).toBe(1)
  }
})

test('the rocket launches and the booster comes back, on one shared period', () => {
  for (const { scene } of SCENES) {
    expect(scene).toContain('@keyframes launch')
    expect(scene).toContain('@keyframes return')
    expect(scene).toContain('.stack{animation:launch 60s linear infinite}')
    expect(scene).toContain('.booster{animation:return 60s linear infinite}')
  }
})

test('the two layouts run the flight lanes in different places', () => {
  for (const look of LOOKS) {
    expect(look.scenes.panels).not.toBe(look.scenes.wide)
  }
})

test('both palettes can be painted by the desktop app', () => {
  for (const look of LOOKS) {
    expect(look.problems.some(line => line.startsWith("Desktop won't paint"))).toBe(false)
  }
})

test('a new session starts at dusk, beside the panels, unblurred, when nothing is saved', async ($, on) => {
  mock.store(on)
  const calls = engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(backdropOf(calls.at(-1))?.scene).toBe('dusk--panels')
  expect(backdropOf(calls.at(-1))?.glass).toEqual({ blur: 0, opacity: 0.12 })
  expect(calls.at(-1)?.set?.colors).toEqual(dusk.colors)
})

test('a new session starts with the saved look and layout', async ($, on) => {
  mock.store(on, { look: 'day', layout: 'wide' })
  const calls = engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(backdropOf(calls.at(-1))?.scene).toBe('day--wide')
})

test('the backdrop is drawn once, in a live frame, in the layout its scene name carries', async ($, on) => {
  mock.store(on)
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const { look, layout, scene } of SCENES) {
    const ui = await $.ui.mount({
      plugin: 'starship-theme',
      component: 'Backdrop',
      requestId: 'r1',
      surface: 'desktop',
      props: { scene: `${look.name}--${layout}`, plugin: 'starship-theme', glass: { blur: 0, opacity: 0.12 } },
    })
    const svg = await ui.find({ type: 'Svg' })
    await ui.unmount()

    expect(svg?.props.isInteractive).toBe(true)
    expect(svg?.props.source).toBe(scene)
  }
})

test('/starship day switches now and is saved for later', async ($, on) => {
  mock.store(on)
  const calls = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ran = await $.command.run(typed('Day'))

  expect(ran.text).toContain('Starship set to day')
  expect(backdropOf(calls.at(-1))?.scene).toBe('day--panels')
  expect(calls.at(-1)?.set?.colors).toEqual(day.colors)
  expect((await $.command.run(typed(''))).text).toContain('● day')
})

test('/starship layout wide moves the lanes now and is saved for later', async ($, on) => {
  mock.store(on)
  const calls = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ran = await $.command.run(typed('layout wide'))

  expect(ran.text).toContain('Layout set to wide')
  expect(backdropOf(calls.at(-1))?.scene).toBe('dusk--wide')
  expect((await $.command.run(typed(''))).text).toContain('● wide')
})

test('/starship blur on frosts the panel behind the conversation, and blur off clears it', async ($, on) => {
  mock.store(on)
  const calls = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect((await $.command.run(typed('blur on'))).text).toContain('Blur on')
  expect(backdropOf(calls.at(-1))?.glass).toEqual({ blur: 12, opacity: 0.38 })

  await $.command.run(typed('blur off'))
  expect(backdropOf(calls.at(-1))?.glass).toEqual({ blur: 0, opacity: 0.12 })
})

test('/starship off clears the theme and is saved', async ($, on) => {
  mock.store(on)
  const calls = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run(typed('off'))

  expect(calls.at(-1)?.clear).toBe(true)
  expect((await $.command.run(typed(''))).text).toContain('● off')
})

test('an unknown look or layout changes nothing', async ($, on) => {
  mock.store(on, { look: 'day' })
  const calls = engine(on)

  expect((await $.command.run(typed('neon'))).text).toContain('no look called "neon"')
  expect((await $.command.run(typed('layout tiny'))).text).toContain('Pick a layout: panels or wide')
  expect(calls).toHaveLength(0)
  expect((await $.command.run(typed(''))).text).toContain('● day')
})
