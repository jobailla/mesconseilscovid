// eslint-disable-next-line no-extra-semi
;(function (window) {
    'use strict'

    var location = window.location
    var document = window.document
    var plausibleHost = document.body.dataset.statsUrl

    var CONFIG = { domain: location.hostname }

    function ignore(reason) {
        console.warn('[Plausible] Ignore event: ' + reason)
    }

    function getUrl() {
        return (
            location.protocol +
            '//' +
            location.hostname +
            location.pathname +
            location.hash.slice(1)
        )
    }

    function getSourceFromQueryParam() {
        var result = location.search.match(/[?&](ref|source|utm_source)=([^?&]+)/)
        return result ? result[2] : null
    }

    function trigger(eventName, options) {
        if (document.visibilityState === 'prerender') return ignore('prerendering')

        var payload = {}
        payload.name = eventName
        payload.url = getUrl()
        payload.domain = CONFIG['domain']
        payload.referrer = document.referrer || null
        payload.source = getSourceFromQueryParam()
        payload.user_agent = window.navigator.userAgent
        payload.screen_width = window.innerWidth

        if (
            /^localhost$|^127(?:\.[0-9]+){0,2}\.[0-9]+$|^(?:0*:)*?:?0*1$/.test(
                location.hostname
            ) ||
            location.protocol === 'file:'
        ) {
            ignore('running locally')
            window.app._plausibleTrackingEvents.push(
                `${payload.name}:${location.hash.slice(1)}`
            )
            console.debug('[Plausible]', payload)
            return
        }
        var request = new XMLHttpRequest()
        request.open('POST', plausibleHost + '/api/event', true)
        request.setRequestHeader('Content-Type', 'text/plain')

        request.send(JSON.stringify(payload))

        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                options && options.callback && options.callback()
            }
        }
    }

    function page() {
        trigger('pageview')
    }

    try {
        var his = window.history
        if (his.pushState) {
            var originalPushState = his['pushState']
            his.pushState = function () {
                originalPushState.apply(this, arguments)
                page()
            }
            window.addEventListener('popstate', page)
        }

        var queue = (window.plausible && window.plausible.q) || []
        window.plausible = trigger
        for (var i = 0; i < queue.length; i++) {
            trigger.apply(this, queue[i])
        }

        page()
    } catch (e) {
        new Image().src =
            plausibleHost + '/api/error?message=' + encodeURIComponent(e.message)
    }
})(window)
