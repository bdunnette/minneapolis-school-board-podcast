#!/usr/bin/env node

var cheerio = require('cheerio'),
    cheerioTableparser = require('cheerio-tableparser'),
    rss = require('rss'),
    request = require('request'),
    _ = require('lodash'),
    moment = require('moment-timezone'),
    fs = require('fs'),
    path = require('path');

var url = 'http://mplsk12mn.granicus.com/ViewPublisher.php?view_id=2'
var imageUrl = 'http://armatage.mpls.k12.mn.us/uploads/mpslogotrans_15.png'
var feedOptions = {
    title: "Minneapolis School Board Meetings",
    pubDate: new Date("2000-01-01"),
    site_url: url,
    image_url: imageUrl,
    categories: ['Government & Organizations:Local'],
    custom_namespaces: {
        'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
    custom_elements: [{
        'itunes:category': [{
                _attr: {
                    text: 'Government & Organizations'
                }
            },
            {
                'itunes:category': {
                    _attr: {
                        text: 'Local'
                    }
                }
            }
        ]
    }]
}
// var feedTypes = ['audio', 'video'];
var feedTypes = ['audio'];
var feeds = {}
feedTypes.forEach(function (ft) {
    feeds[ft] = new rss(feedOptions)
});
var feedTimezone = 'America/Chicago';

function addFeedItem(feed, item, index, $, columns) {
    if (item.length > 6) {
        var dateString = $(columns.dates[index]).text().substring(10)
        var episodeDate = moment.tz(dateString, "MMM DD, YYYY", feedTimezone);
        // Only add the episode if we can parse a valid date
        if (episodeDate.isValid()) {
            var durationString = columns.durations[index].split(' ');
            var durationHours = parseInt(durationString[0]);
            var durationMinutes = _.padStart(parseInt(durationString[1]), 2, '0');
            var durationSeconds = '00';
            var duration = [durationHours, durationMinutes, durationSeconds].join(':').toString()
            var mediaUrl = $(item).attr('href');
            var title = columns.titles[index];
            var feedItem = {
                title: dateString + " " + title,
                date: episodeDate.format(),
                enclosure: {
                    url: mediaUrl
                },
                custom_elements: [{
                    'itunes:duration': duration
                }]
            }
            // Disabling agenda links, as the RSS modules seems to have trouble with ampersands?
            // if (agendas[index].length > 6){
            //     feedItem.url = $(agendas[index]).attr('href');
            // }
            if (moment(episodeDate).isAfter(feed.pubDate)) {
                feed.pubDate = episodeDate;
            }
            feed.item(feedItem)
        }
    }
}

request.get({
    url: url
}, function (err, httpResponse, body) {
    var $ = cheerio.load(body);
    cheerioTableparser($);
    var archive = $('table #archive');
    tableData = archive.parsetable(false, false, false);

    var columns = {
        titles: tableData[0],
        dates: tableData[1],
        durations: tableData[2],
        agendas: tableData[3],
        video: tableData[5],
        audio: tableData[6]
    }

    feedTypes.forEach(function (feedType) {
        columns[feedType].forEach(function (element, index) {
            addFeedItem(feeds[feedType], element, index, $, columns)
        });
        console.log(`Found ${feeds[feedType].items.length} ${feedType} items...`);
        var feedXml = feeds[feedType].xml({
            indent: true
        });
        var feedFile = path.join(__dirname, 'feed-' + feedType + '.xml');
        console.log(`Writing ${feedFile}...`);
        fs.writeFileSync(feedFile, feedXml);
    })
})