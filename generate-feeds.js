#!/usr/bin/env node

var cheerio = require('cheerio'),
    cheerioTableparser = require('cheerio-tableparser'),
    rss = require('rss'),
    request = require('request'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path');
    
var url = 'http://mplsk12mn.granicus.com/ViewPublisher.php?view_id=2'

request.get({
    url: url
}, function(err, httpResponse, body) {
    var $ = cheerio.load(body);
    cheerioTableparser($);
    var archive = $('table #archive');
    tableData = archive.parsetable(true, true, true);
    console.log(tableData);
})
