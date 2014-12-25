var nodemailer = require('nodemailer');

module.exports =  function(credentials) {
  var mailTransport = nodemailer.createTransport('SMTP',{
    service: 'Gmail',
    auth:{
      user: credentials.gmail.user,
      pass: credentials.gmail.password,
    }
  });

  var from = '"mosu test" <luke>';
  var errorRecipient = 'luke_chiang@megasec.com.tw';

  return {
    send: function(to, subj, body){
      mailTransport.sendMail({
        from: from,
        to:   to,
        subject: subj,
        html: body,
        generateTextFromHtml: true
      },function(err){
        if(err) console.error('Unable to send email: ' + err);
      });
    },
    emailError: function(message, filename, exception){
      var body = '<h1>Meadwlark Travel Site Error</h1>' +
          'message:<br><pre>' + message + '</pre></br>';
      if(exception) body += 'exception:<br><pre>' + exception + '</pre></br>' ;
      if(filename) body += 'filename:<br><pre>' + filename + '</pre></br>';

      mailTransport.sendMail({
        from: from,
        to:   errorRecipient,
        subject: 'error',
        html: body,
        generateTextFromHtml: true
      },function(err){
          if(err) console.error('Unbale to send email:' + err);
      });
    },
  };
}
