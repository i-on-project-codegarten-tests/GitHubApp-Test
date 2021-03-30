'use strict'

/**
 * @typedef UserInfo
 * @property {String} userId
 * @property {String} githubAccessToken
 * @property {String} githubName
 */

// Maps user email to access token and current session id
const users = new Map()

function getUserInfo(userId) {
    return users.get(userId)
}

function addUser(userId, username, githubAccessToken) {
    const user = users.get(userId)
    if (user) {
        user.githubAccessToken = githubAccessToken
    } else {
        users.set(userId, 
            {
                userId: userId,
                githubName: username,
                githubAccessToken: githubAccessToken
            })
    }
}

module.exports = {
    addUser,
    getUserInfo
}