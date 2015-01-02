module.exports = {
  cookieSecret: 'your cookie secret goes here',
  gmail: { 
    user: 'your gmail username',
    password: 'your gmail password',
  },
  mongo: {
    development: {
      connectionString: 'mongodb://127.0.0.1/test_express',
    },
    production: {
      connectionString: 'mongodb://127.0.0.1/test_express',
    }
  },
};
