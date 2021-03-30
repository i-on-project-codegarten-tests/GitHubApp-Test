'use strict'

const router = require('express').Router()
const request = require('request')
const users = require('../repo/users')
const sessions = require('../repo/sessions')
const github = require('../repo/github').init(GITHUB_APP_ID, GITHUB_APP_NAME)
const installations = require('../repo/installations')

const GITHUB_APP_NAME = 'CHANGE-ME'
const GITHUB_APP_ID = 123456
const GITHUB_CLIENT_ID = 'CHANGE-ME'
const GITHUB_CLIENT_SECRET = 'CHANGE-ME'
const GITHUB_AUTH_ENDPOINT = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'
const GITHUB_AUTH_CALLBACK = 'auth/github'

router.get('/', (req, resp) => {
    const sessionId = sessions.validateSession(req)
    if (sessionId) {
        const user = users.getUserInfo(sessions.getSessionUserId(sessionId))
        let toSend = `<a href=/logout>Logout ${user.userId}</a><br>`
        toSend += `<a href=/orgs>See organizations of ${user.githubName}</a><br>`

        toSend += `<h1>Welcome to ${GITHUB_APP_NAME}</h1>`
        return resp.end(toSend) 
    }
    sessions.removeAppCookies(resp)
    resp.end(`<a href=/login/>Use GitHub Account</a><br><br><h1>Welcome to ${GITHUB_APP_NAME}</h1>`) 
})

router.get('/login', (req, resp) => {
    if (sessions.validateSession(req)) {
        return resp.redirect(302, '/')
    }

    const sessionId = sessions.generateSessionId()
    sessions.setSessionId(resp, sessionId)

    resp.redirect(302,
        `${GITHUB_AUTH_ENDPOINT}`                                                   // authorization endpoint
        + `?client_id=${GITHUB_CLIENT_ID}`                                          // Client id
        + `&state=${sessionId}`                                                     // bind the user's session to a request/response
        + '&response_type=code'                                                     // response_type for "authorization code grant"
        + `&redirect_uri=http://${req.headers.host}/${GITHUB_AUTH_CALLBACK}`        // redirect uri
    )
})

router.get('/auth/github', (req, resp, next) => {
    if (req.query.err) {
        return resp.redirect(302, '/')
    }

    const sessionId = sessions.getSessionIdCookie(req)

    const userSessionId = req.query.state
    if (sessionId && sessionId == userSessionId) {
        request.post(
            { 
                url: GITHUB_TOKEN_ENDPOINT,
                form: {
                    code: req.query.code,
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    redirect_uri: `http://${req.headers.host}/${GITHUB_AUTH_CALLBACK}`,
                    state: sessionId
                },
                headers: {
                    'Accept': 'application/json' 
                }
            }, 
            (err, httpResponse, body) => {
                if (err) {
                    return next(err)
                }
                const jsonResponse = JSON.parse(body)
                const accessToken = jsonResponse.access_token
                github.getGithubUsername(accessToken, (err, username, userId) => {
                    if (err) {
                        return next(err)
                    }

                    sessions.addSession(userSessionId, userId)
                    users.addUser(userId, username, accessToken)
                    sessions.setSessionMark(resp, sessions.getSessionMark(userSessionId))

                    resp.redirect(302, '/')
                })
            })
    } else {
        // If the user didn't follow the complete authentication path
        const error = {
            status: 400,  // Bad Request
            msg: 'Invalid session'
        }
        next(error)
    }
})

router.get('/logout', (req, resp, next) => {
    const sessionId = sessions.getSessionIdCookie(req)
    if (sessionId) {
        sessions.removeAppCookies(resp)
        sessions.removeSession(sessionId)
        resp.redirect(302, '/')
    } else {
        const err = {
            status: 400,  // Bad Request
            msg: 'No active session'
        }
        next(err)
    }
})

router.get('/orgs/:orgId/repos', (req, resp, next) => {
    const sessionId = sessions.validateSession(req)
    if (sessionId) {
        const orgId = req.params.orgId

        installations.getInstallationToken(orgId, (err, tok, installId) => {
            if (err) return next(err)

            github.getRepositories(tok, (err, repos) => {
                if (err) return next(err)

                let toSend = '<html><meta charset="UTF-8"> <a href=/>Home</a> <a href=/orgs>Organizations</a><br><h1>List of Repos</h1>'
                toSend += `<a href=/orgs/${orgId}/repos/new>Create a new repo!</a><br><br>`
                repos.forEach(repo => {
                    toSend += `${repo.name}<br>` 
                })
                resp.end(toSend)
            })
        })
    } else {
        const error = {
            status: 400,  // Bad Request
            msg: 'Invalid session'
        }
        next(error)
    }
})

router.get('/orgs', (req, resp, next) => {
    const sessionId = sessions.validateSession(req)

    if (sessionId) {
        const user = users.getUserInfo(sessions.getSessionUserId(sessionId))
        github.getOrganizations(user.githubAccessToken, (err, orgs) => {
            if (err) return next(err)
            let toSend = '<a href=/>Home</a><br><h1>List of Organizations</h1>'
            toSend += '<a href=https://github.com/apps/codegarten-test-2/installations/new/>Install to more organizations!</a><br><br>'
            orgs.forEach(org => {
                toSend += `<a href=/orgs/${org.id}/repos>${org.name}</a><br>`
            })
            resp.end(toSend)
        })
    } else {
        const error = {
            status: 400,  // Bad Request
            msg: 'Invalid session'
        }
        next(error)
    }
})

router.get('/orgs/install', (req, resp, next) => {
    const sessionId = sessions.validateSession(req)

    if (sessionId) {
        const installationId = req.query.installation_id

        github.getInstallationOrg(installationId, (err, orgId, orgName) => {
            installations.addInstallation(orgId, installationId)
            resp.redirect(302, '/orgs')
        })
    } else {
        const error = {
            status: 400,  // Bad Request
            msg: 'Invalid session'
        }
        next(error)
    }
})

router.get('/orgs/:orgId/repos/new', (req, resp, next) => {
    const sessionId = sessions.validateSession(req)
    if (sessionId) {
        const orgId = req.params.orgId

        installations.getInstallationToken(orgId, (err, tok, installId) => {
            if (err) return next(err)

            github.createRepo(tok, installId, (err) => {
                if (err) return next(err)
                resp.redirect(302, `/orgs/${orgId}/repos`)
            })
        })
    } else {
        const error = {
            status: 400,  // Bad Request
            msg: 'Invalid session'
        }
        next(error)
    }
})

module.exports = router