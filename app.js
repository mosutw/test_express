var http = require('http');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var jqupload = require('jquery-file-upload-middleware');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var credentials = require('./credentials.js');
var emailService = require('./lib/email.js')(credentials);
var Vacation = require('./models/vacation.js');
var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');

var app = express();



var handlebars = require('express3-handlebars')
    .create({
      defaultLayout:'main',
      helpers: {
        section: function(name, options){
          if(!this._sections) this._sections = {};
          this._sections[name] = options.fn(this);
          return null;
        }
      }
    });


app.engine('handlebars',handlebars.engine);
app.set('view engine', 'handlebars');


app.set('port',process.env.PORT||3000);

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({url: credentials.mongo.development.connectionString });
//
var mongoose = require('mongoose');
var opts = {
  server: {
    socketOptions: { keepAlive: 1 }
  }
};
switch(app.get('env')){
  case 'development':
    mongoose.connect(credentials.mongo.development.connectionString, opts);
    break;
  case 'production':
    mongoose.connect(credentials.mongo.production.connectionString. opts);
    break;
  default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
}

Vacation.find(function(err, vacations){
  if (vacations.length) return;

  new Vacation({
    name: 'Hood River Day Trip',
    slug: 'hood-river-day-trip',
    category: 'Day Trip',
    sku:  'HR199',
    description: 'Spend a day sailling on the Columbia and ' + 
      'enjoying craft beers in Hood River!',
    priceInCents: 9995,
    tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0,
  }).save();

  new Vacation({
    name: 'Oregon Coast Getaway',
    slug: 'oregon-coast-getaway',
    category: 'Weekend Getaway',
    sku:  'OC39',
    description: 'Enjoy the ocean air and quaint coastal towns!',
    priceInCents: 269995,
    tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
    inSeason: true,
    maximumGuests: 8,
    available: true,
    packagesSold: 0,
  }).save();

  new Vacation({
    name: 'Rock Climbing in Bend',
    slug: 'rock-climbing-in-bend',
    category: 'Adventure',
    sku:  'B99',
    description: 'Experience the thrill of climbing in the high desert.',
    priceInCents: 289995,
    tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
    inSeason: true,
    maximumGuests: 4,
    available: false,
    packagesSold: 0,
    notes: 'The tour guide is currently recovering from a skiing accident.', 
  }).save();

})



app.use(function(req,res, next){
  var domain = require('domain').create();
  domain.on('error',function(err){
    console.error('DOMAIN ERROR CAUGHT\n', err.stack);
    try{
      setTimeout(function(){
        console.error('Failsafe shutdown.');
        process.exit(1);
      },5000);

      var worker = require('cluster').worker;
      if(worker) worker.disconnect();

      server.close();

      try {
        next(err);
      } catch(err) {
        console.error('Express error mechanism failed.\n', err.stack);
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end('Server error.');
      }
    } catch(err){
      console.error('Unable to send 500 response.\n', err.stack);
    }
  });

  domain.add(req);
  domain.add(res);

  domain.run(next);
});


app.use(express.static(__dirname + '/public'));

function getWeatherData(){
  return {
    locations: [
      {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)',
      },
      {
        name: 'Bend',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)',
      },
      {
        name: 'Manzanita',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Light Rain',
        temp: '55.0 F (12.8 C)',
      },
    ],
  };
}

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(function(req,res,next) {
  if(!res.locals.partials) res.locals.partials = {};
  res.locals.partials.weather = getWeatherData();
  next();
});


app.use(cookieParser(credentials.cookieSecret));
app.use(expressSession({store:sessionStore}));

// flash message middleware
app.use(function(req, res, next){
  // if there's a flash message, transfer
  // it to the context, then clear it
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

//app.use(function(req,res,next){
//  var cluster = require('cluster');
//  console.log('cluster?' + cluster.isWorker);
//  if(cluster.isWorker) console.log('Worker %d received request',cluster.worker.id);
//});

app.use(function(req, res, next) {
  res.locals.showTests = app.get('env') !== 'production' &&
      req.query.test === '1';
  next();
});

require('./routes.js')(app);

app.use('/upload',function(req,res,next){
  var now = Date.now();
  jqupload.fileHandler({
    uploadDir: function(){
      return __dirname + '/public/uploads/' + now;
    },
    uploadUrl: function(){
      return '/uploads' + now;
    },
  })(req, res,next);
});

app.get('/tours/hood-river', function(req, res) {
  res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function(req, res) {
  res.render('tours/request-group-rate');
});

app.get('/nursery-rhyme', function(req, res){
  res.render('nursery-rhyme');
});

app.get('/data/nursery-rhyme', function(req,res){
  res.json({
    animal: 'squirrel',
    bodyPart: 'tail',
    adjective: 'bushy',
    noun:'heck',
  });
});

app.post('/process', function(req,res){
  console.log('req.xhr:' + req.xhr);
  console.log('req.accept:' + req.accepts('json,html'));
  if(req.xhr || req.accepts('json,html') === 'html'){
    console.log('get html');
    res.send({success:true});
  } else if(req.xhr || req.accepts('json,html') === 'json'){
    console.log('get json data');
    res.send({success:true});
  } else {
    console.log('get 303');
    res.redirect(303, '/thank-you');
  }
});

app.get('/contest/vacation-photo', function(req,res){
  var now = new Date();
  console.log(now.getFullYear());
  console.log(now.getMonth());
  res.render('contest/vacation-photo', {
    year: now.getFullYear(), 
    month: now.getMonth()
  });
});

app.get('/vacations', function(req, res){
  Vacation.find({ available: true }, function(err, vacations){
    var currency = req.session.currency || 'USD';
    var context = {
      currency: currency,
      vacations: vacations.map(function(vacation){
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: convertFromUSD(vacation.priceInCents/100, currency),
          inSeason: vacation.inSeason,
        }
      })
    };
    switch(currency) {
      case 'USD': context.currencyUSD = 'selected' ; break;
      case 'GBP': context.currencyGBP = 'selected' ; break;
      case 'BTC': context.currencyBTC = 'selected' ; break;
    }
    res.render('vacations',context);
  });
});


app.get('/set-currency/:currency', function(req,res){
  req.session.currency = req.params.currency;
  return res.redirect(303, '/vacations');
});

function convertFromUSD(value, currency) {
  switch(currency) {
    case 'USD': return value * 1;
    case 'GBP': return value * 0.6;
    case 'BTC': return value * 0.00237;
    default: return NaN;
  }
}

app.get('/notify-me-when-in-season',function(req,res){
  res.render('notify-me-when-in-season', {sku: req.query.sku});
});

app.post('/notify-me-when-in-season',function(req,res){
  VacationInSeasonListener.update(
    {email: req.body.email },
    {$push: { skus: req.body.sku } },
    {upsert: true},
    function(err) {
      if(err) {
        console.error(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Ooops!',
          message: 'There was an error processing you request.',
        };
        return res.redirect(303,'/vacations');
      }
      req.session.flash = {
        type: 'sucess',
        intro: 'Thank you!',
        message: 'You will be notifyied when this vacation is in season.',
      };
      return res.redirect(303,'/vacations');
    }
  );
});

var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath){

}

function convertFromUSD(value, currency) {
  switch(currency) {
    case 'USD': return value * 1;
    case 'GBP': return value * 0.6;
    case 'BTC': return value * 0.0023707;
    default: return NaN;
  }
}

app.post('/contest/vacation-photo/:year/:month', function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err) return res.redirect(303,'/error');
    if(erR) {
      res.session.flash = {
          type: 'danger',
         intro: 'Oops!',
       message: 'There was an error processing your submission. ' +
                'Pelase try again,',
      };
      return res.redirect(303, '/contest/vacation-photo');
    }
    var photo = files.photo;
    var dir = vacationPhotodir + '/' + Date.now();
    var path = dir + '/' + photo.name;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, dir + '/' + photo.name);
    saveConntestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path);
    req.session.flash = {
      type: 'sucess',
      intro: 'Good luck!',
      message: 'You have been entered into the contest.',
    };
    return res.redirect(303, '/contest/vacation-photo/entries');
  });
});

app.get('/fail', function(req,res){
  throw new Error('Nope');
});

app.use(function(req, res, next){
  res.status(404);
  res.render('404');
});

app.use(function(err,req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

//app.listen(app.get('port'), function(){
//  console.log('Express started on http://localhost:' +
//    app.get('port') + '; press Ctrl-C to terminate.');
//});


var server;

function startServer(){
  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express started in ' + app.get('env') +
      ' mode on http://localhost:' + app.get('port') +
      ';press Ctrl-C to terminate.');
  });
}

if (require.main === module) {
  startServer();
} else {
  module.exports = startServer;
}
