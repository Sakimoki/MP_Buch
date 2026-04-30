async function apiFetch(method, path, body) {
  const opts = { method, headers: {} }
  if (body) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

// ── Geräte ────────────────────────────────────────────────────────────────────
export const getGeraete = (search = '') =>
  apiFetch('GET', '/api/geraete' + (search ? `?search=${encodeURIComponent(search)}` : ''))

export const getGeraetById = (id) => apiFetch('GET', `/api/geraete/${id}`)
export const createGeraet  = (data) => apiFetch('POST', '/api/geraete', data)
export const updateGeraet  = (id, data) => apiFetch('PUT', `/api/geraete/${id}`, data)
export const deleteGeraet  = (id) => apiFetch('DELETE', `/api/geraete/${id}`)
export const getBestandsliste = () => apiFetch('GET', '/api/bestandsliste')

// ── Hersteller ────────────────────────────────────────────────────────────────
export const getHersteller = (search = '') =>
  apiFetch('GET', '/api/hersteller' + (search ? `?search=${encodeURIComponent(search)}` : ''))

export const getHerstellerById  = (id) => apiFetch('GET', `/api/hersteller/${id}`)
export const createHersteller   = (data) => apiFetch('POST', '/api/hersteller', data)
export const updateHersteller   = (id, data) => apiFetch('PUT', `/api/hersteller/${id}`, data)
export const deleteHersteller   = (id) => apiFetch('DELETE', `/api/hersteller/${id}`)

// ── Betreiber ─────────────────────────────────────────────────────────────────
export const getBetreiber = (search = '') =>
  apiFetch('GET', '/api/betreiber' + (search ? `?search=${encodeURIComponent(search)}` : ''))

export const getBetreiberById  = (id) => apiFetch('GET', `/api/betreiber/${id}`)
export const createBetreiber   = (data) => apiFetch('POST', '/api/betreiber', data)
export const updateBetreiber   = (id, data) => apiFetch('PUT', `/api/betreiber/${id}`, data)
export const deleteBetreiber   = (id) => apiFetch('DELETE', `/api/betreiber/${id}`)

// ── Einweisungen ──────────────────────────────────────────────────────────────
export const getEinweisungen  = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/einweisungen`)
export const createEinweisung = (data) => apiFetch('POST', '/api/einweisungen', data)
export const deleteEinweisung = (id) => apiFetch('DELETE', `/api/einweisungen/${id}`)

// ── Prüfungen ─────────────────────────────────────────────────────────────────
export const getPruefungen  = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/pruefungen`)
export const createPruefung = (data) => apiFetch('POST', '/api/pruefungen', data)
export const deletePruefung = (id) => apiFetch('DELETE', `/api/pruefungen/${id}`)

// ── Übergaben ─────────────────────────────────────────────────────────────────
export const getUebergaben  = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/uebergaben`)
export const createUebergabe = (data) => apiFetch('POST', '/api/uebergaben', data)
export const deleteUebergabe = (id) => apiFetch('DELETE', `/api/uebergaben/${id}`)

export const uploadProtokoll = async (id, formData) => {
  const res = await fetch(`/api/uebergaben/${id}/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Datei-Upload fehlgeschlagen')
}

// ── Dokumente ─────────────────────────────────────────────────────────────────
export const getDokumente  = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/dokumente`)
export const deleteDokument = (id) => apiFetch('DELETE', `/api/dokumente/${id}`)

export const uploadDokument = async (formData) => {
  const res = await fetch('/api/dokumente/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(e.error || res.statusText)
  }
  return res.json()
}

// ── Vorkommnisse ──────────────────────────────────────────────────────────────
export const getAllVorkommnisse       = () => apiFetch('GET', '/api/vorkommnisse')
export const getAllVorkommnisseGlobal = () => apiFetch('GET', '/api/vorkommnisse-global')
export const updateVorkommnis        = (id, data) => apiFetch('PUT', `/api/vorkommnisse/${id}`, data)
export const getVorkommnisse        = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/vorkommnisse`)
export const getVorkommnisseUebersicht = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/vorkommnisse-uebersicht`)
export const createVorkommnis  = (data) => apiFetch('POST', '/api/vorkommnisse', data)
export const deleteVorkommnis  = (id) => apiFetch('DELETE', `/api/vorkommnisse/${id}`)

// ── Störungsmeldungen ─────────────────────────────────────────────────────────
export const getStoerungsmeldungen   = (geraetId) => apiFetch('GET', `/api/geraete/${geraetId}/stoerungsmeldungen`)
export const createStoerungsmeldung  = (data) => apiFetch('POST', '/api/stoerungsmeldungen', data)
export const updateStoerungsmeldung  = (id, data) => apiFetch('PUT', `/api/stoerungsmeldungen/${id}`, data)
export const deleteStoerungsmeldung  = (id) => apiFetch('DELETE', `/api/stoerungsmeldungen/${id}`)

export const uploadPruefungsDokument = async (id, formData) => {
  const res = await fetch(`/api/pruefungen/${id}/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Datei-Upload fehlgeschlagen')
  return res.json()
}

// ── Wartungsübersicht ─────────────────────────────────────────────────────────
export const getWartungenFaellig = (von, bis) =>
  apiFetch('GET', `/api/wartungen-faellig?von=${von}&bis=${bis}`)

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────
export function dataURIToBlob(dataURI) {
  const [header, data] = dataURI.split(',')
  const mimeType = header.match(/:(.*?);/)[1]
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  return new Blob([bytes], { type: mimeType })
}
