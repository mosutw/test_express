var mongoose = require('mongoose');

var vacationInSeasonListenSchema = mongoose.Schema({
  email: String,
  skus: [String],
});

var VacationInSeasonListener = mongoose.model('VacationInSeasonListener',
    vacationInSeasonListenSchema);

module.exports = VacationInSeasonListener; 
