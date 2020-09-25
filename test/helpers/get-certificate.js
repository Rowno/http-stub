// Modified fork of https://github.com/johncrisostomo/get-ssl-certificate
import https from 'https'
import { URL } from 'url'

function pemEncode(rawCert) {
  const stringCert = rawCert.toString('base64')

  const lines = []
  for (let i = 0; i <= stringCert.length; i += 64) {
    lines.push(stringCert.substr(i, 64))
  }
  const cert = lines.join('\r\n')

  return `-----BEGIN CERTIFICATE-----\r\n${cert}\r\n-----END CERTIFICATE-----\r\n`
}

export default function getCertificate(href) {
  const url = new URL(href)

  const options = {
    hostname: url.hostname,
    port: url.port,
    agent: false,
    rejectUnauthorized: false,
    ciphers: 'ALL',
  }

  return new Promise((resolve, reject) => {
    const req = https.get(options, (res) => {
      const certificate = res.socket.getPeerCertificate()
      if (!certificate) {
        return reject(new Error('The website did not provide a certificate'))
      }

      if (certificate.raw) {
        certificate.cert = pemEncode(certificate.raw)
      }

      resolve(certificate)
    })

    req.once('error', reject)

    req.end()
  })
}
