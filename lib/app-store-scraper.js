'use strict';

import request from 'request-promise';
import cheerio from 'cheerio';
import moment from 'moment';

let requestError = function () {
  //TODO improve details
  throw Error('Error requesting Google Play');
};

function app(id, country = 'us') {
  id = id.replace(/^id/, '');

  //
  // TODO: use alternative format when relevant: https://itunes.apple.com/<COUNTRY>/app/id553834731?mt=8
  //
  let appStoreUrl = `http://itunes.apple.com/app/id${id}?mt=8`;

  return new Promise(function (resolve, reject) {
    request(appStoreUrl)
      .then(cheerio.load, requestError)
      .then(parseFields)
      .then(function (app) {
        app.url = appStoreUrl;
        app.appId = id;
        resolve(app);
      })
      .catch(reject);
  });
}

function parseFields($) {

  let $left = $('#left-stack');
  let title = $('#title h1').text().trim();
  let developer = $('#title h2').text().trim().slice(3);
  let developerId = (($('.right .view-more').attr('href') || '').match(/id([0-9]+)$/) || [])[1]
  let category = $('[itemprop=applicationCategory]').text().trim();
  let price = ($('[itemprop=price]').attr('content').match(/([0-9\.,\-_]+)/) || [])[1]; // 0 vs. $3.99
  let icon = $left.find('.product img.artwork').attr('src-swap');
  let offersIAP = !!($('.in-app-purchases').length);
  let $description = $('[itemprop=description]');
  let description = $description.text();
  let descriptionHTML = $description.html();
  let version = $('[itemprop=softwareVersion]').text();
  let updated = moment.utc($('[itemprop=datePublished]').attr('content')).format('MMMM D, YYYY');
  let requirediOSVersion = ($('[itemprop=operatingSystem]').text().match(/^Requires iOS ([0-9\.]+)/i) || [])[1];
  let contentRating = ($('.app-rating a').text().match(/^Rated ([0-9][0-9]?\+)$/i) || [])[1];
  let size = ($left.find('.release-date').next().next().text().match(/Size:\s+([0-9]+ .*)$/i) || [])[1];
  let languages = $left.find('.language').text().match(/Languages?:\s+(.*)$/i)[1].split(', ');
  let developerWebsite;
  let supportUrl;


  let $firstLink = $('.app-links a:first-child'),
      $secondLink = $firstLink.next();

  if ($firstLink.text().endsWith('Web Site')) developerWebsite = $firstLink.attr('href');
  if ($firstLink.text().endsWith('Support')) supportUrl = $firstLink.attr('href');
  if ($secondLink.text().endsWith('Support')) supportUrl = $secondLink.attr('href');

  let ratingAll, ratingCurrent, ratersAll, ratersCurrent;

  switch ($left.find('.rating').length) {
    case 2:
      ratingAll = $left.find('.rating').first().find('.rating-star').not('.half').length +
        ($left.find('.rating').first().find('.rating-star.half').length * 0.5);
      ratersAll = cleanInt($left.find('.rating').first().find('.rating-count').text().match(/^([0-9]+)/)[1]);
      ratingCurrent = $left.find('.rating').last().find('.rating-star').not('.half').length +
        ($left.find('.rating').last().find('.rating-star.half').length * 0.5);
      ratersCurrent = cleanInt($left.find('.rating').last().find('.rating-count').text().match(/^([0-9]+)/)[1]);
      break;

    case 1:
      ratingAll = $left.find('.rating .rating-star:not(.half)').length + ($left.find('.rating .rating-star.half').length * 0.5);
      ratersAll = cleanInt($left.find('.rating .rating-count').text().match(/^([0-9]+)/)[1]);
      break;
  }


  let screenshotsIphone = $('.iphone-screen-shots [itemprop=screenshot]').map((i, el) => $(el).attr('src')).get();
  let screenshotsIpad = $('.ipad-screen-shots [itemprop=screenshot]').map((i, el) => $(el).attr('src')).get();



  // Normalize size to be like Google Play
  if (size) size = size.replace(/\s+MB$/, 'M');

  // TODO: Languages array - convert into numbers array


  return {
    title,
    developer,
    category,
    price,
    free: price === '0',
    icon,
    offersIAP,
    description,
    descriptionHTML,
    version,
    updated,
    requirediOSVersion,
    contentRating,
    size,
    languages,
    developerWebsite,
    supportUrl,
    ratingAll,
    ratersAll,
    ratingCurrent,
    ratersCurrent,
    screenshotsIphone,
    screenshotsIpad
  };
}

function cleanInt(number) {
  number = number || '0';
  //removes thousands separator
  number = number.replace(/\D/g, '');
  return parseInt(number);
}

export {app};
