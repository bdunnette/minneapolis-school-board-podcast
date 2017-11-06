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
var feed = new rss({
    title: "Minneapolis School Board Meetings",
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
});
var feedTimezone = 'America/Chicago';
var audioFeedFile = path.join(__dirname, 'feed-audio.xml');

request.get({
    url: url
}, function (err, httpResponse, body) {
    var $ = cheerio.load(body);
    cheerioTableparser($);
    var archive = $('table #archive');
    tableData = archive.parsetable(false, false, false);
    var titles = tableData[0],
        dates = tableData[1],
        durations = tableData[2],
        agendas = tableData[3],
        video = tableData[5],
        audio = tableData[6];
    var latestEpisodeDate = new Date("2000-01-01");
    audio.forEach(function (element, index) {
        if (element.length > 6) {
            var dateString = $(dates[index]).text().substring(10)
            var episodeDate = moment.tz(dateString, "MMM DD, YYYY", feedTimezone);
            // Only add the episode if we can parse a valid date
            if (episodeDate.isValid()) {
                var durationString = durations[index].split(' ');
                var durationHours = parseInt(durationString[0]);
                var durationMinutes = _.padStart(parseInt(durationString[1]), 2, '0');
                var durationSeconds = '00';
                var duration = [durationHours, durationMinutes, durationSeconds].join(':').toString()
                var mediaUrl = $(element).attr('href');
                var title = titles[index];
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
                if (moment(episodeDate).isAfter(latestEpisodeDate)) {
                    latestEpisodeDate = episodeDate;
                }
                feed.item(feedItem)
            }
        }
    });
    feed.pubDate = latestEpisodeDate;
    console.log(`Found ${feed.items.length} items...`);
    var feedXml = feed.xml({
        indent: true
    });
    console.log(`Writing ${audioFeedFile}...`);
    fs.writeFileSync(audioFeedFile, feedXml);
})