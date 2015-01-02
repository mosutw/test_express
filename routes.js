var main = require('./handlers/main.js');
var contest = require('./handlers/contest.js');
var vacation = require('./handlers/vacation.js');

module.exports = function(app){
  app.get('/',main.home);
  app.get('/about',main.about);
  app.get('/newsletter', main.newsletter);
  app.post('/newsletter', main.newsletterProcessPost);
  app.get('/newsletter/archive', main.newsletterArchive);
  app.get('/thank-you', main.genericThankYou);

  app.get('/contest/vacation-photo', contest.vacationPhoto);
  app.post('/contest/vacation-photo/:year/:month', contest.vacationPhotoProcessPost);
  app.get('/contest/vacation-photo/entries', contest.vacationPhotoEntries);

  app.get('/vacations', vacation.list);
  app.get('/vacation/:vacation', vacation.detail);
  app.get('/notify-me-when-in-season', vacation.notifyWhenInSeason);
  app.post('/notify-me-when-in-season', vacation.notifyWhenInSeasonProcessPost);
};
