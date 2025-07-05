'use strict';

let objDatabase = chrome.runtime.connect({
    'name': 'database'
});

let objHistory = chrome.runtime.connect({
    'name': 'history'
});

let objYoutube = chrome.runtime.connect({
    'name': 'youtube'
});

let objSearch = chrome.runtime.connect({
    'name': 'search'
});

jQuery(window.document).ready(function() {
    jQuery('html')
        .attr({
            'data-bs-theme': window.matchMedia('(prefers-color-scheme: dark)').matches === true ? 'dark' : ''
        })
    ;

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(objEvent) {
        jQuery('html')
            .attr({
                'data-bs-theme': window.matchMedia('(prefers-color-scheme: dark)').matches === true ? 'dark' : ''
            })
        ;
    });

    jQuery('#idDatabase_Export')
        .on('click', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('exporting database')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            objDatabase.postMessage({
                'strMessage': 'databaseExport',
                'objRequest': {}
            });
        })
    ;

    objDatabase.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'databaseExport') {
            if (objData.objResponse === null) {
                jQuery('#idLoading_Message')
                    .text('error exporting database')
                ;
                
                // Hide download button if there was an error
                jQuery('#idLoading_Download').hide();

            } else if (objData.objResponse !== null) {
                jQuery('#idLoading_Message')
                    .text('finished exporting database')
                ;
                
                // Check if we're on Android by looking for touch events
                const isAndroid = 'ontouchstart' in window && 
                                  navigator.userAgent.toLowerCase().indexOf('android') > -1;
                
                // Show download button for Android
                if (isAndroid) {
                    // Create download button if it doesn't exist
                    if (jQuery('#idLoading_Download').length === 0) {
                        jQuery('<button class="btn btn-success" id="idLoading_Download" style="margin-right: 10px;">Download</button>')
                            .insertBefore('#idLoading_Close')
                            .on('click', function() {
                                // Get the export data from localStorage
                                const exportData = localStorage.getItem('pendingExport');
                                const filename = localStorage.getItem('pendingExportFilename');
                                
                                if (exportData && filename) {
                                    // Function to safely decode base64 to binary
                                    function base64ToBinary(base64) {
                                        const raw = atob(base64);
                                        const rawLength = raw.length;
                                        const array = new Uint8Array(new ArrayBuffer(rawLength));
                                        
                                        for(let i = 0; i < rawLength; i++) {
                                            array[i] = raw.charCodeAt(i);
                                        }
                                        return array;
                                    }
                                    
                                    // Create a blob URL for the download with proper binary data
                                    const blob = new Blob([base64ToBinary(exportData)], {type: 'application/octet-stream'});
                                    const downloadUrl = URL.createObjectURL(blob);
                                    
                                    // Create a temporary element to hold our download link
                                    const container = document.createElement('div');
                                    container.innerHTML = `
                                        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 9999; padding: 20px; text-align: center;">
                                            <h2>Download Database</h2>
                                            <p>Click the link below to download your database file:</p>
                                            <p><a href="${downloadUrl}" download="${filename}" style="display: inline-block; padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Download ${filename}</a></p>
                                            <p style="margin-top: 20px;"><button id="closeDownload" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button></p>
                                        </div>
                                    `;
                                    
                                    // Add to document
                                    document.body.appendChild(container);
                                    
                                    // Add close button handler
                                    document.getElementById('closeDownload').addEventListener('click', function() {
                                        document.body.removeChild(container);
                                        // Clean up the blob URL to prevent memory leaks
                                        URL.revokeObjectURL(downloadUrl);
                                    });
                                    
                                    // Also add a click handler to the download link to revoke the URL after download
                                    const downloadLink = container.querySelector('a');
                                    downloadLink.addEventListener('click', function() {
                                        // Give the browser some time to start the download before revoking
                                        setTimeout(() => {
                                            URL.revokeObjectURL(downloadUrl);
                                        }, 1000);
                                    });
                                }
                            });
                    } else {
                        jQuery('#idLoading_Download').show();
                    }
                }
            }

            jQuery('#idLoading_Close')
                .removeClass('disabled')
            ;
        }

        if (objData.strMessage === 'databaseExport-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idDatabase_Import').find('input')
        .on('change', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('importing database')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            let objFilereader = new FileReader();

            objFilereader.onload = function(objEvent) {
                objDatabase.postMessage({
                    'strMessage': 'databaseImport',
                    'objRequest': {
                        'objVideos': JSON.parse(decodeURIComponent(escape(atob(objEvent.target.result))))
                    }
                });
            };

            if (jQuery('#idDatabase_Import').find('input').get(0).files !== undefined) {
                if (jQuery('#idDatabase_Import').find('input').get(0).files.length === 1) {
                    objFilereader.readAsText(jQuery('#idDatabase_Import').find('input').get(0).files[0], 'utf-8');
                }
            }
        })
    ;

    objDatabase.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'databaseImport') {
            if (objData.objResponse === null) {
                jQuery('#idLoading_Message')
                    .text('error importing database')
                ;

            } else if (objData.objResponse !== null) {
                jQuery('#idLoading_Message')
                    .text('finished importing database')
                ;

            }

            jQuery('#idLoading_Close')
                .removeClass('disabled')
            ;
        }

        if (objData.strMessage === 'databaseImport-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idDatabase_Reset')
        .on('click', function() {
            jQuery(this)
                .css({
                    'display': 'none'
                })
            ;

            jQuery('#idDatabase_Resyes').closest('.input-group')
                .css({
                    'display': 'inline'
                })
            ;
        })
    ;

    jQuery('#idDatabase_Resyes')
        .on('click', function() {
            objDatabase.postMessage({
                'strMessage': 'databaseReset',
                'objRequest': {}
            });
        })
    ;

    objDatabase.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'databaseReset') {
            window.location.reload();
        }
    });

    jQuery('#idDatabase_Size')
        .text(parseInt(window.localStorage.getItem('extensions.Youwatch.Database.intSize')))
    ;

    jQuery('#idHistory_Synchronize')
        .on('click', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('synchronizing history')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            objHistory.postMessage({
                'strMessage': 'historySynchronize',
                'objRequest': {
                    'intTimestamp': 0
                }
            });
        })
    ;

    objHistory.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'historySynchronize') {
            if (objData.objResponse === null) {
                jQuery('#idLoading_Message')
                    .text('error synchronizing history')
                ;

            } else if (objData.objResponse !== null) {
                jQuery('#idLoading_Message')
                    .text('finished synchronizing history')
                ;

            }

            jQuery('#idLoading_Close')
                .removeClass('disabled')
            ;
        }

        if (objData.strMessage === 'historySynchronize-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idHistory_Timestamp')
        .text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.History.intTimestamp'))).format('YYYY.MM.DD - HH:mm:ss'))
    ;

    jQuery('#idYoutube_Synchronize')
        .on('click', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('synchronizing youtube')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            objYoutube.postMessage({
                'strMessage': 'youtubeSynchronize',
                'objRequest': {
                    'intThreshold': 1000000
                }
            });
        })
    ;

    objYoutube.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'youtubeSynchronize') {
            if (objData.objResponse === null) {
                jQuery('#idLoading_Message')
                    .text('error synchronizing youtube')
                ;

            } else if (objData.objResponse !== null) {
                jQuery('#idLoading_Message')
                    .text('finished synchronizing youtube')
                ;

            }

            jQuery('#idLoading_Close')
                .removeClass('disabled')
            ;
        }

        if (objData.strMessage === 'youtubeSynchronize-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idYoutube_Timestamp')
        .text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.Youtube.intTimestamp'))).format('YYYY.MM.DD - HH:mm:ss'))
    ;

    jQuery('#idCondition_Brownav')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolBrownav', window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Browhist')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolBrowhist', window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youprog')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYouprog', window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youbadge')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYoubadge', window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youhist')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYouhist', window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Fadeout')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolFadeout', window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Grayout')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolGrayout', window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Showbadge')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowbadge', window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Showdate')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowdate', window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Hideprogress')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolHideprogress', window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idSearch_Query')
        .on('keydown', function(objEvent) {
            if (objEvent.keyCode === 13) {
                jQuery('#idSearch_Lookup')
                    .data({
                        'intSkip' : 0
                    })
                ;

                jQuery('#idSearch_Lookup').triggerHandler('click');
            }
        })
    ;

    jQuery('#idSearch_Lookup')
        .data({
            'intSkip' : 0
        })
        .on('click', function(objEvent) {
            if (objEvent.originalEvent !== undefined) {
                jQuery('#idSearch_Lookup')
                    .data({
                        'intSkip' : 0
                    })
                ;
            }

            jQuery('#idSearch_Lookup')
                .addClass('disabled')
                .find('i')
                    .eq(0)
                        .css({
                            'display': 'none'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': 'inline'
                        })
                    .end()
                .end()
            ;

            objSearch.postMessage({
                'strMessage': 'searchLookup',
                'objRequest': {
                    'strQuery': jQuery('#idSearch_Query').val(),
                    'intSkip': jQuery('#idSearch_Lookup').data('intSkip'),
                    'intLength': 10
                }
            });
        })
        .each(function() {
            jQuery(this).triggerHandler('click');
        })
    ;

    objSearch.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'searchLookup') {
            if (objData.objResponse === null) {
                return;
            }

            jQuery('#idSearch_Lookup')
                .removeClass('disabled')
                .find('i')
                    .eq(0)
                        .css({
                            'display': 'inline'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': 'none'
                        })
                    .end()
                .end()
            ;

            if (jQuery('#idSearch_Lookup').data('intSkip') === 0) {
                jQuery('#idSearch_Results')
                    .empty()
                    .append(jQuery('<table></table>')
                        .addClass('table')
                        .addClass('table-sm')
                        .css({
                            'margin': '0px'
                        })
                        .append(jQuery('<thead></thead>')
                            .append(jQuery('<tr></tr>')
                                .append(jQuery('<th></th>')
                                    .attr({
                                        'width': '1%'
                                    })
                                    .text('Time')
                                )
                                .append(jQuery('<th></th>')
                                    .text('Title')
                                )
                                .append(jQuery('<th></th>')
                                    .attr({
                                        'width': '1%'
                                    })
                                    .css({
                                        'text-align': 'right'
                                    })
                                    .text('Visits')
                                )
                                .append(jQuery('<th></th>')
                                    .attr({
                                        'width': '1%'
                                    })
                                )
                            )
                        )
                        .append(jQuery('<tbody></tbody>'))
                    )
                ;
            }

            jQuery('#idSearch_Results').find('tbody')
                .each(function() {
                    for (let objVideo of objData.objResponse.objVideos) {
                        jQuery(this)
                            .append(jQuery('<tr></tr>')
                                .append(jQuery('<td></td>')
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'white-space': 'nowrap'
                                        })
                                        .text(moment(objVideo.intTimestamp).format('YYYY.MM.DD - HH:mm'))
                                    )
                                )
                                .append(jQuery('<td></td>')
                                    .css({
                                        'position': 'relative'
                                    })
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'left': '8px',
                                            'overflow': 'hidden',
                                            'position': 'absolute',
                                            'right': '-8px',
                                            'text-overflow': 'ellipsis',
                                            'white-space': 'nowrap'
                                        })
                                        .append(jQuery('<a></a>')
                                            .attr({
                                                'href': 'https://www.youtube.com/watch?v=' + objVideo.strIdent
                                            })
                                            .css({
                                                'text-decoration': 'none'
                                            })
                                            .text(objVideo.strTitle)
                                        )
                                    )
                                )
                                .append(jQuery('<td></td>')
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'white-space': 'nowrap',
                                            'text-align': 'right'
                                        })
                                        .text(objVideo.intCount)
                                    )
                                )
                                .append(jQuery('<td></td>')
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'white-space': 'nowrap'
                                        })
                                        .append(jQuery('<a></a>')
                                            .addClass('fa-regular')
                                            .addClass('fa-trash-can')
                                            .css({
                                                'cursor': 'pointer'
                                            })
                                            .data({
                                                'strIdent': objVideo.strIdent
                                            })
                                            .on('click', function() {
                                                jQuery('#idLoading_Container')
                                                    .css({
                                                        'display': 'block'
                                                    })
                                                ;

                                                jQuery('#idLoading_Message')
                                                    .text('deleting video')
                                                ;

                                                jQuery('#idLoading_Progress')
                                                    .text('...')
                                                ;

                                                jQuery('#idLoading_Close')
                                                    .addClass('disabled')
                                                ;

                                                objSearch.postMessage({
                                                    'strMessage': 'searchDelete',
                                                    'objRequest': {
                                                        'strIdent': jQuery(this).data('strIdent')
                                                    }
                                                });
                                            })
                                        )
                                    )
                                )
                            )
                        ;
                    }
                })
            ;

            if (objData.objResponse.objVideos.length === 10) {
                jQuery('#idSearch_Results').find('tr:last')
                    .each(function() {
                        new IntersectionObserver(function(objEntries, objObserver) {
                            if (objEntries[0].isIntersecting === true) {
                                objObserver.unobserve(objEntries[0].target);

                                jQuery('#idSearch_Lookup')
                                    .data({
                                        'intSkip' : jQuery('#idSearch_Lookup').data('intSkip') + 10
                                    })
                                ;

                                jQuery('#idSearch_Lookup').triggerHandler('click');
                            }
                        }).observe(this)
                    })
                ;
            }
        }

        if (objData.strMessage === 'searchDelete') {
            if (objData.objResponse === null) {
                jQuery('#idLoading_Message')
                    .text('error deleting video')
                ;

            } else if (objData.objResponse !== null) {
                jQuery('#idLoading_Message')
                    .text('finished deleting video')
                ;

            }

            jQuery('#idLoading_Close')
                .removeClass('disabled')
            ;
        }

        if (objData.strMessage === 'searchDelete-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idLoading_Close')
        .on('click', function() {
            window.location.reload();
        })
    ;
});
