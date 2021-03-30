'use strict'

const request = require('request')
const jwt = require('jsonwebtoken')
const fs = require('fs')

let GITHUB_APP_ID
let GITHUB_APP_NAME
const GITHUB_APP_PRIVATEKEY = fs.readFileSync(`${__dirname}/../../keys/private_key.pem`)

const GITHUB_API_HOST = 'https://api.github.com'
const GITHUB_USER_ENDPOINT = 'user'
const GITHUB_ORGANIZATIONS_ENDPOINT = 'user/orgs'

function getGithubUsername(accessToken, cb) {
    request.get({
        url: `${GITHUB_API_HOST}/${GITHUB_USER_ENDPOINT}`,
        headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': GITHUB_APP_NAME
        }
    }, (err, resp, body) => {
        if (err) {
            return cb(err)
        }
        const jsonResponse = JSON.parse(body)
        cb(null, jsonResponse.login, jsonResponse.id)
    })
}

function getOrganizations(accessToken, cb) {
    request.get({
        url: `${GITHUB_API_HOST}/${GITHUB_ORGANIZATIONS_ENDPOINT}`,
        headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': GITHUB_APP_NAME
        }
    }, (err, resp, body) => {
        if (err) {
            return cb(err)
        }
        const jsonResponse = JSON.parse(body)
        const repositories = []
        jsonResponse.forEach(org => {
            repositories.push( { name: org.login, id: org.id })
        })
        cb(null, repositories)
    })
}

function getRepositories(accessToken, cb) {
    request.get({
        url: `${GITHUB_API_HOST}/installation/repositories`,
        headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': GITHUB_APP_NAME
        }
    }, (err, resp, body) => {
        if (err) {
            return cb(err)
        }
        const jsonResponse = JSON.parse(body)
        const repositories = []
        jsonResponse.repositories.forEach(repo => {
            repositories.push( { name: repo.name, id: repo.id })
        })
        cb(null, repositories)
    })
}

function createRepo(accessToken, installId, cb) {
    getInstallationOrg(installId, (err, orgId, orgName) => {
        if (err) {
            return cb(err)
        }

        request.post({
            url: `${GITHUB_API_HOST}/orgs/${orgName}/repos`,
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/json',
                'User-Agent': GITHUB_APP_NAME
            },
            body: JSON.stringify({
                name: 'repo-created-by-bot'
            })
        }, (err, resp, body) => {
            if (err) {
                return cb(err)
            }
            const jsonResponse = JSON.parse(body)
            cb(null, jsonResponse)
        })
    })
}

function getInstallationOrg(installationId, cb) {
    request.get({
        url: `${GITHUB_API_HOST}/app/installations/${installationId}`,
        headers: {
            'Authorization': `Bearer ${getAppJwt()}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': GITHUB_APP_NAME
        }
    }, (err, resp, body) => {
        if (err) {
            return cb(err)
        }
        const jsonResponse = JSON.parse(body)
        cb(null, jsonResponse.account.id, jsonResponse.account.login)
    })
}

function getInstallationToken(installationId, cb) {
    request.post({
        url: `https://api.github.com/app/installations/${installationId}/access_tokens`,
        headers: {
            'Authorization': `Bearer ${getAppJwt()}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': GITHUB_APP_NAME
        }
    }, (err, resp, body) => {
        if (err) {
            return cb(err)
        }
        const jsonResponse = JSON.parse(body)
        cb(null, jsonResponse.token, jsonResponse.expires_at)
    })
}

function getAppJwt() {
    const currDateSeconds = Math.round(new Date().getTime() / 1000)

    const jwtPayload = {
        iat: currDateSeconds - 60,
        exp: currDateSeconds + (10 * 60),
        iss: GITHUB_APP_ID
    }

    const options = {
        algorithm: 'RS256'
    }

    return jwt.sign(jwtPayload, GITHUB_APP_PRIVATEKEY, options)
}

function init(appId, appName) {
    GITHUB_APP_ID = appId
    GITHUB_APP_NAME = appName
    return API
}

const API = {
    getGithubUsername,
    getOrganizations,
    getInstallationOrg,
    getRepositories,
    createRepo,
    getAppJwt,
    getInstallationToken
}

module.exports = { init }