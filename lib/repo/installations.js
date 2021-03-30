const github = require('./github')

// Maps org id to installations
const installations = new Map()

function addInstallation(orgId, installationId) {
    installations.set(orgId, 
        {
            installationId: installationId,
            token: '',
            exp: ''
        })
}

function getInstallationToken(orgId, cb) {
    const install = installations.get(Number(orgId))

    if (install.token == '' || Date.parse(install.exp) <= new Date().getTime()) {
        github.getInstallationToken(install.installationId, (err, token, exp) => {
            if (err) {
                return cb(err)
            }
    
            install.token = token
            install.exp = exp

            cb(null, install.token, install.installationId)
        })
    } else {
        cb(null, install.token, install.installationId)
    }
}

module.exports = {
    addInstallation,
    getInstallationToken
}