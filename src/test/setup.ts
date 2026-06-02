import '@testing-library/jest-dom'

// react-modal calls Modal.setAppElement('#root') at module scope in several
// components. The element must exist in jsdom before those modules are imported.
const rootEl = document.createElement('div')
rootEl.id = 'root'
document.body.appendChild(rootEl)
