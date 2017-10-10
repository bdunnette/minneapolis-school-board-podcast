#!/usr/bin/env node

var cheerio = require('cheerio'),
    cheerioTableparser = require('cheerio-tableparser'),
    rss = require('rss'),
    request = require('request'),
    _ = require('lodash'),
    moment = require('moment'),
    fs = require('fs'),
    path = require('path');

var url = 'http://mplsk12mn.granicus.com/ViewPublisher.php?view_id=2'
var feed = new rss({
    title: "Minneapolis School Board Meetings",
    pubDate: new Date()
});

console.log(feed);

request.get({
    url: url
}, function (err, httpResponse, body) {
    var $ = cheerio.load(body);
    cheerioTableparser($);
    var archive = $('table #archive');
    tableData = archive.parsetable(false, false, false);
    // console.log(tableData);
    var titles = tableData[0],
        dates = tableData[1],
        durations = tableData[2],
        agendas = tableData[3],
        video = tableData[5],
        audio = tableData[6];
    audio.forEach(function (element, index) {
        console.log(index)
        console.log(element);
        if (element.length > 6) {
            var dateString = $(dates[index]).text().substring(10)
            console.log(dateString)
            var date = moment(dateString, "MMM DD, YYYY").toDate()
            var enclosure = $(element).attr('href');
            console.log(enclosure)
            feed.item({
                title: titles[index],
                date: date,
                enclosure: {
                    url: enclosure
                }
            })
        }
    });
})