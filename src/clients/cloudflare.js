export class Cloudflare {
    constructor(email, apiKey) {
        this.baseURL = 'https://api.cloudflare.com'
        this.email = email
        this.apiKey = apiKey
    }

    /**
     * @returns {Promise<*>}
     */
    async accounts() {
        return this.#request('GET', '/client/v4/accounts')
    }

    /**
     * @returns {Promise<*>}
     */
    async zones() {
        return this.#request('GET', '/client/v4/zones')
    }

    async addDomain(domainName) {
        return this.#request('POST', '/client/v4/zones', {
            name: domainName,
        })
    }

    /**
     * @param zoneId
     * @param record
     * @returns {Promise<*>}
     */
    setDNSRecord(zoneId, record) {
        return this.#request('POST', `/client/v4/zones/${zoneId}/dns_records`, record)
    }

    /**
     * @param zoneId
     * @param recordId
     * @returns {Promise<*>}
     */
    deleteDNSRecord(zoneId, recordId) {
        return this.#request('DELETE', `/client/v4/zones/${zoneId}/dns_records/${recordId}`)
    }

    /**
     * @param zoneId
     * @returns {Promise<*>}
     */
    listDNSRecords(zoneId) {
        return this.#request('GET', `/client/v4/zones/${zoneId}/dns_records`)
    }

    /**
     * @param method
     * @param path
     * @param body
     * @returns {Promise<*>}
     */
    async #request(method, path, body = {}) {
        const opts = {
            method,
            headers: {
                'X-Auth-Email': this.email,
                'X-Auth-Key': this.apiKey,
            },
        }

        if (method === 'POST') {
            opts.headers['Content-Type'] = 'application/json'
            opts.body = JSON.stringify(body)
        }

        try {
            const response = await fetch(this.baseURL + path, opts)
            const json = await response.json()

            if (!response.ok) {
                console.error(
                    `Request to ${this.baseURL + path} failed with status: ${
                        response.status
                    }`,
                )
                return { error: json, status: response.status }
            }

            return json
        } catch (err) {
            console.error(
                `Network error for request to ${this.baseURL + path}: ${
                    err.message
                }`,
            )
        }
    }
}
