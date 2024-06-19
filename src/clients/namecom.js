export class NameCom {
    constructor(username, rawToken) {
        this.baseURL = 'https://api.name.com'
        this.username = username
        this.rawToken = rawToken
        this.token = Buffer.from(`${this.username}:${this.rawToken}`).toString('base64')
    }

    /**
     * @returns {Promise<*>}
     */
    async domains() {
        return this.#request('GET', '/v4/domains')
    }

    /**
     * @param keyword
     * @param maxPrice
     * @returns {Promise<*>}
     */
    async getCheapestAvailableDomain(keyword, maxPrice = +Infinity) {
        const response = await this.#request('POST', '/v4/domains:search', {
            keyword,
        })
        const sortedByPrice = response.results
            .filter(domain => domain.purchasable)
            .filter(domain => domain.purchasePrice <= maxPrice)
            .sort((a, b) => a.purchasePrice - b.purchasePrice)
        return sortedByPrice[0]
    }

    /**
     * @param domain
     * @returns {Promise<*>}
     */
    async buyDomain(domain) {
        return this.#request('POST', '/v4/domains', {
            domain: {
                domainName: domain.domainName,
            },
            purchasePrice: domain.purchasePrice,
            purchaseType: domain.purchaseType,
        })
    }

    /**
     * @param domainName
     * @returns {Promise<*>}
     */
    async disableAutoRenew(domainName) {
        return this.#request('POST', `/v4/domains/${domainName}:disableAutorenew`, {})
    }

    /**
     * @param domainName
     * @param nameservers
     * @returns {Promise<*>}
     */
    async setNameServers(domainName, nameservers) {
        return this.#request('POST', `/v4/domains/${domainName}:setNameservers`, {
            nameservers,
        })
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
            headers: { 'Authorization': 'Basic ' + this.token },
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
