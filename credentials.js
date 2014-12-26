module.exports = {
  cookieSecret: 'your cookie secret goes here',
  gmail: { 
    user: 'your gmail username',
    password: 'your gmail password',
  },
  mongo: {
    development: {
      connectionString: 'mongodb://localhost/test_express',
    },
    production: {
      connectionString: 'mongodb://localhost/test_express',
    },
  },
};
