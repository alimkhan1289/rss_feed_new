const express = require('express');
const app = express(),
      bodyParser = require("body-parser"),
      fs = require('fs'),
      log4js = require('log4js'),
      Parser = require('rss-parser'),
      _ = require('lodash'),
      port = 3000;

var logger = log4js.getLogger('Rss-Feed');
logger.level = 'DEBUG';

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : '0.0.0.0',
  user     : 'root',
  password : 'root123',
  database : 'rss_feed'
});

connection.connect();

app.use(bodyParser.json());

app.post('/', (req,res) => {
    logger.debug('SERVER RUNNING:');
});

app.get('/search', (req,res) => {
    logger.debug('Inside search API:');
    var searchKey = req && req.query && req.query.key;
    logger.debug('search key:', searchKey);
    if(!searchKey) {
        return res.json({success: 0, errCode: 1, items: [] ,errMessage: 'Provide search key'});
    }
    var findQry = `select * from rssFeed where title like ?`;
    logger.debug('findQry:', findQry);
    connection.query(findQry, [`%${searchKey}%`], function (error, results, fields) {
        if (error) {
            throw error;
        }
        else if(results.length > 0){
            logger.debug('Data found in DB:', results.length);
            return res.json({success: 1, errCode: 0, items: results ,errMessage: ''});
        }
        else {
            logger.debug('feed not found in database:');
            let parser = new Parser();

            (async () => {

              let feed = await parser.parseURL('https://www.reddit.com/.rss');
              logger.debug(feed.title);
                var parsedArray = [];
                feed.items.forEach(item => {
                    logger.debug('Title:', item.title);
                    logger.debug('Link:', item.link);
                    let tempObj = {
                        'title':item.title,
                        'url': item.link
                    }
                    parsedArray.push(tempObj);
                });
                logger.debug('parsedArray:', parsedArray);
                var results =_.filter(parsedArray,function(item){
                    item.title = item.title.toLowerCase();
                    return item.title.indexOf(searchKey.toLowerCase())>-1;
                });
                logger.debug('results array:', results);
                results.forEach(function(item) {
                    var insertQry  = `insert into rssFeed set title='${item.title}', url='${item.url}'`;
                    connection.query(insertQry, function (error, res, fields) {
                        if (error) {
                            throw error;
                        }
                        else {
                            logger.debug('feed data inserted in database');
                        }
                    });
                })
                return res.json({success: 1, errCode: 0, items: results ,errMessage: ''});
            })();
        }
    });
});

app.listen(port, () => {
    console.log(`Server listening on the port::::::${port}`);
});