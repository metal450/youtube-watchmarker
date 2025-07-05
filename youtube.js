'use strict';

let strLastchange = null;
let intWatchdate = {};
let objObservers = new WeakMap();
let isRefreshing = false; // Guard against infinite loops
let lastRefreshTime = 0; // Throttle refreshes

// ##########################################################

let videos = function(strIdent) {
    
    let selectors = [
        'a.ytd-thumbnail[href^="/watch?v=' + strIdent + '"]', // regular
        'a.yt-lockup-view-model-wiz__content-image[href^="/watch?v=' + strIdent + '"]', // regular
        'ytd-compact-video-renderer a.yt-simple-endpoint[href^="/watch?v=' + strIdent + '"]', // regular
        'a.ytp-ce-covering-overlay[href*="/watch?v=' + strIdent + '"]', // overlays
        'a.ytp-videowall-still[href*="/watch?v=' + strIdent + '"]', // videowall
        'a.ytd-thumbnail[href^="/shorts/' + strIdent + '"]', // shorts
        'a.ShortsLockupViewModelHostEndpoint[href^="/shorts/' + strIdent + '"]', // shorts
        'a.reel-item-endpoint[href^="/shorts/' + strIdent + '"]', // shorts
        // Mobile selectors - more permissive to catch all variations
        'a.media-item-thumbnail-container[href*="' + strIdent + '"]', // mobile thumbnails
        'a.media-item-extra-endpoint[href*="' + strIdent + '"]', // mobile extra endpoints
        'a[href*="/watch?v=' + strIdent + '"]', // any link with the video ID
        'a[href*="' + strIdent + '"]', // any link containing the video ID
        'a[data-vid="' + strIdent + '"]', // mobile with data-vid attribute
    ];
    
    let result = Array.from(window.document.querySelectorAll(selectors.join(', ')));
    return result;
};

let refresh = function() {
    // Prevent infinite loops and throttle refreshes
    const now = Date.now();
    if (isRefreshing || (now - lastRefreshTime < 1000)) {
        return;
    }
    
    isRefreshing = true;
    lastRefreshTime = now;
    
    let objVideos = videos('');

    // For mobile YouTube, we need to handle the URLs differently
    const isMobileYoutube = window.location.href.includes('m.youtube.com');
    
    for (let objVideo of objVideos) {
        // Extract video ID more reliably for both desktop and mobile
        let strIdent;
        if (objVideo.href) {
            // Try multiple regex patterns to extract video ID
            let match = objVideo.href.match(/[?&]v=([^&]{11})/);
            if (match && match[1]) {
                strIdent = match[1];
            } else {
                // Try matching /watch?v=VIDEO_ID pattern (mobile)
                match = objVideo.href.match(/\/watch\?v=([^&]{11})/);
                if (match && match[1]) {
                    strIdent = match[1];
                } else {
                    // Try matching /shorts/VIDEO_ID pattern
                    match = objVideo.href.match(/\/shorts\/([^/?&]{11})/);
                    if (match && match[1]) {
                        strIdent = match[1];
                    } else {
                        // Last resort fallback
                        strIdent = objVideo.href.split('&')[0].slice(-11);
                    }
                }
            }
        } else {
            // Skip elements without href
            continue;
        }
        
        let strTitle = '';
        

        mark(objVideo, strIdent);

        observe(objVideo);

        if (intWatchdate.hasOwnProperty(strIdent) === true) {
            continue;
        }

        // Try to find the title - different selectors for mobile vs desktop
        if (window.location.href.includes('m.youtube.com')) {
            // Mobile YouTube title extraction
            for (let intTitle = 0, objTitle = objVideo.parentNode; intTitle < 8; intTitle += 1, objTitle = objTitle.parentNode) {
                // Try various mobile selectors
                const titleElement = 
                    objTitle.querySelector('.media-item-headline') || 
                    objTitle.querySelector('.compact-media-item-headline') ||
                    objTitle.querySelector('.media-item-metadata');
                
                if (titleElement) {
                    strTitle = titleElement.innerText.trim();
                    break;
                }
            }
        } else {
            // Desktop YouTube title extraction
            for (let intTitle = 0, objTitle = objVideo.parentNode; intTitle < 5; intTitle += 1, objTitle = objTitle.parentNode) {
                if (objTitle.querySelector('#video-title') !== null) {
                    strTitle = objTitle.querySelector('#video-title').innerText.trim();
                    break;
                }
            }
        }

        chrome.runtime.sendMessage({
            'strMessage': 'youtubeLookup',
            'strIdent': strIdent,
            'strTitle': strTitle
        }, function(objResponse) {
            if (objResponse !== null) {
                intWatchdate[objResponse.strIdent] = objResponse.intTimestamp;

                for (let objVideo of videos(objResponse.strIdent)) {
                    mark(objVideo, objResponse.strIdent);
                }
            }
        });
    }
    
    strLastchange = window.location.href + ':' + window.document.title + ':' + objVideos.length;
    
    // Reset the refreshing flag immediately
    isRefreshing = false;
};

let mark = function(objVideo, strIdent) {
    if ((intWatchdate.hasOwnProperty(strIdent) === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

        if (intWatchdate[strIdent] !== 0) {
            objVideo.setAttribute('watchdate', ' - ' + new Date(intWatchdate[strIdent]).toISOString().split('T')[0].split('-').join('.'));
        }

    } else if ((intWatchdate.hasOwnProperty(strIdent) !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');

        if (objVideo.hasAttribute('watchdate') === true) {
            objVideo.removeAttribute('watchdate');
        }

    }
};

let observe = function(objVideo) {
    if (objObservers.has(objVideo) === true) {
        return;
    }

    let objObserver = new MutationObserver(function() {
        mark(objVideo, objVideo.href.split('&')[0].slice(-11));
    });

    objObserver.observe(objVideo, {'attributes': true, 'attributeFilter': ['href']});

    objObservers.set(objVideo, objObserver);
};

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData, objSender, funcResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();

    } else if (objData.strMessage === 'youtubeMark') {
        intWatchdate[objData.strIdent] = objData.intTimestamp;

        let videoElements = videos(objData.strIdent);
        for (let objVideo of videoElements) {
            mark(objVideo, objData.strIdent);
        }

    }

    funcResponse(null);
});

// ##########################################################

document.addEventListener('yt-service-request-completed', function() {
    strLastchange = null; // there is a chance that this is not sufficient, the page may not be updated yet so if the interval function triggers it may have been too soon
});

document.addEventListener('yt-navigate-finish', function() {
    strLastchange = null; // there is a chance that this is not sufficient, the page may not be updated yet so if the interval function triggers it may have been too soon
});

// For mobile YouTube - additional event listeners
if (window.location.href.includes('m.youtube.com')) {
    
    // Listen for page changes
    window.addEventListener('scroll', function() {
        // Throttle the refresh on scroll
        if (Date.now() - lastRefreshTime > 2000) {
            strLastchange = null; // Force refresh
        }
    });
    
    // Listen for navigation events
    window.addEventListener('popstate', function() {
        strLastchange = null; // Force refresh
    });
    
    // Periodic refresh for mobile
    setInterval(function() {
        if (!isRefreshing && Date.now() - lastRefreshTime > 5000) {
            strLastchange = null; // Force refresh
        }
    }, 5000);
}

// Use a variable to track the last time we refreshed
let lastIntervalRefreshTime = 0;

window.setInterval(function() {
    if (document.hidden === true) {
        return;
    }
    
    // Throttle refreshes to once every 3 seconds
    const now = Date.now();
    if (now - lastIntervalRefreshTime < 3000) {
        return;
    }
    
    // Don't call videos() here as it triggers DOM queries that can cause loops
    // Only check if the URL or title changed
    const currentState = window.location.href + ':' + window.document.title;
    if (strLastchange && strLastchange.startsWith(currentState)) {
        return;
    }
    
    lastIntervalRefreshTime = now;
    refresh();
}, 1000);
