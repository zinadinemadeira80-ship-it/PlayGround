import { FORMS, ENEMIES } from './data.js'

export const eventMethods = {
  updateTouchMode() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
    const touch = coarse || ('ontouchstart' in window) || window.innerWidth <= 820
    document.body.classList.toggle('touch', !!touch)
  },

  bindEvents() {
    this.updateTouchMode()
    window.addEventListener('resize', () => this.updateTouchMode())

    this.dom['btn-start'].addEventListener('click', () => this.startGame())
    this.dom['btn-help'].addEventListener('click', () => this.openHelp('title'))
    this.dom['btn-sound'].addEventListener('click', () => this.toggleSound())
    this.dom['btn-resume'].addEventListener('click', () => this.resume())
    this.dom['btn-pause-help'].addEventListener('click', () => this.openHelp('pause'))
    this.dom['btn-quit'].addEventListener('click', () => this.quitToTitle())
    this.dom['btn-next'].addEventListener('click', () => {
      if (this.s.enemyIndex >= ENEMIES.length - 1) {
        this.showComplete()
      } else {
        this.hideScreens()
        this.dom.hud.classList.add('on')
        this.startFight(this.s.enemyIndex + 1)
      }
    })
    this.dom['btn-victory-quit'].addEventListener('click', () => this.quitToTitle())
    this.dom['btn-retry'].addEventListener('click', () => {
      this.hideScreens()
      this.dom.hud.classList.add('on')
      this.startFight(this.s.enemyIndex, true)
    })
    this.dom['btn-defeat-quit'].addEventListener('click', () => this.quitToTitle())
    this.dom['btn-again'].addEventListener('click', () => this.startGame())
    this.dom['btn-complete-quit'].addEventListener('click', () => this.quitToTitle())

    for (const btn of document.querySelectorAll('[data-close="help"]')) {
      btn.addEventListener('click', () => this.closeHelp())
    }

    this.skillButtons.forEach((btn, index) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault()
        this.audio.init()
        if (this.s.mode === 'fight' && !this.s.paused) this.playerSkill(index)
      })
    })

    window.addEventListener('keydown', (event) => this.onKeyDown(event))
    window.addEventListener('keyup', (event) => this.onKeyUp(event))
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.input.stickX = 0
      this.input.stickY = 0
      this.input.chargeTouch = false
      this.input.beamTouch = false
      if (this.s.mode === 'fight' && !this.s.paused) this.pause()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.s.mode === 'fight' && !this.s.paused) this.pause()
    })
    document.addEventListener('contextmenu', (event) => event.preventDefault())

    this.bindTouch()
  },

  onKeyDown(event) {
    const k = event.key.toLowerCase()
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k) || event.code === 'Space') {
      event.preventDefault()
    }
    this.keys.add(k)
    if (event.repeat) return
    if (k === 'm') { this.toggleSound(); return }

    const helpOpen = !this.dom['screen-help'].classList.contains('hidden')
    if (k === 'escape') {
      if (helpOpen) { this.closeHelp(); return }
      if (this.s.paused) { this.resume(); return }
      if (this.s.mode === 'fight') this.pause()
      return
    }
    if (helpOpen) return

    if (this.s.mode === 'title') {
      if (k === 'enter' || k === ' ') { event.preventDefault(); this.startGame() }
      return
    }
    if (this.s.paused) {
      if (k === 'p') this.resume()
      return
    }
    if (this.s.mode !== 'fight') return

    if (k === 'p') { this.pause(); return }
    if (k === 'j' || k === 'z') this.playerLight()
    else if (k === 'k' || k === 'x') this.playerHeavy()
    else if (k === 'l' || k === 'c') this.playerKi()
    else if (k === 'u') this.playerBeamStart()
    else if (k === 'q' || k === 't') this.playerTransform()
    else if (k === 'w' || k === 'arrowup' || k === ' ') this.playerJump()
    else if (k === 'shift') this.playerDash()
    else if (k === '1') this.playerSkill(0)
    else if (k === '2') this.playerSkill(1)
    else if (k === '3') this.playerSkill(2)
    else if (k === '4') this.playerSkill(3)
  },

  onKeyUp(event) {
    const k = event.key.toLowerCase()
    this.keys.delete(k)
    if (k === 'u') this.playerBeamRelease()
  },

  bindTouch() {
    const ring = this.dom['stick-ring']
    const knob = this.dom['stick-knob']
    if (!ring || !knob) return
    let pointerId = null
    let cx = 0
    let cy = 0
    let max = 40

    const start = (event) => {
      event.preventDefault()
      this.audio.init()
      const rect = ring.getBoundingClientRect()
      cx = rect.left + rect.width / 2
      cy = rect.top + rect.height / 2
      max = rect.width * 0.32
      pointerId = event.pointerId
      try { ring.setPointerCapture(pointerId) } catch {}
      move(event)
    }
    const move = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      let dx = event.clientX - cx
      let dy = event.clientY - cy
      const len = Math.hypot(dx, dy)
      if (len > max) { dx *= max / len; dy *= max / len }
      this.input.stickX = dx / max
      this.input.stickY = dy / max
      knob.style.transform = `translate(calc(-50% + ${dx * 0.72}px), calc(-50% + ${dy * 0.72}px))`
      if (this.input.stickY < -0.55 && !this.input.jumpLatch) {
        this.input.jumpLatch = true
        if (this.s.mode === 'fight' && !this.s.paused) this.playerJump()
      }
      if (this.input.stickY > -0.35) this.input.jumpLatch = false
    }
    const end = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      pointerId = null
      this.input.stickX = 0
      this.input.stickY = 0
      this.input.jumpLatch = false
      knob.style.transform = 'translate(-50%, -50%)'
    }
    ring.addEventListener('pointerdown', start)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    for (const btn of document.querySelectorAll('.tact')) {
      const act = btn.dataset.act
      let active = false
      const down = (event) => {
        event.preventDefault()
        if (active) return
        active = true
        btn.classList.add('down')
        this.audio.init()
        if (this.s.mode !== 'fight' || this.s.paused) return
        if (act === 'strike') this.playerLight()
        else if (act === 'heavy') this.playerHeavy()
        else if (act === 'ki') this.playerKi()
        else if (act === 'dash') this.playerDash()
        else if (act === 'jump') this.playerJump()
        else if (act === 'pause') this.pause()
        else if (act === 'beam') { this.input.beamTouch = true; this.playerBeamStart() }
        else if (act === 'power') {
          const p = this.s.player
          if (p && p.power >= 99.5 && p.form < FORMS.length - 1) this.playerTransform()
          else this.input.chargeTouch = true
        }
      }
      const up = (event) => {
        if (!active) return
        active = false
        btn.classList.remove('down')
        if (act === 'beam' && this.input.beamTouch) { this.input.beamTouch = false; this.playerBeamRelease() }
        if (act === 'power') this.input.chargeTouch = false
      }
      btn.addEventListener('pointerdown', down)
      btn.addEventListener('pointerup', up)
      btn.addEventListener('pointercancel', up)
      btn.addEventListener('pointerleave', (event) => { if (event.buttons === 0) up(event) })
    }
  }
}
