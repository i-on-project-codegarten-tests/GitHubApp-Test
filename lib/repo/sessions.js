'use strict'

const crypto = require('crypto')

const HASH_ALGORITHM = 'sha256'
const SECRET_KEY = 'changeit'

const SESSION_ID_COOKIE = 'sid'
const SESSION_MARK_COOKIE = 'sid.mark'

// Maps sessions to users
const aliveSessions = new Map()

function generateSessionId() {
    const hash = crypto.createHash(HASH_ALGORITHM)
    let sessionId
    do {
        sessionId = crypto.randomBytes(20).toString('hex')
    } while (aliveSessions.has(sessionId))
    
    const hashSessionId = hash.update(sessionId).digest('hex')
    aliveSessions.set(hashSessionId, undefined)

    return sessionId
}

function addSession(sessionId, userId) {
    const hash = crypto.createHash(HASH_ALGORITHM)
    const hashSessionId = hash.update(sessionId).digest('hex')
    aliveSessions.set(hashSessionId, userId)
    console.log(`[LOGIN] ${hashSessionId}`)
}

function removeSession(sessionId) {
    const hash = crypto.createHash(HASH_ALGORITHM)
    const hashSessionId = hash.update(sessionId).digest('hex')
    if (aliveSessions.delete(hashSessionId))
        console.log(`[LOGOUT] ${hashSessionId}`)
}

function getSessionUserId(sessionId) {
    const hash = crypto.createHash(HASH_ALGORITHM)
    return aliveSessions.get(hash.update(sessionId).digest('hex'))
}

function getSessionMark(sessionId) {
    const hmac = crypto.createHmac(HASH_ALGORITHM, SECRET_KEY)
    return hmac.update(sessionId).digest('hex')
}

function getAppCookies(req) {
    if (req.headers.cookie) {
        const rawCookies = req.headers.cookie.split('; ')

        const parsedCookies = {}
        rawCookies.forEach(rawCookie=>{
            const parsedCookie = rawCookie.split('=')
            parsedCookies[parsedCookie[0]] = parsedCookie[1]
        })
        return parsedCookies
    }
    return null
}

function removeAppCookies(resp) {
    resp.setHeader('Set-Cookie', [`${SESSION_ID_COOKIE}=expired; Max-Age=-99999999`])
    resp.setHeader('Set-Cookie', [`${SESSION_MARK_COOKIE}=expired; Max-Age=-99999999`])
}

function setSessionId(resp, sid) {
    resp.setHeader('Set-Cookie', [`${SESSION_ID_COOKIE}=${sid}; Path=/`])
}

function setSessionMark(resp, mark) {
    resp.setHeader('Set-Cookie', [`${SESSION_MARK_COOKIE}=${mark}; Path=/`])
}

function getSessionIdCookie(req) {
    const cookies = getAppCookies(req)
    let sessionId
    if (cookies) {
        sessionId = cookies[SESSION_ID_COOKIE]
    }
    return sessionId
}

function validateSession(req) {
    const cookies = getAppCookies(req)

    let sessionId
    let mark
    if (cookies) {
        sessionId = cookies[SESSION_ID_COOKIE]
        mark = cookies[SESSION_MARK_COOKIE]
    } 
    
    if (sessionId && mark) {
        const hmac = crypto.createHmac(HASH_ALGORITHM, SECRET_KEY)
        const generatedMark = hmac.update(sessionId).digest('hex')
        if (generatedMark == mark) {
            const hash = crypto.createHash(HASH_ALGORITHM)
            if (aliveSessions.has(hash.update(sessionId).digest('hex'))) {
                return sessionId
            }
        }
    }
    return null
}

module.exports = {
    generateSessionId,
    getSessionUserId,
    getSessionMark,
    addSession,
    removeSession,
    getAppCookies,
    getSessionIdCookie,
    removeAppCookies,
    setSessionId,
    setSessionMark,
    validateSession
}