var http = require('http');
var express = require('express');
var fortune = require('./lib/fortune.js');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var jqupload = require('jquery-file-upload-middleware');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var credentials = require('./credentials.js');
var emailService = require('./lib/email.js')(credentials);

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
app.use(expressSession());

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

app.get('/',function(req,res){
  console.log('home');
  res.render('home');
});

app.get('/about',function(req,res){
  res.render('about',{
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js' 
  });
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

app.get('/newsletter',function(req,res){
  console.log('get newsletter');
  res.render('newsletter', {csrf: 'CSRF token goes here' });
});

function NewsLetterSignup(){
}
NewsLetterSignup.prototype.save = function(cb) {
  cb();
}

var VALID_EMAIL_REGEX =  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', function(req,res){
  console.log('post newsletter');
  var name = req.body.name|| '', email = req.body.email || '';
  console('flash');
  if (!email.match(VALID_EMAIL_REGEX)) {
    if (req.xhr) return res.json({error: 'Invalid name email address.'});
    req.session.flash = {
      type: 'danger',
      intro: 'validation error!',
      message: 'The email address you entered was not valid.',
    };
    return res.redirect(303,'/newsletter/archive');
  }
  new NewsLetterSignup({ name: name, email: email}).save(function(err){
    if(err) {
      if(req.xhr) return res.json({error: 'Database error.'});
      req.session.flash = {
        type: 'danger',
        intro: 'Database error!',
        message: 'There was a database error; please try again later.',
      };
      return res.redirect(303,'/newsletter/archive');
    }
    if(req.xhr) return res.json({success: true});
    req.session.flash = {
      type: 'success',
      intro: 'Thank you!',
      message: 'You have now been signed up for the newsletter.',
    };
    return res.redirect(303,'/newsletter/archive');
  });
});

app.get('newsletter/archive', function(req,res){
  res.render('newsletter/archive');
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

app.get('/thank-you', function(req,res){
  res.render('thank-you');  
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

app.post('/contest/vacation-photo/:year/:month', function(req,res){
  console.log('post photo');
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err) return res.redirect(303,'/error');
    console.log('received field:');
    console.log(fields);
    console.log('received files:');
    console.log(files);
    res.redirect(303,'/thank-you');
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
