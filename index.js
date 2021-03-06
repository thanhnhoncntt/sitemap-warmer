#!/usr/bin/env node
const url = require('url');
const SitemapXMLParser = require('sitemap-xml-parser')
const Sitemap = require('./sitemap')
const Warmer = require('./warmer')
const utils = require('./utilities')
const fetch = require('node-fetch')
const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0' + ' domain.com')
    .alias('v', 'version')
    .alias('h', 'help')
    .alias('r', 'range')
    .describe('range', 'Only warm up URLs with lastModified newer than this value (in seconds). Default: 300s (5' +
        ' minutes)')
    .default('range', 300)
    .alias('d', 'delay')
    .describe('delay', 'Delay (in milliseconds) between each warm up call. If you using the low-end hosting, keep this' +
        ' value higher. Default: 500ms')
    .default('delay', 500)
    .describe('images', 'Enable images warm up. Default: true')
    .default('images', true)
    .describe('css', 'Enable CSS warm up. Default: true')
    .default('css', true)
    .describe('js', 'Enable Javascript warm up. Default: true')
    .default('js', true)
    .alias('a', 'all')
    .describe('all', 'Ignore --range parameter and warm up all URLs in sitemap')
    .alias('q', 'quite')
    .describe('quite', 'Disable debug logging if you feel it\'s too much')
    .argv

const Logger = require('logplease');
const logger = Logger.create('main', {
    useLocalTime: true,
});

if (argv.quite) {
    Logger.setLogLevel(Logger.LogLevels.INFO)
}

const settings = {
    all: argv.all,
    sitemap: process.argv[2],
    domain: null,
    newer_than: argv.range,
    delay: argv.delay,
    warmup_images: argv.images,
    warmup_css: argv.css,
    warmup_js: argv.js,
}

settings.sitemap = utils.tryValidURL(settings.sitemap)
settings.sitemap = new URL(settings.sitemap)

if (utils.isValidURL(settings.sitemap) === false) {
    logger.error(`Please specific an valid URL! Your URL ${settings.sitemap} seems not correct.`)
    process.exit()
}

if (settings.sitemap.pathname === '/') {
    settings.sitemap = new URL('/sitemap.xml', settings.sitemap.href)
}

settings.domain = `${settings.sitemap.protocol}//${settings.sitemap.hostname}`

// Pre-check for issue: https://github.com/tdtgit/sitemap-warmer/issues/4
fetch(settings.sitemap.href).then((res) => {
    if (res.ok === false) {
        throw new Error(res.statusText)
    }
}).then(() => {
    const sitemapXMLParser = new SitemapXMLParser(settings.sitemap.href, {delay: 3000})
    logger.info(`???? Getting sitemap from ${settings.sitemap.href}`)
    sitemapXMLParser.fetch().then(urls => {
        let sitemap = new Sitemap(settings)
        urls.forEach(url => {
            sitemap.addURL(url)
        })

        let warmer = new Warmer(sitemap, settings)
        warmer.warmup().then(r => r)
    })
}).catch(error => {
    logger.error(error)
})
