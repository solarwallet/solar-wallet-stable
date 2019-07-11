const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const request = require('request-promise')
const VERSION = require('../dist/chrome/manifest.json').version
const fs = require('fs')

publishRelease().then(function () {
  console.log('Published')
})

/**
 * Creates release. Adds tag from the current commit, current version is used as part of the tag name.
 * Then uploads assets that were created while building.
 * @returns {Promise.<void>}
 */
async function publishRelease () {
  const CIRCLE_SHA1 = process.env.CIRCLE_SHA1
  console.log(`VERSION: ${VERSION}, CIRCLE_SHA1: ${CIRCLE_SHA1}`)
  let releaseId
  const CREATE_RELEASE_URI = `https://api.github.com/repos/poanetwork/solar-wallet/releases`
  console.log(`CREATE_RELEASE_URI: ${CREATE_RELEASE_URI}`)
  let changelog = ''
  try {
    changelog = fs.readFileSync('./CHANGELOG.md').toString().split(VERSION)[1].split('##')[0].trim()
  } catch (err) {
    console.error(`Error in getting changelog: ${err}`)
  }
  // remove first line with date
  const newLineIndex = changelog.indexOf('\n')
  let changes = 'New release is ready.'
  if (newLineIndex !== -1) {
    changes = changelog.slice(newLineIndex + 1)
  }
  console.log(`changes: ${changes}`)

  request({
    method: 'POST',
    uri: CREATE_RELEASE_URI,
    headers: {
      'User-Agent': 'Solar Wallet',
      'Authorization': `token ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      body: changes,
      tag_name: `v${VERSION}`,
      name: `Version ${VERSION}`,
      target_commitish: CIRCLE_SHA1,
      draft: true,
    }),
  }).then(async function (response) {
    console.log('response: ' + response)
    releaseId = JSON.parse(response).id
    console.log(`releaseId: ${releaseId}`)

    return uploadAsset(`./builds/solarwallet-chrome-${VERSION}.zip`, `solarwallet-chrome-${VERSION}.zip`, releaseId)
      .then(() => {
        return uploadAsset(`./builds/solarwallet-firefox-${VERSION}.zip`, `solarwallet-firefox-${VERSION}.zip`, releaseId)
      })
      .then(() => {
        return uploadAsset(`./builds/solarwallet-edge-${VERSION}.zip`, `solarwallet-edge-${VERSION}.zip`, releaseId)
      })
      .then(() => {
        return uploadAsset(`./builds/solarwallet-opera-${VERSION}.zip`, `solarwallet-opera-${VERSION}.zip`, releaseId)
      })
  }).catch(function (err) {
    console.error('error in request:' + err)
    throw err
  })
}

/**
 * Uploads asset to the created release
 * @param path - where file is located
 * @param name - will be displayed on the release page
 * @param releaseId - id or the release obtained after release creation
 * @returns {Promise.<*>}
 */
async function uploadAsset (path, name, releaseId) {
  const UPLOAD_ASSET_URL = `https://uploads.github.com/repos/poanetwork/solar-wallet/releases/${releaseId}/assets?name=${name}&label=${name}`
  console.log(`UPLOAD_ASSET_URL: ${UPLOAD_ASSET_URL}`)
  return request({
    method: 'POST',
    uri: UPLOAD_ASSET_URL,
    body: fs.readFileSync(path),
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/zip',
      'User-Agent': 'Solar Wallet',
    },
  })
}
