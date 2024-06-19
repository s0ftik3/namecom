import { NameCom } from './clients/namecom.js'
import { generateRandomDomainName } from './utils/domain-name.js'
import { Cloudflare } from './clients/cloudflare.js'
import fs from 'fs'

const SERVER_IP = ''

const namecom = new NameCom('', '')
const cloudflare = new Cloudflare('', '')

async function buyDomain() {
    console.log('Starting the buying process...')

    const randomDomainName = generateRandomDomainName()
    console.log(`Looking for the cheapest domain with name "${randomDomainName}"...`)

    const domain = await namecom.getCheapestAvailableDomain(randomDomainName, 5)
    if (!domain) {
        throw new Error(`Failed to find purchasable domain with name "${randomDomainName}"`)
    }
    console.log(`Purchasable domain found: "${domain.domainName}", price ${domain.purchasePrice}, renewal price ${domain.renewalPrice}`)

    console.log('Trying to buy the domain...')
    const purchasedDomain = await namecom.buyDomain(domain)
    if (!purchasedDomain) {
        throw new Error(`Failed to buy domain. Raw response: ${JSON.stringify(purchasedDomain)}`)
    }
    console.log(`Successfully bought domain "${domain.domainName}"!`)
    console.log({ purchasedDomain })

    console.log(`Disabling auto-renew for domain "${domain.domainName}"...`)
    const disableAutoRenewResponse = await namecom.disableAutoRenew(domain.domainName)
    if (!disableAutoRenewResponse) {
        throw new Error(`Failed to disable auto-renew. Raw response: ${JSON.stringify(purchasedDomain)}`)
    }
    console.log(`Successfully disabled auto-renew for domain "${domain.domainName}"!`)

    console.log('The buying process is finished!')
    return purchasedDomain.domain
}

async function addDomainToCloudflare(domain) {
    console.log(`Adding domain "${domain.domainName}" to Cloudflare...`)

    const response = await cloudflare.addDomain(domain.domainName)
    if (!response || !response.success) {
        throw new Error(`Failed to add domain to Cloudflare. Raw response: ${JSON.stringify(response)}`)
    }

    console.log(`Successfully added domain "${domain.domainName}" to Cloudflare!`)
    return {
        zone_id: response.result.id,
        name_servers: response.result.name_servers,
    }
}

async function setNameServers(domain, nameservers) {
    console.log(`Updating nameservers for domain "${domain.domainName}"...`)

    const response = await namecom.setNameServers(domain.domainName, nameservers)
    if (!response) {
        throw new Error(`Failed to set nameservers. Raw response: ${JSON.stringify(response)}`)
    }

    console.log(`Successfully updated nameservers for domain "${domain.domainName}"!`)
}

async function setDNSRecords(domain, zoneId) {
    console.log(`Setting DNS records for domain "${domain.domainName}"...`)

    const records = [
        { type: 'A', name: domain.domainName, content: SERVER_IP, ttl: 1, proxied: true },
        { type: 'A', name: 'www', content: SERVER_IP, ttl: 1, proxied: true },
    ]

    for (const record of records) {
        const response = await cloudflare.setDNSRecord(zoneId, record)
        if (!response || !response.success) {
            throw new Error(`Failed to add DNS to Cloudflare. Raw response: ${JSON.stringify(response)}`)
        }
        console.log(`Added DNS record for domain "${domain.domainName}"...`)
    }

    console.log(`Successfully added all the DNS records for domain "${domain.domainName}"!`)
}

async function writeDomainToFile(domain) {
    const content = JSON.parse(fs.readFileSync('./urls.json', { encoding: 'utf8' }))
    content.push({ url: 'https://' + domain.domainName })
    await fs.writeFile('./urls.json', JSON.stringify(content, null, 4), () => {
    })
    console.log(`Wrote domain "${domain.domainName}" to file. Total domains: ${content.length}`)
}

async function main(count = 1) {
    for (let i = 0; i < 5; i++) {
        try {
            const domain = await buyDomain()
            const { zone_id, name_servers } = await addDomainToCloudflare(domain)

            await setNameServers(domain, name_servers)
            await setDNSRecords(domain, zone_id)
            await writeDomainToFile(domain)
        } catch (e) {
            console.error(e)
            console.log(`Skipping iteration ${i}`)
        }
    }
}

async function checkDomains() {
    const urls = JSON.parse(fs.readFileSync('./urls.json', { encoding: 'utf8' }))
    const active = []
    const unavailable = []

    for (const { url } of urls) {
        try {
            const response = await fetch(url, {
                method: 'GET',
            })

            if (response.status === 404) {
                active.push(url)
            } else {
                unavailable.push(url)
            }
        } catch (e) {
            unavailable.push(url)
        }
    }

    console.log(`Active: ${active.length}; Pending: ${unavailable.length}`)
}

// main(5)
